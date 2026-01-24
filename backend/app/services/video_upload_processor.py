import base64
import logging
from dataclasses import dataclass

import cv2

from app.models.video_upload import Resolution, VideoFrameResult, VideoMetadata
from app.services.face_landmarker import FaceLandmarker, get_essential_landmarks
from app.services.face_landmarks import ESSENTIAL_LANDMARKS
from app.services.metrics.frame_context import FrameContext
from app.services.metrics.metric_manager import MetricManager
from app.services.object_detector import ObjectDetector
from app.services.smoother import SequenceSmoother

logger = logging.getLogger(__name__)

MAX_WIDTH = 480
THUMBNAIL_JPEG_QUALITY = 70


@dataclass
class VideoProcessingResult:
    metadata: VideoMetadata
    frames: list[VideoFrameResult]


def format_timestamp(seconds: float) -> str:
    total_ms = int(seconds * 1000)
    ms = total_ms % 1000
    total_seconds = total_ms // 1000
    hours = total_seconds // 3600
    minutes = (total_seconds % 3600) // 60
    secs = total_seconds % 60
    return f"{hours:02d}:{minutes:02d}:{secs:02d}.{ms:03d}"


def encode_frame_thumbnail(frame) -> str | None:
    encode_params = [int(cv2.IMWRITE_JPEG_QUALITY), THUMBNAIL_JPEG_QUALITY]
    success, buffer = cv2.imencode(".jpg", frame, encode_params)
    if not success:
        return None
    return base64.b64encode(buffer.tobytes()).decode("ascii")


def process_uploaded_video(
    file_path: str,
    *,
    target_fps: int,
    max_duration_sec: float,
    face_landmarker: FaceLandmarker,
    object_detector: ObjectDetector,
) -> VideoProcessingResult:
    cap = cv2.VideoCapture(file_path)
    if not cap.isOpened():
        raise ValueError("Invalid video file")

    source_fps = cap.get(cv2.CAP_PROP_FPS) or 0.0
    source_frame_count = cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0.0
    source_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 0)
    source_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0)

    duration_sec = (
        source_frame_count / source_fps if source_frame_count > 0 and source_fps > 0 else 0.0
    )

    if duration_sec and duration_sec > max_duration_sec:
        raise OverflowError("Video duration exceeds limit")

    metric_manager = MetricManager()
    metric_manager.reset()
    smoother = SequenceSmoother(alpha=0.8, max_missing=5)

    frames: list[VideoFrameResult] = []
    frame_number = 0
    next_target_time = 0.0
    last_timestamp_sec = 0.0
    target_interval = 1.0 / max(1, target_fps)

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                break

            timestamp_ms = cap.get(cv2.CAP_PROP_POS_MSEC)
            timestamp_sec = (
                timestamp_ms / 1000.0
                if timestamp_ms and timestamp_ms > 0
                else (cap.get(cv2.CAP_PROP_POS_FRAMES) or 0.0)
                / source_fps
                if source_fps > 0
                else last_timestamp_sec + target_interval
            )

            last_timestamp_sec = max(last_timestamp_sec, timestamp_sec)

            if max_duration_sec and last_timestamp_sec > max_duration_sec:
                raise OverflowError("Video duration exceeds limit")

            if timestamp_sec + 1e-6 < next_target_time:
                continue

            next_target_time += target_interval
            frame_number += 1

            h, w = frame.shape[:2]
            if w > MAX_WIDTH:
                scale = MAX_WIDTH / w
                w, h = int(w * scale), int(h * scale)
                frame = cv2.resize(frame, (w, h))

            face_landmarks = face_landmarker.detect(frame)
            essential_landmarks = (
                get_essential_landmarks(face_landmarks, ESSENTIAL_LANDMARKS)
                if face_landmarks
                else None
            )
            smoothed_landmarks = smoother.update(essential_landmarks)

            object_detections = object_detector.detect(frame, normalize=True)

            frame_context = FrameContext(
                face_landmarks=face_landmarks, object_detections=object_detections
            )
            metrics = metric_manager.update(frame_context)
            has_alert = any(
                key.endswith("_alert") and isinstance(value, bool) and value
                for key, value in metrics.items()
            )
            thumbnail_base64 = (
                encode_frame_thumbnail(frame) if has_alert and smoothed_landmarks else None
            )

            frames.append(
                VideoFrameResult(
                    timestamp=format_timestamp(timestamp_sec),
                    frame_number=frame_number,
                    resolution=Resolution(width=w, height=h),
                    face_landmarks=smoothed_landmarks if face_landmarks else None,
                    object_detections=object_detections or None,
                    metrics=metrics,
                    thumbnail_base64=thumbnail_base64,
                )
            )

    except OverflowError:
        raise

    except Exception as exc:
        logger.warning("Video processing interrupted: %s", exc)

    finally:
        cap.release()

    if duration_sec <= 0:
        duration_sec = last_timestamp_sec

    duration_sec = max(duration_sec, 0.0)
    duration_sec = float(f"{duration_sec:.3f}")

    metadata = VideoMetadata(
        duration_sec=duration_sec,
        total_frames_processed=len(frames),
        fps=target_fps,
        resolution=Resolution(width=source_width, height=source_height),
    )

    return VideoProcessingResult(metadata=metadata, frames=frames)
