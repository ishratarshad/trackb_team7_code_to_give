"""
Local Dataset Ingestion for ACS Demographics and USDA Food Access Data

Reads from local CSV files in LemonTreeDatasets/ folder and ingests into the database.
Provides demographics by census tract and food desert indicators.

Usage:
    python -m ingest.run_ingestion --acs
    python -m ingest.run_ingestion --usda
"""

from __future__ import annotations

import csv
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

# Base path for dataset files
DATASETS_BASE = Path(__file__).parent.parent.parent / "LemonTreeDatasets"


def _parse_int(value: Any) -> int:
    """Safely parse an integer value."""
    if value is None or value == "":
        return 0
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return 0


def _parse_float(value: Any) -> float:
    """Safely parse a float value."""
    if value is None or value == "":
        return 0.0
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def _read_csv(filepath: Path) -> list[dict[str, Any]]:
    """Read a CSV file and return list of row dicts."""
    if not filepath.exists():
        print(f"Warning: File not found: {filepath}")
        return []

    with open(filepath, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        return list(reader)


# =============================================================================
# ACS Demographics Ingestion
# =============================================================================

def _build_acs_metrics(row: dict[str, Any]) -> dict[str, Any]:
    """Build metrics object from ACS merged data row."""
    return {
        "tract_name": row.get("NAME", ""),
        "state": row.get("state_name", ""),
        "population": {
            "total": _parse_int(row.get("race_total")),
            "white": _parse_int(row.get("white_non_hispanic")),
            "black": _parse_int(row.get("black_alone")),
            "asian": _parse_int(row.get("asian_alone")),
            "hispanic": _parse_int(row.get("hispanic_latino")),
        },
        "ethnicity_pct": {
            "white": round(_parse_float(row.get("white_non_hispanic")) / max(_parse_float(row.get("race_total")), 1) * 100, 1),
            "black": round(_parse_float(row.get("black_alone")) / max(_parse_float(row.get("race_total")), 1) * 100, 1),
            "asian": round(_parse_float(row.get("asian_alone")) / max(_parse_float(row.get("race_total")), 1) * 100, 1),
            "hispanic": round(_parse_float(row.get("hispanic_latino")) / max(_parse_float(row.get("race_total")), 1) * 100, 1),
        },
        "income": {
            "median_household": _parse_int(row.get("median_household_income")),
        },
        "poverty": {
            "universe_total": _parse_int(row.get("poverty_universe_total")),
            "below_50pct": _parse_int(row.get("below_50pct_poverty")),
            "50_to_99pct": _parse_int(row.get("50_to_99pct_poverty")),
            "rate_pct": _parse_float(row.get("poverty_rate_pct", 0)),
        },
        "snap": {
            "total_households": _parse_int(row.get("total_households")),
            "snap_households": _parse_int(row.get("snap_households")),
            "rate_pct": _parse_float(row.get("snap_rate_pct", 0)),
        },
    }


async def _get_or_create_acs_dataset(conn, state: str) -> str:
    """Get or create the ACS dataset record."""
    name = f"ACS Demographics - {state}"
    source = f"US Census Bureau ACS 5-Year Estimates (2018-2022)"

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
        f"Census tract demographics for {state}: race/ethnicity, income, poverty, SNAP enrollment.",
    )
    return created["id"]


