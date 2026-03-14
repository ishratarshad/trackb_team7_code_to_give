"""Tests for resource feedback (ResourceReview) module."""

import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from feedback.issues import extract_issues, aggregate_issue_counts
from feedback.models import CreateFeedbackReviewRequest, FeedbackReview
from feedback.repository import LocalJsonFeedbackRepository
from feedback.service import FeedbackService


# --- Issue extraction tests ---


def test_extract_long_wait_times():
    review = {"waitTimeMinutes": 45}
    assert "long_wait_times" in extract_issues(review)
    review["waitTimeMinutes"] = 50
    assert "long_wait_times" in extract_issues(review)
    review["waitTimeMinutes"] = 44
    assert "long_wait_times" not in extract_issues(review)


def test_extract_inaccurate_information():
    review = {"informationAccurate": False}
    assert "inaccurate_information" in extract_issues(review)
    review["informationAccurate"] = True
    assert "inaccurate_information" not in extract_issues(review)


def test_extract_inconsistent_hours():
    review = {"text": "Hours were wrong when I arrived"}
    assert "inconsistent_hours" in extract_issues(review)
    review = {"didNotAttendReason": "Closed when I got there"}
    assert "inconsistent_hours" in extract_issues(review)


def test_extract_service_disruption():
    review = {"text": "They had shut down for the day"}
    assert "service_disruption" in extract_issues(review)
    review = {"didNotAttendReason": "Wasn't open"}
    assert "service_disruption" in extract_issues(review)


def test_extract_inventory_shortage():
    review = {"text": "They ran out of everything"}
    assert "inventory_shortage" in extract_issues(review)
    review = {"text": "Limited options"}
    assert "inventory_shortage" in extract_issues(review)


def test_extract_lack_of_specific_food_options():
    review = {"text": "They didn't have any produce"}
    assert "lack_of_specific_food_options" in extract_issues(review)
    review = {"text": "No halal options"}
    assert "lack_of_specific_food_options" in extract_issues(review)


def test_extract_transportation_access_barrier():
    review = {"text": "Too far and no bus route"}
    assert "transportation_access_barrier" in extract_issues(review)
    review = {"didNotAttendReason": "Transport was an issue"}
    assert "transportation_access_barrier" in extract_issues(review)


def test_aggregate_issue_counts():
    reviews = [
        {"issueLabels": ["long_wait_times", "inaccurate_information"]},
        {"issueLabels": ["long_wait_times"]},
    ]
    counts = aggregate_issue_counts(reviews)
    assert counts["long_wait_times"] == 2
    assert counts["inaccurate_information"] == 1


# --- Repository tests ---


def test_repository_create_list_get(tmp_path):
    path = tmp_path / "feedback.json"
    repo = LocalJsonFeedbackRepository(path=path)
    review = FeedbackReview(
        id="r1",
        attended=True,
        createdAt="2025-01-01T12:00:00Z",
        deletedAt=None,
        didNotAttendReason=None,
        informationAccurate=True,
        rating=4.0,
        resourceId="res_1",
        issueLabels=["long_wait_times"],
    )
    repo.create_review(review)
    assert path.exists()
    listed = repo.list_reviews()
    assert len(listed) == 1
    assert listed[0].id == "r1"
    got = repo.get_review("r1")
    assert got and got.id == "r1"


def test_repository_soft_delete(tmp_path):
    path = tmp_path / "feedback.json"
    repo = LocalJsonFeedbackRepository(path=path)
    review = FeedbackReview(
        id="r2",
        attended=True,
        createdAt="2025-01-01T12:00:00Z",
        deletedAt=None,
        resourceId="res_1",
        rating=4.0,
        issueLabels=[],
    )
    repo.create_review(review)
    ok = repo.soft_delete_review("r2")
    assert ok
    got = repo.get_review("r2")
    assert got is None
    listed = repo.list_reviews()
    assert len(listed) == 0


# --- Service tests ---


