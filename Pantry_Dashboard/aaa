# Lemontree Pantry Dashboard

Frontend-only Next.js dashboard for exploring food pantries and meal services with a synchronized map, compact resource list, detail views, bookmarks, analytics views, and in-browser feedback capture.

## Stack

- Next.js App Router
- React + TypeScript
- Tailwind CSS
- React Query
- Mapbox via `react-map-gl`

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `./.env.local`:

```bash
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_mapbox_public_token
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=optional_google_static_street_view_key
LEMONTREE_API_BASE_URL=https://platform.foodhelpline.org
```

3. Start the dev server:

```bash
npm run dev
```

The dev script starts on port `5000` by default. If `5000` is busy, it automatically tries `5001`, then `5002`, and so on until it finds an open port.

## Notes

- No separate backend service is required.
- Feedback form submissions are stored locally in the browser for the current app.
- If `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is missing, resource cards and detail views fall back to Lemontree-hosted images or a neutral placeholder.
- If `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` is missing, the dashboard still works and shows a setup fallback in the map panel instead of failing.
