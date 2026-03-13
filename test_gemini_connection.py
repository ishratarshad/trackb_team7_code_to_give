#!/usr/bin/env python3
"""Test Gemini API connection. Run with GEMINI_API_KEY set and USE_MOCK_NORMALIZER unset."""

import os

from dotenv import load_dotenv
load_dotenv()

# Ensure mock mode is off
if os.environ.get("USE_MOCK_NORMALIZER") == "1":
    print("WARNING: USE_MOCK_NORMALIZER=1 is set. Unsetting for this test.")
    os.environ.pop("USE_MOCK_NORMALIZER", None)

from normalizer.normalize import normalize_tags

test_tags = [
    "Great Value black beans",
    "Jack & the Beanstalk long grain white rice",
    "Campbell's chicken noodle soup",
]

print("Testing Gemini normalization...")
try:
    result = normalize_tags(test_tags, pantry_id="gemini_test")
    print("Success. Normalized profile:")
    import json
    print(json.dumps(result, indent=2, default=str))
except Exception as e:
    print(f"Error: {e}")
    raise
