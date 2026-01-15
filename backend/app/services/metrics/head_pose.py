"""""
Head pose metric using 2D landmarks only.
Estimates yaw, pitch, and roll angles using geometric relationships.
"""
import logging
from collections import deque
from typing import Any, Dict, List, Optional, Tuple

from app.core.config import settings
from app.services.metrics.base_metric import BaseMetric
from app.services.metrics.utils.head_pose_2d import compute_head_pose_angles_2d

logger = logging.getLogger(__name__)


class HeadPoseMetric(BaseMetric):
    """
    Head pose metric using yaw, pitch, and roll angles computed from 2D landmarks.
    Detects when head is turned away from forward-facing position.

    This implementation uses only 2D (x, y) landmarks - no 3D coordinates required.
    """

    # Default thresholds in degrees
    DEFAULT_YAW_THRESHOLD = 30.0  # Left/right turn
    DEFAULT_PITCH_THRESHOLD = 25.0  # Up/down tilt
    DEFAULT_ROLL_THRESHOLD = 20.0  # Head tilt

    DEFAULT_WINDOW_SEC = 5  # Rolling window for sustained deviation

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
        self.window_size = max(1, int(window_sec * settings.target_fps))

        # State tracking
        self.last_angles: Optional[Tuple[float, float, float]] = None
        self.yaw_history: deque[bool] = deque(maxlen=self.window_size)
        self.pitch_history: deque[bool] = deque(maxlen=self.window_size)
        self.roll_history: deque[bool] = deque(maxlen=self.window_size)

    def update(self, frame_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Update head pose metric with current frame data.

        Args:
            frame_data: Dictionary containing 'landmarks' key with
                       list of (x, y) tuples (2D landmarks).

        Returns:
            Dictionary with head pose angles and alerts, or None if insufficient data.
        """
        landmarks: Optional[List[Tuple[float, float]]] = frame_data.get("landmarks")

        if not landmarks:
            return None

        # Compute head pose angles from 2D landmarks
        try:
            yaw, pitch, roll = compute_head_pose_angles_2d(landmarks)
        except (ValueError, IndexError, ZeroDivisionError) as e:
            logger.debug(f"Head pose computation failed: {e}")
            return None

        # Update state
        self.last_angles = (yaw, pitch, roll)

        # Check thresholds (absolute values for all angles)
        yaw_alert = abs(yaw) > self.yaw_threshold
        pitch_alert = abs(pitch) > self.pitch_threshold
        roll_alert = abs(roll) > self.roll_threshold

        # Update history
        self.yaw_history.append(yaw_alert)
        self.pitch_history.append(pitch_alert)
        self.roll_history.append(roll_alert)

        # Compute sustained deviation (similar to PERCLOS in eye_closure)
        yaw_sustained = (
            sum(self.yaw_history) / len(self.yaw_history)
            if self.yaw_history else 0.0
        )
        pitch_sustained = (
            sum(self.pitch_history) / len(self.pitch_history)
            if self.pitch_history else 0.0
        )
        roll_sustained = (
            sum(self.roll_history) / len(self.roll_history)
            if self.roll_history else 0.0
        )

        # Overall alert if any axis exceeds threshold
        any_alert = yaw_alert or pitch_alert or roll_alert

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
            "head_pose_alert": any_alert,
        }

    def reset(self):
        """Reset metric state."""
        self.last_angles = None
        self.yaw_history.clear()
        self.pitch_history.clear()
        self.roll_history.clear()

""
