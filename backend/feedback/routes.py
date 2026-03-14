"""FastAPI routes for resource feedback (ResourceReview)."""

from fastapi import APIRouter, HTTPException, Query

from feedback.models import CreateFeedbackReviewRequest, FeedbackReview, FeedbackSummary
from feedback.service import FeedbackService

router = APIRouter(prefix="/resource-reviews", tags=["resource-reviews"])
_service = FeedbackService()


@router.get("/health")
def health() -> dict:
    """Health check for feedback service."""
    return {"status": "ok", "service": "resource-reviews"}


@router.post("", response_model=FeedbackReview)
def create_review(payload: CreateFeedbackReviewRequest) -> FeedbackReview:
    """Submit a feedback review. Returns full review with issueLabels."""
    return _service.create_review(payload)


@router.get("", response_model=list[FeedbackReview])
def list_reviews(
    resourceId: str | None = Query(None, alias="resourceId"),
    startDate: str | None = Query(None, alias="startDate"),
    endDate: str | None = Query(None, alias="endDate"),
    issueCategory: str | None = Query(None, alias="issueCategory"),
    attended: bool | None = Query(None),
    informationAccurate: bool | None = Query(None),
    minRating: float | None = Query(None, alias="minRating"),
    maxRating: float | None = Query(None, alias="maxRating"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
) -> list[FeedbackReview]:
    """List reviews with filters. Excludes soft-deleted."""
    return _service.list_reviews(
        resource_id=resourceId,
        start_date=startDate,
        end_date=endDate,
        issue_category=issueCategory,
        attended=attended,
        information_accurate=informationAccurate,
        min_rating=minRating,
        max_rating=maxRating,
        limit=limit,
        offset=offset,
    )


@router.get("/summary", response_model=FeedbackSummary)
def get_summary(
    resourceId: str | None = Query(None, alias="resourceId"),
    startDate: str | None = Query(None, alias="startDate"),
    endDate: str | None = Query(None, alias="endDate"),
    issueCategory: str | None = Query(None, alias="issueCategory"),
    attended: bool | None = Query(None),
    informationAccurate: bool | None = Query(None),
    minRating: float | None = Query(None, alias="minRating"),
    maxRating: float | None = Query(None, alias="maxRating"),
) -> FeedbackSummary:
    """Aggregated summary of reviews with optional filters."""
    return _service.summarize_reviews(
        resource_id=resourceId,
        start_date=startDate,
        end_date=endDate,
        issue_category=issueCategory,
        attended=attended,
        information_accurate=informationAccurate,
        min_rating=minRating,
        max_rating=maxRating,
    )


@router.get("/{review_id}", response_model=FeedbackReview)
def get_review(review_id: str) -> FeedbackReview:
    """Get a single review by ID. Returns 404 if not found or soft-deleted."""
    review = _service.get_review(review_id)
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    return review


@router.delete("/{review_id}")
def delete_review(review_id: str) -> dict:
    """Soft-delete a review. Returns 404 if not found."""
    ok = _service.soft_delete_review(review_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Review not found")
    return {"deleted": True, "id": review_id}
