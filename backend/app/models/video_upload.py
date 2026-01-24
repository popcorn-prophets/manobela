from pydantic import BaseModel

from app.services.metrics.metric_manager import MetricsOutput
from app.services.object_detector import ObjectDetection


class Resolution(BaseModel):
    width: int
    height: int


class VideoFrameResult(BaseModel):
    timestamp: str
    frame_number: int
    resolution: Resolution
    face_landmarks: list[float] | None = None
    object_detections: list[ObjectDetection] | None = None
    metrics: MetricsOutput | None = None
    thumbnail_base64: str | None = None


class VideoMetadata(BaseModel):
    duration_sec: float
    total_frames_processed: int
    fps: int
    resolution: Resolution


class VideoProcessingResponse(BaseModel):
    video_metadata: VideoMetadata
    frames: list[VideoFrameResult]
