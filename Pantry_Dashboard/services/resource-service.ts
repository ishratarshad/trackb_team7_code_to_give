import type {
  Bounds,
  BoundsResourceCollection,
  Resource,
  ResourceCollection,
  ResourceMarker,
  ResourceQueryInput,
} from '@/types/resources';

function appendIfPresent(searchParams: URLSearchParams, key: string, value?: string | number) {
  if (value === undefined || value === null || value === '') {
    return;
  }

  searchParams.set(key, String(value));
}

async function readJson<T>(input: string, signal?: AbortSignal) {
  const response = await fetch(input, {
    cache: 'no-store',
    signal,
  });

  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}`);
  }

  return (await response.json()) as T;
}

export const resourceService = {
  async listResources(input: ResourceQueryInput, signal?: AbortSignal) {
    const params = new URLSearchParams();
    appendIfPresent(params, 'lat', input.lat);
    appendIfPresent(params, 'lng', input.lng);
    appendIfPresent(params, 'location', input.location);
    appendIfPresent(params, 'text', input.text);
    appendIfPresent(params, 'resourceTypeId', input.resourceTypeId);
    appendIfPresent(params, 'tagId', input.tagId);
    appendIfPresent(params, 'occurrencesWithin', input.occurrencesWithin);
    appendIfPresent(params, 'region', input.region);
    appendIfPresent(params, 'sort', input.sort);
    appendIfPresent(params, 'take', input.take);
    appendIfPresent(params, 'cursor', input.cursor);
    const suffix = params.toString() ? `?${params.toString()}` : '';
    return readJson<ResourceCollection>(`/api/resources${suffix}`, signal);
  },

  async getResource(resourceId: string, signal?: AbortSignal) {
    return readJson<Resource>(`/api/resources/${resourceId}`, signal);
  },

  async getMarkers(bounds: Bounds, signal?: AbortSignal) {
    const params = new URLSearchParams({
      west: String(bounds.west),
      south: String(bounds.south),
      east: String(bounds.east),
      north: String(bounds.north),
    });

    return readJson<{ markers: ResourceMarker[] }>(`/api/markers?${params.toString()}`, signal);
  },

  async getResourcesWithinBounds(
    bounds: Bounds,
    take = 8,
    cursor?: string | null,
    signal?: AbortSignal,
  ) {
    const params = new URLSearchParams({
      west: String(bounds.west),
      south: String(bounds.south),
      east: String(bounds.east),
      north: String(bounds.north),
      take: String(take),
    });
    appendIfPresent(params, 'cursor', cursor ?? undefined);

    return readJson<BoundsResourceCollection>(`/api/resources/within-bounds?${params.toString()}`, signal);
  },
};
