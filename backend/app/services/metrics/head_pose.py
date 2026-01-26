import logging
from typing import Optional

from app.core.config import settings
from app.services.metrics.base_metric import BaseMetric, MetricOutputBase
from app.services.metrics.frame_context import FrameContext
from app.services.metrics.utils.head_pose_2d import compute_head_pose_angles_2d

logger = logging.getLogger(__name__)


class HeadPoseMetricOutput(MetricOutputBase):
    """
    Output schema for the head pose metric.

    Attributes:
"""
  Output schema for the head pose metric.

  Attributes:
      yaw_alert: Whether the relative yaw angle deviates from threshold.
      pitch_alert: Whether the relative pitch angle deviates from threshold.
      roll_alert: Whether the relative roll angle deviates from threshold.
      yaw: Relative yaw angle (degrees, current minus baseline), if available.
      pitch: Relative pitch angle (degrees, current minus baseline), if available.
      roll: Relative roll angle (degrees, current minus baseline), if available.
      calibrating: Whether the baseline is currently being calibrated.
      head_pose_sustained: Fraction of minimum sustained duration elapsed.
  """
        pitch_alert: Whether the pitch angle deviates from the configured threshold.
        roll_alert: Whether the roll angle deviates from the configured threshold.
        yaw: Absolute yaw angle (in degrees) for the current frame, if available.
        pitch: Absolute pitch angle (in degrees) for the current frame, if available.
        roll: Absolute roll angle (in degrees) for the current frame, if available.
        yaw_rel: Relative yaw angle (in degrees) for the current frame, if available.
        pitch_rel: Relative pitch angle (in degrees) for the current frame, if available.
        roll_rel: Relative roll angle (in degrees) for the current frame, if available.
        calibrating: Whether the baseline is being calibrated for this session.
        head_pose_sustained: Fraction of the minimum sustained duration that has elapsed for the most deviant axis.
    """
    yaw_alert: bool
    pitch_alert: bool
    roll_alert: bool
    yaw: Optional[float]
    pitch: Optional[float]
    roll: Optional[float]
    yaw_rel: Optional[float]
    pitch_rel: Optional[float]
    roll_rel: Optional[float]
    calibrating: bool
    head_pose_sustained: float


