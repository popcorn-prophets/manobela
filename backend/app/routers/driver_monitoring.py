import asyncio
import json
import logging
import tempfile
import time
import uuid
from pathlib import Path
from datetime import datetime, timezone

from fastapi import APIRouter, File, HTTPException, Query, Request, UploadFile, WebSocket
from fastapi import WebSocketDisconnect

from app.core.dependencies import (
    ConnectionManagerDep,
    ConnectionManagerWsDep,
    FaceLandmarkerDepWs,
    FaceLandmarkerDep,
    ObjectDetectorDepWs,
    ObjectDetectorDep
)
from app.models.video_upload import VideoProcessingResponse
from app.models.webrtc import MessageType
from app.services.video_upload_processor import process_uploaded_video
from app.services.webrtc_handler import (
    handle_answer,
    handle_ice_candidate,
    handle_offer,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["driver_monitoring"])

MAX_UPLOAD_SIZE_BYTES = 100 * 1024 * 1024
MAX_DURATION_SEC = 5 * 60
PROCESSING_TIMEOUT_SEC = 5 * 60
RATE_LIMIT_WINDOW_SEC = 60
ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".mov"}
_last_upload_by_ip: dict[str, float] = {}


@router.websocket("/ws/driver-monitoring")
async def driver_monitoring(
    websocket: WebSocket,
    connection_manager: ConnectionManagerWsDep,
    face_landmarker: FaceLandmarkerDepWs,
    object_detector: ObjectDetectorDepWs,
):
    """
    WebSocket endpoint that handles WebRTC signaling messages for a single client.
    """

    # Generate a unique identifier for this client session
    client_id = str(uuid.uuid4())
    await connection_manager.connect(websocket, client_id)

    try:
        # Initial handshake message so the client knows its assigned ID
        await connection_manager.send_message(
            client_id,
            {
                "type": MessageType.WELCOME.value,
                "client_id": client_id,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            },
        )

        while True:
            # Receive a message from the client
            raw = await websocket.receive_text()
            try:
                message = json.loads(raw)
            except json.JSONDecodeError:
                logger.warning("Invalid JSON from %s: %s", client_id, raw)
                continue

            msg_type = message.get("type")
            logger.info("Received %s from %s", msg_type, client_id)

            # Route signaling messages based on type
            if msg_type == MessageType.OFFER.value:
                await handle_offer(
                    client_id,
                    message,
                    connection_manager,
                    face_landmarker,
                    object_detector,
                )

            elif msg_type == MessageType.ANSWER.value:
                await handle_answer(client_id, message, connection_manager)

            elif msg_type == MessageType.ICE_CANDIDATE.value:
                await handle_ice_candidate(client_id, message, connection_manager)

            else:
                logger.warning("Unknown message type from %s: %s", client_id, msg_type)

    except WebSocketDisconnect:
        logger.info("Client %s disconnected", client_id)

    except Exception as exc:
        logger.exception("WebSocket error for %s: %s", client_id, exc)

    finally:
        # Ensure peer connection and background tasks are cleaned up
        pc = connection_manager.disconnect(client_id)
        if pc:
            await pc.close()


@router.get("/connections")
async def connections(
    connection_manager: ConnectionManagerDep,
):
    """
    Returns an overview of active driver monitoring sessions and resources.
    """
    return {
        "active_connections": len(connection_manager.active_connections),
        "peer_connections": len(connection_manager.peer_connections),
        "data_channels": len(connection_manager.data_channels),
        "frame_tasks": len(connection_manager.frame_tasks),
    }

@router.post("/driver-monitoring/process-video", response_model=VideoProcessingResponse)
async def process_video_upload(
    request: Request,
    face_landmarker: FaceLandmarkerDep,
    object_detector: ObjectDetectorDep,
    video: UploadFile = File(...),
    target_fps: int = Query(15, ge=1, le=30),
):
    """
    Process an uploaded video file and return frame-by-frame metrics.
    """
    client_host = request.client.host if request.client else "unknown"
    now = time.monotonic()
    last_upload = _last_upload_by_ip.get(client_host)
    if last_upload and now - last_upload < RATE_LIMIT_WINDOW_SEC:
        raise HTTPException(
            status_code=429,
            detail="Too many uploads. Please wait before retrying.",
        )

    _last_upload_by_ip[client_host] = now

    if not video.content_type or not video.content_type.startswith("video/"):
        raise HTTPException(status_code=400, detail="Invalid video format.")

    suffix = Path(video.filename or "").suffix.lower()
    if suffix not in ALLOWED_VIDEO_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Unsupported video file extension.")

    tmp_path = None
    total_size = 0

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            tmp_path = temp_file.name
            while True:
                chunk = await video.read(1024 * 1024)
                if not chunk:
                    break
                total_size += len(chunk)
                if total_size > MAX_UPLOAD_SIZE_BYTES:
                    raise HTTPException(status_code=413, detail="File exceeds size limit.")
                temp_file.write(chunk)

        loop = asyncio.get_running_loop()
        try:
            result = await asyncio.wait_for(
                loop.run_in_executor(
                    None,
                    lambda: process_uploaded_video(
                        tmp_path,
                        target_fps=target_fps,
                        max_duration_sec=MAX_DURATION_SEC,
                        face_landmarker=face_landmarker,
                        object_detector=object_detector,
                    ),
                ),
                timeout=PROCESSING_TIMEOUT_SEC,
            )
        except asyncio.TimeoutError as exc:
            raise HTTPException(
                status_code=503,
                detail="Processing timeout exceeded.",
            ) from exc
        except OverflowError as exc:
            raise HTTPException(
                status_code=413,
                detail="Video duration exceeds limit.",
            ) from exc
        except ValueError as exc:
            raise HTTPException(
                status_code=400,
                detail="Invalid video format.",
            ) from exc

        if not result.frames:
            raise HTTPException(
                status_code=422,
                detail="Video processing failed: no frames extracted.",
            )

        return VideoProcessingResponse(
            video_metadata=result.metadata,
            frames=result.frames,
        )

    finally:
        await video.close()
        if tmp_path:
            Path(tmp_path).unlink(missing_ok=True)
