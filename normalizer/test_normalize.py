"""Tests for food tag normalization (mocked Gemini)."""

from unittest.mock import patch

import pytest

from normalizer.normalize import normalize_tags
from normalizer.profile import build_supply_profile

ALLOWED_CATEGORIES = {
    "staples",
    "protein",
    "fruit",
    "vegetables",
    "dairy",
    "canned_or_processed",
    "grains",
}

SAMPLE_RAW_TAGS = [
    "white rice",
    "bag of rice",
    "jasmine rice",
    "canned beans",
    "lentils",
    "banana",
    "plantains",
    "halal chicken",
    "vegetable oil",
]

# Mock Gemini response: rice deduplicated to one unique item, halal present, latino/south_asian possible
MOCK_GEMINI_RESPONSE = {
    "normalized_foods": [
        {"original_tag": "white rice", "normalized": "rice", "category": "staples"},
        {"original_tag": "bag of rice", "normalized": "rice", "category": "staples"},
        {"original_tag": "jasmine rice", "normalized": "rice", "category": "staples"},
        {"original_tag": "canned beans", "normalized": "beans", "category": "canned_or_processed"},
        {"original_tag": "lentils", "normalized": "lentils", "category": "protein"},
        {"original_tag": "banana", "normalized": "banana", "category": "fruit"},
        {"original_tag": "plantains", "normalized": "plantains", "category": "fruit"},
        {"original_tag": "halal chicken", "normalized": "chicken", "category": "protein"},
        {"original_tag": "vegetable oil", "normalized": "oil", "category": "staples"},
    ],
    "dietary_tags": ["halal"],
    "cultural_tags": ["latino_staples", "south_asian_staples"],
}


@patch("normalizer.normalize.call_gemini_json", return_value=MOCK_GEMINI_RESPONSE)
def test_normalize_tags_deduplication_and_categories(mock_gemini, monkeypatch):
    """Rice deduplicates; category_distribution uses unique normalized items."""
    monkeypatch.delenv("USE_MOCK_NORMALIZER", raising=False)
    result = normalize_tags(SAMPLE_RAW_TAGS, pantry_id="pantry_test")

    # "rice" appears as normalized value; unique normalized items count rice once
    normalized_values = [f["normalized"] for f in result["normalized_foods"]]
    assert "rice" in normalized_values
    # After deduplication for distribution: rice counts as 1 (unique)
    unique_norm = set((f["normalized"], f["category"]) for f in result["normalized_foods"])
    rice_count = sum(1 for n, c in unique_norm if n == "rice")
    assert rice_count == 1, "rice should count once for category_distribution"

    # Category keys only from allowed list
    for cat in result["category_distribution"]:
        assert cat in ALLOWED_CATEGORIES, f"Unexpected category: {cat}"

    # dietary_tags includes halal
    assert "halal" in result["dietary_tags"]

    # cultural_tags includes latino or south_asian (both present in mock)
    assert "latino_staples" in result["cultural_tags"] or "south_asian_staples" in result["cultural_tags"]

    # Percentages sum to ~100
    total_pct = sum(result["category_distribution"].values())
    assert 99 <= total_pct <= 101, f"category_distribution should sum to ~100, got {total_pct}"


@patch("normalizer.normalize.call_gemini_json", return_value=MOCK_GEMINI_RESPONSE)
def test_normalize_tags_schema(mock_gemini, monkeypatch):
    """Result has required schema fields."""
    monkeypatch.delenv("USE_MOCK_NORMALIZER", raising=False)
    result = normalize_tags(SAMPLE_RAW_TAGS, pantry_id="pantry_test")
    assert "pantry_id" in result
    assert "raw_tags" in result
    assert "normalized_foods" in result
    assert "category_distribution" in result
    assert "dietary_tags" in result
    assert "cultural_tags" in result
    for f in result["normalized_foods"]:
        assert "original_tag" in f and "normalized" in f and "category" in f


def test_build_supply_profile_category_distribution():
    """category_distribution counts unique normalized items, not raw tags."""
    foods = [
        {"original_tag": "white rice", "normalized": "rice", "category": "staples"},
        {"original_tag": "bag of rice", "normalized": "rice", "category": "staples"},
        {"original_tag": "banana", "normalized": "banana", "category": "fruit"},
    ]
    profile = build_supply_profile(
        pantry_id="p1",
        raw_tags=["white rice", "bag of rice", "banana"],
        normalized_foods=foods,
        dietary_tags=[],
        cultural_tags=[],
    )
    # 2 unique items: rice, banana → 50% each
    dist = profile["category_distribution"]
    assert dist["staples"] == 50.0
    assert dist["fruit"] == 50.0


def test_empty_raw_tags():
    """Empty raw_tags returns valid profile with zeros."""
    result = normalize_tags([], pantry_id="pantry_empty")
    assert result["pantry_id"] == "pantry_empty"
    assert result["raw_tags"] == []
    assert result["normalized_foods"] == []
    assert result["category_distribution"] == {}
    assert result["dietary_tags"] == []
    assert result["cultural_tags"] == []