class HeadPoseMetric(BaseMetric):
    """
    Head pose metric using yaw, pitch, and roll angles computed from 2D landmarks.
    Detects when head is turned away from forward-facing position.

    This implementation uses only 2D (x, y) landmarks and calibrates
    a neutral baseline so alerts are relative to the driver's posture
    rather than the phone camera angle.
    """

    # Default thresholds in degrees
    DEFAULT_YAW_THRESHOLD = 45.0
    DEFAULT_PITCH_THRESHOLD = 20.0
    DEFAULT_ROLL_THRESHOLD = 25.0

    DEFAULT_MIN_SUSTAINED_SEC = 0.5
    DEFAULT_CALIBRATION_SEC = 1.0
    DEFAULT_MISSING_RESET_SEC = 3.0

    def __init__(
        self,
        yaw_threshold: float = DEFAULT_YAW_THRESHOLD,
        pitch_threshold: float = DEFAULT_PITCH_THRESHOLD,
        roll_threshold: float = DEFAULT_ROLL_THRESHOLD,
        min_sustained_sec: float = DEFAULT_MIN_SUSTAINED_SEC,
        calibration_sec: float = DEFAULT_CALIBRATION_SEC,
        missing_reset_sec: float = DEFAULT_MISSING_RESET_SEC,
    ):
        """
        Args:
            yaw_threshold: Threshold for yaw deviation (angle in degrees).
            pitch_threshold: Threshold for pitch deviation (angle in degrees).
            roll_threshold: Threshold for roll deviation (angle in degrees).
            min_sustained_sec: Minimum duration in seconds to count as head pose (0-inf).
            calibration_sec: Seconds of neutral-looking frames to average for baseline.
            missing_reset_sec: Seconds without a face before forcing recalibration.
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
        if calibration_sec <= 0:
            raise ValueError("calibration_sec must be positive.")
        if missing_reset_sec <= 0:
            raise ValueError("missing_reset_sec must be positive.")

        self.yaw_threshold = yaw_threshold
        self.pitch_threshold = pitch_threshold
        self.roll_threshold = roll_threshold

        fps = getattr(settings, "target_fps", 15)
        self.min_sustained_frames = max(1, int(min_sustained_sec * fps))
        self.calibration_frames = max(1, int(calibration_sec * fps))
        self.missing_reset_frames = max(1, int(missing_reset_sec * fps))

        self.yaw_counter = 0
        self.pitch_counter = 0
        self.roll_counter = 0

        self.yaw_state = False
        self.pitch_state = False
        self.roll_state = False

        self._baseline_yaw: Optional[float] = None
        self._baseline_pitch: Optional[float] = None
        self._baseline_roll: Optional[float] = None
        self._baseline_sum_yaw = 0.0
        self._baseline_sum_pitch = 0.0
        self._baseline_sum_roll = 0.0
        self._baseline_count = 0
        self._missing_frames = 0

    def update(self, context: FrameContext) -> HeadPoseMetricOutput:
        landmarks = context.face_landmarks
        if not landmarks:
            self._missing_frames += 1
            if self._missing_frames >= self.missing_reset_frames:
                self.reset_baseline()
            return self._build_output(
                yaw=None,
                pitch=None,
                roll=None,
                yaw_rel=None,
                pitch_rel=None,
                roll_rel=None,
                calibrating=self._baseline_yaw is None,
            )

        self._missing_frames = 0

        try:
            yaw, pitch, roll = compute_head_pose_angles_2d(landmarks)
        except (ValueError, IndexError, ZeroDivisionError) as e:
            logger.debug(f"Head pose computation failed: {e}")
            return self._build_output(
                yaw=None,
                pitch=None,
                roll=None,
                yaw_rel=None,
                pitch_rel=None,
                roll_rel=None,
                calibrating=self._baseline_yaw is None,
            )

        if self._baseline_yaw is None:
            self._baseline_sum_yaw += yaw
            self._baseline_sum_pitch += pitch
            self._baseline_sum_roll += roll
            self._baseline_count += 1

            if self._baseline_count < self.calibration_frames:
                self._reset_alert_state()
                return self._build_output(
                    yaw=yaw,
                    pitch=pitch,
                    roll=roll,
                    yaw_rel=None,
                    pitch_rel=None,
                    roll_rel=None,
                    calibrating=True,
                )

            self._baseline_yaw = self._baseline_sum_yaw / self._baseline_count
            self._baseline_pitch = self._baseline_sum_pitch / self._baseline_count
            self._baseline_roll = self._baseline_sum_roll / self._baseline_count

        yaw_rel = yaw - self._baseline_yaw
        pitch_rel = pitch - self._baseline_pitch
        roll_rel = roll - self._baseline_roll

        # Detect deviation
        yaw_deviation = abs(yaw_rel) > self.yaw_threshold
        pitch_deviation = abs(pitch_rel) > self.pitch_threshold
        roll_deviation = abs(roll_rel) > self.roll_threshold

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

        return self._build_output(
            yaw=yaw,
            pitch=pitch,
            roll=roll,
            yaw_rel=yaw_rel,
            pitch_rel=pitch_rel,
            roll_rel=roll_rel,
            calibrating=False,
        )

    def reset(self):
        self.reset_baseline()

    def reset_baseline(self) -> None:
        self._reset_alert_state()
        self._baseline_yaw = None
        self._baseline_pitch = None
        self._baseline_roll = None
        self._baseline_sum_yaw = 0.0
        self._baseline_sum_pitch = 0.0
        self._baseline_sum_roll = 0.0
        self._baseline_count = 0
        self._missing_frames = 0

    def _reset_alert_state(self) -> None:
        self.yaw_counter = 0
        self.pitch_counter = 0
        self.roll_counter = 0
        self.yaw_state = False
        self.pitch_state = False
        self.roll_state = False

    def _build_output(
        self,
        yaw: Optional[float],
        pitch: Optional[float],
        roll: Optional[float],
        yaw_rel: Optional[float],
        pitch_rel: Optional[float],
        roll_rel: Optional[float],
        calibrating: bool,
    ) -> HeadPoseMetricOutput:
        return {
            "yaw": yaw,
            "pitch": pitch,
            "roll": roll,
            "yaw_alert": self.yaw_state,
            "pitch_alert": self.pitch_state,
            "roll_alert": self.roll_state,
            "yaw_rel": yaw_rel,
            "pitch_rel": pitch_rel,
            "roll_rel": roll_rel,
            "calibrating": calibrating,
            "head_pose_sustained": self._calc_sustained(),
        }

    def _calc_sustained(self) -> float:
        return min(max(self.yaw_counter, self.pitch_counter, self.roll_counter) / self.min_sustained_frames, 1.0)
