from __future__ import annotations

import asyncio
import os

from ingest.run_ingestion import run_once


def _flag(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "y"}


def main() -> None:
    run_lemontree = _flag("INGEST_LEMONTREE", True)
    run_nyc = _flag("INGEST_NYC", True)
    classifier_path = os.getenv("CLASSIFIER_OUTPUT_PATH")
    supply_path = os.getenv("SUPPLY_PROFILES_PATH")

    asyncio.run(run_once(run_lemontree, run_nyc, classifier_path, supply_path))


if __name__ == "__main__":
    main()
