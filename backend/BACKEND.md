# Backend Design Doc (Aligned with PRD)

## Summary
This document describes the backend implementation for the Lemontree Partner Intelligence Platform.
It is aligned to `PRD.md` and the current `Pantry_Dashboard` frontend, which currently renders a cultural
food match dashboard from a local JSON file (`src/data/supply_profiles.json`) and will be wired to
backend APIs over time.

The backend supports:
1. End‑user feedback collection (structured fields + free text).
2. Data cleaning, standardization, and deduplication pipelines (planned; partial in normalizer).
3. Data ingestion pipelines for external sources (planned; not yet implemented).
4. Analytics, trend detection, and dashboard data APIs.
5. AI food image classification ingestion + supply profiling.
6. Integration of public datasets for contextual insights.
7. Reporting and sharing workflows.
8. Interactive resource map data (locations, schedules, open status).

## Goals
1. Provide a reliable, secure API surface for feedback collection and retrieval.
2. Support filtering by location (neighborhood, ZIP), timeframe, and resource type.
3. Expose analytics for dashboards (counts, averages, distributions, trends).
4. Integrate public datasets for context (demographics, health, poverty, food deserts).
5. Enable AI food image classification ingestion + tag storage.
6. Provide guided insights endpoints that answer common partner questions.
7. Enable reporting and export of insights.
8. Maintain a solid developer experience and deployment posture.

## Non-Goals (Phase 1)
1. Real‑time streaming analytics (near‑real‑time is acceptable).
2. Full BI platform capabilities (ad‑hoc SQL explorer, custom chart builder).
3. Fully automated anomaly detection with alerting (future enhancement).
4. Full workflow tooling for partner case management.

## Current Frontend Context
`Pantry_Dashboard` currently:
- Reads from static JSON (`src/data/supply_profiles.json`).
- Computes cultural match scores and missing foods client-side.
- Has no API calls.

Backend alignment strategy:
1. Define endpoints that can supply equivalent JSON shapes to replace the static file.
2. Move calculations server‑side once data pipelines and schema stabilize.
3. Add map‑ready endpoints for resources + demographic overlays.

## Proposed Architecture
**API**: FastAPI app in `backend/`  
**Database**: Supabase Postgres (primary OLTP store)  
**Deployment**: API service (single service to start)  
**ML Pipelines**:
- `ai-classifier/` produces raw tags from pantry images.
- `normalizer/` normalizes tags and outputs supply profiles.
- Text categorization pipeline for free‑text feedback.

## Data Model (Core)
### 1) Resource (Pantry / Soup Kitchen)
- `id` (uuid)
- `name` (text)
- `neighborhood` (text)
- `address` (text, nullable)
- `zip_code` (text, nullable)
- `latitude`, `longitude` (float, nullable)
- `resource_kind` (enum: pantry, soup_kitchen, other)
- `schedule` (jsonb: hours by day)
- `is_open_now` (bool, derived or cached)
- `created_at`, `updated_at`

### 2) Feedback
- `id` (uuid)
- `created_at` (timestamp)
- `pantry_id` (uuid)
- `rating` (int 1-5)
- `wait_time_min` (int, nullable)
- `resource_type` (enum: produce, protein, dairy, grains, canned, packaged, beverages, condiments, snacks, other)
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

### 4b) Photo + Classification Tags
- `photo_id` (uuid)
- `pantry_id` (uuid)
- `image_url` (text)
- `captured_at` (timestamp)
- `raw_tags` (jsonb)
- `normalized_tags` (jsonb)

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

### Resources (Map)
- `GET /resources`
  - Query params: `neighborhood`, `zip`, `resource_type`, `open_now`
  - Returns list of resources with coordinates + schedule summary
- `GET /resources/{id}`
  - Resource details + schedule

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
- `GET /analytics/insights`
  - Returns guided insight answers for common PRD questions

### Pantry Supply
- `GET /pantries`
  - Returns list of pantries and basic metadata
- `GET /pantries/{id}/supply`
  - Returns normalized supply profile (if ML pipeline integrated)

### Photo Classification
- `POST /photos`
  - Upload or register a photo URL for classification
- `GET /pantries/{id}/photos`
  - List photos + classification tags
- `POST /photos/{id}/classify`
  - Trigger classification (async in production)

### Public Datasets
- `GET /datasets`
  - List available public datasets
- `GET /datasets/{id}`
  - Dataset metadata + metrics
- `GET /datasets/overlay`
  - Returns geo overlays joined to resource locations (map-ready)

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
- Add demographic overlays and guided insights endpoints.

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
4. **Photo classification ingestion**
   - Store photo metadata
   - Persist raw tags + normalized tags
5. **Public dataset ingestion**
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
4. Add resource schedules + open status.
5. Add photo upload/classification ingestion.
6. Extend analytics for trends, maps, guided insights, and reporting.
7. Replace static dashboard data with APIs.

## Open Questions
1. Will feedback ingestion be direct from frontend or via other sources?
2. What exact schema should represent resource locations, schedules, and open status?
3. Should the backend compute cultural match or leave it to frontend?
4. Which public datasets are in scope for phase 1 ingestion?
5. What is the initial photo ingestion flow (upload vs URL registration)?
