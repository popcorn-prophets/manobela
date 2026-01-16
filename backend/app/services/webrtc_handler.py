from __future__ import annotations

import asyncio
import logging

from aiortc import (
    RTCConfiguration,
    RTCPeerConnection,
    RTCSessionDescription,
)
from aiortc.sdp import candidate_from_sdp

from app.models.webrtc import ICECandidateMessage, MessageType, SDPMessage
from app.services.connection_manager import ConnectionManager
from app.services.ice_servers import get_ice_servers
from app.services.object_detector import ObjectDetector
from app.services.video_processor import process_video_frames

logger = logging.getLogger(__name__)


async def create_peer_connection(
    client_id: str,
    connection_manager: ConnectionManager,
    face_landmarker,
    object_detector: ObjectDetector,
) -> RTCPeerConnection:
    """
    Initialize a WebRTC peer connection and wire up all event handlers.
    """
    rtc_config = RTCConfiguration(
        iceServers=await get_ice_servers(),
    )

    pc = RTCPeerConnection(rtc_config)
    connection_manager.peer_connections[client_id] = pc

    stop_processing = asyncio.Event()

    @pc.on("connectionstatechange")
    async def on_connectionstatechange():
        # Log connection state changes
        logger.info("Connection state for %s: %s", client_id, pc.connectionState)

        # Close peer connection if it's in a failed or closed state
        if pc.connectionState in ("failed", "closed", "disconnected"):
            stop_processing.set()
            removed_pc = connection_manager.disconnect(client_id)
            if removed_pc:
                await removed_pc.close()

    @pc.on("track")
    def on_track(track):
        logger.info("Track received: %s kind=%s", track.kind, track.kind)

        if track.kind == "video":
            # Start processing video frames in a background task
            # Pass dependencies explicitly
            task = asyncio.create_task(
                process_video_frames(
                    client_id,
                    track,
                    face_landmarker,
                    object_detector,
                    connection_manager,
                    stop_processing,
                )
            )
            connection_manager.frame_tasks[client_id] = task

    @pc.on("datachannel")
    def on_datachannel(channel):
        logger.info("Data channel established: %s", channel.label)

        # Register the channel
        connection_manager.data_channels[client_id] = channel

        @channel.on("message")
        def on_message(message):
            logger.info("Data channel message from %s: %s", client_id, message)

    @pc.on("icecandidate")
    async def on_icecandidate(candidate):
        # Forward local ICE candidates to the client
        if candidate:
            await connection_manager.send_message(
                client_id,
                {
                    "type": MessageType.ICE_CANDIDATE.value,
                    "candidate": {
                        "candidate": candidate.candidate,
                        "sdpMid": candidate.sdpMid,
                        "sdpMLineIndex": candidate.sdpMLineIndex,
                    },
                },
            )

    return pc


async def handle_offer(
    client_id: str,
    message: dict,
    connection_manager: ConnectionManager,
    face_landmarker,
    object_detector: ObjectDetector,
) -> None:
    """
    Handle an incoming SDP offer from a client and send back an answer.
    """
    try:
        # Parse and validate message
        offer_msg = SDPMessage(**message)

        pc = await create_peer_connection(
            client_id, connection_manager, face_landmarker, object_detector
        )

        offer = RTCSessionDescription(sdp=offer_msg.sdp, type=offer_msg.sdpType)
        await pc.setRemoteDescription(offer)

        # Create and send answer
        answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)

        logger.info(
            "Created answer for %s (includes video: %s)",
            client_id,
            "m=video" in answer.sdp,
        )

        await connection_manager.send_message(
            client_id,
            {
                "type": MessageType.ANSWER.value,
                "sdp": pc.localDescription.sdp,
                "sdpType": pc.localDescription.type,
            },
        )

    except Exception as e:
        logger.error("Error handling offer from %s: %s", client_id, e)
        await connection_manager.send_message(
            client_id, {"type": MessageType.ERROR.value, "message": str(e)}
        )


async def handle_answer(
    client_id: str,
    message: dict,
    connection_manager: ConnectionManager,
) -> None:
    """
    Handle an SDP answer from a client.
    """
    try:
        answer_msg = SDPMessage(**message)

        pc = connection_manager.peer_connections.get(client_id)
        if not pc:
            raise RuntimeError("No peer connection found for client")

        answer = RTCSessionDescription(sdp=answer_msg.sdp, type=answer_msg.sdpType)
        await pc.setRemoteDescription(answer)
        logger.info("Set remote description for %s", client_id)

    except Exception as e:
        logger.error("Error handling answer from %s: %s", client_id, e)
        await connection_manager.send_message(
            client_id, {"type": MessageType.ERROR.value, "message": str(e)}
        )


async def handle_ice_candidate(
    client_id: str,
    message: dict,
    connection_manager: ConnectionManager,
) -> None:
    """
    Add a remote ICE candidate to the active peer connection.
    """
    try:
        ice_msg = ICECandidateMessage(**message)

        pc = connection_manager.peer_connections.get(client_id)
        if not pc:
            raise RuntimeError("No peer connection found for client")

        candidate_data = ice_msg.candidate
        if candidate_data:
            candidate = candidate_from_sdp(candidate_data.candidate)
            candidate.sdpMid = candidate_data.sdpMid
            candidate.sdpMLineIndex = candidate_data.sdpMLineIndex
            await pc.addIceCandidate(candidate)
            logger.debug("Added ICE candidate for %s", client_id)

    except Exception as e:
        logger.error("Error handling ICE candidate from %s: %s", client_id, e)