def test_service_create_normalizes_fields(tmp_path):
    repo = LocalJsonFeedbackRepository(path=tmp_path / "fb.json")
    svc = FeedbackService(repository=repo)
    payload = CreateFeedbackReviewRequest(
        resourceId="res_1",
        attended=True,
        didNotAttendReason="some reason",
        rating=4,
        shareTextWithResource=None,
    )
    created = svc.create_review(payload)
    assert created.id
    assert created.createdAt
    assert created.didNotAttendReason is None
    assert created.shareTextWithResource is False


def test_service_summary(tmp_path):
    repo = LocalJsonFeedbackRepository(path=tmp_path / "fb.json")
    svc = FeedbackService(repository=repo)
    svc.create_review(
        CreateFeedbackReviewRequest(resourceId="res_1", rating=4, waitTimeMinutes=20)
    )
    svc.create_review(
        CreateFeedbackReviewRequest(resourceId="res_1", rating=5, waitTimeMinutes=30)
    )
    summary = svc.summarize_reviews(resource_id="res_1")
    assert summary.total_reviews == 2
    assert summary.average_rating == 4.5
    assert summary.average_wait_time == 25.0


# --- Route tests (require backend app) ---


def test_post_resource_review_fastapi(tmp_path, monkeypatch):
    """POST /resource-reviews creates a review and returns issueLabels."""
    import sys
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
    from feedback.service import FeedbackService
    from feedback.repository import LocalJsonFeedbackRepository

    repo = LocalJsonFeedbackRepository(path=tmp_path / "feedback_store.json")
    svc = FeedbackService(repository=repo)
    monkeypatch.setattr("feedback.routes._service", svc)

    from app import main
    from fastapi.testclient import TestClient
    from tests.conftest import FakePool

    pool = FakePool()
    async def fake_create():
        return pool
    async def fake_health(_):
        return True
    monkeypatch.setattr(main, "create_pool", fake_create)
    monkeypatch.setattr(main, "db_health_check", fake_health)

    with TestClient(main.app) as client:
        payload = {
        "resourceId": "resource_foodbank",
        "authorId": "client_123",
        "attended": False,
        "didNotAttendReason": "Location was closed when I arrived",
        "rating": 1,
        "text": "Hours were wrong and I wasted a trip",
        "waitTimeMinutes": 0,
        "informationAccurate": False,
            "shareTextWithResource": False,
        }
        resp = client.post("/resource-reviews", json=payload)
        assert resp.status_code == 200
        body = resp.json()
        assert body["resourceId"] == "resource_foodbank"
        assert "id" in body
        assert "createdAt" in body
        assert "issueLabels" in body
        assert "inconsistent_hours" in body["issueLabels"] or "inaccurate_information" in body["issueLabels"]


def test_get_resource_reviews_summary(tmp_path, monkeypatch):
    import sys
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
    from feedback.service import FeedbackService
    from feedback.repository import LocalJsonFeedbackRepository

    repo = LocalJsonFeedbackRepository(path=tmp_path / "feedback_store.json")
    svc = FeedbackService(repository=repo)
    monkeypatch.setattr("feedback.routes._service", svc)
    from app import main
    from fastapi.testclient import TestClient
    from tests.conftest import FakePool

    pool = FakePool()
    async def fake_create():
        return pool
    async def fake_health(_):
        return True
    monkeypatch.setattr(main, "create_pool", fake_create)
    monkeypatch.setattr(main, "db_health_check", fake_health)

    with TestClient(main.app) as client:
        client.post(
            "/resource-reviews",
            json={"resourceId": "r1", "rating": 4, "attended": True},
        )
        resp = client.get("/resource-reviews/summary")
        assert resp.status_code == 200
        body = resp.json()
        assert body["total_reviews"] >= 1
        assert "average_rating" in body
        assert "issue_counts" in body


def test_resource_reviews_health(monkeypatch):
    from app import main
    from fastapi.testclient import TestClient
    from tests.conftest import FakePool

    pool = FakePool()
    async def fake_create():
        return pool
    async def fake_health(_):
        return True
    monkeypatch.setattr(main, "create_pool", fake_create)
    monkeypatch.setattr(main, "db_health_check", fake_health)
    with TestClient(main.app) as client:
        resp = client.get("/resource-reviews/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"
