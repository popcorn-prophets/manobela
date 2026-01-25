import base64
import logging
from dataclasses import dataclass, field
from typing import Any

import cv2

from app.models.video_upload import (
    Resolution,
    VideoFrameAggregate,
    VideoFrameGroup,
    VideoFrameResult,
    VideoMetadata,
)
from app.services.face_landmarker import FaceLandmarker, get_essential_landmarks
from app.services.face_landmarks import ESSENTIAL_LANDMARKS
from app.services.metrics.frame_context import FrameContext
from app.services.metrics.metric_manager import MetricManager
from app.services.object_detector import ObjectDetection, ObjectDetector
from app.services.smoother import SequenceSmoother

logger = logging.getLogger(__name__)

MAX_WIDTH = 480
THUMBNAIL_JPEG_QUALITY = 70


@dataclass
class VideoProcessingResult:
    metadata: VideoMetadata
    groups: list[VideoFrameGroup]
    frames: list[VideoFrameResult] | None = None


@dataclass
class BucketAccumulator:
    bucket_index: int
    start_sec: float
    end_sec: float
    frame_count: int = 0
    resolution: Resolution | None = None
    landmarks_sum: list[float] | None = None
    landmarks_count: int = 0
    detections: dict[str, ObjectDetection] = field(default_factory=dict)
    metrics: list[dict[str, Any]] = field(default_factory=list)
    thumbnail_base64: str | None = None


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

def _is_numeric(value: Any) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def _is_numeric_array(value: Any) -> bool:
    return isinstance(value, list) and all(_is_numeric(item) for item in value)


def _aggregate_boolean(values: list[bool]) -> bool:
    if any(values):
        return True
    return values[-1] if values else False


def _aggregate_numeric_array(values: list[list[float]]) -> list[float] | None:
    if not values:
        return None
    length = len(values[0])
    totals = [0.0] * length
    count = 0
    for arr in values:
        if len(arr) != length:
            continue
        for index, value in enumerate(arr):
            totals[index] += float(value)
        count += 1
    if not count:
        return None
    return [value / count for value in totals]


