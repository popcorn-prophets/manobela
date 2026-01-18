from math import hypot


def euclidean_dist(a: tuple[float, float], b: tuple[float, float]) -> float:
    """
    Compute Euclidean distance between two points.

    Args:
        a: First point as (x, y) tuple
        b: Second point as (x, y) tuple

    Returns:
        Euclidean distance between points
    """
    return hypot(a[0] - b[0], a[1] - b[1])

def average_point(landmarks, indices: tuple[int, ...]) -> tuple[float, float]:
    xs = [landmarks[i][0] for i in indices]
    ys = [landmarks[i][1] for i in indices]
    return sum(xs) / len(xs), sum(ys) / len(ys)
