# Lemontree Partner Intelligence Platform — Design Doc

This document defines the technical design for this repo based on `PRD.md`, `lemontree_project.md`, and the current codebase layout. It reconciles the product goals with the existing implementation (FastAPI backend, Vite frontend, classifier and normalizer pipelines).

## 1. Scope And Goals

### Product Goals (from PRD)
- Interactive map of food resources with filters and open‑now status.
- Feedback analytics: wait times, ratings, issue trends.
- AI food image classification and normalized supply profiles.
- Demographic overlays for contextual insights.
- Guided insights answering common partner questions.

### Repo Reality (current state)
- **Frontend**: `Pantry_Dashboard/` is a Vite + React app rendering a static cultural match dashboard from local JSON.
- **Backend**: `backend/` is a FastAPI service with Postgres schema + API endpoints for pantries/resources, feedback, analytics, datasets, photos, and reports.
- **AI Classifier**: `ai-classifier/` is a Node CLI that calls Anthropic Claude Vision to generate raw food tags.
- **Normalizer**: `normalizer/` is a Python service that normalizes tags into supply profiles using Gemini (with mock mode fallback).

This design keeps those components and defines how they should be integrated to fully meet the PRD.

## 2. Architecture Overview

### High-Level Components
- **Frontend** (`Pantry_Dashboard/`): UI and user workflows.
- **Backend API** (`backend/`): data storage, aggregation, and analytics endpoints.
- **Classifier Pipeline** (`ai-classifier/`): batch image tagging (raw tags).
- **Normalizer Pipeline** (`normalizer/`): tag normalization + supply profiles.
- **External Data**: Lemontree public API + NYC Open Data.

### Intended Data Flow
1. **Ingest** Lemontree resources + photos into backend.
2. **Classify** photos via `ai-classifier` (Claude Vision).
3. **Normalize** tags via `normalizer` (Gemini).
4. **Store** normalized supply profiles + photo tags in backend.
5. **Serve** dashboard data via backend APIs to frontend.

## 3. Frontend Design (Pantry_Dashboard)

### Current State
- Renders `src/data/pantryData.json` in a static cultural match view.
- Includes API clients for Lemontree (`src/lib/lemontreeApi.js`) and NYC Open Data (`src/lib/demographicsApi.js`) but does not use them in UI.

### Target Behavior
- Replace static JSON with backend APIs.
- Keep frontend thin: rendering + light calculations only.

### Primary UI Modules (planned)
- Map view with resource pins + demographic overlays.
- Guided insights panel.
- AI image browser.
- Cultural match dashboard (existing view).

## 4. Backend Design (backend/)

### Core Responsibilities
- Store resources, feedback, photos, supply profiles, and datasets.
- Provide analytics and guided insights endpoints.
- Provide map-ready endpoints (resources with filters, heatmap, demographic overlay).

### Current API Surface (implemented)
- Resources:
  - `POST /pantries`
  - `GET /pantries`
  - `GET /pantries/{id}`
  - `GET /resources`
  - `GET /resources/{id}`
- Feedback:
  - `POST /feedback`
  - `GET /feedback`
- Analytics:
  - `GET /analytics/summary`
  - `GET /analytics/issues`
  - `GET /analytics/trends`
  - `GET /analytics/heatmap`
  - `GET /analytics/insights`
- Supply:
  - `GET /pantries/{id}/supply`
- Photos:
  - `POST /photos`
  - `GET /pantries/{id}/photos`
  - `POST /photos/{id}/classify`
- Datasets:
  - `GET /datasets`
  - `GET /datasets/{id}`
  - `GET /datasets/overlay`
- Reports:
  - `POST /reports`
  - `GET /reports/{id}`

### Data Model Notes
- `pantries` table now represents “resources” and includes:
  - `resource_kind` (`pantry`, `soup_kitchen`, `other`)
  - `zip_code`, `schedule`, `is_open_now`
- `pantry_photos` table stores image URLs + tags.
- `supply_profiles` stores normalized food distribution.
- `public_datasets` + `public_dataset_metrics` for demographic overlays.

## 5. AI Classification Pipeline

### Raw Tagging (ai-classifier/)
- Batch classification CLI using Claude Vision.
- Outputs raw tags + confidence + source metadata (resource ID, zip, lat/lng).

### Normalization (normalizer/)
- Converts raw tags into normalized taxonomy + category distribution.
- Produces a supply profile per resource.

### Backend Integration (planned)
- Write a small ingest script to:
  1. Insert photos into `pantry_photos`.
  2. Save raw tags via `POST /photos/{id}/classify`.
  3. Write normalized results into `supply_profiles`.

## 6. External Data Integration

### Lemontree Public API
- Used for resource metadata and potentially photos + reviews.
- Currently consumed directly by the frontend.

### NYC Open Data
- Zip-level demographics from NYC Open Data API.
- Currently consumed directly by the frontend.

### Target State
- Backend periodically ingests external data.
- Frontend only calls backend endpoints.

## 7. Guided Insights

### PRD Questions
- Longest wait times by neighborhood.
- Inaccurate listing reports.
- Food types by zip.
- Travel distance / unmet demand.
- Photo filters by pantry + date range.
- Pantries per capita.

### Implementation Approach
- Expand `/analytics/insights` to accept filters and compute each insight.
- Store precomputed aggregates if performance becomes an issue.

## 8. Deployment Assumptions

### Current Repo
- No deployment scripts committed.
- Backend runs via `uvicorn`.
- Frontend runs via `vite`.
- Classifier and normalizer run locally via CLI.

### Minimum Demo Stack
- Local FastAPI backend + Postgres.
- Local Vite frontend.
- One-time classification run with stored JSON.

## 9. Open Issues And Gaps

1. No automated ingestion from Lemontree API into backend.
2. `is_open_now` not computed from occurrences.
3. `ai-classifier` and `normalizer` not wired into backend.
4. Frontend still uses static JSON instead of backend APIs.
5. Guided insights only partially implemented.

## 10. Next Steps (Recommended)

1. Add a Lemontree ingestion script into `backend/` or `data/`.
2. Wire classifier output into backend photo + supply endpoints.
3. Replace frontend static JSON with backend API calls.
4. Expand `/analytics/insights` to cover PRD questions with filters.
5. Add tests for new backend endpoints.
