from __future__ import annotations

import logging
from pathlib import Path

from mediapipe.tasks import python
from mediapipe.tasks.python import vision

logger = logging.getLogger(__name__)

# Path to the model file
PROJECT_ROOT = Path(__file__).resolve().parents[2]
MODEL_PATH = PROJECT_ROOT / "assets" / "models" / "face_landmarker.task"


def create_face_landmarker(model_path: Path = MODEL_PATH) -> "vision.FaceLandmarker":
    """
    Face Landmarker factory
    """
    try:
        base_options = python.BaseOptions(model_asset_path=str(model_path))
        options = vision.FaceLandmarkerOptions(
            base_options=base_options,
            running_mode=vision.RunningMode.VIDEO,
            num_faces=1,
            min_face_detection_confidence=0.3,
            min_face_presence_confidence=0.3,
            min_tracking_confidence=0.5,
        )
        face_landmarker = vision.FaceLandmarker.create_from_options(options)
        logger.info("Face Landmarker initialized successfully")
        return face_landmarker

    except Exception as e:
        logger.error(f"Failed to initialize Face Landmarker: {e}")
        raise RuntimeError("Face Landmarker initialization failed") from e
