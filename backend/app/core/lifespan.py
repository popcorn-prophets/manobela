import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.core.dependencies import app_state

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Manage application lifecycle: startup and shutdown.
    """
    logger.info("Starting application")

    # Startup
    # Initialize all application-scoped dependencies
    app_state.initialize()

    try:
        yield
    finally:
        # Shutdown
        logger.info("Shutting down application...")
        # Clean up all application-scoped dependencies
        app_state.shutdown()
        logger.info("Shutdown complete")
