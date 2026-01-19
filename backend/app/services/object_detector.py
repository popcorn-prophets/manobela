import logging
import os
import threading
from pathlib import Path
from typing import Protocol

import cv2
import numpy as np
import onnxruntime as ort
from pydantic import BaseModel

from app.services.utils.image_utils import letterbox

logger = logging.getLogger(__name__)

# Path to the model file
PROJECT_ROOT = Path(__file__).resolve().parents[2]
MODEL_PATH = PROJECT_ROOT / "assets" / "models" / "yolov8n.onnx"

# Essential classes to filter out from object detections
ESSENTIAL_CLASSES: list[int] = [67]  # cell phone


class ObjectDetection(BaseModel):
    """
    Object detection result for a single detected object.
    """

    bbox: list[float]
    conf: float
    class_id: int


class ObjectDetector(Protocol):
    """
    Abstraction for object detection.
    """

    def detect(
        self,
        img: np.ndarray,
        normalize: bool = True,
        conf_threshold: float = 0.3,
        iou_threshold: float = 0.5,
    ) -> list[ObjectDetection]: ...

    def close(self) -> None: ...


class YoloObjectDetector(ObjectDetector):
    """
    YOLO-based implementation of object detector.
    """

    def __init__(self, model_path: Path = MODEL_PATH, input_size: int = 640):
        """
        Initialize object detector.

        Args:
            model_path: Path to the ONNX model file.
            input_size: Input size for the model (default: 640).

        Raises:
            ValueError: If parameters are invalid.
            RuntimeError: If model loading fails.
        """
        self._lock = threading.Lock()
        self._closed = False

        # Validate input_size
        if not isinstance(input_size, int) or input_size <= 0:
            raise ValueError(
                f"input_size must be a positive integer, got: {input_size}"
            )

        if input_size % 32 != 0:
            logger.warning(
                f"input_size {input_size} is not divisible by 32, may cause issues"
            )

        self.input_size = input_size

        # Validate model path
        self._validate_model_path(model_path)

        # Initialize ONNX session
        try:
            sess_opts = ort.SessionOptions()
            sess_opts.graph_optimization_level = (
                ort.GraphOptimizationLevel.ORT_ENABLE_ALL
            )
            sess_opts.intra_op_num_threads = max(1, (os.cpu_count() or 2) // 2)

            self.session = ort.InferenceSession(
                str(model_path),
                sess_options=sess_opts,
                providers=["CPUExecutionProvider"],
            )

            self.input_name = self.session.get_inputs()[0].name

            # Validate model input shape
            self._validate_model_input()

            logger.info(f"Object Detector initialized with model: {model_path}")

        except Exception as e:
            logger.error(f"Failed to initialize ONNX session: {e}")
            raise RuntimeError(f"Failed to load model from {model_path}: {e}") from e

    def detect(
        self,
        img: np.ndarray,
        normalize: bool = True,
        conf_threshold: float = 0.3,
        iou_threshold: float = 0.5,
    ) -> list[ObjectDetection]:
        """
        Detect objects in an image.

        Args:
            img: BGR image to detect objects in.
            normalize: Whether to normalize bounding boxes to 0-1 range.
            conf_threshold: Confidence threshold for object detection.
            iou_threshold: Intersection over union threshold for object detection.

        Returns:
            List of detected objects.
        """
        if self._closed or self.session is None:
            raise RuntimeError("Object detector has been closed")

        try:
            orig_shape = img.shape[:2]

            img_lb, ratio, pad = letterbox(img, self.input_size)

            tensor = self._preprocess(img_lb)

            with self._lock:
                outputs = self.session.run(None, {self.input_name: tensor})

            # Validate outputs
            if not outputs or len(outputs) == 0:
                logger.warning("Model returned empty output")
                return []

            output = outputs[0]
            assert isinstance(output, np.ndarray)

            results = self._postprocess(
                output,
                orig_shape,
                ratio,
                pad,
                conf_threshold,
                iou_threshold,
                normalize,
            )

            logger.debug(f"Detected {len(results)} objects")
            return results

        except Exception as e:
            logger.error(f"Detection failed: {e}", exc_info=True)
            raise RuntimeError(f"Inference failed: {e}") from e

    def close(self) -> None:
        """
        Release underlying resources.
        Safe to call multiple times.
        """
        with self._lock:
            if self._closed:
                return
            self._closed = True
            self.session = None
            self.input_name = None

    @staticmethod
    def _preprocess(img: np.ndarray) -> np.ndarray:
        """
        Preprocess a BGR image for ONNX YOLOv8 inference.
        """
        try:
            img = img[:, :, ::-1]  # BGR -> RGB
            img = img.transpose(2, 0, 1)  # HWC -> CHW
            # Normalize to [0, 1]
            img = np.ascontiguousarray(img, dtype=np.float32) / 255.0
            return img[None]  # Add batch dimension
        except Exception as e:
            logger.error(f"Preprocessing failed: {e}")
            raise ValueError(f"Failed to preprocess image: {e}") from e

    @staticmethod
    def _postprocess(
        output: np.ndarray,
        orig_shape: tuple[int, int],
        ratio: float,
        pad: tuple[int, int],
        conf_thres: float,
        iou_thres: float,
        normalize: bool = False,
    ) -> list[ObjectDetection]:
        """
        Post process raw YOLOv8 ONNX output to a list of ObjectDetection.
        """
        try:
            output = np.squeeze(output).T

            boxes = output[:, :4]
            scores = output[:, 4:]

            class_ids = scores.argmax(axis=1)
            confidences = scores[np.arange(scores.shape[0]), class_ids]

            # Filter by confidence & essential classes
            boxes, confidences, class_ids = (
                YoloObjectDetector._filter_confidence_and_classes(
                    boxes, confidences, class_ids, conf_thres
                )
            )
            if boxes.size == 0:
                return []

            # Convert xywh -> xyxy
            boxes = YoloObjectDetector._xywh_to_xyxy(boxes)

            # Undo letterbox
            boxes /= ratio
            boxes[:, [0, 2]] -= pad[0]
            boxes[:, [1, 3]] -= pad[1]

            # Clip / normalize
            h, w = orig_shape
            if normalize:
                boxes[:, [0, 2]] /= w
                boxes[:, [1, 3]] /= h
            else:
                boxes[:, [0, 2]] = boxes[:, [0, 2]].clip(0, w)
                boxes[:, [1, 3]] = boxes[:, [1, 3]].clip(0, h)

            # Apply class-aware NMS
            keep_idxs = YoloObjectDetector._apply_nms(
                boxes, confidences, class_ids, conf_thres, iou_thres
            )
            boxes = boxes[keep_idxs]
            confidences = confidences[keep_idxs]
            class_ids = class_ids[keep_idxs]

            # Convert to ObjectDetection
            return YoloObjectDetector._to_object_detections(
                boxes, confidences, class_ids
            )

        except Exception as e:
            logger.error(f"Postprocessing failed: {e}")
            raise RuntimeError(f"Failed to postprocess output: {e}") from e

    @staticmethod
    def _filter_confidence_and_classes(
        boxes: np.ndarray,
        confidences: np.ndarray,
        class_ids: np.ndarray,
        conf_thres: float,
    ):
        """Filter boxes by confidence and essential classes."""
        mask = confidences >= conf_thres
        boxes, confidences, class_ids = boxes[mask], confidences[mask], class_ids[mask]

        if ESSENTIAL_CLASSES:
            class_mask = np.isin(class_ids, ESSENTIAL_CLASSES)
            boxes, confidences, class_ids = (
                boxes[class_mask],
                confidences[class_mask],
                class_ids[class_mask],
            )

        return boxes, confidences, class_ids

    @staticmethod
    def _xywh_to_xyxy(boxes: np.ndarray) -> np.ndarray:
        """Convert bounding boxes from xywh to xyxy format."""
        boxes_copy = boxes.copy()
        boxes_copy[:, 0] = boxes[:, 0] - boxes[:, 2] / 2
        boxes_copy[:, 1] = boxes[:, 1] - boxes[:, 3] / 2
        boxes_copy[:, 2] = boxes[:, 0] + boxes[:, 2] / 2
        boxes_copy[:, 3] = boxes[:, 1] + boxes[:, 3] / 2
        return boxes_copy

    @staticmethod
    def _apply_nms(boxes, confidences, class_ids, conf_thres, iou_thres):
        """Apply Non-Max Suppression (NMS) to boxes
        to remove duplicate or overlapping bounding boxes for the same object."""
        if len(boxes) == 0:
            return np.array([], dtype=np.int32)

        keep_idxs = []
        unique_classes = np.unique(class_ids)

        for cls in unique_classes:
            cls_mask = class_ids == cls
            cls_indices = np.flatnonzero(cls_mask)
            cls_boxes = boxes[cls_mask]
            cls_scores = confidences[cls_mask]

            try:
                keep = cv2.dnn.NMSBoxes(
                    cls_boxes.tolist(),
                    cls_scores.tolist(),
                    conf_thres,
                    iou_thres,
                )

                if len(keep) > 0:
                    keep_flat = np.array(keep).flatten()
                    keep_idxs.extend(cls_indices[keep_flat])
            except Exception as e:
                logger.warning(f"NMS failed for class {cls}: {e}")
                continue

        return np.array(keep_idxs, dtype=np.int32)

    @staticmethod
    def _to_object_detections(boxes, confidences, class_ids):
        """Convert raw output to list of ObjectDetection."""
        return [
            ObjectDetection(
                bbox=boxes[i].tolist(),
                conf=float(confidences[i]),
                class_id=int(class_ids[i]),
            )
            for i in range(len(boxes))
        ]

    @staticmethod
    def _validate_model_path(model_path: Path) -> None:
        """Validate that model path exists and is readable."""
        if not isinstance(model_path, Path):
            try:
                model_path = Path(model_path)
            except Exception as e:
                raise ValueError(f"Invalid model path type: {type(model_path)}") from e

        if not model_path.exists():
            raise ValueError(f"Model file does not exist: {model_path}")

        if not model_path.is_file():
            raise ValueError(f"Model path is not a file: {model_path}")

        if model_path.suffix.lower() != ".onnx":
            logger.warning(f"Model file extension is not .onnx: {model_path.suffix}")

        if not os.access(model_path, os.R_OK):
            raise ValueError(f"Model file is not readable: {model_path}")

    def _validate_model_input(self) -> None:
        """Validate model input shape and type."""
        if self._closed or self.session is None:
            return

        try:
            input_shape = self.session.get_inputs()[0].shape
            input_type = self.session.get_inputs()[0].type

            logger.info(f"Model input shape: {input_shape}, type: {input_type}")

            # Expected shape: [batch, channels, height, width]
            if len(input_shape) != 4:
                logger.warning(f"Unexpected input shape rank: {len(input_shape)}")

            if isinstance(input_shape[1], int) and input_shape[1] != 3:
                logger.warning(f"Expected 3 channels (RGB), got: {input_shape[1]}")

        except Exception as e:
            logger.error(f"Failed to validate model input: {e}")


def create_object_detector(implementation: type[ObjectDetector]) -> ObjectDetector:
    """
    Factory method to create a object detector.
    """
    return implementation()
