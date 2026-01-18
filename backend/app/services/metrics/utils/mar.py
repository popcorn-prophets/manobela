from typing import  Optional, Sequence

from app.services.metrics.utils.geometry import euclidean_dist

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

        # Validate coordinates are within reasonable bounds
        if any(not all(-1e6 < c < 1e6 for c in p) for p in (top, bottom, left, right)):
            return None

        # Validate each point has x,y
        if any(len(p) < 2 for p in (top, bottom, left, right)):
            return None

        horizontal = euclidean_dist(left, right)
        if horizontal <= 1e-9:
            return None

        vertical = euclidean_dist(top, bottom)
        return vertical / horizontal
