"""
Development-only rule-based normalizer. Used when USE_MOCK_NORMALIZER=1.
Bypasses Gemini; produces same output shape for local dev when quota is exhausted.
"""

import os
import re

# (pattern_or_exact_match, normalized, category)
# Order matters: more specific patterns first
_MOCK_MAPPINGS = [
    # Rice variants
    (r"\b(white\s+)?rice\b", "rice", "staples"),
    (r"\bjasmine\s+rice\b", "rice", "staples"),
    (r"\bbag\s+of\s+rice\b", "rice", "staples"),
    (r"\blong\s+grain\s+(white\s+)?rice\b", "rice", "staples"),
    # Beans (green beans before generic beans)
    (r"\bgreen\s+beans?\b", "green beans", "vegetables"),
    (r"\bcanned\s+beans\b", "beans", "protein"),
    (r"\bblack\s+beans?\b", "beans", "protein"),
    (r"\bkidney\s+beans?\b", "beans", "protein"),
    (r"\bbeans\b", "beans", "protein"),
    # Fruit
    (r"\bbanana", "banana", "fruit"),
    (r"\bplantains?\b", "plantains", "fruit"),
    # Canned / processed
    (r"\bmacaroni\s+and\s+cheese\b", "macaroni and cheese", "canned_or_processed"),
    (r"\bchicken\s+noodle\s+soup\b", "chicken noodle soup", "canned_or_processed"),
    # Dairy
    (r"\bmilk\b", "milk", "dairy"),
    # Grains
    (r"\bbread\b", "bread", "grains"),
    (r"\blentils?\b", "lentils", "protein"),
    (r"\bchickpeas?\b", "chickpeas", "protein"),
    (r"\bnaan\b", "naan", "grains"),
    (r"\btortillas?\b", "tortillas", "grains"),
    (r"\bvegetable\s+oil\b", "oil", "staples"),
    (r"\boil\b", "oil", "staples"),
]

_FALLBACK_CATEGORY = "canned_or_processed"


def _normalize_label(label: str) -> tuple[str, str]:
    """Return (normalized, category)."""
    lower = label.lower().strip()
    for pattern, norm, cat in _MOCK_MAPPINGS:
        if re.search(pattern, lower):
            return (norm, cat)
    # Unknown: cleaned lowercase, fallback category
    cleaned = re.sub(r"\s+", " ", lower).strip()
    cleaned = re.sub(r"[^\w\s-]", "", cleaned).strip() or lower
    return (cleaned or "unknown", _FALLBACK_CATEGORY)


def mock_normalize(raw_tags: list[str]) -> tuple[list[dict], list[str], list[str]]:
    """
    Rule-based normalization. Returns (normalized_foods, dietary_tags, cultural_tags).
    Same format as Gemini output for build_supply_profile.
    """
    normalized_foods = []
    dietary_tags = []
    cultural_tags = []

    for tag in raw_tags:
        norm, cat = _normalize_label(tag)
        normalized_foods.append({
            "original_tag": tag,
            "normalized": norm,
            "category": cat,
        })

    return (normalized_foods, dietary_tags, cultural_tags)


def is_mock_enabled() -> bool:
    """True if USE_MOCK_NORMALIZER=1."""
    return os.environ.get("USE_MOCK_NORMALIZER") == "1"
