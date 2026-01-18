import logging
from typing import Any, Dict

from app.services.metrics.base_metric import BaseMetric
from app.services.metrics.eye_closure import EyeClosureMetric
from app.services.metrics.yawn_detector import YawnMetric

logger = logging.getLogger(__name__)


class MetricManager:
    """
    Orchestrates multiple driver monitoring metrics per frame.
    """

    def __init__(self):
        # Register metrics here
        self.metrics: list[BaseMetric] = [
            EyeClosureMetric(),
            # Add more metrics here
            YawnMetric(),
        ]

    def update(self, frame_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Update all metrics with the current frame and return combined results.
        """
        results: Dict[str, Any] = {}
        for metric in self.metrics:
            try:
                res = metric.update(frame_data)
                if res:
                    results.update(res)
            except Exception as e:
                # Log individual metric errors but continue
                metric_name = type(metric).__name__
                logger.error("Metric '%s' update failed: %s", metric_name, e)
        return results

    def reset(self):
        """Reset all metrics."""
        for metric in self.metrics:
            metric.reset()
