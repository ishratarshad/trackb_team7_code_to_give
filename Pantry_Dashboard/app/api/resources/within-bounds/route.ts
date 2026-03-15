import { NextResponse } from 'next/server';

import { buildBoundsSearchParams, fetchUpstreamJson } from '@/lib/api-utils';
import { matchesBorough } from '@/lib/boroughs';
import { normalizeMarkers } from '@/lib/adapters/resource-adapter';
import { getCachedResources } from '@/lib/server-resource-cache';
import type { RawMarkerFeatureCollection } from '@/types/api';
import type { Borough, Bounds } from '@/types/resources';

function readBounds(searchParams: URLSearchParams): Bounds {
  return {
    west: Number(searchParams.get('west')),
    south: Number(searchParams.get('south')),
    east: Number(searchParams.get('east')),
    north: Number(searchParams.get('north')),
  };
}

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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const take = Number(searchParams.get('take') ?? '8');
    const cursor = Number(searchParams.get('cursor') ?? '0');
    const bounds = readBounds(searchParams);
    const borough = readBorough(searchParams);
    const markerResponse = await fetchUpstreamJson<RawMarkerFeatureCollection>(
      '/api/resources/markersWithinBounds',
      buildBoundsSearchParams(bounds),
    );
    const markers = normalizeMarkers(markerResponse);

    if (borough) {
      // Limit the number of resources we fetch for borough filtering to avoid timeouts
      const maxFetchForFilter = 200;
      const idsToFetch = markers.slice(0, maxFetchForFilter).map((marker) => marker.id);
      const markerResources = await getCachedResources(idsToFetch);
      const filteredResources = markerResources.filter((resource) => matchesBorough(resource, borough));
      const safeCursor = Number.isFinite(cursor) && cursor > 0 ? cursor : 0;
      const safeTake = Number.isFinite(take) && take > 0 ? take : 8;
      const nextCursor =
        safeCursor + safeTake < filteredResources.length ? String(safeCursor + safeTake) : null;

      return NextResponse.json({
        totalMarkers: filteredResources.length,
        cursor: nextCursor,
        resources: filteredResources.slice(safeCursor, safeCursor + safeTake),
      });
    }

    const safeCursor = Number.isFinite(cursor) && cursor > 0 ? cursor : 0;
    const ids = markers
      .slice(safeCursor, safeCursor + take)
      .map((marker) => marker.id);
    const nextCursor =
      safeCursor + take < markers.length ? String(safeCursor + take) : null;

    const resources = await getCachedResources(ids);

    return NextResponse.json({
      totalMarkers: markers.length,
      cursor: nextCursor,
      resources,
    });
  } catch (error) {
    console.error('Error fetching resources within bounds:', error);
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : 'Failed to fetch resources within bounds',
        totalMarkers: 0,
        cursor: null,
        resources: [],
      },
      { status: 500 },
    );
  }
}
