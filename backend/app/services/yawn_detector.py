import math
from typing import Dict, List, Optional

from app.services.face_landmarks import INNER_LIP, OUTER_LIP
from app.services.smoother import Smoother


def _dist(p1, p2) -> float:
    return math.hypot(p1[0] - p2[0], p1[1] - p2[1])


class YawnDetector:
    """
    Detects yawning using Mouth Aspect Ratio (MAR).

    Usage:
        detector = YawnDetector()
        result = detector.update(landmarks)
    """

    def __init__(
        self,
        mar_threshold: float = 0.6,
        min_duration_frames: int = 15,
        smoothing_alpha: float = 0.3,
    ):
        """
        Args:
            mar_threshold: MAR value above which mouth is considered open.
            min_duration_frames: Frames MAR must stay high to count as yawn.
            smoothing_alpha: EMA smoothing for MAR.
        """
        self.mar_threshold = mar_threshold
        self.min_duration_frames = min_duration_frames

        self.smoother = Smoother(alpha=smoothing_alpha)
        self._open_counter = 0
        self._yawn_active = False

    def compute_mar(self, landmarks: Dict[int, dict]) -> Optional[float]:
        """
        Compute MAR from essential landmarks.

        landmarks: { index: {"x": float, "y": float, "z": float? } }
        """
        try:
            # Vertical mouth opening (inner lips)
            top = landmarks[13]
            bottom = landmarks[14]

            # Mouth width (outer lips)
            left = landmarks[61]
            right = landmarks[291]

            vertical = _dist((top["x"], top["y"]), (bottom["x"], bottom["y"]))
            horizontal = _dist((left["x"], left["y"]), (right["x"], right["y"]))

            if horizontal == 0:
                return None

            return vertical / horizontal

        except KeyError:
            return None

    def update(self, landmarks: Optional[Dict[int, dict]]) -> dict:
        """
        Update yawning state.

        Returns:
            {
                "mar": float | None,
                "yawning": bool,
                "yawn_progress": float (0–1)
            }
        """
        if landmarks is None:
            self._open_counter = 0
            self._yawn_active = False
            return {
                "mar": None,
                "yawning": False,
                "yawn_progress": 0.0,
            }

        mar = self.compute_mar(landmarks)
        smoothed = self.smoother.update([mar] if mar is not None else None)

        if smoothed is None:
            return {
                "mar": None,
                "yawning": False,
                "yawn_progress": 0.0,
            }

        mar_value = smoothed[0]

        if mar_value > self.mar_threshold:
            self._open_counter += 1
        else:
            self._open_counter = 0
            self._yawn_active = False

        if self._open_counter >= self.min_duration_frames:
            self._yawn_active = True

        progress = min(
            self._open_counter / self.min_duration_frames,
            1.0,
        )

        return {
            "mar": mar_value,
            "yawning": self._yawn_active,
            "yawn_progress": progress,
        }
