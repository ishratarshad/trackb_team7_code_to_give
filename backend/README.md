# Backend (FastAPI)

Minimal FastAPI service with a `/health` endpoint that verifies Supabase Postgres access.

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

## Run

```bash
cd backend
source .venv/bin/activate
python3 -m uvicorn app.main:app --reload
```

## Health Check

- `GET /health`
  - Returns `{"status":"ok","db":"ok"}` when Supabase is reachable.
  - Returns `{"status":"degraded","db":"error",...}` on failure.

## MVP Endpoints

- `GET /health` — health + DB check
- `POST /pantries` — create a pantry
- `GET /pantries` — list pantries
- `GET /pantries/{pantry_id}` — pantry details
- `POST /feedback` — create a feedback entry
- `GET /feedback` — list feedback with optional filters
- `GET /analytics/summary` — basic counts and averages
- `GET /analytics/issues` — issue counts
- `GET /analytics/trends` — time‑series metrics
- `GET /analytics/heatmap` — map aggregates
- `GET /pantries/{pantry_id}/supply` — normalized supply profile
- `GET /datasets` — list public datasets
- `GET /datasets/{dataset_id}` — dataset detail + metrics
- `POST /reports` — generate a report
- `GET /reports/{report_id}` — fetch report metadata

## Database Schema

See `backend/db/schema.sql` for the minimal tables and indexes.

## Tests

```bash
cd backend
source .venv/bin/activate
python -m pytest
```

## External Data Ingestion

Run one-off ingestion (requires `DATABASE_URL`):

```bash
cd backend
source .venv/bin/activate
python -m ingest.run_ingestion --lemontree
python -m ingest.run_ingestion --nyc
```

Run on an interval (minutes):

```bash
python -m ingest.run_ingestion --interval-min 1440
```

Optional env vars:
- `LEMONTREE_BASE_URL`
- `LEMONTREE_TAKE`
- `NYC_OPEN_DATA_BASE`
- `NYC_DEMOGRAPHICS_DATASET`
- `NYC_OPEN_DATA_LIMIT`
