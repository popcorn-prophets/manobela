from abc import ABC, abstractmethod
from typing import Any, Optional


class BaseMetric(ABC):
    """
    Abstract base class for all driver monitoring metrics.
    """

    @abstractmethod
    def update(self, frame_data: dict[str, Any]) -> Optional[dict[str, Any]]:
        """
        Update the metric with the latest frame data.

        Args:
            frame_data: Dictionary containing preprocessed information for this frame
                        e.g., {'landmarks': [...], 'timestamp': 'ISO string'}

        Returns:
            Dictionary of metric results or None if metric cannot be computed.
        """
        pass

    @abstractmethod
    def reset(self):
        """Reset metric state."""
        pass
