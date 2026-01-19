from typing import Sequence

from app.services.face_landmarker import FaceLandmark2D
from app.services.metrics.utils.geometry import euclidean_dist

LEFT_EYE_INDICES = [33, 160, 158, 133, 153, 144]
RIGHT_EYE_INDICES = [362, 385, 387, 263, 373, 380]


def compute_ear(landmarks: Sequence[FaceLandmark2D], indices: list[int]) -> float:
    """
    Compute eye aspect ratio (EAR) for a given set of landmarks.

    Args:
        landmarks: List of landmarks as (x, y) tuples
        indices: Indices of landmarks to use for computing EAR

    Returns:
        EAR value between 0 and 1
    """
    if len(landmarks) <= max(indices):
        return 0.0
    p1, p2, p3 = landmarks[indices[0]], landmarks[indices[1]], landmarks[indices[2]]
    p4, p5, p6 = landmarks[indices[3]], landmarks[indices[4]], landmarks[indices[5]]
    A = euclidean_dist(p2, p6)
    B = euclidean_dist(p3, p5)
    C = euclidean_dist(p1, p4)
    return (A + B) / (2.0 * C) if C > 0 else 0.0


def average_ear(
    landmarks: Sequence[FaceLandmark2D],
    left_eye_indices: list[int] = LEFT_EYE_INDICES,
    right_eye_indices: list[int] = RIGHT_EYE_INDICES,
) -> float:
    """
    Compute average EAR for a given set of landmarks.

    Args:
        landmarks: List of landmarks as (x, y) tuples
        left_eye_indices: Indices of left eye landmarks.
        right_eye_indices: Indices of right eye landmarks

    Returns:
        Average EAR value between 0 and 1
    """
    left_ear = compute_ear(landmarks, left_eye_indices)
    right_ear = compute_ear(landmarks, right_eye_indices)
    return (left_ear + right_ear) / 2.0
