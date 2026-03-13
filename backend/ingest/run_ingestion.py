from __future__ import annotations

import argparse
import asyncio
from datetime import datetime, timezone

from app.db import create_pool
from ingest.lemontree import ingest_lemontree
from ingest.nyc_open_data import ingest_nyc_open_data


async def run_once(run_lemontree: bool, run_nyc: bool) -> None:
    pool = await create_pool()
    try:
        if run_lemontree:
            count = await ingest_lemontree(pool)
            print(f"[{datetime.now(timezone.utc).isoformat()}] Lemontree ingested: {count}")
        if run_nyc:
            count = await ingest_nyc_open_data(pool)
            print(f"[{datetime.now(timezone.utc).isoformat()}] NYC Open Data ingested: {count}")
    finally:
        await pool.close()


async def run_loop(run_lemontree: bool, run_nyc: bool, interval_minutes: int) -> None:
    while True:
        await run_once(run_lemontree, run_nyc)
        await asyncio.sleep(interval_minutes * 60)


def main() -> None:
    parser = argparse.ArgumentParser(description="Run external data ingestion.")
    parser.add_argument("--lemontree", action="store_true", help="Ingest Lemontree resources.")
    parser.add_argument("--nyc", action="store_true", help="Ingest NYC Open Data demographics.")
    parser.add_argument(
        "--interval-min",
        type=int,
        default=0,
        help="Run continuously every N minutes (0 = run once).",
    )
    args = parser.parse_args()

    run_lemontree = args.lemontree or not args.nyc
    run_nyc = args.nyc or not args.lemontree

    if args.interval_min > 0:
        asyncio.run(run_loop(run_lemontree, run_nyc, args.interval_min))
    else:
        asyncio.run(run_once(run_lemontree, run_nyc))


if __name__ == "__main__":
    main()
