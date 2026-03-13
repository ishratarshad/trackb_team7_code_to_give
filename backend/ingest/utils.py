from __future__ import annotations

from datetime import datetime, timezone
from typing import Any


def decode_superjson(payload: Any) -> Any:
    if isinstance(payload, dict) and "json" in payload and "meta" in payload:
        return payload["json"]
    return payload


def parse_iso_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            return dt.replace(tzinfo=timezone.utc)
        return dt
    except ValueError:
        return None


def _weekday_name(dt: datetime) -> str:
    return ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"][
        dt.weekday()
    ]


def build_schedule_from_occurrences(
    occurrences: list[dict] | None,
) -> dict[str, list[list[str]]] | None:
    if not occurrences:
        return None
    schedule: dict[str, list[list[str]]] = {}
    for occ in occurrences:
        start = parse_iso_datetime(occ.get("startTime") or occ.get("start_time"))
        end = parse_iso_datetime(occ.get("endTime") or occ.get("end_time"))
        if not start or not end:
            continue
        day = _weekday_name(start)
        schedule.setdefault(day, []).append(
            [start.strftime("%H:%M"), end.strftime("%H:%M")]
        )
    return schedule or None


def is_open_now(
    occurrences: list[dict] | None, now: datetime | None = None
) -> bool | None:
    if not occurrences:
        return None
    current = now or datetime.now(timezone.utc)
    for occ in occurrences:
        if occ.get("skippedAt") or occ.get("skipped_at"):
            continue
        start = parse_iso_datetime(occ.get("startTime") or occ.get("start_time"))
        end = parse_iso_datetime(occ.get("endTime") or occ.get("end_time"))
        if not start or not end:
            continue
        if start <= current <= end:
            return True
    return False


def resource_kind_from_type(value: str | None) -> str:
    if isinstance(value, dict):
        value = value.get("id") or value.get("name")
    if not value:
        return "other"
    normalized = value.strip().upper()
    if normalized in {"FOOD_PANTRY", "PANTRY"}:
        return "pantry"
    if normalized in {"SOUP_KITCHEN", "SOUPKITCHEN"}:
        return "soup_kitchen"
    return "other"


def pick_first(*values: Any) -> Any:
    for value in values:
        if value is not None and value != "":
            return value
    return None
