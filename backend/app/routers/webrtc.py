import aiohttp
from fastapi import APIRouter, HTTPException

from app.core.config import settings
from app.services.ice_servers import get_ice_servers

router = APIRouter(tags=["webrtc"])


@router.get("/ice-servers")
async def ice_servers():
    servers = await get_ice_servers()
    return {"iceServers": [s.__dict__ for s in servers]}


@router.get("/turn-usage")
async def turn_usage():
    if not settings.metered_secret_key or not settings.metered_domain:
        raise HTTPException(status_code=400, detail="TURN secret key or domain not set")

    url = f"https://{settings.metered_domain}/api/v1/turn/current_usage?secretKey={settings.metered_secret_key}"
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as resp:
            if resp.status != 200:
                text = await resp.text()
                raise HTTPException(status_code=resp.status, detail=text)
            data = await resp.json()
    return data
