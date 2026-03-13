from __future__ import annotations

import os
from typing import Any, AsyncIterator

import httpx

from app.cleaning import clean_name, clean_neighborhood, clean_text, clean_zip
from ingest.utils import (
    build_schedule_from_occurrences,
    decode_superjson,
    is_open_now,
    pick_first,
    resource_kind_from_type,
)


LEMON_TREE_BASE_URL = os.getenv("LEMONTREE_BASE_URL", "https://platform.foodhelpline.org")
LEMON_TREE_TAKE = int(os.getenv("LEMONTREE_TAKE", "40"))


async def _fetch_page(
    client: httpx.AsyncClient, cursor: str | None = None
) -> dict[str, Any]:
    params: dict[str, Any] = {"take": LEMON_TREE_TAKE}
    if cursor:
        params["cursor"] = cursor
    response = await client.get(f"{LEMON_TREE_BASE_URL}/api/resources", params=params)
    response.raise_for_status()
    payload = response.json()
    return decode_superjson(payload)


async def iter_resources() -> AsyncIterator[dict[str, Any]]:
    async with httpx.AsyncClient(timeout=30) as client:
        cursor: str | None = None
        while True:
            data = await _fetch_page(client, cursor=cursor)
            resources = data.get("resources") or []
            for resource in resources:
                yield resource
            cursor = data.get("cursor")
            if not cursor:
                break


def _extract_location(resource: dict[str, Any]) -> dict[str, Any]:
    location = resource.get("location") or {}
    address = pick_first(
        resource.get("address"),
        resource.get("address1"),
        location.get("address"),
        location.get("address1"),
    )
    zip_code = pick_first(
        resource.get("zipCode"),
        resource.get("zip_code"),
        resource.get("zip"),
        location.get("zipCode"),
        location.get("zip"),
    )
    neighborhood = pick_first(
        resource.get("neighborhood"),
        location.get("neighborhood"),
        location.get("city"),
        resource.get("city"),
    )
    latitude = pick_first(
        resource.get("latitude"),
        resource.get("lat"),
        location.get("latitude"),
        location.get("lat"),
    )
    longitude = pick_first(
        resource.get("longitude"),
        resource.get("lng"),
        resource.get("lon"),
        location.get("longitude"),
        location.get("lng"),
        location.get("lon"),
    )
    return {
        "address": clean_text(address),
        "zip_code": clean_zip(str(zip_code)) if zip_code else None,
        "neighborhood": clean_neighborhood(neighborhood),
        "latitude": float(latitude) if latitude is not None else None,
        "longitude": float(longitude) if longitude is not None else None,
    }


async def upsert_resource(conn, resource: dict[str, Any]) -> None:
    name = clean_name(resource.get("name") or "Unknown")
    location = _extract_location(resource)
    resource_kind = resource_kind_from_type(
        resource.get("resourceTypeId")
        or resource.get("resource_type_id")
        or resource.get("resourceType")
    )
    occurrences = resource.get("occurrences") or []
    schedule = build_schedule_from_occurrences(occurrences)
    open_now = is_open_now(occurrences)

    existing = await conn.fetchrow(
        """
        select id
        from pantries
        where lower(name) = lower($1)
          and (
            (zip_code is not null and zip_code = $2)
            or (address is not null and address = $3)
            or (
                latitude is not null
                and longitude is not null
                and latitude = $4
                and longitude = $5
            )
          )
        limit 1
        """,
        name,
        location["zip_code"],
        location["address"],
        location["latitude"],
        location["longitude"],
    )
    if existing:
        await conn.execute(
            """
            update pantries
            set neighborhood = coalesce($2, neighborhood),
                address = coalesce($3, address),
                zip_code = coalesce($4, zip_code),
                latitude = coalesce($5, latitude),
                longitude = coalesce($6, longitude),
                resource_kind = $7,
                schedule = coalesce($8, schedule),
                is_open_now = coalesce($9, is_open_now),
                updated_at = now()
            where id = $1
            """,
            existing["id"],
            location["neighborhood"],
            location["address"],
            location["zip_code"],
            location["latitude"],
            location["longitude"],
            resource_kind,
            schedule,
            open_now,
        )
        return

    await conn.execute(
        """
        insert into pantries (
            name,
            neighborhood,
            address,
            zip_code,
            latitude,
            longitude,
            resource_kind,
            schedule,
            is_open_now
        )
        values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        """,
        name,
        location["neighborhood"] or "Unknown",
        location["address"],
        location["zip_code"],
        location["latitude"],
        location["longitude"],
        resource_kind,
        schedule,
        open_now,
    )


async def ingest_lemontree(pool) -> int:
    count = 0
    async with pool.acquire() as conn:
        async for resource in iter_resources():
            await upsert_resource(conn, resource)
            count += 1
    return count
