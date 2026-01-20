import logging
from collections import deque
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
    yaw_sustained: float
    pitch_sustained: float
    roll_sustained: float


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

    # Rolling window for sustained deviation
    DEFAULT_WINDOW_SEC = 5

    def __init__(
        self,
        yaw_threshold: float = DEFAULT_YAW_THRESHOLD,
        pitch_threshold: float = DEFAULT_PITCH_THRESHOLD,
        roll_threshold: float = DEFAULT_ROLL_THRESHOLD,
        window_sec: int = DEFAULT_WINDOW_SEC,
    ):
        """
        Args:
            yaw_threshold: Yaw angle (degrees) beyond which alert is triggered.
                          Positive = turning right, negative = turning left.
            pitch_threshold: Pitch angle (degrees) beyond which alert is triggered.
                            Positive = looking up, negative = looking down.
            roll_threshold: Roll angle (degrees) beyond which alert is triggered.
                            Positive = clockwise tilt, negative = counterclockwise tilt.
            window_sec: Rolling window duration for sustained deviation detection.
        """

        self.yaw_threshold = yaw_threshold
        self.pitch_threshold = pitch_threshold
        self.roll_threshold = roll_threshold

        # Convert seconds to frames
        fps = getattr(settings, "target_fps", 30)  # Provide a sensible default
        if not isinstance(fps, (int, float)) or fps <= 0:
            fps = 30
            logger.warning("Invalid target_fps, defaulting to %s", fps)

        self.window_size = max(1, int(window_sec * fps))

        self.yaw_history: deque[bool] = deque(maxlen=self.window_size)
        self.pitch_history: deque[bool] = deque(maxlen=self.window_size)
        self.roll_history: deque[bool] = deque(maxlen=self.window_size)

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
                "yaw_sustained": self._sustained_ratio(self.yaw_history),
                "pitch_sustained": self._sustained_ratio(self.pitch_history),
                "roll_sustained": self._sustained_ratio(self.roll_history),
            }

        # Compute head pose angles
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
                "yaw_sustained": self._sustained_ratio(self.yaw_history),
                "pitch_sustained": self._sustained_ratio(self.pitch_history),
                "roll_sustained": self._sustained_ratio(self.roll_history),
            }

        # Check thresholds (absolute values for all angles)
        yaw_alert = abs(yaw) > self.yaw_threshold
        pitch_alert = abs(pitch) > self.pitch_threshold
        roll_alert = abs(roll) > self.roll_threshold

        # Update history
        self.yaw_history.append(yaw_alert)
        self.pitch_history.append(pitch_alert)
        self.roll_history.append(roll_alert)

        # Compute sustained deviation
        yaw_sustained = self._sustained_ratio(self.yaw_history)
        pitch_sustained = self._sustained_ratio(self.pitch_history)
        roll_sustained = self._sustained_ratio(self.roll_history)

        return {
            "yaw": yaw,
            "pitch": pitch,
            "roll": roll,
            "yaw_alert": yaw_alert,
            "pitch_alert": pitch_alert,
            "roll_alert": roll_alert,
            "yaw_sustained": yaw_sustained,
            "pitch_sustained": pitch_sustained,
            "roll_sustained": roll_sustained,
        }

    def reset(self):
        self.last_angles = None
        self.yaw_history.clear()
        self.pitch_history.clear()
        self.roll_history.clear()

    @staticmethod
    def _sustained_ratio(history: deque[bool]) -> float:
        return sum(history) / len(history) if history else 0.0
