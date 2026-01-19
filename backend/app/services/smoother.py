from typing import Optional, Sequence, Union

Numeric = Union[float, int]


class Smoother:
    """
    Exponential moving average smoother for numeric sequences.
    Can be used for any numeric time series.
    """

    def __init__(self, alpha: float = 0.3, max_missing: int = 5):
        """
        Args:
            alpha: Smoothing factor (0-1). Lower = smoother but more lag, higher = more responsive.
            max_missing: Maximum consecutive missing inputs to interpolate.
        """
        self.alpha = alpha
        self.max_missing = max_missing
        self.last_value: Optional[list[float]] = None  # Last smoothed value
        self.missing_count = 0  # Counter for consecutive missing inputs

    def update(self, new_value: Optional[Sequence[Numeric]]) -> Optional[list[float]]:
        """
        Update with a new numeric sequence and return smoothed result.

        Args:
            new_value: Current numeric sequence or None if missing.

        Returns:
            Smoothed numeric sequence or None if missing for too long.
        """
        if new_value is not None:
            # Value is present, update state
            self.missing_count = 0
            new_list = list(map(float, new_value))  # Ensure float internally
            if self.last_value is None:
                self.last_value = new_list
                return new_list

            smoothed = [
                self.alpha * new_list[i] + (1 - self.alpha) * self.last_value[i]
                for i in range(len(new_list))
            ]
            self.last_value = smoothed
            return smoothed

        else:
            # Value is missing, update counter
            self.missing_count += 1

            if self.missing_count <= self.max_missing:
                # Keep showing last known value
                return self.last_value
            else:
                # Value lost for too long, reset
                self.last_value = None
                return None

    def reset(self):
        """Reset the smoother state."""
        self.last_value = None
        self.missing_count = 0
