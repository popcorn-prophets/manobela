import asyncio
import logging

from aiortc import (
    RTCConfiguration,
    RTCIceServer,
    RTCPeerConnection,
    RTCSessionDescription,
)
from aiortc.sdp import candidate_from_sdp

from app.models.webrtc import ICECandidateMessage, MessageType, SDPMessage
from app.services.connection_manager import manager
from app.services.video_precessor import process_video_frames

logger = logging.getLogger(__name__)


async def create_peer_connection(client_id: str) -> RTCPeerConnection:
    """
    Create a new RTCPeerConnection for a client and register it with the manager.
    """
    rtc_config = RTCConfiguration(
        iceServers=[
            RTCIceServer(urls="stun:stun.l.google.com:19302"),
        ]
    )
    pc = RTCPeerConnection(rtc_config)
    manager.peer_connections[client_id] = pc

    @pc.on("connectionstatechange")
    async def on_connectionstatechange():
        logger.info("Connection state for %s: %s", client_id, pc.connectionState)
        if pc.connectionState in ["failed", "closed", "disconnected"]:
            removed_pc = manager.disconnect(client_id)
            if removed_pc:
                await removed_pc.close()

    @pc.on("track")
    def on_track(track):
        logger.info("Track received: %s kind=%s", track.kind, track.kind)

        if track.kind == "video":
            task = asyncio.create_task(process_video_frames(client_id, track))
            manager.frame_tasks[client_id] = task

    @pc.on("datachannel")
    def on_datachannel(channel):
        logger.info("Data channel established: %s", channel.label)
        manager.data_channels[client_id] = channel  # store the channel

        @channel.on("message")
        def on_message(message):
            logger.info("Data channel message from %s: %s", client_id, message)

    @pc.on("icecandidate")
    async def on_icecandidate(candidate):
        if candidate:
            await manager.send_message(
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


async def handle_offer(client_id: str, message: dict):
    """
    Handle an incoming SDP offer from a client and send back an answer.
    """
    try:
        # Parse and validate message
        offer_msg = SDPMessage(**message)

        pc = await create_peer_connection(client_id)

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

        await manager.send_message(
            client_id,
            {
                "type": MessageType.ANSWER.value,
                "sdp": pc.localDescription.sdp,
                "sdpType": pc.localDescription.type,
            },
        )

    except Exception as e:
        logger.error("Error handling offer from %s: %s", client_id, e)
        await manager.send_message(
            client_id, {"type": MessageType.ERROR.value, "message": str(e)}
        )


async def handle_answer(client_id: str, message: dict):
    """
    Handle an SDP answer from a client.
    """
    try:
        answer_msg = SDPMessage(**message)

        pc = manager.peer_connections.get(client_id)
        if not pc:
            raise RuntimeError("No peer connection found for client")

        answer = RTCSessionDescription(sdp=answer_msg.sdp, type=answer_msg.sdpType)
        await pc.setRemoteDescription(answer)
        logger.info("Set remote description for %s", client_id)

    except Exception as e:
        logger.error("Error handling answer from %s: %s", client_id, e)
        await manager.send_message(
            client_id, {"type": MessageType.ERROR.value, "message": str(e)}
        )


async def handle_ice_candidate(client_id: str, message: dict):
    """
    Add an ICE candidate received from a client.
    """
    try:
        ice_msg = ICECandidateMessage(**message)

        pc = manager.peer_connections.get(client_id)
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
