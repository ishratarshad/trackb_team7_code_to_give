import type { Bounds, Coordinates } from '@/types/resources';

const EARTH_RADIUS_MILES = 3958.8;

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

export function distanceInMiles(a: Coordinates, b: Coordinates) {
  const latitudeDelta = toRadians(b.latitude - a.latitude);
  const longitudeDelta = toRadians(b.longitude - a.longitude);
  const latitudeOne = toRadians(a.latitude);
  const latitudeTwo = toRadians(b.latitude);

  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.sin(longitudeDelta / 2) ** 2 *
      Math.cos(latitudeOne) *
      Math.cos(latitudeTwo);

  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.sqrt(haversine));
}

export function isWithinBounds(coordinates: Coordinates | null, bounds: Bounds | null) {
  if (!coordinates || !bounds) {
    return false;
  }

  return (
    coordinates.longitude >= bounds.west &&
    coordinates.longitude <= bounds.east &&
    coordinates.latitude >= bounds.south &&
    coordinates.latitude <= bounds.north
  );
}

export function roundBounds(bounds: Bounds | null) {
  if (!bounds) {
    return null;
  }

  return {
    west: Number(bounds.west.toFixed(4)),
    south: Number(bounds.south.toFixed(4)),
    east: Number(bounds.east.toFixed(4)),
    north: Number(bounds.north.toFixed(4)),
  };
}
