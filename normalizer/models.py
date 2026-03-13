"""Pydantic models for food normalization pipeline."""

from typing import Optional

from pydantic import BaseModel, Field


class PantryMetadata(BaseModel):
    """Location and naming metadata for a pantry."""

    resource_name: Optional[str] = None
    zip_code: Optional[str] = None
    neighborhood_name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class NormalizedFood(BaseModel):
    """A single normalized food item."""

    original_tag: str
    normalized: str
    category: str


class SupplyProfile(BaseModel):
    """Full pantry supply profile output."""

    pantry_id: str
    metadata: Optional[PantryMetadata] = None
    raw_tags: list[str]
    normalized_foods: list[NormalizedFood]
    category_distribution: dict[str, float]
    dietary_tags: list[str] = Field(default_factory=list)
    cultural_tags: list[str] = Field(default_factory=list)


class NormalizeRequest(BaseModel):
    """Request body for POST /normalize."""

    pantry_id: str
    raw_tags: list[str]


class BatchNormalizeRequest(BaseModel):
    """Request body for POST /normalize/batch."""

    results: list[dict]
