# Resource Feedback (ResourceReview)

Feedback collection and processing for Lemontree resource reviews. Uses the full ResourceReview schema with deterministic issue labeling. Storage is file-based (JSON) for MVP; swappable to Supabase later.

## Backend

### Run

```bash
cd backend
source .venv/bin/activate  # or: python -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Backend listens on `http://localhost:8000` by default.

### Storage

Reviews are stored in a JSON file:

- **Path:** `FEEDBACK_STORE_PATH` env var, or default `data/feedback_store.json`
- **Location:** relative to the process CWD (usually `backend/` when running uvicorn from there, so `backend/data/feedback_store.json`)
- **Behavior:** file is created automatically if missing; directory is created if needed

To use the project root `data/` folder:

```bash
export FEEDBACK_STORE_PATH="../data/feedback_store.json"
uvicorn app.main:app --reload
```

## Tests

Run feedback tests:

```bash
cd backend
source .venv/bin/activate
PYTHONPATH=. python -m pytest tests/test_feedback.py -v
```

Tests use `tmp_path` for isolated storage; no shared state between tests.

**Note:** Full backend tests require `DATABASE_URL` and `asyncpg` because `conftest.py` loads the main app. Feedback-only logic (issue extraction, repository, service) runs without DB. Route tests that use the FastAPI app may fail if DB setup is missing; run `pytest tests/test_feedback.py -v -k "extract or aggregate or repository or service"` to skip route tests if needed.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/resource-reviews/health` | Health check |
| POST | `/resource-reviews` | Submit review |
| GET | `/resource-reviews` | List reviews (with query filters) |
| GET | `/resource-reviews/summary` | Aggregated summary |
| GET | `/resource-reviews/{id}` | Get single review |
| DELETE | `/resource-reviews/{id}` | Soft delete |

## cURL Examples

### Submit a review

```bash
curl -X POST http://localhost:8000/resource-reviews \
  -H "Content-Type: application/json" \
  -d '{
    "authorId": "client_123",
    "resourceId": "resource_foodbank_downtown",
    "attended": false,
    "didNotAttendReason": "Location was closed when I arrived",
    "rating": 1,
    "text": "Hours were wrong and I wasted a trip",
    "waitTimeMinutes": 0,
    "informationAccurate": false,
    "shareTextWithResource": false
  }'
```

### List reviews for a resource

```bash
curl "http://localhost:8000/resource-reviews?resourceId=resource_foodbank_downtown"
```

### Get summary

```bash
curl "http://localhost:8000/resource-reviews/summary"
```

### Soft delete

```bash
curl -X DELETE "http://localhost:8000/resource-reviews/{review_id}"
```

## Swapping to Supabase

1. Create a `SupabaseFeedbackRepository` that implements `feedback.repository.FeedbackRepository`.
2. Implement `create_review`, `list_reviews`, `get_review`, `soft_delete_review`, and `summarize_reviews` against your Supabase tables.
3. Wire the new repository into `FeedbackService` (e.g. in `feedback/routes.py` or via dependency injection).
4. Do not change service logic or route handlers; only swap the repository implementation.

Example:

```python
# feedback/routes.py
from feedback.repository import LocalJsonFeedbackRepository  # or SupabaseFeedbackRepository

_service = FeedbackService(repository=SupabaseFeedbackRepository(...))
```

## Frontend

**Supply profiles:** The dashboard imports `src/data/supply_profiles.json`. The source is generated at project-root `data/supply_profiles.json`. Sync with `npm run sync:supply-profiles` in `Pantry_Dashboard/` after running the normalizer pipeline.

The Pantry Dashboard includes a "Resource Feedback" tab with:

- **FeedbackForm** — submits to `POST /resource-reviews`
- **FeedbackSummaryCard** — loads from `GET /resource-reviews/summary`

Set `VITE_API_URL` to your backend URL (default `http://localhost:8000`) if different.
