import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.services.connection_manager import ConnectionManager
from app.services.face_landmarker import create_face_landmarker
from app.services.object_detector import create_object_detector

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Manage application lifecycle: startup and shutdown.
    """
    # Startup
    # Startup

    logger.info("Starting application...")

    # Create connection manager
    app.state.connection_manager = ConnectionManager()

    # Create face landmarker
    app.state.face_landmarker = create_face_landmarker()

    # Create object detector
    app.state.object_detector = create_object_detector()

    logger.info("Application started")

    try:
        yield
    finally:
        # Shutdown

        logger.info("Shutting down application...")

        # Close connection manager
        if getattr(app.state, "connection_manager", None):
            try:
                await app.state.connection_manager.close()
            except Exception as e:
                logger.error("Error closing ConnectionManager: %s", e)
            finally:
                app.state.connection_manager = None

        # Close face landmarker
        if getattr(app.state, "face_landmarker", None):
            try:
                if hasattr(app.state.face_landmarker, "close"):
                    app.state.face_landmarker.close()
            except Exception as e:
                logger.error("Error closing FaceLandmarker: %s", e)
            finally:
                app.state.face_landmarker = None

        # Close object detector
        if getattr(app.state, "object_detector", None):
            app.state.object_detector = None

        logger.info("Shutdown complete")
