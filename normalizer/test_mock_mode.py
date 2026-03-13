"""Tests for USE_MOCK_NORMALIZER development fallback."""

import json
import os
from pathlib import Path
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from normalizer.ingest import process_export, process_export_to_file
from normalizer.normalize import normalize_tags

SAMPLE_FILE = Path(__file__).resolve().parent.parent / "data" / "sample_classifier_output.json"


@pytest.fixture(autouse=True)
def mock_env(monkeypatch):
    """Ensure USE_MOCK_NORMALIZER=1 for mock tests. Restore after."""
    monkeypatch.setenv("USE_MOCK_NORMALIZER", "1")


@patch("normalizer.normalize.call_gemini_json")
def test_mock_mode_skips_gemini(mock_gemini):
    """When USE_MOCK_NORMALIZER=1, no Gemini call is made."""
    result = normalize_tags(["white rice", "banana"], pantry_id="test")

    mock_gemini.assert_not_called()
    assert result["pantry_id"] == "test"
    assert "normalized_foods" in result
    assert len(result["normalized_foods"]) == 2


def test_mock_normalize_sample_labels():
    """Mock produces expected mappings for sample labels."""
    tags = [
        "white rice",
        "Jack & the Beanstalk long grain white rice",
        "Cheese Club macaroni and cheese",
        "Del Monte green beans",
        "Great Value lentils",
        "store brand black beans",
        "banana",
        "vegetable oil",
    ]
    result = normalize_tags(tags, pantry_id="test")

    norms = {f["original_tag"]: f["normalized"] for f in result["normalized_foods"]}
    assert norms.get("white rice") == "rice"
    assert any("rice" in (norms.get(k) or "") for k in norms if "rice" in k.lower())
    assert any("macaroni" in (norms.get(k) or "").lower() for k in norms if "macaroni" in k.lower())
    assert any("green beans" in (norms.get(k) or "") for k in norms if "green beans" in k.lower())
    assert result["category_distribution"]


def test_process_export_to_file_mock_mode(tmp_path):
    """process_export_to_file works in mock mode on sample file."""
    out = tmp_path / "output.json"
    process_export_to_file(str(SAMPLE_FILE), str(out))

    data = json.loads(out.read_text(encoding="utf-8"))
    assert len(data) == 3
    pantry_ids = {p["pantry_id"] for p in data}
    assert pantry_ids == {"pantry_alpha", "pantry_beta", "pantry_gamma"}


def test_process_export_three_profiles_mock_mode():
    """process_export returns 3 pantry profiles for sample file in mock mode."""
    profiles = process_export(str(SAMPLE_FILE))
    assert len(profiles) == 3
    for p in profiles:
        assert "pantry_id" in p
        assert "raw_tags" in p
        assert "normalized_foods" in p
        assert "category_distribution" in p
        assert "dietary_tags" in p
        assert "cultural_tags" in p


def test_batch_endpoint_mock_mode():
    """POST /normalize/batch works in mock mode."""
    from normalizer.main import app
    client = TestClient(app)

    with open(SAMPLE_FILE, encoding="utf-8") as f:
        data = json.load(f)

    response = client.post("/normalize/batch", json={"results": data["results"]})

    assert response.status_code == 200
    body = response.json()
    assert body["pantries_processed"] == 3
    assert len(body["profiles"]) == 3
