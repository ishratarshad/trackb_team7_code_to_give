"""Deterministic issue extraction from feedback reviews."""

from typing import Any

VALID_LABELS: frozenset[str] = frozenset({
    "long_wait_times",
    "inconsistent_hours",
    "inventory_shortage",
    "service_disruption",
    "lack_of_specific_food_options",
    "transportation_access_barrier",
    "inaccurate_information",
})

# Keyword matches per spec (case-insensitive substring)
# inconsistent_hours: "closed", "not open", "hours wrong", "wrong hours"
# service_disruption: "closed", "not open", "shut down", "wasn't open"
# inventory_shortage: "ran out", "no food", "limited", "sold out", "none left" (text only)
# lack_of_specific_food_options: "didn't have", "no produce", "no meat", "no halal", "no vegetables" (text only)
# transportation_access_barrier: "too far", "transport", "bus", "distance", "travel"


def _normalize_value(val: Any, key: str) -> Any:
    """Read value from dict supporting camelCase or snake_case."""
    if val is not None:
        return val
    snake = "".join(
        f"_{c.lower()}" if c.isupper() else c
        for c in key
    ).lstrip("_")
    return None


def _get_str(d: dict[str, Any], *keys: str) -> str:
    """Get concatenated string from dict keys (camelCase or snake_case)."""
    parts: list[str] = []
    for key in keys:
        val = d.get(key) or d.get(
            "".join(w.capitalize() if i else w for i, w in enumerate(key.split("_")))
        )
        if isinstance(val, str) and val.strip():
            parts.append(val.strip())
    return " ".join(parts).lower()


def _get_int(d: dict[str, Any], key: str) -> int | None:
    """Get int from dict (supports camelCase)."""
    val = d.get(key)
    if val is None:
        c = "".join(w.capitalize() if i else w for i, w in enumerate(key.split("_")))
        val = d.get(c)
    if val is None:
        return None
    try:
        return int(val)
    except (TypeError, ValueError):
        return None


def _get_bool(d: dict[str, Any], key: str) -> bool | None:
    """Get bool from dict (supports camelCase)."""
    val = d.get(key)
    if val is None:
        c = "".join(w.capitalize() if i else w for i, w in enumerate(key.split("_")))
        val = d.get(c)
    if val is None:
        return None
    if isinstance(val, bool):
        return val
    if isinstance(val, str):
        return val.lower() in ("true", "yes", "1")
    return bool(val)


def extract_issues(review_dict: dict[str, Any]) -> list[str]:
    """
    Deterministic issue extraction from a single review.

    Rules:
    - waitTimeMinutes >= 45 -> long_wait_times
    - informationAccurate == false -> inaccurate_information
    - text / didNotAttendReason keyword matches per LABEL_KEYWORDS
    """
    issues: set[str] = set()

    wait_min = _get_int(review_dict, "waitTimeMinutes")
    if wait_min is not None and wait_min >= 45:
        issues.add("long_wait_times")

    info_acc = _get_bool(review_dict, "informationAccurate")
    if info_acc is False:
        issues.add("inaccurate_information")

    text_only = _get_str(review_dict, "text")
    text_or_reason = _get_str(review_dict, "text", "didNotAttendReason")

    if text_or_reason:
        # long_wait_times: "long wait" (structured reason or free text)
        if "long wait" in text_or_reason:
            issues.add("long_wait_times")
        # inconsistent_hours: "closed", "not open", "hours wrong", "wrong hours", "hours changed"
        if any(k in text_or_reason for k in ("closed", "not open", "hours wrong", "wrong hours", "hours changed")):
            issues.add("inconsistent_hours")
        # service_disruption: "closed", "not open", "shut down", "wasn't open"
        if any(k in text_or_reason for k in ("closed", "not open", "shut down", "wasn't open")):
            issues.add("service_disruption")
        # inventory_shortage: also from didNotAttendReason ("no food left", "ran out", etc.)
        if any(k in text_or_reason for k in ("no food", "ran out", "limited", "sold out", "none left")):
            issues.add("inventory_shortage")
        # transportation_access_barrier: "too far", "transport", "bus", "distance", "travel"
        if any(k in text_or_reason for k in ("too far", "transport", "bus", "distance", "travel")):
            issues.add("transportation_access_barrier")
    if text_only:
        # inventory_shortage (text only): "ran out", "no food", "limited", "sold out", "none left"
        if any(k in text_only for k in ("ran out", "no food", "limited", "sold out", "none left")):
            issues.add("inventory_shortage")
        # lack_of_specific_food_options (text only): "didn't have", "no produce", "no meat", "no halal", "no vegetables"
        if any(k in text_only for k in ("didn't have", "no produce", "no meat", "no halal", "no vegetables")):
            issues.add("lack_of_specific_food_options")

    return sorted(issues & VALID_LABELS)


def aggregate_issue_counts(reviews: list[dict[str, Any]]) -> dict[str, int]:
    """Aggregate issue counts from stored issueLabels on each review (no recomputation)."""
    counts: dict[str, int] = {}
    for review in reviews:
        labels = review.get("issueLabels") or []
        for label in labels:
            if label in VALID_LABELS:
                counts[label] = counts.get(label, 0) + 1
    return counts
