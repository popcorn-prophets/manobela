import logging
from typing import Optional

from app.core.config import settings
from app.services.metrics.base_metric import BaseMetric, MetricOutputBase
from app.services.metrics.frame_context import FrameContext
from app.services.metrics.utils.mar import compute_mar
from app.services.smoother import ScalarSmoother

logger = logging.getLogger(__name__)


class YawnMetricOutput(MetricOutputBase):
    mar: Optional[float]
    yawning: bool
    yawn_sustained: float
    yawn_count: int


class YawnMetric(BaseMetric):
    """
    Yawn detection metric using Mouth Aspect Ratio (MAR).
    """

    DEFAULT_MAR_THRESHOLD = 0.6
    DEFAULT_HYSTERESIS_RATIO = 0.9
    DEFAULT_MIN_YAWN_DURATION_SEC = 0.5
    DEFAULT_SMOOTHER_ALPHA = 0.7

    def __init__(
        self,
        mar_threshold: float = DEFAULT_MAR_THRESHOLD,
        hysteresis_ratio: float = DEFAULT_HYSTERESIS_RATIO,
        min_yawn_duration_sec: float = DEFAULT_MIN_YAWN_DURATION_SEC,
        smoother_alpha: float = DEFAULT_SMOOTHER_ALPHA,
    ):
        """
        Args:
            mar_threshold: MAR value above which mouth is considered open (0-1).
            hysteresis_ratio: Ratio of close_threshold to open_threshold (0-1).
            min_yawn_duration_sec: Minimum duration in seconds to count as yawn (0-inf).
            smoother_alpha: Smoother alpha for MAR smoothing (0-1).
        """

        # Validate inputs
        if mar_threshold < 0 or mar_threshold > 1:
            raise ValueError("mar_threshold must be between (0, 1).")
        if hysteresis_ratio < 0 or hysteresis_ratio > 1:
            raise ValueError("hysteresis_ratio must be between (0, 1).")
        if min_yawn_duration_sec <= 0:
            raise ValueError("min_yawn_duration_sec must be positive.")

        self._frames_processed = 0

        self._mar_threshold_open = mar_threshold
        self._mar_threshold_close = mar_threshold * hysteresis_ratio

        # Convert duration from seconds to frames based on target FPS
        self._min_yawn_duration_frames = max(
            1, int(min_yawn_duration_sec * settings.target_fps)
        )

        # State tracking
        self._yawn_duration_frames = 0
        self._yawn_active = False

        # Event count
        self._yawn_events = 0

        self.mar_smoother = ScalarSmoother(alpha=smoother_alpha, max_missing=3)

    def update(self, context: FrameContext) -> YawnMetricOutput:
        self._frames_processed += 1

        landmarks = context.face_landmarks

        # If no landmarks, keep state but don't count new yawns
        if not landmarks:
            return {
                "mar": None,
                "yawning": self._yawn_active,
                "yawn_sustained": self._calc_sustained(),
                "yawn_count": self._yawn_events,
            }

        try:
            raw_mar = compute_mar(landmarks)
            mar_value = self.mar_smoother.update(raw_mar)
        except (IndexError, ZeroDivisionError) as e:
            logger.debug(f"MAR computation failed: {e}")
            return {
                "mar": None,
                "yawning": self._yawn_active,
                "yawn_sustained": self._calc_sustained(),
                "yawn_count": self._yawn_events,
            }

        if mar_value is None:
            return {
                "mar": None,
                "yawning": self._yawn_active,
                "yawn_sustained": self._calc_sustained(),
                "yawn_count": self._yawn_events,
            }

        if mar_value >= self._mar_threshold_open:
            self._yawn_duration_frames += 1
        elif mar_value <= self._mar_threshold_close:
            # If yawning and now mouth closes, count 1 yawn event
            if self._yawn_active:
                self._yawn_events += 1

            self._yawn_duration_frames = 0
            self._yawn_active = False

        if self._yawn_duration_frames >= self._min_yawn_duration_frames:
            self._yawn_active = True

        return {
            "mar": mar_value,
            "yawning": self._yawn_active,
            "yawn_sustained": self._calc_sustained(),
            "yawn_count": self._yawn_events,
        }

    def reset(self):
        self._yawn_duration_frames = 0
        self._yawn_active = False
        self._yawn_events = 0
        self.mar_smoother.reset()

    def _calc_sustained(self) -> float:
        return min(self._yawn_duration_frames / self._min_yawn_duration_frames, 1.0)
