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
    const bounds = readBounds(searchParams);
    const borough = readBorough(searchParams);
    const raw = await fetchUpstreamJson<RawMarkerFeatureCollection>(
      '/api/resources/markersWithinBounds',
      buildBoundsSearchParams(bounds),
    );
    const normalizedMarkers = normalizeMarkers(raw);

    if (!borough) {
      return NextResponse.json({
        markers: normalizedMarkers,
      });
    }

    const resources = await getCachedResources(normalizedMarkers.map((marker) => marker.id));
    const filteredMarkers = normalizedMarkers.filter((marker, index) =>
      matchesBorough(resources[index], borough),
    );

    return NextResponse.json({
      markers: filteredMarkers,
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : 'Failed to fetch markers',
      },
      { status: 500 },
    );
  }
}
