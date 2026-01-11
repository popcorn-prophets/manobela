import asyncio
import json
import logging
import time
from datetime import datetime, timezone

import cv2

from app.services.connection_manager import manager

logger = logging.getLogger(__name__)


async def process_video_frames(client_id: str, track):
    frame_count = 0
    skipped_frames = 0
    last_process_time = 0

    TARGET_INTERVAL_MS = 66  # Process every ~66ms = ~15fps processing rate
    MAX_WIDTH = 640

    try:
        while True:
            try:
                frame = await track.recv()
                frame_count += 1
                current_time = time.time() * 1000  # ms

                # Frame skipping strategy for high FPS inputs
                time_since_last = current_time - last_process_time
                if time_since_last < TARGET_INTERVAL_MS and frame_count > 1:
                    skipped_frames += 1
                    continue  # Skip this frame to maintain target FPS

                last_process_time = current_time

                # Log first frame info
                if frame_count == 1:
                    img = frame.to_ndarray(format="bgr24")
                    logger.info(
                        "Client %s: Receiving %dx%d video",
                        client_id,
                        img.shape[1],
                        img.shape[0],
                    )

                # Convert frame
                img = frame.to_ndarray(format="bgr24")
                h, w = img.shape[:2]

                # Resize if too large
                if w > MAX_WIDTH:
                    scale = MAX_WIDTH / w
                    new_w = int(w * scale)
                    new_h = int(h * scale)
                    img = cv2.resize(img, (new_w, new_h))
                    logger.debug(
                        "Resized frame from %dx%d to %dx%d", w, h, new_w, new_h
                    )

                # Dummy processing for now
                gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
                brightness = float(gray.mean())
                mean_color = img.mean(axis=(0, 1))

                result = {
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "frame_id": getattr(frame, "pts", None),
                    "frame_count": frame_count,
                    "processed_count": frame_count - skipped_frames,
                    "skipped_frames": skipped_frames,
                    "resolution": f"{img.shape[1]}x{img.shape[0]}",
                    "brightness": brightness,
                    "mean_color": mean_color.tolist(),
                }

                # Send via data channel
                channel = manager.data_channels.get(client_id)
                if channel and channel.readyState == "open":
                    channel.send(json.dumps(result))
                else:
                    logger.warning("Data channel not ready for %s", client_id)

                # Log processing stats every 100 frames
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
        logger.info(
            "Frame processing stopped for %s (processed %d/%d frames)",
            client_id,
            frame_count - skipped_frames,
            frame_count,
        )
    except Exception as e:
        logger.error("Fatal error in frame processing for %s: %s", client_id, e)
    finally:
        logger.info("Frame processing ended for %s", client_id)
