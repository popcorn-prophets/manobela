from __future__ import annotations

import logging
from typing import Annotated

from fastapi import Depends, WebSocket
from mediapipe.tasks.python import vision

from app.services.connection_manager import ConnectionManager
from app.services.object_detector import ObjectDetector

logger = logging.getLogger(__name__)


def get_connection_manager(websocket: WebSocket) -> ConnectionManager:
    return websocket.app.state.connection_manager


def get_face_landmarker(websocket: WebSocket) -> "vision.FaceLandmarker":
    return websocket.app.state.face_landmarker


def get_object_detector(websocket: WebSocket) -> ObjectDetector:
    return websocket.app.state.object_detector


ConnectionManagerDep = Annotated[ConnectionManager, Depends(get_connection_manager)]
FaceLandmarkerDep = Annotated["vision.FaceLandmarker", Depends(get_face_landmarker)]
ObjectDetectorDep = Annotated[ObjectDetector, Depends(get_object_detector)]
