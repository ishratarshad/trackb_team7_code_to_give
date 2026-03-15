# Lemontree Pantry Dashboard

Current project state: a frontend-only Next.js dashboard for exploring food resources, map overlays, bookmarks, insights, and local feedback capture.

## Quick Start

```bash
cd Pantry_Dashboard
npm install
npm run dev
```

Open the URL printed by the dev server. It starts on port `5000` by default and automatically moves to the next open port if that one is already in use.

## Environment Variables

Create `Pantry_Dashboard/.env.local` with:

```bash
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_mapbox_public_token
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=optional_google_static_street_view_key
LEMONTREE_API_BASE_URL=https://platform.foodhelpline.org
```

## Project Structure

```text
Pantry_Dashboard/
  app/          Next.js routes and API handlers
  components/   UI and dashboard components
  hooks/        Client hooks
  lib/          Utilities and adapters
  services/     Frontend data access helpers
  src/data/     Bundled dashboard datasets
```

## Notes

- No separate backend service is required.
- Feedback submissions are stored locally in the browser.
- If the Mapbox token is missing, the rest of the dashboard still loads and the map panel shows a fallback state.
- If the Google Maps key is missing, image fallbacks are used where needed.
