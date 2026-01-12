import logging
from pathlib import Path

from mediapipe.tasks import python
from mediapipe.tasks.python import vision

logger = logging.getLogger(__name__)

# Path to the model file
PROJECT_ROOT = Path(__file__).resolve().parents[2]
MODEL_PATH = PROJECT_ROOT / "assets" / "models" / "face_landmarker.task"


class FaceLandmarker:
    """
    Face landmarking model wrapper.
    """

    def __init__(self, model_path: Path = MODEL_PATH):
        """
        Initialize the face landmarker.

        Args:
            model_path: Path to the MediaPipe face landmarker model file.
        """
        self.model_path = model_path
        self._landmarker = None
        self._initialize()

    def _initialize(self) -> None:
        """Initialize the MediaPipe face landmarker."""
        try:
            base_options = python.BaseOptions(model_asset_path=str(self.model_path))

            options = vision.FaceLandmarkerOptions(
                base_options=base_options,
                running_mode=vision.RunningMode.VIDEO,
                num_faces=1,
                min_face_detection_confidence=0.3,
                min_face_presence_confidence=0.3,
                min_tracking_confidence=0.5,
            )

            self._landmarker = vision.FaceLandmarker.create_from_options(options)
            logger.info("Face Landmarker initialized successfully")

        except Exception as e:
            logger.error(f"Failed to initialize Face Landmarker: {e}")
            raise RuntimeError("Face Landmarker initialization failed") from e

    def close(self) -> None:
        """Clean up resources."""
        self._landmarker = None
        logger.info("Face Landmarker closed")

    def detect_for_video(self, image, timestamp_ms: int):
        """
        Detect facial landmarks in a video frame.

        Args:
            image: MediaPipe image object.
            timestamp_ms: Timestamp in milliseconds.

        Returns:
            Detection result containing face landmarks.
        """
        if self._landmarker is None:
            raise RuntimeError("Face Landmarker not initialized")
        return self._landmarker.detect_for_video(image, timestamp_ms)
