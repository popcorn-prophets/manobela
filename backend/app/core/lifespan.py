import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.services.connection_manager import ConnectionManager
from app.services.face_landmarker import (
    MediapipeFaceLandmarker,
    create_face_landmarker,
)
from app.services.object_detector import YoloObjectDetector, create_object_detector

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Manage application lifecycle: startup and shutdown.
    """
    # Startup
    logger.info("Starting application...")

    # Create connection manager
    app.state.connection_manager = ConnectionManager()

    # Create face landmarker
    app.state.face_landmarker = create_face_landmarker(MediapipeFaceLandmarker)

    # Create object detector
    app.state.object_detector = create_object_detector(YoloObjectDetector)

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
                app.state.face_landmarker.close()
            except Exception as e:
                logger.error("Error closing FaceLandmarker: %s", e)
            finally:
                app.state.face_landmarker = None

        # Close object detector
        if getattr(app.state, "object_detector", None):
            try:
                app.state.object_detector.close()
            except Exception as e:
                logger.error("Error closing ObjectDetector: %s", e)
            finally:
                app.state.object_detector = None

        logger.info("Shutdown complete")
