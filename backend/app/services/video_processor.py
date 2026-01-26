import asyncio
import atexit
import functools
import logging
import os
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone

import cv2
from aiortc.mediastreams import MediaStreamError

from app.core.config import settings
from app.models.inference import InferenceData, Resolution
from app.services.connection_manager import ConnectionManager
from app.services.face_landmarker import (
    FaceLandmarker,
    get_essential_landmarks,
)
from app.services.face_landmarks import ESSENTIAL_LANDMARKS
from app.services.metrics.frame_context import FrameContext
from app.services.metrics.metric_manager import MetricManager
from app.services.object_detector import ObjectDetector
from app.services.smoother import SequenceSmoother

logger = logging.getLogger(__name__)

TARGET_FPS = max(1, settings.target_fps)
TARGET_INTERVAL_SEC = 1 / TARGET_FPS
MAX_WIDTH = 480
RENDER_LANDMARKS_FULL = False  # Option to render all landmarks or only essential ones
MAX_DATA_CHANNEL_BUFFER = 1_000_000  # bytes

# Dedicated thread pool for CPU-bound frame processing
executor = ThreadPoolExecutor(max_workers=min(os.cpu_count() or 4, 4))
atexit.register(executor.shutdown, wait=True)


def process_video_frame(
    timestamp: str,
    img_bgr,
    face_landmarker: FaceLandmarker,
    object_detector: ObjectDetector,
    metric_manager: MetricManager,
    smoother: SequenceSmoother,
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

    # Detect landmarks
    face_landmarks = face_landmarker.detect(img_bgr)
    essential_landmarks = get_essential_landmarks(face_landmarks, ESSENTIAL_LANDMARKS)
    smoothed_landmarks = smoother.update(essential_landmarks)

    # Detect objects
    object_detections = object_detector.detect(img_bgr, normalize=True)

    # Update metrics
    frame_context = FrameContext(
        face_landmarks=face_landmarks, object_detections=object_detections
    )
    metrics = metric_manager.update(frame_context)

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
    dropped_messages = 0
    start_time = time.perf_counter()
    last_process_time = 0.0
    metric_manager = MetricManager()
    smoother = SequenceSmoother(alpha=0.8, max_missing=5)

    data_channel_retries = 0
    MAX_DATA_CHANNEL_RETRIES = 10
    # Keep only the most recent frame to avoid backlog-induced latency.
    frame_queue: asyncio.Queue = asyncio.Queue(maxsize=1)
    reader_task: asyncio.Task | None = None

    async def _read_frames() -> None:
        while True:
            if stop_processing.is_set():
                break
            if client_id not in connection_manager.peer_connections:
                break
            try:
                frame = await track.recv()
            except asyncio.CancelledError:
                raise
            except Exception:
                logger.exception("Frame receive failed for %s", client_id)
                await asyncio.sleep(0)
                continue

            if frame_queue.full():
                try:
                    frame_queue.get_nowait()
                except asyncio.QueueEmpty:
                    pass

            try:
                frame_queue.put_nowait(frame)
            except asyncio.QueueFull:
                pass

    try:
        reader_task = asyncio.create_task(_read_frames())
        while True:
            if stop_processing.is_set():
                logger.info("Stop signal received for %s", client_id)
                break

            if client_id not in connection_manager.peer_connections:
                logger.info("Peer connection not found for %s", client_id)
                break

            try:
                try:
                    frame = await asyncio.wait_for(frame_queue.get(), timeout=0.5)
                except asyncio.TimeoutError:
                    continue

                now = time.perf_counter()
                if now - last_process_time < TARGET_INTERVAL_SEC:
                    continue
                last_process_time = now

                if not frame:
                    logger.info("Frame is empty for %s", client_id)
                    break

                if connection_manager.processing_reset.get(client_id, False):
                    metric_manager = MetricManager()
                    smoother = SequenceSmoother(alpha=0.8, max_missing=5)
                    frame_count = 0
                    processed_frames = 0
                    start_time = time.perf_counter()
                    last_process_time = time.perf_counter()
                    connection_manager.processing_reset[client_id] = False

                frame_count += 1
                if connection_manager.processing_paused.get(client_id, False):
                    last_process_time = time.perf_counter()
                    continue

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

                buffered_amount = getattr(channel, "bufferedAmount", 0)
                if buffered_amount > MAX_DATA_CHANNEL_BUFFER:
                    dropped_messages += 1
                    if dropped_messages % 50 == 0:
                        logger.warning(
                            "Client %s: Data channel buffer high (%d bytes); dropped %d messages",
                            client_id,
                            buffered_amount,
                            dropped_messages,
                        )
                    continue
                if connection_manager.consume_head_pose_recalibration(client_id):
                    metric_manager.reset_head_pose_baseline()

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

            except MediaStreamError:
                logger.info("Video track ended for %s", client_id)
                break

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
        if reader_task:
            reader_task.cancel()
            try:
                await reader_task
            except asyncio.CancelledError:
                pass
