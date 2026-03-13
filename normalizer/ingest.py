"""Read Layer 1 classifier export and feed into the normalizer."""

import json
from pathlib import Path
from typing import Callable, Optional

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


def process_results_to_profiles(results: list[dict]) -> list[dict]:
    """
    Process Layer 1 results array: group by source.resourceId, combine labels,
    call normalize_tags per pantry. Returns list of SupplyProfile dicts.
    """
    pantry_labels: dict[str, list[str]] = {}
    for img in results:
        source = img.get("source") or {}
        resource_id = source.get("resourceId", "unknown")
        labels = extract_labels(img)
        if resource_id not in pantry_labels:
            pantry_labels[resource_id] = []
        pantry_labels[resource_id].extend(labels)

    profiles = []
    for resource_id, labels in pantry_labels.items():
        combined = list(dict.fromkeys(labels))
        profile = normalize_tags(raw_tags=combined, pantry_id=resource_id)
        profiles.append(profile)
    return profiles


def process_export(
    filepath: str,
    on_pantry_processed: Optional[Callable[[int, int], None]] = None,
) -> list[dict]:
    """
    Load export, group images by source.resourceId, combine labels per pantry,
    call normalize_tags for each, return list of SupplyProfile dicts.
    """
    results = load_classifier_export(filepath)

    # Group by resourceId: resourceId -> list of labels from all images
    pantry_labels: dict[str, list[str]] = {}
    for img in results:
        source = img.get("source") or {}
        resource_id = source.get("resourceId", "unknown")
        labels = extract_labels(img)
        if resource_id not in pantry_labels:
            pantry_labels[resource_id] = []
        pantry_labels[resource_id].extend(labels)

    # Deduplicate labels per pantry and normalize
    pantry_ids = list(pantry_labels.keys())
    profiles: list[dict] = []
    for i, resource_id in enumerate(pantry_ids):
        labels = pantry_labels[resource_id]
        combined = list(dict.fromkeys(labels))  # preserve order, dedupe
        profile = normalize_tags(raw_tags=combined, pantry_id=resource_id)
        profiles.append(profile)
        if on_pantry_processed and (i + 1) % 10 == 0:
            on_pantry_processed(i + 1, len(pantry_ids))

    return profiles


def process_export_to_file(input_filepath: str, output_filepath: str) -> None:
    """Process export and write SupplyProfile list to JSON file."""

    def on_progress(done: int, total: int) -> None:
        print(f"  Processed {done}/{total} pantries...")

    profiles = process_export(input_filepath, on_pantry_processed=on_progress)
    Path(output_filepath).write_text(
        json.dumps(profiles, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    print(f"Processed {len(profiles)} pantries. Output: {output_filepath}")

