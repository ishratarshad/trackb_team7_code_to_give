# Layer 2 — Food Normalization Pipeline

## How to run

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Set up environment:
   ```bash
   cp .env.example .env
   # Add your GEMINI_API_KEY to .env
   # To use mock normalizer instead: USE_MOCK_NORMALIZER=1
   ```

3. Run the full pipeline:
   ```bash
   python run_pipeline.py
   ```

4. Output:
   `data/supply_profiles.json`

## Output format

Supply profiles are written as a JSON array. Each profile has this shape:

```json
{
  "pantry_id": "cleh7op8t0008l00f527l985c",
  "metadata": {
    "resource_name": "Holy Communion Lutheran Church Food Kitchen",
    "zip_code": "08089",
    "neighborhood_name": "Chesilhurst",
    "latitude": 39.7223927,
    "longitude": -74.8895494
  },
  "raw_tags": ["macaroni and cheese", "white rice", "chicken noodle soup", "green beans"],
  "normalized_foods": [
    { "original_tag": "Cheese Club macaroni and cheese", "normalized": "macaroni and cheese", "category": "canned_or_processed" },
    { "original_tag": "Jack & the Beanstalk long grain white rice", "normalized": "rice", "category": "staples" }
  ],
  "category_distribution": {
    "canned_or_processed": 50.0,
    "staples": 25.0,
    "vegetables": 25.0
  },
  "dietary_tags": [],
  "cultural_tags": ["latino_staples"]
}
```

## For Layer 3

Layer 3 should read `data/supply_profiles.json` directly.

Each profile includes:

- `pantry_id`
- `metadata` (location, zip, neighborhood)
- `category_distribution`
- `dietary_tags`
- `cultural_tags`

Do **NOT** use the raw classifier export. Use `supply_profiles.json` only.

## API

- `POST /normalize` — normalize a single list of tags
- `POST /normalize/batch` — process a full Layer 1 export
- `GET /health` — health check
