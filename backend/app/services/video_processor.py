import asyncio
import functools
import logging
import os
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone

import cv2
import mediapipe as mp

from app.models.inference import InferenceData, Resolution
from app.services.connection_manager import ConnectionManager
from app.services.face_landmarks import ESSENTIAL_LANDMARKS
from app.services.metrics.metric_manager import MetricManager
from app.services.smoother import Smoother

logger = logging.getLogger(__name__)


TARGET_INTERVAL_MS = 66  # ~15 FPS processing target
MAX_WIDTH = 640
RENDER_LANDMARKS_FULL = False  # Option to render all landmarks or only essential ones

# Dedicated thread pool for CPU-bound frame processing
executor = ThreadPoolExecutor(max_workers=min(os.cpu_count() or 4, 4))


def process_video_frame(
    timestamp: str,
    img_bgr,
    face_landmarker,
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

    # Update metrics
    frame_data = {"landmarks": raw_landmarks} if raw_landmarks else {}
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
    )


async def process_video_frames(
    client_id: str,
    track,
    face_landmarker,
    connection_manager: ConnectionManager,
    stop_processing: asyncio.Event,
) -> None:
    """
    Receive video frames from a WebRTC track, perform processing,
    and stream results back over the data channel.
    """
    frame_count = 0
    skipped_frames = 0
    last_process_time = 0
    metric_manager = MetricManager()
    smoother = Smoother()

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
                current_time = time.time() * 1000  # ms

                # Skip frames to maintain a stable processing rate
                time_since_last = current_time - last_process_time
                if time_since_last < TARGET_INTERVAL_MS and frame_count > 1:
                    skipped_frames += 1
                    continue

                last_process_time = current_time

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

                timestamp = datetime.now(timezone.utc).isoformat()

                result = await asyncio.get_running_loop().run_in_executor(
                    executor,
                    functools.partial(
                        process_video_frame,
                        timestamp,
                        img,
                        face_landmarker,
                        metric_manager,
                        smoother,
                    ),
                )

                # Send result
                channel = connection_manager.data_channels.get(client_id)
                if not channel or channel.readyState != "open":
                    logger.info(
                        "Data channel closed for %s; stopping frame processing",
                        client_id,
                    )
                    break

                try:
                    channel.send(result.model_dump_json())
                except Exception:
                    logger.info(
                        "Data channel send failed for %s; stopping processing",
                        client_id,
                    )
                    break

                # Periodic logging of processing stats
                if frame_count % 100 == 0:
                    effective_fps = (frame_count - skipped_frames) / (frame_count / 15)
                    logger.info(
                        "Client %s: Processed %d/%d frames (%.1f fps effective)",
                        client_id,
                        frame_count - skipped_frames,
                        frame_count,
                        effective_fps,
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
