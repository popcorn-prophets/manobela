import logging
import os
from pathlib import Path

import cv2
import numpy as np
import onnxruntime as ort

from app.models.inference import ObjectDetection
from app.services.utils.image_utils import letterbox

logger = logging.getLogger(__name__)

# Path to the model file
PROJECT_ROOT = Path(__file__).resolve().parents[2]
MODEL_PATH = PROJECT_ROOT / "assets" / "models" / "yolov8n.onnx"

# Essential classes to filter out from object detections
ESSENTIAL_CLASSES: list[int] = [67]


class ObjectDetector:
    """
    Object detector using YOLOv8 ONNX model.
    """

    def __init__(self, model_path: Path, input_size: int = 640):
        """
        Initialize object detector.
        """
        self.input_size = input_size

        sess_opts = ort.SessionOptions()
        sess_opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
        sess_opts.intra_op_num_threads = max(1, (os.cpu_count() or 2) // 2)

        self.session = ort.InferenceSession(
            str(model_path),
            sess_options=sess_opts,
            providers=["CPUExecutionProvider"],
        )

        self.input_name = self.session.get_inputs()[0].name

    def detect(
        self,
        frame: np.ndarray,
        normalize: bool = True,
        conf_threshold: float = 0.3,
        iou_threshold: float = 0.5,
    ) -> list[ObjectDetection]:
        """
        Detect objects in a frame.

        Args:
            frame: RGB frame to detect objects in.
            normalize: Whether to normalize bounding boxes to 0-1 range.
            conf_threshold: Confidence threshold for object detection.
            iou_threshold: Intersection over union threshold for object detection.

        Returns:
            List of detected objects.
        """
        img, ratio, pad = letterbox(frame, self.input_size)

        tensor = self._preprocess(img)

        outputs = self.session.run(None, {self.input_name: tensor})

        results = self._postprocess(
            np.asarray(outputs[0]),
            frame.shape[:2],
            ratio,
            pad,
            conf_threshold,
            iou_threshold,
            normalize,
        )

        return results

    @staticmethod
    def _preprocess(img: np.ndarray) -> np.ndarray:
        """
        Preprocess a BGR image for ONNX YOLOv8 inference:
        """
        img = img[:, :, ::-1]  # BGR -> RGB
        img = img.transpose(2, 0, 1)  # HWC -> NCHW
        img = np.ascontiguousarray(img, dtype=np.float32) / 255.0  # Normalize to [0, 1]
        return img[None]  # Add batch dimension

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
        output = np.squeeze(output).T
        boxes = output[:, :4]
        scores = output[:, 4:]

        class_ids = scores.argmax(axis=1)
        confidences = scores[np.arange(scores.shape[0]), class_ids]

        # Filter by confidence & essential classes
        boxes, confidences, class_ids = ObjectDetector._filter_confidence_and_classes(
            boxes, confidences, class_ids, conf_thres
        )
        if boxes.size == 0:
            return []

        # Convert xywh -> xyxy
        boxes = ObjectDetector._xywh_to_xyxy(boxes)

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
        keep_idxs = ObjectDetector._apply_nms(
            boxes, confidences, class_ids, conf_thres, iou_thres
        )
        boxes = boxes[keep_idxs]
        confidences = confidences[keep_idxs]
        class_ids = class_ids[keep_idxs]

        # Convert to ObjectDetection
        return ObjectDetector._to_object_detections(boxes, confidences, class_ids)

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
        boxes[:, 0] -= boxes[:, 2] / 2
        boxes[:, 1] -= boxes[:, 3] / 2
        boxes[:, 2] += boxes[:, 0]
        boxes[:, 3] += boxes[:, 1]
        return boxes

    @staticmethod
    def _apply_nms(boxes, confidences, class_ids, conf_thres, iou_thres):
        """Apply Non-Max Suppression (NMS) to boxes
        to remove duplicate or overlapping bounding boxes for the same object."""
        keep_idxs = []
        for cls in np.unique(class_ids):
            idxs = np.where(class_ids == cls)[0]
            cls_boxes = boxes[idxs]
            cls_scores = confidences[idxs]

            keep = cv2.dnn.NMSBoxes(
                cls_boxes.tolist(),
                cls_scores.tolist(),
                conf_thres,
                iou_thres,
            )

            if len(keep) > 0:
                keep_idxs.extend(idxs[np.array(keep).flatten()])

        return np.array(keep_idxs)

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


def create_object_detector(model_path: Path = MODEL_PATH) -> ObjectDetector:
    """
    Object Detector factory.
    """
    try:
        detector = ObjectDetector(model_path)
        logger.info("Object Detector initialized")
        return detector
    except Exception:
        logger.exception("Object Detector initialization failed")
        raise RuntimeError("Object Detector initialization failed")
