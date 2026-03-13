"""Pydantic models for food normalization pipeline."""

from pydantic import BaseModel, Field


class NormalizedFood(BaseModel):
    """A single normalized food item."""

    original_tag: str
    normalized: str
    category: str


class SupplyProfile(BaseModel):
    """Full pantry supply profile output."""

    pantry_id: str
    raw_tags: list[str]
    normalized_foods: list[NormalizedFood]
    category_distribution: dict[str, float]
    dietary_tags: list[str] = Field(default_factory=list)
    cultural_tags: list[str] = Field(default_factory=list)


class NormalizeRequest(BaseModel):
    """Request body for POST /normalize."""

    pantry_id: str
    raw_tags: list[str]
