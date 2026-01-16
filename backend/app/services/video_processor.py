import asyncio
import atexit
import functools
import logging
import os
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone

import cv2
import mediapipe as mp

from app.core.config import settings
from app.models.inference import InferenceData, Resolution
from app.services.connection_manager import ConnectionManager
from app.services.face_landmarks import ESSENTIAL_LANDMARKS
from app.services.metrics.metric_manager import MetricManager
from app.services.object_detector import ObjectDetector
from app.services.smoother import Smoother

logger = logging.getLogger(__name__)

# MediaPipe FaceLandmarker is NOT thread-safe.
# Use a global lock to prevent concurrent access.
face_landmarker_lock = threading.Lock()

# YOLO ONNX model is NOTthread-safe.
# Use a global lock to prevent concurrent access.
object_detector_lock = threading.Lock()

TARGET_FPS = max(1, settings.target_fps)
TARGET_INTERVAL_SEC = 1 / TARGET_FPS
MAX_WIDTH = 480
RENDER_LANDMARKS_FULL = False  # Option to render all landmarks or only essential ones

# Dedicated thread pool for CPU-bound frame processing
executor = ThreadPoolExecutor(max_workers=min(os.cpu_count() or 4, 4))
atexit.register(executor.shutdown, wait=True)


def process_video_frame(
    timestamp: str,
    img_bgr,
    face_landmarker,
    object_detector: ObjectDetector,
    metric_manager: MetricManager,
    smoother: Smoother,
) -> InferenceData:
    """
    Process a single video frame.
    """

    h, w = img_bgr.shape[:2]

    # Resize if needed
    if w > MAX_WIDTH:
        scale = MAX_WIDTH / w
        w, h = int(w * scale), int(h * scale)
        img_bgr = cv2.resize(img_bgr, (w, h))

    # Convert BGR to RGB
    rgb_frame = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)

    # Detect landmarks
    timestamp_ms = int(time.time() * 1000)
    with face_landmarker_lock:
        detection_result = face_landmarker.detect_for_video(mp_image, timestamp_ms)

    raw_landmarks: list[tuple[float, float]] | None = None
    essential_landmarks: list[float] | None = None

    if detection_result.face_landmarks:
        face_landmarks = detection_result.face_landmarks[0]

        # Full landmarks as (x, y) tuples
        raw_landmarks = [(lm.x, lm.y) for lm in face_landmarks]

        # Filter only essential landmarks
        essential_landmarks = [
            coord
            for idx in ESSENTIAL_LANDMARKS
            for coord in (face_landmarks[idx].x, face_landmarks[idx].y)
        ]

    # Detect objects
    with object_detector_lock:
        object_detections = object_detector.detect(img_bgr, normalize=True)

    # Update metrics
    frame_data = {}
    frame_data["landmarks"] = raw_landmarks
    frame_data["object_detections"] = object_detections
    metrics = metric_manager.update(frame_data)

    # Apply smoothing
    smoothed_landmarks = (
        smoother.update(essential_landmarks) if essential_landmarks else None
    )

    return InferenceData(
        timestamp=timestamp,
        resolution=Resolution(width=w, height=h),
        metrics=metrics,
        face_landmarks=smoothed_landmarks,
        object_detections=object_detections,
    )


async def process_video_frames(
    client_id: str,
    track,
    face_landmarker,
    object_detector: ObjectDetector,
    connection_manager: ConnectionManager,
    stop_processing: asyncio.Event,
) -> None:
    """
    Receive video frames from a WebRTC track, perform processing,
    and stream results back over the data channel.
    """
    frame_count = 0
    processed_frames = 0
    start_time = time.perf_counter()
    last_process_time = time.perf_counter()
    metric_manager = MetricManager()
    smoother = Smoother()

    data_channel_retries = 0
    MAX_DATA_CHANNEL_RETRIES = 10

    try:
        while True:
            if stop_processing.is_set():
                logger.info("Stop signal received for %s", client_id)
                break

            if client_id not in connection_manager.peer_connections:
                logger.info("Peer connection not found for %s", client_id)
                break

            try:
                frame = await track.recv()
                if not frame:
                    logger.info("Frame is empty for %s", client_id)
                    break

                frame_count += 1

                # Schedule frame processing at a fixed interval to avoid drift.
                # The next processing time is derived from the previous scheduled time,
                # not the actual processing completion time.
                next_process_time = last_process_time + TARGET_INTERVAL_SEC
                sleep_duration = next_process_time - time.perf_counter()

                if sleep_duration > 0:
                    # Yield control until the scheduled processing time
                    await asyncio.sleep(sleep_duration)
                else:
                    # Processing took longer than the target interval;
                    # skip sleeping to prevent accumulating delay
                    logger.debug(
                        "Client %s: Processing is behind schedule by %.2f ms",
                        client_id,
                        -sleep_duration * 1000,
                    )

                # Advance schedule to maintain cadence
                last_process_time = next_process_time

                # Get data channel
                channel = connection_manager.data_channels.get(client_id)
                if not channel or channel.readyState != "open":
                    logger.info("Data channel not ready for %s; waiting...", client_id)
                    data_channel_retries += 1
                    if data_channel_retries > MAX_DATA_CHANNEL_RETRIES:
                        logger.warning(
                            "Data channel persistently unavailable for %s; stopping processing",
                            client_id,
                        )
                        break
                    await asyncio.sleep(0.05)
                    continue
                else:
                    data_channel_retries = 0

                # Convert frame to numpy array
                img = frame.to_ndarray(format="bgr24")
                h, w = img.shape[:2]

                # Log first frame info
                if frame_count == 1:
                    logger.info(
                        "Client %s: Receiving %dx%d video",
                        client_id,
                        w,
                        h,
                    )

                # Process frame
                timestamp = datetime.now(timezone.utc).isoformat()
                result = await asyncio.get_running_loop().run_in_executor(
                    executor,
                    functools.partial(
                        process_video_frame,
                        timestamp,
                        img,
                        face_landmarker,
                        object_detector,
                        metric_manager,
                        smoother,
                    ),
                )

                # Send result
                try:
                    channel.send(result.model_dump_json())
                except Exception as e:
                    logger.info(
                        "Data channel send failed for %s: %s",
                        client_id,
                        e,
                    )
                    await asyncio.sleep(0.05)
                    continue

                # Update counters
                processed_frames += 1

                # Log FPS every 100 frames
                if processed_frames % 100 == 0:
                    elapsed_sec = time.perf_counter() - start_time
                    fps = processed_frames / elapsed_sec if elapsed_sec > 0 else 0
                    logger.info(
                        "Client %s: Processed %d frames (%.2f fps)",
                        client_id,
                        processed_frames,
                        fps,
                    )

            except asyncio.CancelledError:
                logger.info("Frame processing cancelled for %s", client_id)
                raise  # MUST propagate cancellation

            except Exception:
                logger.exception("Non-fatal frame processing error for %s", client_id)
                await asyncio.sleep(0)  # yield control
                continue

    except asyncio.CancelledError:
        logger.info("Frame processing stopped for %s", client_id)
        return

    except Exception:
        logger.exception("Fatal error in frame processing for %s", client_id)

    finally:
        logger.info("Frame processing ended for %s", client_id)
