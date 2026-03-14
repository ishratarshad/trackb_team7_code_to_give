"""Read Layer 1 classifier export and feed into the normalizer."""

import json
from pathlib import Path
from typing import Callable, Optional, Tuple

from normalizer.models import PantryMetadata
from normalizer.normalize import normalize_tags

VAGUE_LABELS = frozenset(
    {
        "canned goods",
        "packaged goods",
        "various",
        "food",
        "items",
        "mixed",
        "various items",
        "mixed items",
    }
)

MIN_CONFIDENCE = 0.7


def load_classifier_export(filepath: str) -> list[dict]:
    """Read the Layer 1 JSON export and return the results[] array."""
    path = Path(filepath)
    data = json.loads(path.read_text(encoding="utf-8"))
    return data.get("results", [])


def extract_labels(image_result: dict) -> list[str]:
    """
    Extract label strings from rawTags[], filtering low-confidence and vague labels.
    Pass full labels to normalizer; do not strip brand names here.
    """
    raw_tags = image_result.get("rawTags", [])
    labels = []
    for item in raw_tags:
        if not isinstance(item, dict):
            continue
        conf = item.get("confidence", 0)
        if conf < MIN_CONFIDENCE:
            continue
        label = item.get("label", "").strip()
        if not label:
            continue
        # Exclude vague labels (case-insensitive match)
        norm_label = label.lower().strip()
        if norm_label in VAGUE_LABELS:
            continue
        labels.append(label)
    return labels


def _metadata_from_source(source: dict) -> Optional[PantryMetadata]:
    """Build PantryMetadata from source dict, or None if empty."""
    if not source:
        return None
    return PantryMetadata(
        resource_name=source.get("resourceName"),
        zip_code=str(source["zipCode"]) if source.get("zipCode") is not None else None,
        neighborhood_name=source.get("neighborhoodName"),
        latitude=source.get("latitude"),
        longitude=source.get("longitude"),
    )


def process_results_to_profiles(results: list[dict]) -> list[dict]:
    """
    Process Layer 1 results array: group by source.resourceId, combine labels,
    capture metadata from first image per pantry, call normalize_tags.
    Returns list of SupplyProfile dicts.
    """
    pantry_data: dict[str, Tuple[list[str], Optional[PantryMetadata]]] = {}
    for img in results:
        source = img.get("source") or {}
        resource_id = source.get("resourceId", "unknown")
        labels = extract_labels(img)
        if resource_id not in pantry_data:
            pantry_data[resource_id] = ([], _metadata_from_source(source))
        pantry_data[resource_id][0].extend(labels)

    profiles = []
    for resource_id, (labels, metadata) in pantry_data.items():
        combined = list(dict.fromkeys(labels))
        profile = normalize_tags(
            raw_tags=combined,
            pantry_id=resource_id,
            metadata=metadata,
        )
        profiles.append(profile)
    return profiles


def process_export(
    filepath: str,
    on_pantry_processed: Optional[Callable[[int, int, str], None]] = None,
) -> list[dict]:
    """
    Load export, group images by source.resourceId, combine labels per pantry,
    capture metadata from first image, call normalize_tags for each.
    Returns list of SupplyProfile dicts.
    """
    results = load_classifier_export(filepath)

    pantry_data: dict[str, Tuple[list[str], Optional[PantryMetadata]]] = {}
    for img in results:
        source = img.get("source") or {}
        resource_id = source.get("resourceId", "unknown")
        labels = extract_labels(img)
        if resource_id not in pantry_data:
            pantry_data[resource_id] = ([], _metadata_from_source(source))
        pantry_data[resource_id][0].extend(labels)

    pantry_ids = list(pantry_data.keys())
    profiles: list[dict] = []
    for i, resource_id in enumerate(pantry_ids):
        labels, metadata = pantry_data[resource_id]
        combined = list(dict.fromkeys(labels))
        profile = normalize_tags(
            raw_tags=combined,
            pantry_id=resource_id,
            metadata=metadata,
        )
        profiles.append(profile)
        if on_pantry_processed and (i + 1) % 10 == 0:
            on_pantry_processed(i + 1, len(pantry_ids), resource_id)

    return profiles


def process_export_to_file(input_filepath: str, output_filepath: str) -> None:
    """Process export and write SupplyProfile list to JSON file."""
    # USE_MOCK_NORMALIZER is respected by normalize_tags (called via process_export)

    def on_progress(done: int, total: int, pantry_id: str) -> None:
        print(f"Processing pantry {done}/{total}: {pantry_id}")

    profiles = process_export(input_filepath, on_pantry_processed=on_progress)
    Path(output_filepath).write_text(
        json.dumps(profiles, indent=2, ensure_ascii=False, default=str),
        encoding="utf-8",
    )
    print(f"Done. {len(profiles)} pantries processed. Output written to: {output_filepath}")

    # Aggregate summary
    if profiles:
        cat_totals: dict[str, float] = {}
        for p in profiles:
            for k, v in (p.get("category_distribution") or {}).items():
                cat_totals[k] = cat_totals.get(k, 0) + v
        n = len(profiles)
        cat_avg = {k: round(v / n, 1) for k, v in cat_totals.items()}
        print("Categories found:", ", ".join(f"{k}: {v}%" for k, v in sorted(cat_avg.items())))

        dietary_counts: dict[str, int] = {}
        for p in profiles:
            for t in p.get("dietary_tags") or []:
                dietary_counts[t] = dietary_counts.get(t, 0) + 1
        if dietary_counts:
            print("Dietary tags found:", ", ".join(f"{k} ({v} pantries)" for k, v in sorted(dietary_counts.items())))

        cultural_counts: dict[str, int] = {}
        for p in profiles:
            for t in p.get("cultural_tags") or []:
                cultural_counts[t] = cultural_counts.get(t, 0) + 1
        if cultural_counts:
            print("Cultural tags found:", ", ".join(f"{k} ({v} pantries)" for k, v in sorted(cultural_counts.items())))

