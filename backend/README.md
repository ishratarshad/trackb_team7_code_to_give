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
