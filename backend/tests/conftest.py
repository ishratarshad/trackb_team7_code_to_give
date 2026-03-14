from __future__ import annotations

from datetime import datetime, timezone, timedelta
from typing import Any
from uuid import uuid4

import re
import pytest
from fastapi.testclient import TestClient

from app import main


class _FakeAcquire:
    def __init__(self, conn: "FakeConn"):
        self._conn = conn

    async def __aenter__(self) -> "FakeConn":
        return self._conn

    async def __aexit__(self, exc_type, exc, tb) -> None:
        return None


class FakeConn:
    def __init__(self, pool: "FakePool"):
        self._pool = pool

    async def execute(self, _query: str) -> None:
        return None

    async def fetchrow(self, query: str, *values: Any) -> dict | None:
        if "insert into pantries" in query:
            record = {
                "id": str(uuid4()),
                "name": values[0],
                "neighborhood": values[1],
                "address": values[2],
                "latitude": values[3],
                "longitude": values[4],
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc),
            }
            self._pool.pantries[record["id"]] = record
            self._pool.supply[record["id"]] = {
                "pantry_id": record["id"],
                "normalized_foods": [],
                "category_distribution": {},
                "updated_at": datetime.now(timezone.utc),
            }
            return record
        if "select * from pantries where id" in query:
            return self._pool.pantries.get(values[0])
        if "insert into feedback" in query:
            record = {
                "id": str(uuid4()),
                "pantry_id": values[0],
                "author_id": values[1],
                "attended": values[2],
                "did_not_attend_reason": values[3],
                "rating": values[4],
                "wait_time_min": values[5],
                "resource_type": values[6],
                "items_unavailable": values[7],
                "comment": values[8],
                "information_accurate": values[9],
                "photo_url": values[10],
                "photo_public": values[11],
                "share_text_with_resource": values[12],
                "occurrence_id": values[13],
                "user_id": values[14],
                "reviewed_by_user_id": values[15],
                "deleted_at": values[16],
                "issue_categories": values[17],
                "raw_payload": values[18],
                "created_at": values[19] or datetime.now(timezone.utc),
            }
            self._pool.feedback.append(record)
            return record
        if "select name, neighborhood from pantries" in query:
            pantry = self._pool.pantries.get(values[0])
            if not pantry:
                return None
            return {"name": pantry["name"], "neighborhood": pantry["neighborhood"]}
        if "count(*) as total_feedback" in query:
            rows = self._pool._filter_feedback(query, values)
            total = len(rows)
            avg_rating = sum(r["rating"] for r in rows) / total if total else None
            waits = [r["wait_time_min"] for r in rows if r["wait_time_min"] is not None]
            avg_wait = sum(waits) / len(waits) if waits else None
            return {
                "total_feedback": total,
                "avg_rating": avg_rating,
                "avg_wait_time_min": avg_wait,
            }
        if "from supply_profiles" in query:
            pantry_id = values[0]
            return self._pool.supply.get(pantry_id)
        if "from public_datasets" in query and "where id" in query:
            return self._pool.datasets.get(values[0])
        if "insert into reports" in query:
            record = {
                "id": str(uuid4()),
                "title": values[0],
                "filters": values[1],
                "generated_at": datetime.now(timezone.utc),
                "export_url": None,
            }
            self._pool.reports[record["id"]] = record
            return record
        if "from reports" in query:
            return self._pool.reports.get(values[0])
        return None

    async def fetch(self, query: str, *values: Any) -> list[dict]:
        if "from pantries" in query and "order by name" in query:
            rows = list(self._pool.pantries.values())
            if "where neighborhood" in query:
                neighborhood = values[0]
                rows = [r for r in rows if r["neighborhood"] == neighborhood]
            return rows
        if "group by f.resource_type" in query:
            rows = self._pool._filter_feedback(query, values)
            counts: dict[str, int] = {}
            for r in rows:
                counts[r["resource_type"]] = counts.get(r["resource_type"], 0) + 1
            return [{"resource_type": k, "count": v} for k, v in counts.items()]
        if "jsonb_array_elements_text" in query:
            rows = self._pool._filter_feedback(query, values)
            counts: dict[str, int] = {}
            for r in rows:
                for issue in r.get("issue_categories") or []:
                    counts[issue] = counts.get(issue, 0) + 1
            return [{"issue": k, "count": v} for k, v in counts.items()]
        if "select comment, items_unavailable" in query:
            rows = self._pool._filter_feedback(query, values)
            return [
                {"comment": r["comment"], "items_unavailable": r["items_unavailable"]}
                for r in rows
            ]
        if "date_trunc" in query:
            match = re.search(r"date_trunc\('([^']+)'", query)
            interval = match.group(1) if match else "day"
            rows = self._pool._filter_feedback(query, values)
            buckets: dict[datetime, dict[str, Any]] = {}
            for r in rows:
                dt = r["created_at"]
                if interval == "month":
                    bucket = dt.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
                elif interval == "week":
                    bucket = dt - timedelta(days=dt.weekday())
                    bucket = bucket.replace(hour=0, minute=0, second=0, microsecond=0)
                else:
                    bucket = dt.replace(hour=0, minute=0, second=0, microsecond=0)
                data = buckets.setdefault(bucket, {"total": 0, "ratings": [], "waits": []})
                data["total"] += 1
                data["ratings"].append(r["rating"])
                if r["wait_time_min"] is not None:
                    data["waits"].append(r["wait_time_min"])
            results = []
            for bucket, data in sorted(buckets.items()):
                results.append(
                    {
                        "bucket": bucket,
                        "total_feedback": data["total"],
                        "avg_rating": sum(data["ratings"]) / len(data["ratings"]),
                        "avg_wait_time_min": (
                            sum(data["waits"]) / len(data["waits"]) if data["waits"] else None
                        ),
                    }
                )
            return results
        if "from public_dataset_metrics" in query:
            dataset_id = values[0]
            metrics = [m for m in self._pool.dataset_metrics if m["dataset_id"] == dataset_id]
            if "geo_unit_id" in query and len(values) >= 2:
                metrics = [m for m in metrics if m["geo_unit_id"] == values[1]]
            limit = values[-1]
            return metrics[:limit]
        if "from public_datasets" in query:
            return list(self._pool.datasets.values())
        if "from feedback" in query and "join pantries" in query:
            rows = self._pool._filter_feedback(query, values)
            limit, offset = self._pool._extract_limit_offset(query, values)
            rows = rows[offset : offset + limit]
            enriched = []
            for r in rows:
                pantry = self._pool.pantries.get(r["pantry_id"])
                enriched.append(
                    {
                        **r,
                        "pantry_name": pantry["name"],
                        "pantry_neighborhood": pantry["neighborhood"],
                    }
                )
            return enriched
        if "select" in query and "total_feedback" in query and "group by" in query:
            rows = self._pool._filter_feedback(query, values)
            counts: dict[str, int] = {}
            for r in rows:
                counts[r["pantry_id"]] = counts.get(r["pantry_id"], 0) + 1
            results = []
            for pantry_id, total in counts.items():
                pantry = self._pool.pantries[pantry_id]
                results.append(
                    {
                        "pantry_id": pantry_id,
                        "pantry_name": pantry["name"],
                        "neighborhood": pantry["neighborhood"],
                        "latitude": pantry["latitude"],
                        "longitude": pantry["longitude"],
                        "total_feedback": total,
                    }
                )
            return results
        return []


