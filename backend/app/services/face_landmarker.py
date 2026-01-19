from __future__ import annotations

import logging
import threading
import time
from pathlib import Path
from typing import Protocol, Sequence, TypeVar

import cv2
import mediapipe as mp
import numpy as np
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

logger = logging.getLogger(__name__)

# Path to the model file
PROJECT_ROOT = Path(__file__).resolve().parents[2]
MODEL_PATH = PROJECT_ROOT / "assets" / "models" / "face_landmarker.task"

T = TypeVar("T")


FaceLandmark2D = tuple[float, float]


class FaceLandmarker(Protocol):
    """
    Abstraction for face landmark detection.
    """

    def detect(
        self,
        img: np.ndarray,
    ) -> Sequence[FaceLandmark2D]: ...

    def close(self) -> None: ...


class MediapipeFaceLandmarker(FaceLandmarker):
    """
    MediaPipe-based implementation of face landmark detection.
    """

    def __init__(
        self,
        model_path: Path = MODEL_PATH,
        *,
        num_faces: int = 1,
        min_face_detection_confidence: float = 0.3,
        min_face_presence_confidence: float = 0.3,
        min_tracking_confidence: float = 0.5,
    ) -> None:
        """
        Initialize face landmark detector.
        Args:
            model_path: Path to the ONNX model file.
            num_faces: Number of faces to detect.
            min_face_detection_confidence: Minimum confidence threshold for face detection.
            min_face_presence_confidence: Minimum confidence threshold for face presence.
            min_tracking_confidence: Minimum confidence threshold for face tracking.

        Raises:
            ValueError: If parameters are invalid.
            RuntimeError: If model loading fails.
        """
        self._lock = threading.Lock()

        try:
            base_options = python.BaseOptions(model_asset_path=str(model_path))

            options = vision.FaceLandmarkerOptions(
                base_options=base_options,
                running_mode=vision.RunningMode.VIDEO,
                num_faces=num_faces,
                min_face_detection_confidence=min_face_detection_confidence,
                min_face_presence_confidence=min_face_presence_confidence,
                min_tracking_confidence=min_tracking_confidence,
            )

            self._landmarker = vision.FaceLandmarker.create_from_options(options)
            logger.info("MediaPipe FaceLandmarker initialized")

        except Exception as exc:
            logger.exception("MediaPipe FaceLandmarker initialization failed")
            raise RuntimeError("FaceLandmarker initialization failed") from exc

    def detect(
        self,
        img: np.ndarray,
    ) -> Sequence[FaceLandmark2D]:
        """
        Detect face landmarks in an image.

        Args:
            img: BGR image to detect landmarks in.

        Returns:
            List of detected face landmarks.
        """
        rgb_frame = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(
            image_format=mp.ImageFormat.SRGB,
            data=rgb_frame,
        )

        timestamp_ms = int(time.time() * 1000)

        with self._lock:
            raw_result = self._landmarker.detect_for_video(
                mp_image,
                timestamp_ms,
            )

        if not raw_result.face_landmarks:
            return []

        first_face = raw_result.face_landmarks[0]

        face_landmarks: list[FaceLandmark2D] = [(lm.x, lm.y) for lm in first_face]

        return face_landmarks

    def close(self) -> None:
        """
        Release underlying resources.
        Safe to call multiple times.
        """
        with self._lock:
            try:
                self._landmarker.close()
                logger.info("MediaPipe FaceLandmarker closed")
            except Exception:
                logger.exception("Error while closing MediaPipe FaceLandmarker")


def get_essential_landmarks(
    face_landmarks: Sequence[FaceLandmark2D], indices: Sequence[int]
) -> list[float]:
    """
    Filter essential indices and flatten.
    """
    fl_len = len(face_landmarks)
    out = [0.0] * (len(indices) * 2)

    for i, idx in enumerate(indices):
        if idx < fl_len:
            x, y = face_landmarks[idx]
            out[2 * i] = x
            out[2 * i + 1] = y

    return out


def create_face_landmarker(
    implementation: type[FaceLandmarker],
) -> FaceLandmarker:
    """
    Factory method to create a face landmark detector.
    """
    return implementation()
