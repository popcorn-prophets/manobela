import asyncio
import json
import logging
from typing import Optional

from aiortc import RTCDataChannel, RTCPeerConnection
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    """
    Central registry for active WebSocket clients and their WebRTC resources.
    """

    def __init__(self):
        self.active_connections: dict[str, WebSocket] = {}
        self.peer_connections: dict[str, RTCPeerConnection] = {}
        self.data_channels: dict[str, RTCDataChannel] = {}
        self.frame_tasks: dict[str, asyncio.Task] = {}
        self.head_pose_recalibrate_requests: set[str] = set()
        self.paused_clients: set[str] = set()
        logger.info("Connection Manager initialized")

    async def connect(self, websocket: WebSocket, client_id: str) -> None:
        """Accept a WebSocket connection and register it."""
        await websocket.accept()
        self.active_connections[client_id] = websocket
        logger.info(
            "Client %s connected. Total: %d", client_id, len(self.active_connections)
        )

    def disconnect(self, client_id: str) -> Optional[RTCPeerConnection]:
        """Remove all resources associated with a client and cancel background tasks."""
        self.active_connections.pop(client_id, None)
        pc = self.peer_connections.pop(client_id, None)
        self.data_channels.pop(client_id, None)
        self.head_pose_recalibrate_requests.discard(client_id)
        self.paused_clients.discard(client_id)

        task = self.frame_tasks.pop(client_id, None)
        if task and not task.done():
            task.cancel()
            logger.info("Cancelled frame processing task for %s", client_id)

        if pc:
            # Async close should be handled elsewhere
            logger.info("Closed RTCPeerConnection for %s", client_id)

        logger.info(
            "Client %s disconnected. Remaining: %d",
            client_id,
            len(self.active_connections),
        )
        return pc

    async def send_message(self, client_id: str, message: dict) -> None:
        """Send a JSON-serializable message to a client over WebSocket."""
        ws = self.active_connections.get(client_id)
        if ws:
            try:
                await ws.send_json(message)
            except Exception as e:
                logger.error("Failed to send message to %s: %s", client_id, e)

    async def send_data(self, client_id: str, message: dict) -> None:
        """Send a JSON message to the client via its WebRTC data channel."""
        channel = self.data_channels.get(client_id)
        if channel and channel.readyState == "open":
            try:
                channel.send(json.dumps(message))
            except Exception as e:
                logger.error("Failed to send data to %s: %s", client_id, e)
        else:
            logger.warning("Data channel not open for %s", client_id)

    async def broadcast(self, message: dict) -> None:
        """Send a message to all connected clients."""
        for client_id, ws in self.active_connections.items():
            try:
                await ws.send_json(message)
            except Exception as e:
                logger.error("Failed to broadcast to %s: %s", client_id, e)

    async def close(self) -> None:
        """
        Close all active connections, peer connections, data channels, and cancel tasks.
        Intended to be called during app shutdown.
        """
        logger.info("Shutting down Connection Manager...")

        # Cancel all frame processing tasks
        for client_id, task in list(self.frame_tasks.items()):
            if task and not task.done():
                task.cancel()
                logger.info("Cancelled frame processing task for %s", client_id)

        # Close all RTCPeerConnections
        for client_id, pc in list(self.peer_connections.items()):
            if pc:
                await pc.close()
                logger.info("Closed RTCPeerConnection for %s", client_id)

        # Close all WebSockets
        for client_id, ws in list(self.active_connections.items()):
            try:
                await ws.close()
                logger.info("Closed WebSocket for %s", client_id)
            except Exception as e:
                logger.warning("Failed to close WebSocket for %s: %s", client_id, e)

        # Clear all internal dictionaries
        self.active_connections.clear()
        self.peer_connections.clear()
        self.data_channels.clear()
        self.frame_tasks.clear()
        self.head_pose_recalibrate_requests.clear()

        logger.info("Connection Manager shutdown complete")

    def request_head_pose_recalibration(self, client_id: str) -> None:
        """Queue a head pose recalibration request for the next processed frame."""
        self.head_pose_recalibrate_requests.add(client_id)

    def consume_head_pose_recalibration(self, client_id: str) -> bool:
        """Return True if a recalibration request was queued and consume it."""
        if client_id in self.head_pose_recalibrate_requests:
            self.head_pose_recalibrate_requests.remove(client_id)
            return True
        return False

    def set_paused(self, client_id: str, paused: bool) -> None:
        """Pause/resume processing for a given client."""
        if paused:
            self.paused_clients.add(client_id)
        else:
            self.paused_clients.discard(client_id)

    def is_paused(self, client_id: str) -> bool:
        """Return True if processing is paused for a client."""
        return client_id in self.paused_clients
