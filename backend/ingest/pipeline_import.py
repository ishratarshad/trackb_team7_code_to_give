from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
from typing import Any

from app.db import create_pool


def _as_path(value: str | None) -> Path | None:
    if not value:
        return None
    return Path(value).expanduser()


def _load_json(path: Path) -> Any:
    return json.loads(path.read_text())


def _extract_raw_tags(raw_tags: Any) -> list[str]:
    if not raw_tags:
        return []
    if isinstance(raw_tags, list):
        if raw_tags and isinstance(raw_tags[0], dict):
            return [t.get("label") for t in raw_tags if t.get("label")]
        return [str(t) for t in raw_tags if t]
    return []


async def _find_pantry_id(
    conn,
    resource_id: str | None,
    resource_name: str | None,
    zip_code: str | None,
    neighborhood: str | None,
    latitude: float | None,
    longitude: float | None,
) -> str | None:
    if resource_id:
        row = await conn.fetchrow("select id from pantries where id = $1", resource_id)
        if row:
            return row["id"]

    if resource_name and zip_code:
        row = await conn.fetchrow(
            """
            select id
            from pantries
            where lower(name) = lower($1)
              and zip_code = $2
            limit 1
            """,
            resource_name,
            zip_code,
        )
        if row:
            return row["id"]

    if resource_name and neighborhood:
        row = await conn.fetchrow(
            """
            select id
            from pantries
            where lower(name) = lower($1)
              and neighborhood = $2
            limit 1
            """,
            resource_name,
            neighborhood,
        )
        if row:
            return row["id"]

    if latitude is not None and longitude is not None:
        row = await conn.fetchrow(
            """
            select id
            from pantries
            where latitude = $1 and longitude = $2
            limit 1
            """,
            latitude,
            longitude,
        )
        if row:
            return row["id"]
    return None


async def ingest_classifier_output(conn, path: Path) -> dict[str, int]:
    payload = _load_json(path)
    results = payload.get("results") if isinstance(payload, dict) else None
    if results is None and isinstance(payload, list):
        results = payload
    results = results or []

    inserted = 0
    updated = 0
    skipped = 0
    missing = 0

    for item in results:
        source = item.get("source") or {}
        resource_id = source.get("resourceId")
        resource_name = source.get("resourceName")
        zip_code = source.get("zipCode")
        neighborhood = source.get("neighborhoodName")
        latitude = source.get("latitude")
        longitude = source.get("longitude")
        image_url = item.get("imageUrl") or item.get("image_url")
        image_id = item.get("imageId")
        raw_tags = _extract_raw_tags(item.get("rawTags"))

        if not image_url and image_id:
            image_url = f"lemontree://{image_id}"
        if not image_url:
            skipped += 1
            continue

        pantry_id = await _find_pantry_id(
            conn,
            resource_id=resource_id,
            resource_name=resource_name,
            zip_code=zip_code,
            neighborhood=neighborhood,
            latitude=latitude,
            longitude=longitude,
        )
        if not pantry_id:
            missing += 1
            continue

        existing = await conn.fetchrow(
            """
            select id
            from pantry_photos
            where pantry_id = $1 and image_url = $2
            limit 1
            """,
            pantry_id,
            image_url,
        )
        if existing:
            await conn.execute(
                """
                update pantry_photos
                set raw_tags = $1
                where id = $2
                """,
                raw_tags,
                existing["id"],
            )
            updated += 1
        else:
            await conn.execute(
                """
                insert into pantry_photos (pantry_id, image_url, raw_tags)
                values ($1, $2, $3)
                """,
                pantry_id,
                image_url,
                raw_tags,
            )
            inserted += 1

    return {
        "inserted": inserted,
        "updated": updated,
        "skipped": skipped,
        "missing": missing,
    }


async def ingest_supply_profiles(conn, path: Path) -> dict[str, int]:
    payload = _load_json(path)
    profiles = payload if isinstance(payload, list) else payload.get("pantries") or []

    upserts = 0
    missing = 0

    for profile in profiles:
        resource_id = profile.get("pantry_id")
        metadata = profile.get("metadata") or {}
        resource_name = metadata.get("resource_name")
        zip_code = metadata.get("zip_code")
        neighborhood = metadata.get("neighborhood_name")
        latitude = metadata.get("latitude")
        longitude = metadata.get("longitude")

        pantry_id = await _find_pantry_id(
            conn,
            resource_id=resource_id,
            resource_name=resource_name,
            zip_code=zip_code,
            neighborhood=neighborhood,
            latitude=latitude,
            longitude=longitude,
        )
        if not pantry_id:
            missing += 1
            continue

        await conn.execute(
            """
            insert into supply_profiles (
                pantry_id,
                normalized_foods,
                category_distribution,
                updated_at
            )
            values ($1, $2, $3, now())
            on conflict (pantry_id)
            do update
            set normalized_foods = excluded.normalized_foods,
                category_distribution = excluded.category_distribution,
                updated_at = now()
            """,
            pantry_id,
            profile.get("normalized_foods") or [],
            profile.get("category_distribution") or {},
        )
        upserts += 1

    return {"upserts": upserts, "missing": missing}


async def run_import(
    classifier_path: Path | None,
    supply_path: Path | None,
) -> dict[str, dict[str, int]]:
    results: dict[str, dict[str, int]] = {}
    pool = await create_pool()
    try:
        async with pool.acquire() as conn:
            if classifier_path and classifier_path.exists():
                results["classifier"] = await ingest_classifier_output(conn, classifier_path)
            if supply_path and supply_path.exists():
                results["supply_profiles"] = await ingest_supply_profiles(conn, supply_path)
    finally:
        await pool.close()
    return results


def main() -> None:
    parser = argparse.ArgumentParser(description="Import classifier and supply profiles.")
    parser.add_argument("--classifier-path", default=os.getenv("CLASSIFIER_OUTPUT_PATH"))
    parser.add_argument("--supply-path", default=os.getenv("SUPPLY_PROFILES_PATH"))
    args = parser.parse_args()

    classifier_path = _as_path(args.classifier_path)
    supply_path = _as_path(args.supply_path)

    if not classifier_path and not supply_path:
        raise SystemExit("No input paths provided.")

    import asyncio

    results = asyncio.run(run_import(classifier_path, supply_path))
    for key, stats in results.items():
        print(f"{key}: {stats}")


if __name__ == "__main__":
    main()
