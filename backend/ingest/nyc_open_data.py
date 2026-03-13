from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Any

import httpx

from app.cleaning import clean_zip


NYC_OPEN_DATA_BASE = os.getenv("NYC_OPEN_DATA_BASE", "https://data.cityofnewyork.us/resource")
NYC_DEMOGRAPHICS_DATASET = os.getenv("NYC_DEMOGRAPHICS_DATASET", "kku6-nxdu")
NYC_OPEN_DATA_LIMIT = int(os.getenv("NYC_OPEN_DATA_LIMIT", "1000"))


def _parse_int(value: Any) -> int:
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return 0


def _parse_float(value: Any) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


async def _fetch_page(client: httpx.AsyncClient, offset: int) -> list[dict[str, Any]]:
    params = {"$limit": NYC_OPEN_DATA_LIMIT, "$offset": offset}
    response = await client.get(
        f"{NYC_OPEN_DATA_BASE}/{NYC_DEMOGRAPHICS_DATASET}.json",
        params=params,
    )
    response.raise_for_status()
    return response.json()


def _build_metrics(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "jurisdiction": row.get("jurisdiction_name"),
        "population": {
            "total": _parse_int(row.get("count_participants")),
            "male": _parse_int(row.get("count_male")),
            "female": _parse_int(row.get("count_female")),
        },
        "age": {
            "under18": _parse_float(row.get("percent_18")),
            "age19to64": _parse_float(row.get("percent_19_to_64")),
            "age65plus": _parse_float(row.get("percent_65")),
        },
        "ethnicity": {
            "asian": _parse_float(row.get("percent_asian_non_hispanic")),
            "black": _parse_float(row.get("percent_black_non_hispanic")),
            "hispanic": _parse_float(row.get("percent_hispanic_latino")),
            "white": _parse_float(row.get("percent_white_non_hispanic")),
            "other": _parse_float(row.get("percent_other")),
        },
        "socioeconomic": {
            "receives_public_assistance": _parse_float(
                row.get("percent_receives_public_assistance")
            ),
            "poverty": _parse_float(row.get("percent_poverty")),
        },
        "raw": row,
    }


async def _get_or_create_dataset(conn) -> str:
    name = "NYC Demographic Statistics By Zip Code"
    source = f"NYC Open Data: {NYC_DEMOGRAPHICS_DATASET}"
    row = await conn.fetchrow(
        "select id from public_datasets where name = $1 and source = $2",
        name,
        source,
    )
    if row:
        return row["id"]
    created = await conn.fetchrow(
        """
        insert into public_datasets (name, source, description)
        values ($1, $2, $3)
        returning id
        """,
        name,
        source,
        "Census-style demographics by modified ZCTA (NYC Open Data).",
    )
    return created["id"]


async def ingest_nyc_open_data(pool) -> int:
    total = 0
    async with httpx.AsyncClient(timeout=30) as client:
        async with pool.acquire() as conn:
            dataset_id = await _get_or_create_dataset(conn)
            offset = 0
            while True:
                rows = await _fetch_page(client, offset)
                if not rows:
                    break
                for row in rows:
                    zip_code = clean_zip(row.get("zip_code"))
                    if not zip_code:
                        continue
                    metrics = _build_metrics(row)
                    recorded_at = datetime.now(timezone.utc)

                    last = await conn.fetchrow(
                        """
                        select metrics
                        from public_dataset_metrics
                        where dataset_id = $1 and geo_unit_id = $2
                        order by recorded_at desc
                        limit 1
                        """,
                        dataset_id,
                        zip_code,
                    )
                    if last and last["metrics"] == metrics:
                        continue
                    await conn.execute(
                        """
                        insert into public_dataset_metrics (
                            dataset_id,
                            geo_unit_id,
                            metrics,
                            recorded_at
                        )
                        values ($1,$2,$3,$4)
                        """,
                        dataset_id,
                        zip_code,
                        metrics,
                        recorded_at,
                    )
                    total += 1
                offset += NYC_OPEN_DATA_LIMIT
    return total
