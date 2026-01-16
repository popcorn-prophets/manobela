from datetime import datetime, timezone

from fastapi import APIRouter

from app.core.dependencies import ConnectionManagerDep, FaceLandmarkerDep

router = APIRouter(
    prefix="/health",
    tags=["health"],
)


@router.get("/")
async def health():
    return {
        "status": "ok",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/live")
async def liveness():
    return {"status": "alive"}


@router.get("/ready", include_in_schema=False)
async def readiness(
    connection_manager: ConnectionManagerDep,
    face_landmarker: FaceLandmarkerDep,
):
    return {"status": "ready"}
