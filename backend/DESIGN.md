# Backend Design Doc (Full Implementation)

## Summary
This document describes the full backend implementation for the Food Access Insights Platform.
It is based on the PRD and the current `Pantry_Dashboard` frontend, which currently renders a cultural
food match dashboard from a local JSON file (`src/data/classifierOutput.json`) and will be wired to
backend APIs over time.

The backend supports:
1. End‑user feedback collection (structured fields + free text).
2. Data cleaning, normalization, and categorization.
3. Analytics, trend detection, and dashboard data APIs.
4. Integration of public datasets for contextual insights.
5. Reporting and sharing workflows.

## Goals
1. Provide a reliable, secure API surface for feedback collection and retrieval.
2. Support filtering by location, timeframe, and resource type.
3. Expose analytics for dashboards (counts, averages, distributions, trends).
4. Integrate public datasets for context (demographics, health, poverty, food deserts).
5. Enable reporting and export of insights.
6. Maintain a solid developer experience and deployment posture.

## Non-Goals (Phase 1)
1. Real‑time streaming analytics (near‑real‑time is acceptable).
2. Full BI platform capabilities (ad‑hoc SQL explorer, custom chart builder).
3. Fully automated anomaly detection with alerting (future enhancement).

## Current Frontend Context
`Pantry_Dashboard` currently:
- Reads from static JSON (`classifierOutput.json`).
- Computes cultural match scores and missing foods client-side.
- Has no API calls.

Backend alignment strategy:
1. Define endpoints that can supply equivalent JSON shapes to replace the static file.
2. Move calculations server‑side once data pipelines and schema stabilize.

## Proposed Architecture
**API**: FastAPI app in `backend/`  
**Database**: Supabase Postgres (primary OLTP store)  
**Storage**: S3‑compatible (images, exports, reports)  
**Compute**: Background workers for ML + ETL (separate process)  
**Deployment**: API + worker services (can start as single service)  
**ML Pipelines**:
- `ai-classifier/` produces raw tags from pantry images.
- `normalizer/` normalizes tags and outputs supply profiles.
- Text categorization pipeline for free‑text feedback.

## Data Model (Core)
### 1) Pantry
- `id` (uuid)
- `name` (text)
- `neighborhood` (text)
- `address` (text, nullable)
- `latitude`, `longitude` (float, nullable)
- `created_at`, `updated_at`

### 2) Feedback
- `id` (uuid)
- `created_at` (timestamp)
- `pantry_id` (uuid)
- `rating` (int 1-5)
- `wait_time_min` (int, nullable)
- `resource_type` (enum)
- `items_unavailable` (text, nullable)
- `comment` (text, nullable)
- `issue_categories` (jsonb, nullable)
- `raw_payload` (jsonb, nullable)

### 3) Issue Categories
- `id` (uuid)
- `name` (text)
- `description` (text)
- `keywords` (jsonb)

### 4) Supply Profiles
- `pantry_id` (uuid)
- `normalized_foods` (jsonb)
- `category_distribution` (jsonb)
- `updated_at` (timestamp)

### 5) Public Datasets
- `dataset_id` (uuid)
- `dataset_name` (text)
- `source` (text)
- `ingested_at` (timestamp)
- `geo_unit_id` (text)
- `metrics` (jsonb)

### 6) Reports
- `id` (uuid)
- `title` (text)
- `filters` (jsonb)
- `generated_at` (timestamp)
- `export_url` (text)

## API Endpoints
### Health
- `GET /health` → `{ status: "ok", db: "ok" }`

### Feedback
- `POST /feedback`
  - Body: fields above
  - Response: created record
- `GET /feedback`
  - Query params: `pantry_id`, `neighborhood`, `from`, `to`, `resource_type`
  - Response: list of feedback

### Analytics
- `GET /analytics/summary`
  - Returns aggregated counts and averages for dashboard tiles
- `GET /analytics/issues`
  - Returns issue categories (initially empty or keyword-based)
- `GET /analytics/trends`
  - Returns time‑series metrics (ratings, wait times, issue counts)
- `GET /analytics/heatmap`
  - Returns location‑based aggregates for map visualization

### Pantry Supply
- `GET /pantries`
  - Returns list of pantries and basic metadata
- `GET /pantries/{id}/supply`
  - Returns normalized supply profile (if ML pipeline integrated)

### Public Datasets
- `GET /datasets`
  - List available public datasets
- `GET /datasets/{id}`
  - Dataset metadata + metrics

### Reporting
- `POST /reports`
  - Create report based on filters
- `GET /reports/{id}`
  - Fetch report details and export link

## Integration with Frontend
Phase 1 (no UI changes):
- Provide `/pantries` and `/pantries/{id}/supply` endpoints that match the current JSON schema used
  in `Pantry_Dashboard`.

Phase 2:
- Replace static JSON with `/analytics/*` and `/feedback` APIs.
- Add filtering and map endpoints to support PRD requirements.

## Data Processing Pipelines
1. **Feedback ingestion**
   - Validate, clean, and store structured fields.
   - Send free‑text to categorization pipeline.
2. **Free‑text categorization**
   - Keyword baseline + LLM classifier for issue themes.
   - Persist issue categories on feedback records.
3. **Supply profile generation**
   - `ai-classifier` → raw tags
   - `normalizer` → normalized taxonomy + supply distribution
4. **Public dataset ingestion**
   - Scheduled ETL into `public_datasets`
   - Join with pantry locations for contextual metrics.

## Security & Config
- `.env` required for `DATABASE_URL`, API keys, and CORS
- CORS allowlist set via `CORS_ORIGINS`
- Auth (Phase 2+): JWT or Supabase Auth; role‑based access for dashboards
- No secrets committed

## Observability
- Structured logs (request id, status, latency)
- Health checks with DB connectivity
- Metrics: request counts, error rates, latency p95
- Alerting: DB failures, pipeline failures, ingestion lag

## Performance & Scaling
- Connection pooling to Postgres
- Pagination on list endpoints
- Background jobs for heavy processing
- Cache read‑heavy analytics with TTL

## Migration Plan
1. MVP API + schema (already implemented).
2. Add auth and RBAC.
3. Add pipeline workers and public dataset ingestion.
4. Extend analytics for trends, maps, and reporting.
5. Replace static dashboard data with APIs.

## Open Questions
1. Will feedback ingestion be direct from frontend or via other sources?
2. What exact schema should represent pantry locations and neighborhoods?
3. Should the backend compute cultural match or leave it to frontend?
4. Which public datasets are in scope for phase 1 ingestion?
