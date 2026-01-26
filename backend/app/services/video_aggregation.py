from dataclasses import dataclass, field
from typing import Any

from app.models.video_upload import Resolution, VideoFrameAggregate, VideoFrameGroup
from app.services.object_detector import ObjectDetection


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


def _is_int(value: Any) -> bool:
    return isinstance(value, int) and not isinstance(value, bool)


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

        if all(_is_int(value) for value in values):
            result[key] = max(values)
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


def update_detections(
    unique: dict[str, ObjectDetection], detections: list[ObjectDetection]
) -> None:
    for detection in detections:
        bbox_key = ",".join(f"{value:.3f}" for value in detection.bbox)
        key = f"{detection.class_id}:{bbox_key}"
        existing = unique.get(key)
        if not existing or detection.conf > existing.conf:
            unique[key] = detection


def finalize_bucket(bucket: BucketAccumulator) -> VideoFrameGroup:
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
