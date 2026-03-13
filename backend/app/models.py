from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field

ResourceKind = Literal["pantry", "soup_kitchen", "other"]

ResourceType = Literal[
    "produce",
    "protein",
    "dairy",
    "grains",
    "canned",
    "packaged",
    "beverages",
    "condiments",
    "snacks",
    "other",
]


class PantryCreate(BaseModel):
    name: str = Field(..., min_length=1)
    neighborhood: str = Field(..., min_length=1)
    address: str | None = None
    zip_code: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    resource_kind: ResourceKind = "pantry"
    schedule: dict[str, list[list[str]]] | None = None
    is_open_now: bool | None = None


class PantryOut(PantryCreate):
    id: str
    created_at: datetime
    updated_at: datetime


class FeedbackCreate(BaseModel):
    pantry_id: str = Field(..., min_length=1)
    rating: int = Field(..., ge=1, le=5)
    wait_time_min: int | None = Field(None, ge=0)
    resource_type: ResourceType
    items_unavailable: str | None = None
    comment: str | None = None
    issue_categories: list[str] | None = None
    raw_payload: dict | None = None
    created_at: datetime | None = None


class FeedbackOut(FeedbackCreate):
    id: str
    created_at: datetime
    pantry_name: str
    pantry_neighborhood: str


class AnalyticsSummary(BaseModel):
    total_feedback: int
    avg_rating: float | None = None
    avg_wait_time_min: float | None = None
    feedback_by_resource_type: dict[str, int] = Field(default_factory=dict)


class IssueCategory(BaseModel):
    issue: str
    count: int


class TrendPoint(BaseModel):
    bucket: datetime
    avg_rating: float | None = None
    avg_wait_time_min: float | None = None
    total_feedback: int


class HeatmapPoint(BaseModel):
    pantry_id: str
    pantry_name: str
    neighborhood: str
    latitude: float | None = None
    longitude: float | None = None
    total_feedback: int


class SupplyProfileOut(BaseModel):
    pantry_id: str
    normalized_foods: list[dict]
    category_distribution: dict[str, float]
    updated_at: datetime | None = None


class DatasetOut(BaseModel):
    id: str
    name: str
    source: str
    description: str | None = None
    ingested_at: datetime


class DatasetMetric(BaseModel):
    geo_unit_id: str
    metrics: dict
    recorded_at: datetime


class DatasetDetail(BaseModel):
    dataset: DatasetOut
    metrics: list[DatasetMetric]

class DatasetOverlayPoint(BaseModel):
    pantry_id: str
    pantry_name: str
    neighborhood: str
    zip_code: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    metrics: dict[str, Any]


class PhotoCreate(BaseModel):
    pantry_id: str = Field(..., min_length=1)
    image_url: str = Field(..., min_length=1)
    captured_at: datetime | None = None


class PhotoClassify(BaseModel):
    raw_tags: list[str] | None = None
    normalized_tags: list[str] | None = None


class PhotoOut(PhotoCreate):
    id: str
    raw_tags: list[str] | None = None
    normalized_tags: list[str] | None = None
    created_at: datetime


class InsightPoint(BaseModel):
    pantry_id: str
    pantry_name: str
    neighborhood: str
    metric: float | None = None


class AnalyticsInsights(BaseModel):
    longest_wait_times: list[InsightPoint] = Field(default_factory=list)
    lowest_satisfaction: list[InsightPoint] = Field(default_factory=list)
    highest_unmet_demand: list[InsightPoint] = Field(default_factory=list)

class ReportCreate(BaseModel):
    title: str = Field(..., min_length=1)
    filters: dict = Field(default_factory=dict)


class ReportOut(ReportCreate):
    id: str
    generated_at: datetime
    export_url: str | None = None
