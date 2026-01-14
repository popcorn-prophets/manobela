import logging
from typing import Any

import aiohttp
from aiortc import RTCIceServer

from app.core.config import settings

logger = logging.getLogger(__name__)

cred_api_key = settings.metered_credentials_api_key


async def get_ice_servers() -> list[RTCIceServer]:
    """
    Return ICE servers list.
    """
    global cred_api_key
    ice_servers: list[RTCIceServer] = []

    # Include fallback STUN servers
    ice_servers.append(RTCIceServer(urls="stun:stun.l.google.com:19302"))
    ice_servers.append(
        RTCIceServer(urls="stun:stun1.l.google.com:19302"),
    )

    try:
        if cred_api_key:
            ice_servers.extend(await get_ice_servers_from_api_key(cred_api_key))
        else:
            logger.warning("Open Relay credentials API key not configured")
    except Exception as e:
        logger.warning("Open Relay TURN servers unavailable: %s", e)

    return ice_servers


async def get_ice_servers_from_api_key(
    api_key: str, region: str | None = None
) -> list[RTCIceServer]:
    """
    Fetch the ICE servers array using the TURN credential API key.
    Optionally specify a region (e.g., "global", "us_east", "europe").
    """
    if not settings.metered_domain:
        logger.warning("Open Relay domain not configured")
        return []

    base = f"https://{settings.metered_domain}/api/v1/turn/credentials?apiKey={api_key}"
    url = f"{base}&region={region}" if region else base

    async with aiohttp.ClientSession() as session:
        async with session.get(url) as resp:
            resp.raise_for_status()
            data = await resp.json()

    ice_servers: list[RTCIceServer] = []
    for srv in data:
        ice_servers.append(
            RTCIceServer(
                urls=srv.get("urls"),
                username=srv.get("username"),
                credential=srv.get("credential"),
            )
        )
    return ice_servers


async def create_turn_credential(
    expiry_in_seconds: int,
    label: str | None = None,
) -> dict[str, Any]:
    """
    Create a TURN credential via Metered TURN REST API.
    Returns dict with keys: username, password, apiKey, expiryInSeconds, label.
    """
    if not (settings.metered_secret_key and settings.metered_domain):
        logger.warning("Open Relay secret key not configured")
        return {}

    url = (
        f"https://{settings.metered_domain}"
        f"/api/v1/turn/credential?secretKey={settings.metered_secret_key}"
    )
    payload: dict[str, object] = {}
    if expiry_in_seconds:
        payload["expiryInSeconds"] = expiry_in_seconds
    if label:
        payload["label"] = label

    async with aiohttp.ClientSession() as session:
        async with session.post(url, json=payload) as resp:
            resp.raise_for_status()
            return await resp.json()
