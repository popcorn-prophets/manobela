import logging
from typing import Any, Dict, List, Optional, Tuple, Union

from app.services.metrics.base_metric import BaseMetric
from app.services.metrics.utils.geometry import average_point
from app.services.metrics.utils.calc import in_range

logger = logging.getLogger(__name__)


class GazeMetric(BaseMetric):
    """
    Computes normalized gaze coordinates and detects off-road gaze.

    The metric calculates gaze direction based on iris position relative to
    eye corners and lids. Returns normalized coordinates (0.0-1.0) where:
    - (0.0, 0.0) = top-left
    - (1.0, 1.0) = bottom-right
    - (0.5, 0.5) = center gaze

    Coordinate System:
    - X-axis: 0.0 (left) to 1.0 (right)
    - Y-axis: 0.0 (top) to 1.0 (bottom)
    - Both eyes are normalized to the same coordinate system

    Methods:
        update: Computes gaze metrics from frame data
        reset: Resets any internal state (no-op here)
        _eye_gaze_ratio: Computes gaze ratio for one eye
        _average_point: Computes average point from given landmark indices
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

        # Ensure required keys exist if custom provided
        if landmark_indices is not None:
            missing =[k for k in self.LANDMARK_MAP.keys() if k not in landmark_indices]
            if missing:
                raise ValueError(f"Missing landmark indices for: {missing}")

        self.landmarks = dict(landmark_indices) if landmark_indices is not None else dict(self.LANDMARK_MAP)


    def update(self, frame_data: Dict[str, Any]) -> Optional[Dict[str, Union[float, bool, Dict]]]:

        # ---- Input Validation ----
        if not isinstance(frame_data, dict):
            logger.warning(f"Invalid frame data type: {type(frame_data)}")
            return None
        landmarks = frame_data.get("landmarks")

        if not isinstance(landmarks, list):
            return None

        if not landmarks:
            logger.debug("No landmarks in frame data")
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
                is_right_eye=False,
            )
            right_ratio = self._eye_gaze_ratio(
                landmarks,
                self.landmarks["RIGHT_EYE_CORNERS"],
                self.landmarks["RIGHT_EYE_LIDS"],
                self.landmarks["RIGHT_IRIS"],
                is_right_eye=True,
            )
        except (IndexError, ZeroDivisionError) as exc:
            logger.debug(f"Gaze computation failed: {exc}")
            return None

        # Occlusion Handling for missing eye data
        if left_ratio is None and right_ratio is None:
            return None

        # Handle right-eye normalization if needed

        left_x = left_y = right_x = right_y = None
        if left_ratio:
            left_x, left_y = left_ratio
        if right_ratio:
            right_x, right_y = right_ratio

        left_on_h = in_range(left_x, self.horizontal_range)
        right_on_h = in_range(right_x, self.horizontal_range)
        left_on_v = in_range(left_y, self.vertical_range)
        right_on_v = in_range(right_y, self.vertical_range)

        # Treat "missing eye" as neutral for AND by checking only present eyes
        horizontal_ok = all(v is True for v in [x for x in (left_on_h, right_on_h) if x is not None])
        vertical_ok = all(v is True for v in [y for y in (left_on_v, right_on_v) if y is not None])


        # Tuple assignment
        gaze_on_road = horizontal_ok and vertical_ok

        return {
            "gaze_on_road": gaze_on_road,
        }

    def reset(self) -> None:
        pass

    @staticmethod
    def _eye_gaze_ratio(
        landmarks: List[tuple[float, float]],
        corners: Tuple[int, int],
        lids: Tuple[int, int],
        iris_indices: Tuple[int, ...],
        is_right_eye: bool = False,
    ) -> Optional[Tuple[float, float]]:
        if max(corners + lids + iris_indices) >= len(landmarks):
            return None

        left_corner, right_corner = corners
        upper_lid, lower_lid = lids

        iris_center = average_point(landmarks, iris_indices)

        width = landmarks[right_corner][0] - landmarks[left_corner][0]
        height = landmarks[lower_lid][1] - landmarks[upper_lid][1]

        if width == 0 or height == 0:
            logger.debug("Zero width/height in eye landmarks")
            return None

        gaze_x = (iris_center[0] - landmarks[left_corner][0]) / width
        gaze_y = (iris_center[1] - landmarks[upper_lid][1]) / height

        # Normalize right eye horizontally in ratio variables
        if is_right_eye:
            gaze_x = 1.0 - gaze_x
            return gaze_x, gaze_y

        return gaze_x, gaze_y


