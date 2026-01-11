import asyncio
import json
import logging
from typing import Dict, Optional

from aiortc import RTCDataChannel, RTCPeerConnection
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Tracks active WebSocket connections and associated RTCPeerConnections."""

    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.peer_connections: Dict[str, RTCPeerConnection] = {}
        self.data_channels: Dict[str, RTCDataChannel] = {}
        self.frame_tasks: Dict[str, asyncio.Task] = {}

    async def connect(self, websocket: WebSocket, client_id: str) -> None:
        """Accept a WebSocket connection and register it."""
        await websocket.accept()
        self.active_connections[client_id] = websocket
        logger.info(
            "Client %s connected. Total: %d", client_id, len(self.active_connections)
        )

    def disconnect(self, client_id: str) -> Optional[RTCPeerConnection]:
        """Remove a client and its peer connection (if any). Returns the removed RTCPeerConnection."""
        self.active_connections.pop(client_id, None)
        pc = self.peer_connections.pop(client_id, None)
        self.data_channels.pop(client_id, None)

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
        """Send a JSON message to a specific client."""
        ws = self.active_connections.get(client_id)
        if ws:
            try:
                await ws.send_json(message)
            except Exception as e:
                logger.error("Failed to send message to %s: %s", client_id, e)

    async def send_data(self, client_id: str, message: dict) -> None:
        """Send a JSON message via the WebRTC data channel."""
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


# Singleton instance
manager = ConnectionManager()
