from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.lifespan import lifespan
from app.core.logging import configure_logging
from app.routers.driver_monitoring import router as driver_monitoring_router
from app.routers.health import router as health_router
from app.routers.webrtc import router as webrtc_router

app = FastAPI()


def create_app() -> FastAPI:
    configure_logging()

    app = FastAPI(
        title=settings.app_name,
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_allow_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health_router)
    app.include_router(webrtc_router)
    app.include_router(driver_monitoring_router)

    return app


app = create_app()
