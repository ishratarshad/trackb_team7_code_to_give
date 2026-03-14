import { NextResponse } from 'next/server';

import { buildBoundsSearchParams, fetchUpstreamJson } from '@/lib/api-utils';
import { normalizeMarkers } from '@/lib/adapters/resource-adapter';
import type { RawMarkerFeatureCollection } from '@/types/api';
import type { Bounds } from '@/types/resources';

function readBounds(searchParams: URLSearchParams): Bounds {
  return {
    west: Number(searchParams.get('west')),
    south: Number(searchParams.get('south')),
    east: Number(searchParams.get('east')),
    north: Number(searchParams.get('north')),
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const bounds = readBounds(searchParams);
    const raw = await fetchUpstreamJson<RawMarkerFeatureCollection>(
      '/api/resources/markersWithinBounds',
      buildBoundsSearchParams(bounds),
    );

    return NextResponse.json({
      markers: normalizeMarkers(raw),
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
