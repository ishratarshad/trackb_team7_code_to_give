import { deserialize } from 'superjson';

import type { Bounds } from '@/types/resources';

const DEFAULT_BASE_URL = 'https://platform.foodhelpline.org';

export function getApiBaseUrl() {
  return process.env.LEMONTREE_API_BASE_URL ?? DEFAULT_BASE_URL;
}

export function deserializeMaybeSuperJson<T>(payload: unknown): T {
  if (
    payload &&
    typeof payload === 'object' &&
    'json' in payload &&
    Object.prototype.hasOwnProperty.call(payload, 'meta')
  ) {
    try {
      return deserialize(payload as never) as T;
    } catch {
      return (payload as { json: T }).json;
    }
  }

  if (payload && typeof payload === 'object' && 'json' in payload) {
    return (payload as { json: T }).json;
  }

  return payload as T;
}

export async function fetchUpstreamJson<T>(path: string, searchParams?: URLSearchParams) {
  const url = new URL(path, getApiBaseUrl());

  if (searchParams) {
    url.search = searchParams.toString();
  }

  const response = await fetch(url.toString(), {
    headers: {
      Accept: 'application/json',
    },
    next: {
      revalidate: 60,
    },
  });

  if (!response.ok) {
    throw new Error(`Lemontree API request failed with ${response.status}`);
  }

  const payload = (await response.json()) as unknown;
  return deserializeMaybeSuperJson<T>(payload);
}

export function appendIfPresent(params: URLSearchParams, key: string, value?: string | number) {
  if (value === undefined || value === null || value === '') {
    return;
  }

  params.set(key, String(value));
}

export function buildBoundsSearchParams(bounds: Bounds) {
  const params = new URLSearchParams();
  params.append('corner', `${bounds.west},${bounds.south}`);
  params.append('corner', `${bounds.east},${bounds.north}`);
  return params;
}