class FakePool:
    def __init__(self):
        self.pantries: dict[str, dict] = {}
        self.feedback: list[dict] = []
        self.supply: dict[str, dict] = {}
        self.datasets: dict[str, dict] = {}
        self.dataset_metrics: list[dict] = []
        self.reports: dict[str, dict] = {}

        pantry_id = str(uuid4())
        self.pantries[pantry_id] = {
            "id": pantry_id,
            "name": "Holy Communion Lutheran Church",
            "neighborhood": "Chesilhurst",
            "address": None,
            "latitude": 39.72,
            "longitude": -74.88,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }
        self.supply[pantry_id] = {
            "pantry_id": pantry_id,
            "normalized_foods": [],
            "category_distribution": {},
            "updated_at": datetime.now(timezone.utc),
        }
        dataset_id = str(uuid4())
        self.datasets[dataset_id] = {
            "id": dataset_id,
            "name": "Census Demographics",
            "source": "census",
            "description": "Demo dataset",
            "ingested_at": datetime.now(timezone.utc),
        }
        self.dataset_metrics.append(
            {
                "dataset_id": dataset_id,
                "geo_unit_id": "08089",
                "metrics": {"median_income": 52000},
                "recorded_at": datetime.now(timezone.utc),
            }
        )

    def acquire(self) -> _FakeAcquire:
        return _FakeAcquire(FakeConn(self))

    async def close(self) -> None:
        return None

    def _extract_limit_offset(self, query: str, values: tuple[Any, ...]) -> tuple[int, int]:
        if "limit" in query and "offset" in query and len(values) >= 2:
            return values[-2], values[-1]
        return 100, 0

    def _filter_feedback(self, query: str, values: tuple[Any, ...]) -> list[dict]:
        import re

        rows = list(self.feedback)
        matches = re.finditer(
            r"(f\.pantry_id|p\.neighborhood|f\.resource_type|f\.created_at)\s*(>=|<=|=)\s*\$(\d+)",
            query,
        )
        for match in matches:
            field, op, idx = match.groups()
            value = values[int(idx) - 1]
            if field == "f.pantry_id":
                rows = [r for r in rows if r["pantry_id"] == value]
            elif field == "p.neighborhood":
                rows = [r for r in rows if self.pantries[r["pantry_id"]]["neighborhood"] == value]
            elif field == "f.resource_type":
                rows = [r for r in rows if r["resource_type"] == value]
            elif field == "f.created_at":
                if op == ">=":
                    rows = [r for r in rows if r["created_at"] >= value]
                elif op == "<=":
                    rows = [r for r in rows if r["created_at"] <= value]
        return rows


@pytest.fixture
def client(monkeypatch):
    pool = FakePool()

    async def fake_create_pool():
        return pool

    async def fake_db_health_check(_pool):
        return True

    monkeypatch.setattr(main, "create_pool", fake_create_pool)
    monkeypatch.setattr(main, "db_health_check", fake_db_health_check)

    with TestClient(main.app) as test_client:
        yield test_client
