from pydantic import BaseModel

from app.services.metrics.metric_manager import MetricsOutput
from app.services.object_detector import ObjectDetection


class Resolution(BaseModel):
    width: int
    height: int


class VideoFrameResult(BaseModel):
    """
    Data returned for each processed video frame.
    """
    timestamp: str
    face_landmarks: list[float] | None = None
    object_detections: list[ObjectDetection] | None = None
    metrics: MetricsOutput | None = None


class VideoMetadata(BaseModel):
    """
    Metadata about the processed video.
    """
    duration_sec: float
    total_frames_processed: int
    fps: int
    resolution: Resolution


class VideoProcessingResponse(BaseModel):
    """
    Response model for video processing results.
    """
    video_metadata: VideoMetadata
    frames: list[VideoFrameResult] | None = None
