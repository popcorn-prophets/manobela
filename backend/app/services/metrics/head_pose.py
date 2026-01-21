import logging
from typing import Optional

from app.core.config import settings
from app.services.metrics.base_metric import BaseMetric, MetricOutputBase
from app.services.metrics.frame_context import FrameContext
from app.services.metrics.utils.head_pose_2d import compute_head_pose_angles_2d

logger = logging.getLogger(__name__)


class HeadPoseMetricOutput(MetricOutputBase):
    yaw_alert: bool
    pitch_alert: bool
    roll_alert: bool
    yaw: Optional[float]
    pitch: Optional[float]
    roll: Optional[float]
    head_pose_sustained: float


class HeadPoseMetric(BaseMetric):
    """
    Head pose metric using yaw, pitch, and roll angles computed from 2D landmarks.
    Detects when head is turned away from forward-facing position.

    This implementation uses only 2D (x, y) landmarks.

    Note: Pitch is less accurate because only 2D landmarks are used.
    """

    # Default thresholds in degrees
    DEFAULT_YAW_THRESHOLD = 50.0
    DEFAULT_PITCH_THRESHOLD = 10.0
    DEFAULT_ROLL_THRESHOLD = 30.0

    DEFAULT_MIN_SUSTAINED_SEC = 0.5

    def __init__(
        self,
        yaw_threshold: float = DEFAULT_YAW_THRESHOLD,
        pitch_threshold: float = DEFAULT_PITCH_THRESHOLD,
        roll_threshold: float = DEFAULT_ROLL_THRESHOLD,
        min_sustained_sec: float = DEFAULT_MIN_SUSTAINED_SEC,
    ):
        """
        Args:
            yaw_threshold: Threshold for yaw deviation (angle in degrees).
            pitch_threshold: Threshold for pitch deviation (angle in degrees).
            roll_threshold: Threshold for roll deviation (angle in degrees).
            min_sustained_sec: Minimum duration in seconds to count as head pose (0-inf).
        """

        # Validate inputs
        if yaw_threshold < 0 or yaw_threshold > 180:
            raise ValueError("yaw_threshold must be between (0, 180).")
        if pitch_threshold < 0 or pitch_threshold > 180:
            raise ValueError("pitch_threshold must be between (0, 180).")
        if roll_threshold < 0 or roll_threshold > 180:
            raise ValueError("roll_threshold must be between (0, 180).")
        if min_sustained_sec <= 0:
            raise ValueError("min_sustained_sec must be positive.")

        self.yaw_threshold = yaw_threshold
        self.pitch_threshold = pitch_threshold
        self.roll_threshold = roll_threshold

        fps = getattr(settings, "target_fps", 30)
        self.min_sustained_frames = max(1, int(min_sustained_sec * fps))

        self.yaw_counter = 0
        self.pitch_counter = 0
        self.roll_counter = 0

        self.yaw_state = False
        self.pitch_state = False
        self.roll_state = False

    def update(self, context: FrameContext) -> HeadPoseMetricOutput:
        landmarks = context.face_landmarks
        if not landmarks:
            return {
                "yaw": None,
                "pitch": None,
                "roll": None,
                "yaw_alert": False,
                "pitch_alert": False,
                "roll_alert": False,
                "head_pose_sustained": self._calc_sustained(),
            }

        try:
            yaw, pitch, roll = compute_head_pose_angles_2d(landmarks)
        except (ValueError, IndexError, ZeroDivisionError) as e:
            logger.debug(f"Head pose computation failed: {e}")
            return {
                "yaw": None,
                "pitch": None,
                "roll": None,
                "yaw_alert": False,
                "pitch_alert": False,
                "roll_alert": False,
                "head_pose_sustained": self._calc_sustained(),
            }

        # Detect deviation
        yaw_deviation = abs(yaw) > self.yaw_threshold
        pitch_deviation = abs(pitch) > self.pitch_threshold
        roll_deviation = abs(roll) > self.roll_threshold

        # Debounce counters
        self.yaw_counter = self.yaw_counter + 1 if yaw_deviation else 0
        self.pitch_counter = self.pitch_counter + 1 if pitch_deviation else 0
        self.roll_counter = self.roll_counter + 1 if roll_deviation else 0

        # Update state only after sustained duration
        if self.yaw_counter >= self.min_sustained_frames:
            self.yaw_state = True
        if self.pitch_counter >= self.min_sustained_frames:
            self.pitch_state = True
        if self.roll_counter >= self.min_sustained_frames:
            self.roll_state = True

        # Reset state if back to normal
        if not yaw_deviation:
            self.yaw_state = False
        if not pitch_deviation:
            self.pitch_state = False
        if not roll_deviation:
            self.roll_state = False

        return {
            "yaw": yaw,
            "pitch": pitch,
            "roll": roll,
            "yaw_alert": self.yaw_state,
            "pitch_alert": self.pitch_state,
            "roll_alert": self.roll_state,
            "head_pose_sustained": self._calc_sustained(),
        }

    def reset(self):
        self.yaw_counter = 0
        self.pitch_counter = 0
        self.roll_counter = 0
        self.yaw_state = False
        self.pitch_state = False
        self.roll_state = False

    def _calc_sustained(self) -> float:
        return min(max(self.yaw_counter, self.pitch_counter, self.roll_counter) / self.min_sustained_frames, 1.0)