def _aggregate_metrics_object(objects: list[dict[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    keys: set[str] = set()
    for obj in objects:
        keys.update(obj.keys())

    for key in keys:
        values = [obj[key] for obj in objects if key in obj and obj[key] is not None]
        if not values:
            continue

        if key.endswith("_alert"):
            bools = [value for value in values if isinstance(value, bool)]
            result[key] = _aggregate_boolean(bools) if bools else values[-1]
            continue

        if all(_is_numeric(value) for value in values):
            result[key] = sum(values) / len(values)
            continue

        if all(isinstance(value, bool) for value in values):
            result[key] = _aggregate_boolean(values)
            continue

        if all(_is_numeric_array(value) for value in values):
            arrays = [value for value in values if isinstance(value, list)]
            result[key] = _aggregate_numeric_array(arrays)
            continue

        if all(isinstance(value, dict) for value in values):
            objects_values = [value for value in values if isinstance(value, dict)]
            result[key] = _aggregate_metrics_object(objects_values)
            continue

        result[key] = values[-1]

    return result


def aggregate_metrics(metrics_list: list[dict[str, Any]]) -> dict[str, Any] | None:
    if not metrics_list:
        return None
    return _aggregate_metrics_object(metrics_list)

def _update_detections(
    unique: dict[str, ObjectDetection], detections: list[ObjectDetection]
) -> None:
    for detection in detections:
        bbox_key = ",".join(f"{value:.3f}" for value in detection.bbox)
        key = f"{detection.class_id}:{bbox_key}"
        existing = unique.get(key)
        if not existing or detection.conf > existing.conf:
            unique[key] = detection


def _finalize_bucket(bucket: BucketAccumulator) -> VideoFrameGroup:
    face_landmarks = None
    if bucket.landmarks_sum and bucket.landmarks_count:
        face_landmarks = [
            value / bucket.landmarks_count for value in bucket.landmarks_sum
        ]

    object_detections = list(bucket.detections.values()) or None
    metrics = aggregate_metrics(bucket.metrics)

    aggregate = VideoFrameAggregate(
        resolution=bucket.resolution,
        face_landmarks=face_landmarks,
        object_detections=object_detections,
        metrics=metrics,
        thumbnail_base64=bucket.thumbnail_base64,
    )

    return VideoFrameGroup(
        bucket_index=bucket.bucket_index,
        start_sec=bucket.start_sec,
        end_sec=bucket.end_sec,
        frame_count=bucket.frame_count,
        aggregate=aggregate,
    )


def process_uploaded_video(
    file_path: str,
    *,
    target_fps: int,
    max_duration_sec: float,
    group_interval_sec: float,
    face_landmarker: FaceLandmarker,
    object_detector: ObjectDetector,
    include_frames: bool = False,
) -> VideoProcessingResult:
    cap = cv2.VideoCapture(file_path)
    if not cap.isOpened():
        raise ValueError("Invalid video file")

    source_fps = cap.get(cv2.CAP_PROP_FPS) or 0.0
    source_frame_count = cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0.0
    source_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 0)
    source_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0)

    duration_sec = (
        source_frame_count / source_fps
        if source_frame_count > 0 and source_fps > 0
        else 0.0
    )

    if duration_sec and duration_sec > max_duration_sec:
        raise OverflowError("Video duration exceeds limit")

    metric_manager = MetricManager()
    metric_manager.reset()
    smoother = SequenceSmoother(alpha=0.8, max_missing=5)

    frames: list[VideoFrameResult] | None = [] if include_frames else None
    groups: list[VideoFrameGroup] = []
    current_bucket: BucketAccumulator | None = None

    frame_number = 0
    next_target_time = 0.0
    last_timestamp_sec = 0.0
    target_interval = 1.0 / max(1, target_fps)

    def flush_bucket():
        nonlocal current_bucket
        if current_bucket:
            groups.append(_finalize_bucket(current_bucket))
            current_bucket = None

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
            has_face = bool(face_landmarks)
            essential_landmarks = (
                get_essential_landmarks(face_landmarks, ESSENTIAL_LANDMARKS)
                if has_face
                else None
            )
            smoothed_landmarks = smoother.update(essential_landmarks)

            object_detections = object_detector.detect(frame, normalize=True)

            frame_context = FrameContext(
                face_landmarks=face_landmarks, object_detections=object_detections
            )
            metrics = metric_manager.update(frame_context)
            has_alert = any(
                key.endswith("_alert")
                and isinstance(value, bool)
                and value
                for key, value in metrics.items()
            )
            thumbnail_base64 = (
                encode_frame_thumbnail(frame)
                if has_alert and smoothed_landmarks
                else None
            )

            bucket_index = int(timestamp_sec // group_interval_sec)
            if current_bucket is None or bucket_index != current_bucket.bucket_index:
                flush_bucket()
                start_sec = bucket_index * group_interval_sec
                end_sec = start_sec + group_interval_sec
                current_bucket = BucketAccumulator(
                    bucket_index=bucket_index,
                    start_sec=start_sec,
                    end_sec=end_sec,
                )

            current_bucket.frame_count += 1
            if current_bucket.resolution is None:
                current_bucket.resolution = Resolution(width=w, height=h)

            if has_face and smoothed_landmarks:
                if (
                    current_bucket.landmarks_sum is None
                    or len(current_bucket.landmarks_sum) != len(smoothed_landmarks)
                ):
                    current_bucket.landmarks_sum = [0.0] * len(smoothed_landmarks)
                    current_bucket.landmarks_count = 0
                if len(smoothed_landmarks) == len(current_bucket.landmarks_sum):
                    for index, value in enumerate(smoothed_landmarks):
                        current_bucket.landmarks_sum[index] += float(value)
                    current_bucket.landmarks_count += 1

            if object_detections:
                _update_detections(current_bucket.detections, object_detections)

            if metrics:
                current_bucket.metrics.append(metrics)

            if thumbnail_base64 and current_bucket.thumbnail_base64 is None:
                current_bucket.thumbnail_base64 = thumbnail_base64

            if include_frames and frames is not None:
                frames.append(
                    VideoFrameResult(
                        timestamp=format_timestamp(timestamp_sec),
                        frame_number=frame_number,
                        resolution=Resolution(width=w, height=h),
                        face_landmarks=smoothed_landmarks if has_face else None,
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

    flush_bucket()

    if duration_sec <= 0:
        duration_sec = last_timestamp_sec

    duration_sec = max(duration_sec, 0.0)
    duration_sec = float(f"{duration_sec:.3f}")

    metadata = VideoMetadata(
        duration_sec=duration_sec,
        total_frames_processed=frame_number,
        fps=target_fps,
        resolution=Resolution(width=source_width, height=source_height),
    )

    return VideoProcessingResult(metadata=metadata, groups=groups, frames=frames)
