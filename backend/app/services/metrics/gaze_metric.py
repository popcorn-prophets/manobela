import logging
from typing import Any, Dict, Optional

from app.services.metrics.base_metric import BaseMetric

logger = logging.getLogger(__name__)


class GazeMetric(BaseMetric):
    """
    Gaze metric based on iris position relative to eye corners.

    The metric returns normalized gaze coordinates in eye space and flags when
    gaze is outside a configured center range.
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
        if not landmarks:
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

        if left_ratio is None or right_ratio is None:
            return None

        # Tupple assignment
        left_x, left_y = left_ratio
        right_x, right_y = right_ratio

        right_x = 1.0 - right_x  # Normalize view of right eye horizontally


        # We treat both eyes independently for on-road detection
        left_on_road = self.horizontal_range[0] <= left_x <= self.horizontal_range[1]
        right_on_road = self.horizontal_range[0] <= right_x <= self.horizontal_range[1]

        gaze_on_road = left_on_road and right_on_road

        on_road = (
            self.horizontal_range[0] <= left_on_road <= self.horizontal_range[1]
            and self.vertical_range[0] <= right_on_road <= self.vertical_range[1]
        )

        return {
            "gaze_x": left_on_road,
            "gaze_y": right_on_road,
            "gaze_on_road": on_road,
            "gaze_alert": not on_road,
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

        return gaze_x, gaze_y

    @staticmethod
    def _average_point(landmarks, indices: tuple[int, ...]) -> tuple[float, float]:
        xs = [landmarks[i][0] for i in indices]
        ys = [landmarks[i][1] for i in indices]
        return sum(xs) / len(xs), sum(ys) / len(ys)