async def ingest_acs_data(pool, state: str = "NY") -> int:
    """
    Ingest ACS demographics data from local CSV files.

    Args:
        pool: Database connection pool
        state: State to ingest ("NY" or "NJ")

    Returns:
        Number of records ingested
    """
    filepath = DATASETS_BASE / "ACS" / state / f"acs_merged_{state.lower()}.csv"
    rows = _read_csv(filepath)

    if not rows:
        print(f"No ACS data found for {state}")
        return 0

    total = 0
    async with pool.acquire() as conn:
        dataset_id = await _get_or_create_acs_dataset(conn, state)
        recorded_at = datetime.now(timezone.utc)

        for row in rows:
            geoid = row.get("GEOID", "").strip()
            if not geoid:
                continue

            metrics = _build_acs_metrics(row)

            # Check if we already have this exact data
            last = await conn.fetchrow(
                """
                select metrics
                from public_dataset_metrics
                where dataset_id = $1 and geo_unit_id = $2
                order by recorded_at desc
                limit 1
                """,
                dataset_id,
                geoid,
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
                values ($1, $2, $3, $4)
                """,
                dataset_id,
                geoid,
                metrics,
                recorded_at,
            )
            total += 1

    print(f"Ingested {total} ACS records for {state}")
    return total


# =============================================================================
# USDA Food Access Ingestion
# =============================================================================

def _build_usda_metrics(row: dict[str, Any]) -> dict[str, Any]:
    """Build metrics object from USDA Food Access data row."""
    return {
        "county": row.get("County", ""),
        "state": row.get("State", ""),
        "urban": _parse_int(row.get("Urban")) == 1,
        "population_2010": _parse_int(row.get("Pop2010")),
        "food_desert": {
            "lila_1_10": _parse_int(row.get("LILATracts_1And10")) == 1,
            "lila_half_10": _parse_int(row.get("LILATracts_halfAnd10")) == 1,
            "lila_vehicle": _parse_int(row.get("LILATracts_Vehicle")) == 1,
            "low_income": _parse_int(row.get("LowIncomeTracts")) == 1,
            "hunv_flag": _parse_int(row.get("HUNVFlag")) == 1,
        },
        "access": {
            "la_half_mile": _parse_int(row.get("LATracts_half")) == 1,
            "la_1_mile": _parse_int(row.get("LATracts1")) == 1,
            "la_10_mile": _parse_int(row.get("LATracts10")) == 1,
            "la_20_mile": _parse_int(row.get("LATracts20")) == 1,
        },
        "population": {
            "low_access_1_10": _parse_int(row.get("LAPOP1_10")),
            "low_income_low_access": _parse_int(row.get("LALOWI1_10")),
            "low_income_total": _parse_int(row.get("TractLOWI")),
            "seniors": _parse_int(row.get("TractSeniors")),
            "kids": _parse_int(row.get("TractKids")),
            "no_vehicle_households": _parse_int(row.get("TractHUNV")),
        },
        "demographics": {
            "black": _parse_int(row.get("TractBlack")),
            "white": _parse_int(row.get("TractWhite")),
            "asian": _parse_int(row.get("TractAsian")),
            "hispanic": _parse_int(row.get("TractHispanic")),
        },
        "snap_households": _parse_int(row.get("TractSNAP")),
        "poverty_rate": _parse_float(row.get("PovertyRate")),
        "median_family_income": _parse_int(row.get("MedianFamilyIncome")),
    }


async def _get_or_create_usda_dataset(conn, state: str) -> str:
    """Get or create the USDA Food Access dataset record."""
    name = f"USDA Food Access - {state}"
    source = "USDA Economic Research Service Food Access Research Atlas (2019)"

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
        f"Food desert indicators and access metrics by census tract for {state}.",
    )
    return created["id"]


async def ingest_usda_data(pool, state: str = "ny") -> int:
    """
    Ingest USDA Food Access data from local CSV files.

    Args:
        pool: Database connection pool
        state: State to ingest ("ny" or "nj")

    Returns:
        Number of records ingested
    """
    filepath = DATASETS_BASE / "USDA_FoodAccess" / f"{state.lower()}-food-access-usda.csv"
    rows = _read_csv(filepath)

    if not rows:
        print(f"No USDA data found for {state}")
        return 0

    total = 0
    async with pool.acquire() as conn:
        dataset_id = await _get_or_create_usda_dataset(conn, state.upper())
        recorded_at = datetime.now(timezone.utc)

        for row in rows:
            # USDA uses CensusTract as integer - pad to 11 chars for GEOID
            census_tract = row.get("CensusTract", "")
            if not census_tract:
                continue
            geoid = str(census_tract).zfill(11)

            metrics = _build_usda_metrics(row)

            # Check for existing identical data
            last = await conn.fetchrow(
                """
                select metrics
                from public_dataset_metrics
                where dataset_id = $1 and geo_unit_id = $2
                order by recorded_at desc
                limit 1
                """,
                dataset_id,
                geoid,
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
                values ($1, $2, $3, $4)
                """,
                dataset_id,
                geoid,
                metrics,
                recorded_at,
            )
            total += 1

    print(f"Ingested {total} USDA Food Access records for {state.upper()}")
    return total


# =============================================================================
# Combined Ingestion
# =============================================================================

async def ingest_all_local_datasets(pool) -> dict[str, int]:
    """
    Ingest all local datasets (ACS + USDA for NY and NJ).

    Returns:
        Dict with counts per dataset
    """
    results = {}

    # ACS Demographics
    results["acs_ny"] = await ingest_acs_data(pool, "NY")
    results["acs_nj"] = await ingest_acs_data(pool, "NJ")

    # USDA Food Access
    results["usda_ny"] = await ingest_usda_data(pool, "ny")
    results["usda_nj"] = await ingest_usda_data(pool, "nj")

    return results
