# Lemontree Pantry Dashboard

**Supply profiles:** The dashboard imports `src/data/supply_profiles.json`, but the generated file lives at project-root `data/supply_profiles.json`. After running the normalizer pipeline, sync it with:

```bash
npm run sync:supply-profiles
```

This copies `../data/supply_profiles.json` into `src/data/` so Vite can import it.

---

Frontend-only prototype for exploring food pantries and meal services with a synchronized map, compact list view, structured resource details, and local bookmarks.

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

2. Create `.env.local`:

```bash
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_mapbox_public_token
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=optional_google_static_street_view_key
LEMONTREE_API_BASE_URL=https://platform.foodhelpline.org
```

3. Run the app:

```bash
npm run dev
```

## Notes

- The app is intentionally limited to trustworthy metadata returned by the public Lemontree resource API.
- Review-dependent features, mock review data, demographic overlays, and speculative analytics have been removed.
- The primary product now focuses on map exploration, list browsing, filtering, pagination, expanded resource details, and bookmarks.
- If `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is missing, resource cards and the detail drawer fall back to Lemontree-hosted images or a neutral placeholder.
- If `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` is missing, the dashboard still works and shows a setup fallback in the map panel instead of failing.
