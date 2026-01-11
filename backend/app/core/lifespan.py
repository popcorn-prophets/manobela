import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting application")

    try:
        yield
    finally:
        logger.info("Shutting down application")
        logger.info("Shutdown complete")
