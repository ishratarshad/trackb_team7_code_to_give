"""Pydantic models for resource reviews (ResourceReview schema fidelity)."""

from typing import Any

from pydantic import BaseModel, ConfigDict, Field

# All timestamps as ISO 8601 strings
# ResourceReview schema: camelCase field names for API compatibility


class FeedbackReview(BaseModel):
    """Full ResourceReview schema with id and computed fields."""

    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    id: str
    attended: bool | None = None
    createdAt: str = Field(..., description="ISO 8601 timestamp")
    deletedAt: str | None = Field(None, description="ISO 8601 timestamp when soft-deleted")
    didNotAttendReason: str | None = None
    informationAccurate: bool | None = None
    photoPublic: bool | None = None
    photoUrl: str | None = None
    rating: float | None = None
    shareTextWithResource: bool | None = None
    text: str | None = None
    waitTimeMinutes: int | None = None
    authorId: str | None = None
    resourceId: str | None = None
    occurrenceId: str | None = None
    userId: str | None = None
    reviewedByUserId: str | None = None
    issueLabels: list[str] = Field(default_factory=list)

    def model_dump(self, **kwargs: Any) -> dict[str, Any]:
        return super().model_dump(by_alias=False, **kwargs)


class CreateFeedbackReviewRequest(BaseModel):
    """Request payload for creating a feedback review. id, createdAt, issueLabels are server-generated."""

    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    authorId: str | None = None
    resourceId: str
    attended: bool | None = None
    didNotAttendReason: str | None = None
    rating: float = Field(..., ge=1, le=5)
    text: str | None = None
    waitTimeMinutes: int | None = None
    informationAccurate: bool | None = None
    photoUrl: str | None = None
    photoPublic: bool | None = None
    shareTextWithResource: bool | None = None
    occurrenceId: str | None = None


class FeedbackSummary(BaseModel):
    """Aggregated summary of reviews."""

    total_reviews: int = 0
    average_rating: float | None = None
    average_wait_time: float | None = None
    attended_rate: float | None = None
    inaccurate_information_rate: float | None = None
    issue_counts: dict[str, int] = Field(default_factory=dict)
    by_resource: dict[str, dict[str, Any]] | None = None
