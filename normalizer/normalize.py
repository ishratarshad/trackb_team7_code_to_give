"""Main entry point for food tag normalization."""

from typing import Optional

from normalizer.gemini_client import call_gemini_json
from normalizer.mock_normalizer import is_mock_enabled, mock_normalize
from normalizer.models import PantryMetadata, SupplyProfile
from normalizer.profile import build_supply_profile
from normalizer.prompt import build_prompt


def normalize_tags(
    raw_tags: list[str],
    pantry_id: str = "unknown",
    metadata: Optional[PantryMetadata] = None,
) -> dict:
    """
    Normalize raw food tags from Layer 1 and return a structured supply profile.

    Args:
        raw_tags: List of raw food tags from vision model (Layer 1)
        pantry_id: Optional pantry identifier (default "unknown")

    Returns:
        Supply profile dict compatible with SupplyProfile schema.
    """
    if not raw_tags:
        return build_supply_profile(
            pantry_id=pantry_id,
            raw_tags=[],
            normalized_foods=[],
            dietary_tags=[],
            cultural_tags=[],
            metadata=metadata.model_dump() if metadata else None,
        )

    if is_mock_enabled():
        normalized_foods, dietary_tags, cultural_tags = mock_normalize(raw_tags)
    else:
        prompt = build_prompt(raw_tags)
        result = call_gemini_json(prompt)
        normalized_foods = result.get("normalized_foods", [])
        dietary_tags = result.get("dietary_tags", [])
        cultural_tags = result.get("cultural_tags", [])

    meta_dict = metadata.model_dump() if metadata else None
    profile = build_supply_profile(
        pantry_id=pantry_id,
        raw_tags=raw_tags,
        normalized_foods=normalized_foods,
        dietary_tags=dietary_tags,
        cultural_tags=cultural_tags,
        metadata=meta_dict,
    )

    return SupplyProfile(**profile).model_dump()
