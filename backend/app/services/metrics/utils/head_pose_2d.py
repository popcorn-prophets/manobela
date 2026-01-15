"""
2D-only head pose estimation using geometric relationships between facial landmarks.
No 3D coordinates or camera calibration required.
"""
import math
from typing import List, Tuple

from app.services.metrics.utils.geometry import euclidean_dist

# Key landmark indices for head pose estimation (MediaPipe 468 landmarks)
NOSE_TIP = 4
CHIN = 175
FOREHEAD = 10
LEFT_EYE_OUTER = 33
RIGHT_EYE_OUTER = 263
LEFT_EYE_INNER = 133
RIGHT_EYE_INNER = 362
LEFT_MOUTH = 61
RIGHT_MOUTH = 291
NOSE_BRIDGE = 6
LEFT_FACE = 234  # Left cheek
RIGHT_FACE = 454  # Right cheek


def compute_roll_angle(landmarks: List[Tuple[float, float]]) -> float:
    """
    Compute roll (head tilt) angle from 2D landmarks.
    Uses the angle between eye corners.

    Args:
        landmarks: List of (x, y) tuples for all landmarks

    Returns:
        Roll angle in degrees (positive = clockwise tilt)
    """
    if len(landmarks) <= max(LEFT_EYE_OUTER, RIGHT_EYE_OUTER):
        return 0.0

    left_eye = landmarks[LEFT_EYE_OUTER]
    right_eye = landmarks[RIGHT_EYE_OUTER]

    # Compute angle of line between eyes
    dx = right_eye[0] - left_eye[0]
    dy = right_eye[1] - left_eye[1]

    # Convert to degrees (atan2 gives angle from horizontal)
    roll = math.degrees(math.atan2(dy, dx))

    return roll


def compute_yaw_angle(landmarks: List[Tuple[float, float]]) -> float:
    """
    Compute yaw (left/right turn) angle from 2D landmarks.
    Uses the ratio of distances from nose to face edges.

    When head turns left, right side of face is more visible (larger distance).
    When head turns right, left side of face is more visible (larger distance).

    Args:
        landmarks: List of (x, y) tuples for all landmarks

    Returns:
        Yaw angle in degrees (positive = turning right, negative = turning left)
    """
    if len(landmarks) <= max(NOSE_TIP, LEFT_FACE, RIGHT_FACE):
        return 0.0

    nose = landmarks[NOSE_TIP]
    left_face = landmarks[LEFT_FACE]
    right_face = landmarks[RIGHT_FACE]

    # Distance from nose to left and right face edges
    dist_left = euclidean_dist(nose, left_face)
    dist_right = euclidean_dist(nose, right_face)

    # When facing forward, distances should be roughly equal
    # When turning, one side becomes larger
    # Ratio approach: (right - left) / (right + left)
    total_dist = dist_left + dist_right
    if total_dist == 0:
        return 0.0

    # Normalized difference: ranges from -1 (fully left) to +1 (fully right)
    ratio = (dist_right - dist_left) / total_dist

    # Convert ratio to approximate angle (empirically calibrated)
    # This is a simplified model - in practice, you'd calibrate this
    # For MediaPipe landmarks, roughly: ratio of 0.3 ≈ 30 degrees
    yaw = ratio * 60.0  # Scale factor - adjust based on testing

    return yaw


def compute_pitch_angle(landmarks: List[Tuple[float, float]]) -> float:
    """
    Compute pitch (up/down tilt) angle from 2D landmarks.
    Uses the vertical position of nose relative to face center.

    When looking up, nose moves down relative to face center.
    When looking down, nose moves up relative to face center.

    Args:
        landmarks: List of (x, y) tuples for all landmarks

    Returns:
        Pitch angle in degrees (positive = looking up, negative = looking down)
    """
    if len(landmarks) <= max(NOSE_TIP, CHIN, FOREHEAD):
        return 0.0

    nose = landmarks[NOSE_TIP]
    chin = landmarks[CHIN]
    forehead = landmarks[FOREHEAD]

    # Face center (vertical midpoint)
    face_center_y = (chin[1] + forehead[1]) / 2.0
    face_height = abs(chin[1] - forehead[1])

    if face_height == 0:
        return 0.0

    # Normalized offset: how far is nose from face center?
    # Positive = nose below center (looking up)
    # Negative = nose above center (looking down)
    offset = (nose[1] - face_center_y) / face_height

    # Convert to approximate angle (empirically calibrated)
    # This is a simplified model - adjust based on testing
    pitch = offset * 40.0  # Scale factor - adjust based on testing

    return pitch


def compute_head_pose_angles_2d(
    landmarks: List[Tuple[float, float]]
) -> Tuple[float, float, float]:
    """
    Compute head pose angles (yaw, pitch, roll) from 2D landmarks only.

    This method uses geometric relationships and ratios between 2D landmark
    positions. No 3D coordinates or camera calibration required.

    Args:
        landmarks: List of (x, y) tuples for all 468 MediaPipe landmarks

    Returns:
        Tuple of (yaw, pitch, roll) in degrees

    Note:
        - Yaw: positive = turning right, negative = turning left
        - Pitch: positive = looking up, negative = looking down
        - Roll: positive = clockwise tilt, negative = counterclockwise tilt
    """
    if len(landmarks) < 468:
        raise ValueError(
            f"Insufficient landmarks for head pose estimation: got {len(landmarks)}, need 468"
        )

    yaw = compute_yaw_angle(landmarks)
    pitch = compute_pitch_angle(landmarks)
    roll = compute_roll_angle(landmarks)

    return (yaw, pitch, roll)

