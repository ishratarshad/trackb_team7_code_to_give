"""Build supply profile from normalized foods."""

from typing import Optional

ALLOWED_CATEGORIES = frozenset(
    {"staples", "protein", "fruit", "vegetables", "dairy", "canned_or_processed", "grains"}
)


def build_supply_profile(
    pantry_id: str,
    raw_tags: list[str],
    normalized_foods: list[dict],
    dietary_tags: list[str],
    cultural_tags: list[str],
    metadata: Optional[dict] = None,
) -> dict:
    """
    Compute category distribution from unique normalized items and build full profile.

    Category distribution counts unique normalized foods per category (deduplication),
    not raw tags. E.g. "white rice" and "bag of rice" → "rice" counts as 1 staples item.
    """
    # Unique normalized items per category
    seen: set[tuple[str, str]] = set()
    category_counts: dict[str, int] = {}

    for item in normalized_foods:
        norm = item.get("normalized", "").strip().lower()
        cat = item.get("category", "").strip().lower()
        if cat not in ALLOWED_CATEGORIES:
            cat = "staples"  # fallback for unexpected category
        key = (norm, cat)
        if key not in seen:
            seen.add(key)
            category_counts[cat] = category_counts.get(cat, 0) + 1

    total = sum(category_counts.values())
    category_distribution = (
        {k: round(100.0 * v / total, 1) for k, v in category_counts.items()}
        if total > 0
        else {}
    )

    return {
        "pantry_id": pantry_id,
        "metadata": metadata,
        "raw_tags": raw_tags,
        "normalized_foods": normalized_foods,
        "category_distribution": category_distribution,
        "dietary_tags": dietary_tags,
        "cultural_tags": cultural_tags,
    }
