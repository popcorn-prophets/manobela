import logging
import math
from typing import Any, Dict, Optional, Sequence, Tuple

from app.services.metrics.base_metric import BaseMetric
from app.services.smoother import Smoother
from app.services.metrics.utils.geometry import euclidean_dist
from app.services.metrics.utils.mar import _compute_mar

Point2D = Sequence
Landmarks = Sequence[Point2D]


class YawnMetric(BaseMetric):
    """
    Yawn detection metric using Mouth Aspect Ratio (MAR).
    Tracks sustained mouth opening to infer yawns.

    Thresholds:
      - open_threshold  (mar_threshold): when MAR >= this, we count "mouth open" frames.
      - close_threshold (mar_close_threshold): when MAR <= this, we reset and mark closed.

    Hysteresis band: (close_threshold, open_threshold)
      - If MAR is inside the band, we HOLD state (no counter increment / no reset).
        This prevents rapid toggling when MAR hovers around the threshold.

    State machine (conceptual):
      CLOSED:
        - MAR >= open_threshold  -> OPENING (counter starts/increments)
        - MAR in band            -> stay CLOSED
        - MAR <= close_threshold -> stay CLOSED

    OPENING (0 < counter < min_duration_frames):
        - MAR >= open_threshold  -> counter++
        - MAR in band            -> hold counter (stay OPENING)
        - MAR <= close_threshold -> CLOSED (counter=0, yawning=False)

    YAWNING (counter >= min_duration_frames):
        - yawning=True (latched) until MAR <= close_threshold, then reset to CLOSED/FALSE.
        - MAR in band            -> keep yawning=True (hold)
        - MAR >= open_threshold  -> continue counting (optional; we keep counter going)

    """
    # ----- DEFAULT CONFIG -----
    DEFAULT_MAR_THRESHOLD = 0.6
    DEFAULT_MIN_DURATION_FRAMES = 15
    DEFAULT_SMOOTHING_ALPHA = 0.3

    REQUIRED_INDICES: Tuple[int, int, int, int] = ( 13, # Upper lip center point
                                                    14, # Lower lip center point
                                                    61,# Left mouth corner
                                                    291 # Right mouth corner
                                                    )

    def __init__(

        self,
        mar_threshold: float = DEFAULT_MAR_THRESHOLD,
        min_duration_frames: int = DEFAULT_MIN_DURATION_FRAMES,
        smoothing_alpha: float = DEFAULT_SMOOTHING_ALPHA,
        hysteresis_ratio: float = 0.9,

        # Hysteresis: close threshold could be lower than open threshold
        mar_close_threshold: Optional[float] = None,
    ):
        """
        Args:
            mar_threshold: MAR value above which mouth is considered open.
            min_duration_frames: Frames MAR must stay high to count as yawn.
            smoothing_alpha: EMA smoothing for MAR.
            hysteresis_ratio: Ratio of close_threshold to open_threshold (0.0-1.0)
                Default 0.9 means close_threshold = 0.9 * open_threshold
        """

        # Explicit Validations:

        if mar_threshold <= 0:
            raise ValueError("mar_threshold must be positive.")

        if min_duration_frames <= 0:
            raise ValueError("min_duration_frames must be positive.")

        if not (0.0 <= smoothing_alpha <= 1.0):
            raise ValueError(f"smoothing_alpha must be between 0 and 1, got {smoothing_alpha}")


        if mar_close_threshold is None:
            # Ratio must be (0, 1) to insure close threshold < open threshold
            if not (0.0 < hysteresis_ratio < 1.0):
                raise ValueError(
                    f"hysteresis_ratio must be between (0, 1) when mar_close threshold is None got {hysteresis_ratio}"
                )
            else:
                if mar_close_threshold <= 0:
                    raise ValueError(f"mar_close_threshold must be positive, got {mar_close_threshold}")

        if mar_close_threshold >= mar_threshold:
            raise ValueError(
                f"mar_close_threshold {self.mar_close_threshold} must be"
                f"less than mar_threshold {self.mar_threshold} for hysteresis to work."
            )
        if mar_close_threshold is not None and mar_close_threshold >= mar_threshold: # validation for the relationship between thresholds
            raise ValueError("mar_close_threshold must be less than mar_threshold")


        # ----- STORE CONFIG -----
        self.mar_threshold = mar_threshold
        self.mar_close_threshold = mar_threshold * hysteresis_ratio #hysteresis default
        self.min_duration_frames = min_duration_frames
        self.smoother = Smoother(alpha=smoothing_alpha)

        # mar close threshold with default hysteresis
        # Default to 10% hysteresis buffer (close threshold = 90% of open threshold)
        # This creates a buffer zone that prevents rapid state toggling near thresholds
        self.mar_close_threshold = ( # TODO: Maybe change with hysteresis ratio
            mar_close_threshold
            if mar_close_threshold is not None
            else mar_threshold * 0.9
        )

        if self.mar_close_threshold < mar_threshold:
            logging.warning(
                f"mar_close_threshold {self.mar_close_threshold} is less than "
                f"mar_threshold {mar_threshold}. This may cause rapid state changes."
            )

        # ----- INTERNAL STATE -----
        self._open_counter = 0
        self._yawn_active = False

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

        mar = _compute_mar(self, landmarks)
        if mar is None:
            smoothed = None
        else:
            smoothed = self.smoother.update([mar])

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
        elif mar_value < self.mar_close_threshold:
            self._open_counter = 0
            self._yawn_active = False
        else:
            return None


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

        # Resetting progress after yawn completion
        if self._open_counter >= self.min_duration_frames:
            self._yawn_active = True
            self._open_counter = 0

        self.smoother.reset()
        self._open_counter = 0
        self._yawn_active = False
