from __future__ import annotations

import argparse
import asyncio
from datetime import datetime, timezone
from pathlib import Path

from app.db import create_pool
from ingest.lemontree import ingest_lemontree
from ingest.nyc_open_data import ingest_nyc_open_data
from ingest.pipeline_import import ingest_classifier_output, ingest_supply_profiles
from ingest.local_datasets import ingest_acs_data, ingest_usda_data, ingest_all_local_datasets


async def run_once(
    run_lemontree: bool,
    run_nyc: bool,
    run_acs: bool,
    run_usda: bool,
    classifier_path: str | None,
    supply_path: str | None,
) -> None:
    pool = await create_pool()
    try:
        if run_lemontree:
            count = await ingest_lemontree(pool)
            print(f"[{datetime.now(timezone.utc).isoformat()}] Lemontree ingested: {count}")
        if run_nyc:
            count = await ingest_nyc_open_data(pool)
            print(f"[{datetime.now(timezone.utc).isoformat()}] NYC Open Data ingested: {count}")
        if run_acs:
            count_ny = await ingest_acs_data(pool, "NY")
            count_nj = await ingest_acs_data(pool, "NJ")
            print(f"[{datetime.now(timezone.utc).isoformat()}] ACS ingested: NY={count_ny}, NJ={count_nj}")
        if run_usda:
            count_ny = await ingest_usda_data(pool, "ny")
            count_nj = await ingest_usda_data(pool, "nj")
            print(f"[{datetime.now(timezone.utc).isoformat()}] USDA Food Access ingested: NY={count_ny}, NJ={count_nj}")
        async with pool.acquire() as conn:
            if classifier_path:
                stats = await ingest_classifier_output(conn, Path(classifier_path))
                print(f"[{datetime.now(timezone.utc).isoformat()}] Classifier import: {stats}")
            if supply_path:
                stats = await ingest_supply_profiles(conn, Path(supply_path))
                print(f"[{datetime.now(timezone.utc).isoformat()}] Supply profiles import: {stats}")
    finally:
        await pool.close()


async def run_loop(
    run_lemontree: bool,
    run_nyc: bool,
    run_acs: bool,
    run_usda: bool,
    classifier_path: str | None,
    supply_path: str | None,
    interval_minutes: int,
) -> None:
    while True:
        await run_once(run_lemontree, run_nyc, run_acs, run_usda, classifier_path, supply_path)
        await asyncio.sleep(interval_minutes * 60)


def main() -> None:
    parser = argparse.ArgumentParser(description="Run external data ingestion.")
    parser.add_argument("--lemontree", action="store_true", help="Ingest Lemontree resources.")
    parser.add_argument("--nyc", action="store_true", help="Ingest NYC Open Data demographics.")
    parser.add_argument("--acs", action="store_true", help="Ingest ACS demographics from local CSV files.")
    parser.add_argument("--usda", action="store_true", help="Ingest USDA Food Access data from local CSV files.")
    parser.add_argument("--classifier-path", help="Path to classifier output JSON.")
    parser.add_argument("--supply-path", help="Path to supply profiles JSON.")
    parser.add_argument(
        "--interval-min",
        type=int,
        default=0,
        help="Run continuously every N minutes (0 = run once).",
    )
    args = parser.parse_args()

    # Determine which ingestions to run
    any_specified = args.lemontree or args.nyc or args.acs or args.usda
    run_lemontree = args.lemontree if any_specified else True
    run_nyc = args.nyc if any_specified else False
    run_acs = args.acs
    run_usda = args.usda

    classifier_path = args.classifier_path
    supply_path = args.supply_path

    if args.interval_min > 0:
        asyncio.run(
            run_loop(
                run_lemontree,
                run_nyc,
                run_acs,
                run_usda,
                classifier_path,
                supply_path,
                args.interval_min,
            )
        )
    else:
        asyncio.run(run_once(run_lemontree, run_nyc, run_acs, run_usda, classifier_path, supply_path))


if __name__ == "__main__":
    main()
