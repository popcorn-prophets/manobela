import logging
import math
from typing import Any, Dict, Optional, Sequence, Tuple

from app.services.metrics.base_metric import BaseMetric
from app.services.smoother import Smoother

Point2D = Sequence
Landmarks = Sequence[Point2D]

def _dist(p1: Sequence[float], p2: Sequence[float]) -> float:
    return math.hypot(p1[0] - p2[0], p1[1] - p2[1])


class YawnMetric(BaseMetric):
    """
    Yawn detection metric using Mouth Aspect Ratio (MAR).
    Tracks sustained mouth opening to infer yawns.
    """

    DEFAULT_MAR_THRESHOLD = 0.6
    DEFAULT_MIN_DURATION_FRAMES = 15
    DEFAULT_SMOOTHING_ALPHA = 0.3

    REQUIRED_INDICES: Tuple[int, int, int, int] = (13, 14, 61, 291)

    def __init__(

        self,
        mar_threshold: float = DEFAULT_MAR_THRESHOLD,
        min_duration_frames: int = DEFAULT_MIN_DURATION_FRAMES,
        smoothing_alpha: float = DEFAULT_SMOOTHING_ALPHA,

        # Hysteresis: close threshold could be lower than open threshold
        mar_close_threshold: Optional[float] = None,
    ):
        """
        Args:
            mar_threshold: MAR value above which mouth is considered open.
            min_duration_frames: Frames MAR must stay high to count as yawn.
            smoothing_alpha: EMA smoothing for MAR.
        """
        if mar_threshold <= 0:
            raise ValueError("mar_threshold must be positive.")
        if min_duration_frames <= 0:
            raise ValueError("min_duration_frames must be positive.")
        if not 0 <= smoothing_alpha <= 1:
            raise ValueError(f"smoothing_alpha must be between 0 and 1, got {smoothing_alpha}")



        self.mar_threshold = mar_threshold

        # mar close threshold with default hysteresis
        self.mar_close_threshold = (
            mar_close_threshold
            if mar_close_threshold is not None
            else mar_threshold * 1.1
        )

        self.min_duration_frames = min_duration_frames
        self.smoother = Smoother(alpha=smoothing_alpha)

        if self.mar_close_threshold < mar_threshold:
            logging.warning(
                f"mar_close_threshold {self.mar_close_threshold} is less than "
                f"mar_threshold {mar_threshold}. This may cause rapid state changes."
            )

        self._open_counter = 0
        self._yawn_active = False


    # May Integrate mar.py in utils
    def _compute_mar(
        self, landmarks: Sequence[Sequence[float]]
    ) -> Optional[float]:
         # Validate we can index required landmarks
        max_idx = max(self.REQUIRED_INDICES)
        if len(landmarks) <= max_idx:
            return None


        top = landmarks[13]
        bottom = landmarks[14]
        left = landmarks[61]
        right = landmarks[291]

        # Validate each point has x,y
        if any(len(p) < 2 for p in (top, bottom, left, right)):
            return None

        horizontal = _dist(left, right)
        if horizontal <= 1e-9:
            return None

        vertical = _dist(top, bottom)
        return vertical / horizontal

    def update(self, frame_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        landmarks = frame_data.get("landmarks")

        if not landmarks:
            # Do NOT reset state on transient landmark dropouts
            # Preserve yawn progress and active state
            return {
                "mar": None,
                "yawning": self._yawn_active, # Preserved state
                "yawn_progress": min(
                    self._open_counter / self.min_duration_frames,
                    1.0,
                ),
            }

        mar = self._compute_mar(landmarks)
        smoothed = self.smoother.update([mar] if mar is not None else None)

        if smoothed is None:
            return {
                "mar": None,
                "yawning": self._yawn_active,
                "yawn_progress": min(
                    self._open_counter / self.min_duration_frames,
                    1.0,
                ),
            }

        mar_value = smoothed[0]

        if mar_value > self.mar_threshold:
            self._open_counter += 1
        else:
            self._open_counter = 0
            self._yawn_active = False

        if self._open_counter >= self.min_duration_frames:
            self._yawn_active = True

        return {
            "mar": mar_value,
            "yawning": self._yawn_active,
            "yawn_progress": min(
                self._open_counter / self.min_duration_frames,
                1.0,
            ),
        }

    def reset(self):
        self.smoother.reset()
        self._open_counter = 0
        self._yawn_active = False
