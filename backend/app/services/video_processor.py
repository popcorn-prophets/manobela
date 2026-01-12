import asyncio
import logging
import time
from datetime import datetime, timezone

import cv2
import mediapipe as mp

from app.models.inference import InferenceData, Resolution
from app.services.connection_manager import ConnectionManager
from app.services.face_landmarks import ESSENTIAL_LANDMARKS
from app.services.smoother import Smoother

logger = logging.getLogger(__name__)


TARGET_INTERVAL_MS = 66  # ~15 FPS processing target
MAX_WIDTH = 640
RENDER_LANDMARKS_FULL = False  # Option to render all landmarks or only essential ones


def process_video_frame(
    timestamp: str,
    img_bgr,
    face_landmarker,
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

    raw_landmarks = None
    if detection_result.face_landmarks:
        face_landmarks = detection_result.face_landmarks[0]
        indices = (
            range(len(face_landmarks)) if RENDER_LANDMARKS_FULL else ESSENTIAL_LANDMARKS
        )

        # Flatten coordinates
        raw_landmarks = [
            coord
            for idx in indices
            for coord in (face_landmarks[idx].x, face_landmarks[idx].y)
        ]

    # Apply smoothing
    smoothed_landmarks = smoother.update(raw_landmarks)

    return InferenceData(
        timestamp=timestamp,
        resolution=Resolution(width=w, height=h),
        face_landmarks=smoothed_landmarks,
    )


async def process_video_frames(
    client_id: str,
    track,
    face_landmarker,
    connection_manager: ConnectionManager,
) -> None:
    """
    Receive video frames from a WebRTC track, perform processing,
    and stream results back over the data channel.
    """
    frame_count = 0
    skipped_frames = 0
    last_process_time = 0
    smoother = Smoother()

    try:
        while True:
            try:
                frame = await track.recv()
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
                result = process_video_frame(timestamp, img, face_landmarker, smoother)

                # Send result
                channel = connection_manager.data_channels.get(client_id)
                if channel and channel.readyState == "open":
                    channel.send(result.model_dump_json())
                else:
                    logger.warning("Data channel not ready for %s", client_id)

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
                raise

            except Exception as e:
                logger.error("Error processing frame for %s: %s", client_id, e)
                continue

    except asyncio.CancelledError:
        logger.info("Frame processing stopped for %s", client_id)

    except Exception as e:
        logger.error("Fatal error in frame processing for %s: %s", client_id, e)

    finally:
        logger.info("Frame processing ended for %s", client_id)
