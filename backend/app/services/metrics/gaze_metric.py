import logging
from typing import Any, Dict, Optional

from app.services.metrics.base_metric import BaseMetric

logger = logging.getLogger(__name__)


class GazeMetric(BaseMetric):
    """
    Computes normalized gaze coordinates and detects off-road gaze.

    The metric calculates gaze direction based on iris position relative to
    eye corners and lids. Returns normalized coordinates (0.0-1.0) in eye space
    where (0.5, 0.5) represents center gaze.

    Coordinate System:
    - X-axis: 0.0 (left) to 1.0 (right)
    - Y-axis: 0.0 (top) to 1.0 (bottom)
    - Both eyes are normalized to the same coordinate system

    Attributes:
        horizontal_range: Tuple defining valid horizontal gaze range
        vertical_range: Tuple defining valid vertical gaze range
        landmarks: Mapping of landmark indices for eye features
    Methods:
        update: Computes gaze metrics from frame data
        reset: Resets any internal state (no-op here)
        _eye_gaze_ratio: Computes gaze ratio for one eye
        _average_point: Computes average point from given landmark indices
        _normalize_right_eye: Normalizes right eye x-coordinate to left-eye system
    """

    DEFAULT_HORIZONTAL_RANGE = (0.35, 0.65)
    DEFAULT_VERTICAL_RANGE = (0.35, 0.65)

    LANDMARK_MAP = {
        "LEFT_EYE_CORNERS": (33, 133),
        "RIGHT_EYE_CORNERS": (362, 263),
        "LEFT_EYE_LIDS": (159, 145),
        "RIGHT_EYE_LIDS": (386, 374),
        "LEFT_IRIS": (468, 469, 470, 471, 472),
        "RIGHT_IRIS": (473, 474, 475, 476, 477)
    }
    def __init__(
        self,
        horizontal_range: tuple[float, float] = DEFAULT_HORIZONTAL_RANGE,
        vertical_range: tuple[float, float] = DEFAULT_VERTICAL_RANGE,
        landmark_indices: Dict[str, tuple[int, ...]] = None,
    ) -> None:
        self.horizontal_range = horizontal_range
        self.vertical_range = vertical_range
        self.landmarks = landmark_indices or self.LANDMARK_MAP

    def update(self, frame_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        landmarks = frame_data.get("landmarks")
        logger.debug("No landmarks in frame data")
        if not landmarks:
            return None

        if len(landmarks) <= max(self.LANDMARK_MAP["RIGHT_IRIS"]):
            logger.debug("Insufficient landmarks for gaze computation")
            return None

        try:
            left_ratio = self._eye_gaze_ratio(
                landmarks,
                self.landmarks["LEFT_EYE_CORNERS"],
                self.landmarks["LEFT_EYE_LIDS"],
                self.landmarks["LEFT_IRIS"],
            )
            right_ratio = self._eye_gaze_ratio(
                landmarks,
                self.landmarks["RIGHT_EYE_CORNERS"],
                self.landmarks["RIGHT_EYE_LIDS"],
                self.landmarks["RIGHT_IRIS"],
            )
        except (IndexError, ZeroDivisionError) as exc:
            logger.debug(f"Gaze computation failed: {exc}")
            return None

        # Occlusion Handling for missing eye data
        validRatios =[r for r in (left_ratio, right_ratio) if r is not None]
        if not validRatios:
            return None

        # Using the tuples in validRatios to compute average gaze
        avg_x = sum(r[0] for r in validRatios) / len(validRatios)
        avg_y = sum(r[1] for r in validRatios) / len(validRatios)

        # Handle right-eye normalization if needed
        if right_ratio and right_ratio in validRatios and len(validRatios) == 1:
            avg_x = self._normalize_right_eye(avg_x)  # Only normalize if right eye is the only valid one

        if left_ratio is None and right_ratio is None:
            confidence = 0.0  # Lower confidence if one eye is missing

        # Tuple assignment
        left_x, left_y = left_ratio
        right_x, right_y = right_ratio
        right_x = 1.0 - right_x  # Normalize view of right eye horizontally

        # We treat both eyes independently for on-road detection
        left_on_road = self.horizontal_range[0] <= left_x <= self.horizontal_range[1]
        right_on_road = self.horizontal_range[0] <= right_x <= self.horizontal_range[1]

        vertical_on_road = (
            self.vertical_range[0] <= left_y <= self.vertical_range[1]
            and self.vertical_range[0] <= right_y <= self.vertical_range[1]
        )
        gaze_on_road = left_on_road and right_on_road and vertical_on_road


        # Average gaze for debugging pruposes
        gaze_x =(left_x + right_x) / 2.0
        gaze_y = (left_y + right_y) / 2.0

        return {
            "gaze coordinates": {
                "gaze_x": gaze_x,
                "gaze_y": gaze_y,
            },
            "eye_details": { # This is for debugging purposes
                "left_eye": {"x": left_x, "y": left_y, "on_road": left_on_road},
                "right_eye": {"x": right_x, "y": right_y, "on_road": right_on_road},
            },
            "gaze_on_road": gaze_on_road,
            "gaze_alert": not gaze_on_road,
            "confidence":1.0 if left_ratio and right_ratio else 0.5, # Confidence is 1.0 if both eyes are valid, else 0.5
        }

    def reset(self) -> None:
        pass

    @staticmethod
    def _eye_gaze_ratio(
        landmarks,
        corners: tuple[int, int],
        lids: tuple[int, int],
        iris_indices: tuple[int, ...],
    ) -> Optional[tuple[float, float]]:
        if max(corners + lids + iris_indices) >= len(landmarks):
            return None

        left_corner, right_corner = corners
        upper_lid, lower_lid = lids

        iris_center = GazeMetric._average_point(landmarks, iris_indices)

        width = landmarks[right_corner][0] - landmarks[left_corner][0]
        height = landmarks[lower_lid][1] - landmarks[upper_lid][1]

        if width == 0 or height == 0:
            raise ZeroDivisionError("Eye width/height is zero")

        gaze_x = (iris_center[0] - landmarks[left_corner][0]) / width
        gaze_y = (iris_center[1] - landmarks[upper_lid][1]) / height

        # Normalize right eye horizontally in ratio variables
        if is_right_eye:
            gaze_x = 1.0 - gaze_x
            return gaze_x, gaze_y

        return gaze_x, gaze_y

    @staticmethod
    def _average_point(landmarks, indices: tuple[int, ...]) -> tuple[float, float]:
        xs = [landmarks[i][0] for i in indices]
        ys = [landmarks[i][1] for i in indices]
        return sum(xs) / len(xs), sum(ys) / len(ys)

    def _normalize_right_eye(self, gaze_x: float) -> float:
        # Normalize right eye x-coordinate to left-eye coordinate system
        return 1.0 - gaze_x
