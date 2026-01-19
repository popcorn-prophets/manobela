import logging
from collections import deque
from typing import Any, Optional, Sequence

from app.core.config import settings
from app.services.face_landmarker import FaceLandmark2D
from app.services.metrics.base_metric import BaseMetric
from app.services.metrics.utils.ear import average_ear

logger = logging.getLogger(__name__)


class EyeClosureMetric(BaseMetric):
    """
    Eye closure metric using EAR per frame and PERCLOS over a rolling window.
    Thresholds and window size are configurable per instance.
    """

    DEFAULT_EAR_THRESHOLD = 0.20
    DEFAULT_PERCLOS_THRESHOLD = 0.4
    DEFAULT_WINDOW_SEC = 10

    def __init__(
        self,
        ear_threshold: float = DEFAULT_EAR_THRESHOLD,
        perclos_threshold: float = DEFAULT_PERCLOS_THRESHOLD,
        window_sec: int = DEFAULT_WINDOW_SEC,
    ):
        """
        Args:
            ear_threshold: EAR value below which eyes are considered closed.
            perclos_threshold: PERCLOS ratio above which alert is triggered.
            window_sec: Rolling window duration in seconds.
        """

        self.ear_threshold = ear_threshold
        self.perclos_threshold = perclos_threshold

        # Convert seconds to frames based on backend target FPS
        self.window_size = max(1, int(window_sec * settings.target_fps))

        self.last_value: Optional[float] = None
        self.eye_history: deque[bool] = deque(maxlen=self.window_size)

    def update(self, frame_data: dict[str, Any]) -> Optional[dict[str, Any]]:
        landmarks: Sequence[FaceLandmark2D] = frame_data.get("landmarks", [])
        if not landmarks:
            return None

        # Computer EAR
        try:
            ear_value = average_ear(landmarks)
        except (IndexError, ZeroDivisionError) as e:
            logger.debug(f"EAR computation failed: {e}")
            return None

        self.last_value = ear_value

        ear_alert = ear_value < self.ear_threshold
        self.eye_history.append(ear_alert)

        # Compute PERCLOS
        perclos = (
            sum(self.eye_history) / len(self.eye_history) if self.eye_history else 0.0
        )
        perclos_alert = perclos > self.perclos_threshold

        return {
            "ear_alert": ear_alert,
            "ear": ear_value,
            "perclos_alert": perclos_alert,
            "perclos": perclos,
        }

    def reset(self):
        self.last_value = None
        self.eye_history.clear()
