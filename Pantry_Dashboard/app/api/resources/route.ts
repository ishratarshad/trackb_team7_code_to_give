import { NextResponse } from 'next/server';

import { appendIfPresent, fetchUpstreamJson } from '@/lib/api-utils';
import { normalizeResourceCollection } from '@/lib/adapters/resource-adapter';
import { matchesBorough } from '@/lib/boroughs';
import type { RawResourceCollection } from '@/types/api';
import type { Borough, Resource, ResourceCollection } from '@/types/resources';

const FILTERED_QUERY_TTL_MS = 1000 * 60;

const filteredQueryCache = new Map<
  string,
  {
    expiresAt: number;
    response: ResourceCollection;
  }
>();

function readBorough(searchParams: URLSearchParams) {
  const borough = searchParams.get('borough');

  if (
    borough === 'manhattan' ||
    borough === 'brooklyn' ||
    borough === 'queens' ||
    borough === 'bronx' ||
    borough === 'staten-island' ||
    borough === 'unknown'
  ) {
    return borough satisfies Borough;
  }

  return '';
}

function buildUpstreamParams(searchParams: URLSearchParams) {
  const upstreamParams = new URLSearchParams();

  appendIfPresent(upstreamParams, 'lat', searchParams.get('lat') ?? undefined);
  appendIfPresent(upstreamParams, 'lng', searchParams.get('lng') ?? undefined);
  appendIfPresent(upstreamParams, 'location', searchParams.get('location') ?? undefined);
  appendIfPresent(upstreamParams, 'text', searchParams.get('text') ?? undefined);
  appendIfPresent(
    upstreamParams,
    'resourceTypeId',
    searchParams.get('resourceTypeId') ?? undefined,
  );
  appendIfPresent(upstreamParams, 'tagId', searchParams.get('tagId') ?? undefined);
  appendIfPresent(
    upstreamParams,
    'occurrencesWithin',
    searchParams.get('occurrencesWithin') ?? undefined,
  );
  appendIfPresent(upstreamParams, 'region', searchParams.get('region') ?? undefined);
  appendIfPresent(upstreamParams, 'sort', searchParams.get('sort') ?? undefined);

  return upstreamParams;
}

function buildFilteredCacheKey(searchParams: URLSearchParams, borough: Borough) {
  const params = buildUpstreamParams(searchParams);
  params.set('borough', borough);
  return params.toString();
}

async function getFilteredResourceCollection(searchParams: URLSearchParams, borough: Borough) {
  const cacheKey = buildFilteredCacheKey(searchParams, borough);
  const now = Date.now();
  const cached = filteredQueryCache.get(cacheKey);

  if (cached && cached.expiresAt > now) {
    return cached.response;
  }

  const upstreamParams = buildUpstreamParams(searchParams);
  let upstreamCursor: string | null = null;
  let resolvedLocation: ResourceCollection['resolvedLocation'] = null;
  const resources: Resource[] = [];

  do {
    const pageParams = new URLSearchParams(upstreamParams);
    pageParams.set('take', '50');
    appendIfPresent(pageParams, 'cursor', upstreamCursor ?? undefined);

    const raw = await fetchUpstreamJson<RawResourceCollection>('/api/resources', pageParams);
    const normalized = normalizeResourceCollection(raw);

    if (!resolvedLocation && normalized.resolvedLocation) {
      resolvedLocation = normalized.resolvedLocation;
    }

    resources.push(...normalized.resources.filter((resource) => matchesBorough(resource, borough)));
    upstreamCursor = normalized.cursor;
  } while (upstreamCursor);

  const response = {
    count: resources.length,
    cursor: null,
    resources,
    resolvedLocation,
  } satisfies ResourceCollection;

  filteredQueryCache.set(cacheKey, {
    expiresAt: now + FILTERED_QUERY_TTL_MS,
    response,
  });

  return response;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const borough = readBorough(searchParams);

    if (!borough) {
      const upstreamParams = buildUpstreamParams(searchParams);

      appendIfPresent(upstreamParams, 'take', searchParams.get('take') ?? '18');
      appendIfPresent(upstreamParams, 'cursor', searchParams.get('cursor') ?? undefined);

      const raw = await fetchUpstreamJson<RawResourceCollection>('/api/resources', upstreamParams);
      return NextResponse.json(normalizeResourceCollection(raw));
    }

    const take = Number(searchParams.get('take') ?? '18');
    const cursor = Number(searchParams.get('cursor') ?? '0');
    const safeTake = Number.isFinite(take) && take > 0 ? take : 18;
    const safeCursor = Number.isFinite(cursor) && cursor > 0 ? cursor : 0;
    const filteredCollection = await getFilteredResourceCollection(searchParams, borough);
    const nextCursor =
      safeCursor + safeTake < filteredCollection.resources.length
        ? String(safeCursor + safeTake)
        : null;

    return NextResponse.json({
      ...filteredCollection,
      cursor: nextCursor,
      resources: filteredCollection.resources.slice(safeCursor, safeCursor + safeTake),
    } satisfies ResourceCollection);
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : 'Failed to fetch resources',
      },
      { status: 500 },
    );
  }
}
