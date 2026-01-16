import json
import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.dependencies import (
    ConnectionManagerDep,
    ConnectionManagerWsDep,
    FaceLandmarkerDepWs,
)
from app.models.webrtc import MessageType
from app.services.webrtc_handler import (
    handle_answer,
    handle_ice_candidate,
    handle_offer,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["driver_monitoring"])


@router.websocket("/ws/driver-monitoring")
async def driver_monitoring(
    websocket: WebSocket,
    connection_manager: ConnectionManagerWsDep,
    face_landmarker: FaceLandmarkerDepWs,
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
                    client_id, message, connection_manager, face_landmarker
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
