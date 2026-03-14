# Backend (FastAPI)

FastAPI service for resources, feedback/reviews, analytics, datasets, photos, and reports. It connects to Postgres and is designed to back the Pantry Dashboard UI.

## Hosted URL

```
trackb-team7-code-to-give.onrender.com
```

## Setup

1. Create a virtual environment and install dependencies:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install -r requirements.txt
```

2. Create `.env` (or export `DATABASE_URL`):

```dotenv
DATABASE_URL="postgresql://postgres.<project-ref>:<password>@<host>:6543/postgres"
```

Optional env vars:
- `CORS_ORIGINS`
- `LEMONTREE_BASE_URL`
- `LEMONTREE_TAKE`
- `NYC_OPEN_DATA_BASE`
- `NYC_DEMOGRAPHICS_DATASET`
- `NYC_OPEN_DATA_LIMIT`

## Run

```bash
cd backend
source .venv/bin/activate
python3 -m uvicorn app.main:app --reload
```

## Health Check

`GET /health` returns `{"status":"ok","db":"ok"}` when the DB is reachable.

## API Summary

- `GET /health`
- `POST /pantries`
- `GET /pantries`
- `GET /pantries/{pantry_id}`
- `GET /resources`
- `GET /resources/{resource_id}`
- `GET /proxy/lemontree/resources`
- `GET /proxy/lemontree/resources/{resource_id}`
- `GET /proxy/lemontree/markersWithinBounds`
- `GET /fusion/lemontree/resources-with-demographics`
- `POST /feedback`
- `GET /feedback`
- `GET /analytics/summary`
- `GET /analytics/issues`
- `GET /analytics/trends`
- `GET /analytics/heatmap`
- `GET /analytics/insights`
- `GET /analytics/shortage`
- `GET /pantries/{pantry_id}/supply`
- `POST /photos`
- `GET /pantries/{pantry_id}/photos`
- `POST /photos/{photo_id}/classify`
- `GET /datasets`
- `GET /datasets/{dataset_id}`
- `GET /datasets/overlay`
- `GET /demographics/summary`
- `GET /demographics/tract/{geoid}`
- `GET /demographics/search`
- `POST /reports`
- `GET /reports/{report_id}`

## Feedback Payload Notes

- The backend accepts **camelCase** review fields (from `details.pdf`) as well as **snake_case** equivalents.
- Responses for feedback default to **camelCase** (e.g., `resourceId`, `waitTimeMinutes`, `informationAccurate`, `photoPublic`, `shareTextWithResource`, `createdAt`).
- Required fields: `resourceId` (or `pantry_id`), `rating`, `resource_type`.

## Shortage Score

`GET /analytics/shortage?neighborhood=Bronx&limit=10`

Returns foods most needed but least available:

```json
{
  "neighborhood": "Bronx",
  "total_pantries": 45,
  "shortages": [
    {
      "item": "fresh vegetables",
      "demand_mentions": 23,
      "pantries_requesting": 12,
      "pantries_supplying": 5,
      "supply_pct": 11.1,
      "shortage_score": 88.9
    }
  ]
}
```

**Methodology:**
- **Demand:** Count of `items_unavailable` mentions in feedback
- **Supply:** Binary presence per pantry (not photo count)
- **Score:** `normalized_demand - supply_pct` (higher = more shortage)

## Database Schema

See `backend/db/schema.sql` for tables, indexes, and enums.

## External Data Ingestion

One-off ingestion (requires `DATABASE_URL`):

```bash
cd backend
source .venv/bin/activate
python -m ingest.run_ingestion --lemontree
python -m ingest.run_ingestion --nyc
python -m ingest.run_ingestion --acs    # ACS demographics from local CSVs
python -m ingest.run_ingestion --usda   # USDA Food Access from local CSVs
```

Run on an interval (minutes):

```bash
python -m ingest.run_ingestion --interval-min 1440
```

Classifier + supply profile import:

```bash
python -m ingest.pipeline_import --classifier-path ../data/sample_classifier_output.json --supply-path ../data/supply_profiles.json
```

Cron-friendly entrypoint (uses env vars):

```bash
INGEST_LEMONTREE=1 INGEST_NYC=1 \
CLASSIFIER_OUTPUT_PATH=../data/sample_classifier_output.json \
SUPPLY_PROFILES_PATH=../data/supply_profiles.json \
python -m ingest.cron
```

## Tests

```bash
cd backend
source .venv/bin/activate
python -m pytest
```

## Render Start Command

If the service root is `backend/`, use:

```bash
gunicorn -k uvicorn.workers.UvicornWorker app.main:app --bind 0.0.0.0:$PORT
```

Or:

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```
