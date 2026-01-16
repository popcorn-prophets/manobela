from __future__ import annotations

import logging
from typing import Annotated

from fastapi import Depends, Request, WebSocket
from mediapipe.tasks.python import vision

from app.services.connection_manager import ConnectionManager

logger = logging.getLogger(__name__)


def get_connection_manager(request: Request) -> ConnectionManager:
    return request.app.state.connection_manager


def get_connection_manager_ws(websocket: WebSocket) -> ConnectionManager:
    return websocket.app.state.connection_manager


def get_face_landmarker(request: Request) -> "vision.FaceLandmarker":
    return request.app.state.face_landmarker


def get_face_landmarker_ws(websocket: WebSocket) -> "vision.FaceLandmarker":
    return websocket.app.state.face_landmarker


ConnectionManagerDep = Annotated[ConnectionManager, Depends(get_connection_manager)]
ConnectionManagerWsDep = Annotated[
    ConnectionManager, Depends(get_connection_manager_ws)
]
FaceLandmarkerDep = Annotated["vision.FaceLandmarker", Depends(get_face_landmarker)]
FaceLandmarkerDepWs = Annotated[
    "vision.FaceLandmarker", Depends(get_face_landmarker_ws)
]
