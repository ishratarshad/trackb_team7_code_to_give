export const mapboxAccessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? '';

export function hasMapboxToken() {
  return Boolean(mapboxAccessToken);
}

export function buildStreetViewImageUrl(latitude?: number, longitude?: number) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey || typeof latitude !== 'number' || typeof longitude !== 'number') {
    return null;
  }

  const params = new URLSearchParams({
    key: apiKey,
    size: '1200x800',
    location: `${latitude},${longitude}`,
    fov: '95',
    pitch: '0',
  });

  return `https://maps.googleapis.com/maps/api/streetview?${params.toString()}`;
}
