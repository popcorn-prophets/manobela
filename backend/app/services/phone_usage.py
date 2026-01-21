from app.core.config import settings
from app.services.metrics.base_metric import BaseMetric, MetricOutputBase
from app.services.metrics.frame_context import FrameContext

PHONE_CLASS_ID = 67  # COCO


class PhoneUsageMetricOutput(MetricOutputBase):
    phone_usage: bool
    phone_usage_sustained: float


class PhoneUsageMetric(BaseMetric):
    """
    Metric to detect phone usage.
    """

    DEFAULT_CONF = 0.3
    DEFAULT_MIN_USAGE_DURATION_SEC = 0.5

    def __init__(
        self,
        conf: float = DEFAULT_CONF,
        min_usage_duration_sec: float = DEFAULT_MIN_USAGE_DURATION_SEC,
    ):
        """
        Args:
            conf: Confidence threshold for phone detection (0-1).
            min_usage_duration_sec: Minimum duration in seconds to count as phone usage (0-inf).
        """

        # Validate inputs
        if conf < 0 or conf > 1:
            raise ValueError("conf must be between (0, 1).")
        if min_usage_duration_sec <= 0:
            raise ValueError("min_usage_duration_sec must be positive.")

        self.conf = conf

        fps = getattr(settings, "target_fps", 30)
        if not isinstance(fps, (int, float)) or fps <= 0:
            fps = 30

        self._min_usage_frames = max(1, int(min_usage_duration_sec * fps))

        self._usage_counter = 0
        self._phone_usage_active = False

    def update(self, context: FrameContext) -> PhoneUsageMetricOutput:
        obj_detections = context.object_detections

        phone_detected = any(
            d.conf >= self.conf and (d.class_id == PHONE_CLASS_ID)
            for d in obj_detections or []
        )

        if phone_detected:
            self._usage_counter += 1
        else:
            self._usage_counter = 0
            self._phone_usage_active = False

        if self._usage_counter >= self._min_usage_frames:
            self._phone_usage_active = True

        return {
            "phone_usage": self._phone_usage_active,
            "phone_usage_sustained": self._calc_sustained(),
        }

    def reset(self):
        self._usage_counter = 0
        self._phone_usage_active = False

    def _calc_sustained(self) -> float:
        return min(self._usage_counter / self._min_usage_frames, 1.0)
