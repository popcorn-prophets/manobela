"""
Dependency injection providers for FastAPI.
"""

import logging
from typing import Annotated

from fastapi import Depends

from app.services.connection_manager import ConnectionManager
from app.services.face_landmarker import FaceLandmarker

logger = logging.getLogger(__name__)


class AppState:
    """
    Container for application-scoped dependencies.
    Initialized once during app startup and shared across requests.
    """

    def __init__(self):
        self.face_landmarker: FaceLandmarker | None = None
        self.connection_manager: ConnectionManager | None = None

    def initialize(self) -> None:
        """Initialize all application-scoped dependencies."""
        logger.info("Initializing application state")

        # Initialize connection manager
        self.connection_manager = ConnectionManager()
        logger.info("Connection manager initialized")

        # Initialize face landmarker
        self.face_landmarker = FaceLandmarker()
        logger.info("Face landmarker initialized")

    def shutdown(self) -> None:
        """Clean up application-scoped dependencies."""
        logger.info("Shutting down application state")

        # Connection manager cleanup happens per-connection
        self.connection_manager = None

        # Face landmarker cleanup
        if self.face_landmarker:
            self.face_landmarker.close()
            self.face_landmarker = None

        logger.info("Application state shutdown complete")


# Global app state instance
app_state = AppState()


def get_connection_manager() -> ConnectionManager:
    """
    Dependency provider for ConnectionManager.
    """
    if app_state.connection_manager is None:
        raise RuntimeError("Connection manager not initialized")
    return app_state.connection_manager


# Dependency provider functions
def get_face_landmarker() -> FaceLandmarker:
    """
    Dependency provider for FaceLandmarker.
    """
    if app_state.face_landmarker is None:
        raise RuntimeError("Face landmarker not initialized")
    return app_state.face_landmarker


# Type aliases
FaceLandmarkerDep = Annotated[FaceLandmarker, Depends(get_face_landmarker)]
ConnectionManagerDep = Annotated[ConnectionManager, Depends(get_connection_manager)]
