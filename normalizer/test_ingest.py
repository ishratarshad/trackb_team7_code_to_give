"""Tests for the ingest module."""

import json
from pathlib import Path
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from normalizer.ingest import extract_labels, load_classifier_export, process_export

SAMPLE_FILE = Path(__file__).resolve().parent.parent / "data" / "sample_classifier_output.json"

MOCK_PROFILE = {
    "pantry_id": "pantry_alpha",
    "raw_tags": ["macaroni and cheese", "white rice"],
    "normalized_foods": [],
    "category_distribution": {},
    "dietary_tags": [],
    "cultural_tags": [],
}


def test_load_export():
    """Load export returns 5 image results."""
    results = load_classifier_export(str(SAMPLE_FILE))
    assert len(results) == 5


def test_extract_labels_filters_low_confidence():
    """Labels with confidence < 0.7 are excluded."""
    img = {
        "rawTags": [
            {"label": "keep me", "confidence": 0.9, "category": "canned"},
            {"label": "exclude me", "confidence": 0.5, "category": "other"},
            {"label": "also exclude", "confidence": 0.65, "category": "other"},
        ]
    }
    labels = extract_labels(img)
    assert labels == ["keep me"]


def test_extract_labels_filters_vague():
    """'canned goods' and 'packaged goods' are excluded."""
    img = {
        "rawTags": [
            {"label": "canned goods", "confidence": 0.9, "category": "canned"},
            {"label": "packaged goods", "confidence": 0.9, "category": "packaged"},
            {"label": "Del Monte green beans", "confidence": 0.9, "category": "canned"},
        ]
    }
    labels = extract_labels(img)
    assert "canned goods" not in labels
    assert "packaged goods" not in labels
    assert "Del Monte green beans" in labels


def test_extract_labels_keeps_specific_items():
    """Specific food labels pass through."""
    img = {
        "rawTags": [
            {"label": "Cheese Club macaroni and cheese", "confidence": 0.95, "category": "packaged"},
            {"label": "various", "confidence": 0.9, "category": "other"},
        ]
    }
    labels = extract_labels(img)
    assert "Cheese Club macaroni and cheese" in labels
    assert "various" not in labels


@patch("normalizer.ingest.normalize_tags")
def test_process_export_groups_by_pantry(mock_normalize):
    """Pantries with multiple images are merged into one profile each."""
    def fake_normalize(raw_tags, pantry_id):
        return {**MOCK_PROFILE, "pantry_id": pantry_id, "raw_tags": raw_tags}

    mock_normalize.side_effect = fake_normalize

    profiles = process_export(str(SAMPLE_FILE))

    # 3 unique resourceIds: pantry_alpha, pantry_beta, pantry_gamma
    assert len(profiles) == 3
    pantry_ids = {p["pantry_id"] for p in profiles}
    assert pantry_ids == {"pantry_alpha", "pantry_beta", "pantry_gamma"}

    # pantry_alpha: 2 images, labels merged (excluding vague/low-conf)
    # img001: macaroni, rice (exclude "canned goods", "low confidence item")
    # img002: soup, green beans (exclude "packaged goods")
    alpha_profile = next(p for p in profiles if p["pantry_id"] == "pantry_alpha")
    raw = alpha_profile["raw_tags"]
    assert "Cheese Club macaroni and cheese" in raw
    assert "Jack & the Beanstalk long grain white rice" in raw
    assert "Campbell's Chicken Noodle soup" in raw
    assert "Del Monte green beans" in raw
    assert "canned goods" not in raw
    assert "packaged goods" not in raw


@patch("normalizer.ingest.normalize_tags")
def test_batch_endpoint(mock_normalize):
    """POST /normalize/batch with sample data returns profiles for all unique resourceIds."""

    def fake_normalize(raw_tags, pantry_id):
        return {**MOCK_PROFILE, "pantry_id": pantry_id, "raw_tags": raw_tags}

    mock_normalize.side_effect = fake_normalize

    from normalizer.main import app
    client = TestClient(app)

    with open(SAMPLE_FILE, encoding="utf-8") as f:
        data = json.load(f)

    response = client.post("/normalize/batch", json={"results": data["results"]})

    assert response.status_code == 200
    body = response.json()
    assert body["pantries_processed"] == 3
    assert len(body["profiles"]) == 3
    pantry_ids = {p["pantry_id"] for p in body["profiles"]}
    assert pantry_ids == {"pantry_alpha", "pantry_beta", "pantry_gamma"}
