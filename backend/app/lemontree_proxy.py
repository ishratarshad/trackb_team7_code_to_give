from __future__ import annotations

import os
from typing import Any

import httpx

from ingest.utils import decode_superjson


LEMON_TREE_BASE_URL = os.getenv("LEMONTREE_BASE_URL", "https://platform.foodhelpline.org")


async def fetch_resources(params: dict[str, Any]) -> dict[str, Any]:
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.get(f"{LEMON_TREE_BASE_URL}/api/resources", params=params)
        response.raise_for_status()
        payload = response.json()
        return decode_superjson(payload)


async def fetch_resource(resource_id: str) -> dict[str, Any]:
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.get(f"{LEMON_TREE_BASE_URL}/api/resources/{resource_id}")
        response.raise_for_status()
        payload = response.json()
        return decode_superjson(payload)


async def fetch_markers_within_bounds(params: dict[str, Any]) -> dict[str, Any]:
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.get(
            f"{LEMON_TREE_BASE_URL}/api/resources/markersWithinBounds",
            params=params,
        )
        response.raise_for_status()
        return response.json()
