from __future__ import annotations

import re
from datetime import datetime, timezone

from app.models import FeedbackCreate

_WS_RE = re.compile(r"\s+")
_NON_ALNUM_UNDERSCORE_RE = re.compile(r"[^a-z0-9_]+")
_ZIP_RE = re.compile(r"(\d{5})")


def _collapse_ws(value: str) -> str:
    return _WS_RE.sub(" ", value).strip()


def clean_text(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = _collapse_ws(value)
    return cleaned or None


def clean_zip(zip_code: str | None) -> str | None:
    if not zip_code:
        return None
    match = _ZIP_RE.search(zip_code)
    return match.group(1) if match else None


def clean_name(value: str | None) -> str | None:
    if not value:
        return None
    return _collapse_ws(value)


def clean_neighborhood(value: str | None) -> str | None:
    if not value:
        return None
    cleaned = _collapse_ws(value)
    return cleaned.title()


def clean_issue_categories(values: list[str] | None) -> list[str] | None:
    if not values:
        return None
    cleaned: list[str] = []
    for raw in values:
        if not raw:
            continue
        lowered = _collapse_ws(raw.lower()).replace(" ", "_")
        normalized = _NON_ALNUM_UNDERSCORE_RE.sub("", lowered)
        if normalized:
            cleaned.append(normalized)
    return cleaned or None


def clean_feedback_payload(payload: FeedbackCreate) -> dict:
    data = payload.model_dump()
    data["items_unavailable"] = clean_text(data.get("items_unavailable"))
    data["comment"] = clean_text(data.get("comment"))
    data["did_not_attend_reason"] = clean_text(data.get("did_not_attend_reason"))
    data["issue_categories"] = clean_issue_categories(data.get("issue_categories"))
    created_at = data.get("created_at")
    if created_at is None:
        data["created_at"] = datetime.now(timezone.utc)
    return data
