#!/usr/bin/env python3
"""Run the Layer 2 food normalization pipeline."""

import pathlib

from dotenv import load_dotenv

load_dotenv()

from normalizer.ingest import process_export_to_file

if __name__ == "__main__":
    input_file = pathlib.Path("data/classifier_output.json")
    output_file = pathlib.Path("data/supply_profiles.json")

    if not input_file.exists():
        print("Input file not found: data/classifier_output.json")
        print("Falling back to sample data...")
        input_file = pathlib.Path("data/sample_classifier_output.json")

    process_export_to_file(str(input_file), str(output_file))
