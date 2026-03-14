"""Abstract feedback repository interface and LocalJsonFeedbackRepository implementation."""

from abc import ABC, abstractmethod
from pathlib import Path
from typing import Any

import os

from feedback.models import FeedbackReview, FeedbackSummary


class FeedbackRepository(ABC):
    """Abstract interface for feedback storage."""

    @abstractmethod
    def create_review(self, review: FeedbackReview) -> FeedbackReview:
        """Persist a new review."""
        ...

    @abstractmethod
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
        """List reviews with optional filters. Excludes soft-deleted unless include_deleted=True."""
        ...

    @abstractmethod
    def get_review(self, review_id: str) -> FeedbackReview | None:
        """Get a single review by id."""
        ...

    @abstractmethod
    def soft_delete_review(self, review_id: str) -> bool:
        """Soft-delete a review. Returns True if found and updated."""
        ...

    @abstractmethod
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
        """Compute summary over reviews. Excludes soft-deleted unless include_deleted=True."""
        ...


class LocalJsonFeedbackRepository(FeedbackRepository):
    """Store feedback in a JSON file. Path from FEEDBACK_STORE_PATH or data/feedback_store.json."""

    def __init__(self, path: str | Path | None = None) -> None:
        raw = path or os.getenv("FEEDBACK_STORE_PATH") or "data/feedback_store.json"
        self._path = Path(raw)

    def _ensure_file(self) -> None:
        self._path.parent.mkdir(parents=True, exist_ok=True)
        if not self._path.exists():
            self._path.write_text("[]", encoding="utf-8")

    def _read_all(self) -> list[dict[str, Any]]:
        self._ensure_file()
        import json

        content = self._path.read_text(encoding="utf-8")
        try:
            data = json.loads(content)
        except json.JSONDecodeError:
            data = []
        return data if isinstance(data, list) else []

    def _write_all(self, reviews: list[dict[str, Any]]) -> None:
        self._ensure_file()
        import json

        self._path.write_text(json.dumps(reviews, indent=2), encoding="utf-8")

    def _filter_deleted(
        self,
        reviews: list[dict[str, Any]],
        include_deleted: bool,
    ) -> list[dict[str, Any]]:
        if include_deleted:
            return reviews
        return [r for r in reviews if not r.get("deletedAt")]

    def create_review(self, review: FeedbackReview) -> FeedbackReview:
        data = self._read_all()
        row = review.model_dump()
        data.append(row)
        self._write_all(data)
        return review

    def _apply_filters(
        self,
        data: list[dict],
        resource_id: str | None = None,
        start_date: str | None = None,
        end_date: str | None = None,
        issue_category: str | None = None,
        attended: bool | None = None,
        information_accurate: bool | None = None,
        min_rating: float | None = None,
        max_rating: float | None = None,
        author_id: str | None = None,
    ) -> list[dict]:
        out = data
        if resource_id:
            out = [r for r in out if r.get("resourceId") == resource_id]
        if author_id:
            out = [r for r in out if r.get("authorId") == author_id]
        if start_date:
            out = [r for r in out if (r.get("createdAt") or "")[:10] >= start_date[:10]]
        if end_date:
            out = [r for r in out if (r.get("createdAt") or "")[:10] <= end_date[:10]]
        if issue_category:
            out = [r for r in out if issue_category in (r.get("issueLabels") or [])]
        if attended is not None:
            out = [r for r in out if r.get("attended") == attended]
        if information_accurate is not None:
            out = [r for r in out if r.get("informationAccurate") == information_accurate]
        rmin, rmax = min_rating, max_rating
        if rmin is not None:
            out = [r for r in out if r.get("rating") is not None and r["rating"] >= rmin]
        if rmax is not None:
            out = [r for r in out if r.get("rating") is not None and r["rating"] <= rmax]
        return out

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
        data = self._read_all()
        filtered = self._filter_deleted(data, include_deleted)
        filtered = self._apply_filters(
            filtered,
            resource_id=resource_id,
            start_date=start_date,
            end_date=end_date,
            issue_category=issue_category,
            attended=attended,
            information_accurate=information_accurate,
            min_rating=min_rating,
            max_rating=max_rating,
            author_id=author_id,
        )
        filtered.sort(key=lambda r: r.get("createdAt", ""), reverse=True)
        page = filtered[offset : offset + limit]
        return [FeedbackReview(**r) for r in page]

    def get_review(self, review_id: str, include_deleted: bool = False) -> FeedbackReview | None:
        data = self._read_all()
        for r in data:
            if r.get("id") == review_id:
                if not include_deleted and r.get("deletedAt"):
                    return None
                return FeedbackReview(**r)
        return None

    def soft_delete_review(self, review_id: str) -> bool:
        from datetime import datetime, timezone

        data = self._read_all()
        for r in data:
            if r.get("id") == review_id:
                r["deletedAt"] = datetime.now(timezone.utc).isoformat()
                self._write_all(data)
                return True
        return False

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
        from feedback.issues import aggregate_issue_counts

        data = self._read_all()
        filtered = self._filter_deleted(data, include_deleted)
        filtered = self._apply_filters(
            filtered,
            resource_id=resource_id,
            start_date=start_date,
            end_date=end_date,
            issue_category=issue_category,
            attended=attended,
            information_accurate=information_accurate,
            min_rating=min_rating,
            max_rating=max_rating,
        )

        n = len(filtered)
        if n == 0:
            return FeedbackSummary(issue_counts=aggregate_issue_counts([]))

        ratings = [r["rating"] for r in filtered if r.get("rating") is not None]
        waits = [
            r["waitTimeMinutes"]
            for r in filtered
            if r.get("waitTimeMinutes") is not None
        ]
        attended = [r for r in filtered if r.get("attended") is True]
        inaccurate = [
            r
            for r in filtered
            if r.get("informationAccurate") is False
        ]

        avg_rating = sum(ratings) / len(ratings) if ratings else None
        avg_wait = sum(waits) / len(waits) if waits else None
        attended_rate = len(attended) / n if n else None
        inaccurate_rate = len(inaccurate) / n if n else None

        by_resource: dict[str, dict[str, Any]] = {}
        for r in filtered:
            rid = r.get("resourceId") or "_unknown"
            if rid not in by_resource:
                by_resource[rid] = {
                    "total": 0,
                    "avg_rating": None,
                    "avg_wait_time": None,
                    "attended_rate": None,
                    "inaccurate_rate": None,
                    "issue_counts": {},
                }
            by_resource[rid]["total"] = by_resource[rid]["total"] + 1

        for rid, sub in by_resource.items():
            sub_reviews = [r for r in filtered if (r.get("resourceId") or "_unknown") == rid]
            sub["issue_counts"] = aggregate_issue_counts(sub_reviews)
            sub_ratings = [r["rating"] for r in sub_reviews if r.get("rating") is not None]
            sub_waits = [
                r["waitTimeMinutes"]
                for r in sub_reviews
                if r.get("waitTimeMinutes") is not None
            ]
            sub_attended = sum(1 for r in sub_reviews if r.get("attended") is True)
            sub_inaccurate = sum(
                1 for r in sub_reviews if r.get("informationAccurate") is False
            )
            sub["avg_rating"] = sum(sub_ratings) / len(sub_ratings) if sub_ratings else None
            sub["avg_wait_time"] = sum(sub_waits) / len(sub_waits) if sub_waits else None
            sub["attended_rate"] = sub_attended / len(sub_reviews) if sub_reviews else None
            sub["inaccurate_rate"] = sub_inaccurate / len(sub_reviews) if sub_reviews else None

        return FeedbackSummary(
            total_reviews=n,
            average_rating=avg_rating,
            average_wait_time=avg_wait,
            attended_rate=attended_rate,
            inaccurate_information_rate=inaccurate_rate,
            issue_counts=aggregate_issue_counts(filtered),
            by_resource=by_resource,
        )
