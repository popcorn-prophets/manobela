import logging
from collections import deque
from typing import Optional

from app.core.config import settings
from app.services.metrics.base_metric import BaseMetric, MetricOutputBase
from app.services.metrics.frame_context import FrameContext
from app.services.metrics.utils.ear import average_ear
from app.services.smoother import ScalarSmoother

logger = logging.getLogger(__name__)


class EyeClosureMetricOutput(MetricOutputBase):
    ear: Optional[float]
    eye_closed: bool
    eye_closed_sustained: float
    perclos: Optional[float]
    perclos_alert: bool


class EyeClosureMetric(BaseMetric):
    """
    Eye closure metric using EAR per frame and PERCLOS over a rolling window.
    """

    DEFAULT_EAR_THRESHOLD = 0.15
    DEFAULT_EAR_HYSTERESIS_RATIO = 0.9
    DEFAULT_PERCLOS_THRESHOLD = 0.4
    DEFAULT_MIN_EYE_CLOSED_DURATION_SEC = 0.25
    DEFAULT_WINDOW_SEC = 10
    DEFAULT_SMOOTHER_ALPHA = 0.6

    def __init__(
        self,
        ear_threshold: float = DEFAULT_EAR_THRESHOLD,
        hysteresis_ratio: float = DEFAULT_EAR_HYSTERESIS_RATIO,
        perclos_threshold: float = DEFAULT_PERCLOS_THRESHOLD,
        min_eye_closed_duration_sec: float = DEFAULT_MIN_EYE_CLOSED_DURATION_SEC,
        window_sec: int = DEFAULT_WINDOW_SEC,
        smoother_alpha: float = DEFAULT_SMOOTHER_ALPHA,
    ):
        """
        Args:
            ear_threshold: EAR value below which eyes are considered closed (0-1).
            hysteresis_ratio: Ratio of close_threshold to open_threshold (0-1).
            perclos_threshold: PERCLOS ratio above which alert is triggered (0-1).
            min_eye_closed_duration_sec: Minimum duration in seconds to count as eye closed (0-inf).
            window_sec: Rolling window duration in seconds (0-inf).
            smoother_alpha: Smoother alpha for EAR smoothing (0-1).
        """

        # Validate inputs
        if ear_threshold < 0 or ear_threshold > 1:
            raise ValueError("ear_threshold must be between (0, 1).")
        if hysteresis_ratio < 0 or hysteresis_ratio > 1:
            raise ValueError("hysteresis_ratio must be between (0, 1).")
        if perclos_threshold < 0 or perclos_threshold > 1:
            raise ValueError("perclos_threshold must be between (0, 1).")
        if min_eye_closed_duration_sec <= 0:
            raise ValueError("min_eye_closed_duration_sec must be positive.")
        if window_sec <= 0:
            raise ValueError("window_sec must be positive.")

        self.ear_threshold_open = ear_threshold
        self.ear_threshold_close = ear_threshold * hysteresis_ratio
        self.perclos_threshold = perclos_threshold

        # Convert duration from seconds to frames based on backend target FPS
        self._min_eye_closed_duration_frames = max(
            1, int(min_eye_closed_duration_sec * settings.target_fps)
        )

        # Convert seconds to frames based on backend target FPS
        self.window_size = max(1, int(window_sec * settings.target_fps))

        self._eye_closed_duration_frames = 0
        self._eye_closed = False

        self.eye_history: deque[bool] = deque(maxlen=self.window_size)

        self.ear_smoother = ScalarSmoother(alpha=smoother_alpha, max_missing=3)

    def update(self, context: FrameContext) -> EyeClosureMetricOutput:
        landmarks = context.face_landmarks
        if not landmarks:
            perclos = self._perclos()
            return {
                "ear": None,
                "eye_closed": self._eye_closed,
                "eye_closed_sustained": self._calc_sustained(),
                "perclos": perclos,
                "perclos_alert": perclos >= self.perclos_threshold,
            }

        # Computer EAR
        try:
            raw_ear = average_ear(landmarks)
            ear_value = self.ear_smoother.update(raw_ear)
        except (IndexError, ZeroDivisionError) as e:
            logger.debug(f"EAR computation failed: {e}")
            perclos = self._perclos()
            return {
                "ear": None,
                "eye_closed": self._eye_closed,
                "eye_closed_sustained": self._calc_sustained(),
                "perclos": perclos,
                "perclos_alert": perclos >= self.perclos_threshold,
            }

        if ear_value is None:
            perclos = self._perclos()
            return {
                "eye_closed": self._eye_closed,
                "ear": None,
                "eye_closed_sustained": self._calc_sustained(),
                "perclos_alert": perclos >= self.perclos_threshold,
                "perclos": perclos,
            }

        if ear_value <= self.ear_threshold_close:
            self._eye_closed_duration_frames += 1
        elif ear_value >= self.ear_threshold_open:
            self._eye_closed_duration_frames = 0
            self._eye_closed = False

        if self._eye_closed_duration_frames >= self._min_eye_closed_duration_frames:
            self._eye_closed = True

        self.eye_history.append(ear_value <= self.ear_threshold_close)

        # Compute PERCLOS
        perclos = self._perclos()
        perclos_alert = perclos >= self.perclos_threshold

        return {
            "ear": ear_value,
            "eye_closed": self._eye_closed,
            "eye_closed_sustained": self._calc_sustained(),
            "perclos": perclos,
            "perclos_alert": perclos_alert,
        }

    def reset(self):
        self.ear_smoother.reset()
        self.eye_history.clear()

    def _perclos(self) -> float:
        return (
            sum(self.eye_history) / len(self.eye_history) if self.eye_history else 0.0
        )

    def _calc_sustained(self) -> float:
        return min(self._eye_closed_duration_frames / self._min_eye_closed_duration_frames, 1.0)
