from typing import Optional, Sequence, Tuple

from app.services.metrics.utils.geometry import euclidean_dist

UPPER_LIP = 13
LOWER_LIP = 14
LEFT_MOUTH_CORNER = 61
RIGHT_MOUTH_CORNER = 291

REQUIRED_INDICES: Tuple[int, int, int, int] = (
    UPPER_LIP,
    LOWER_LIP,
    LEFT_MOUTH_CORNER,
    RIGHT_MOUTH_CORNER,
)


@staticmethod
def compute_mar(landmarks: Sequence[Sequence[float]]) -> Optional[float]:
    # Validate we can index required landmarks
    max_idx = max(REQUIRED_INDICES)
    if len(landmarks) <= max_idx:
        return None

    top = landmarks[UPPER_LIP]
    bottom = landmarks[LOWER_LIP]
    left = landmarks[LEFT_MOUTH_CORNER]
    right = landmarks[RIGHT_MOUTH_CORNER]

    # Validate each point has x,y
    if any(len(p) < 2 for p in (top, bottom, left, right)):
        return None

    horizontal = euclidean_dist(left, right)
    if horizontal <= 1e-9:
        return None

    vertical = euclidean_dist(top, bottom)
    return vertical / horizontal
