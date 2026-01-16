from app.services.metrics.base_metric import BaseMetric

PHONE_CLASS_ID = 67  # COCO


class PhoneUsageMetric(BaseMetric):
    """
    Metric to detect phone usage.
    It counts the number of consecutive frames with a detected phone.
    """

    def __init__(self, conf=0.3, min_consecutive_frames=3):
        """
        Args:
            conf: Confidence threshold for phone detection.
            min_consecutive_frames: Minimum number of consecutive frames with a detected phone.
        """
        self.conf = conf
        self.min_consecutive_frames = min_consecutive_frames
        self.counter = 0

    def update(self, frame_data):
        obj_detections = frame_data.get("object_detections", [])
        phone_detected = any(
            d.conf >= self.conf and (d.class_id == PHONE_CLASS_ID)
            for d in obj_detections
        )

        if phone_detected:
            self.counter += 1
        else:
            self.counter = 0

        return {
            "phone_usage": self.counter >= self.min_consecutive_frames,
            "phone_detected_frames": self.counter,
        }

    def reset(self):
        pass
