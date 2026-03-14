"""Feedback service: create, list, get, soft-delete, and summarize reviews."""

import uuid
from datetime import datetime, timezone
from typing import Any

from feedback.issues import extract_issues
from feedback.models import CreateFeedbackReviewRequest, FeedbackReview, FeedbackSummary
from feedback.repository import FeedbackRepository, LocalJsonFeedbackRepository


def _now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"


def _normalize_fields(payload: dict[str, Any]) -> dict[str, Any]:
    """Normalize request fields for persistence per spec."""
    out: dict[str, Any] = dict(payload)
    for key in ("text", "didNotAttendReason", "photoUrl", "occurrenceId"):
        if key in out and out[key] == "":
            out[key] = None
    # attended true -> clear didNotAttendReason
    if out.get("attended") is True:
        out["didNotAttendReason"] = None
    # photoUrl null -> photoPublic null
    if out.get("photoUrl") is None:
        out["photoPublic"] = None
    # shareTextWithResource defaults to false
    if out.get("shareTextWithResource") is None:
        out["shareTextWithResource"] = False
    if "rating" in out and out["rating"] is not None:
        try:
            out["rating"] = float(out["rating"])
        except (TypeError, ValueError):
            out["rating"] = None
    if "waitTimeMinutes" in out and out["waitTimeMinutes"] is not None:
        try:
            out["waitTimeMinutes"] = int(out["waitTimeMinutes"])
        except (TypeError, ValueError):
            out["waitTimeMinutes"] = None
    return out


class FeedbackService:
    def __init__(self, repository: FeedbackRepository | None = None) -> None:
        self._repo = repository or LocalJsonFeedbackRepository()

    def create_review(self, payload: CreateFeedbackReviewRequest | dict[str, Any]) -> FeedbackReview:
        """Validate, generate id/createdAt, normalize, compute issueLabels, persist."""
        if isinstance(payload, dict):
            payload = CreateFeedbackReviewRequest(**payload)
        data = payload.model_dump(exclude_none=False)
        data = _normalize_fields(data)

        review_id = str(uuid.uuid4())
        createdAt = _now_iso()

        review_dict: dict[str, Any] = {
            "id": review_id,
            "attended": data.get("attended"),
            "createdAt": createdAt,
            "deletedAt": None,
            "didNotAttendReason": data.get("didNotAttendReason"),
            "informationAccurate": data.get("informationAccurate"),
            "photoPublic": data.get("photoPublic"),
            "photoUrl": data.get("photoUrl"),
            "rating": data.get("rating"),
            "shareTextWithResource": data.get("shareTextWithResource"),
            "text": data.get("text"),
            "waitTimeMinutes": data.get("waitTimeMinutes"),
            "authorId": data.get("authorId"),
            "resourceId": data.get("resourceId"),
            "occurrenceId": data.get("occurrenceId"),
            "userId": data.get("userId"),
            "reviewedByUserId": data.get("reviewedByUserId"),
        }
        review_dict["issueLabels"] = extract_issues(review_dict)

        review = FeedbackReview(**review_dict)
        self._repo.create_review(review)
        return review

    def list_reviews(
        self,
        resource_id: str | None = None,
        author_id: str | None = None,
        start_date: str | None = None,
        end_date: str | None = None,
        issue_category: str | None = None,
        attended: bool | None = None,
        information_accurate: bool | None = None,
        min_rating: float | None = None,
        max_rating: float | None = None,
        include_deleted: bool = False,
        limit: int = 100,
        offset: int = 0,
    ) -> list[FeedbackReview]:
        return self._repo.list_reviews(
            resource_id=resource_id,
            author_id=author_id,
            start_date=start_date,
            end_date=end_date,
            issue_category=issue_category,
            attended=attended,
            information_accurate=information_accurate,
            min_rating=min_rating,
            max_rating=max_rating,
            include_deleted=include_deleted,
            limit=limit,
            offset=offset,
        )

    def get_review(self, review_id: str) -> FeedbackReview | None:
        return self._repo.get_review(review_id)

    def soft_delete_review(self, review_id: str) -> bool:
        return self._repo.soft_delete_review(review_id)

    def summarize_reviews(
        self,
        resource_id: str | None = None,
        start_date: str | None = None,
        end_date: str | None = None,
        issue_category: str | None = None,
        attended: bool | None = None,
        information_accurate: bool | None = None,
        min_rating: float | None = None,
        max_rating: float | None = None,
        include_deleted: bool = False,
    ) -> FeedbackSummary:
        return self._repo.summarize_reviews(
            resource_id=resource_id,
            start_date=start_date,
            end_date=end_date,
            issue_category=issue_category,
            attended=attended,
            information_accurate=information_accurate,
            min_rating=min_rating,
            max_rating=max_rating,
            include_deleted=include_deleted,
        )
