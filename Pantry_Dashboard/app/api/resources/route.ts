import { NextResponse } from 'next/server';

import { appendIfPresent, fetchUpstreamJson } from '@/lib/api-utils';
import { normalizeResourceCollection } from '@/lib/adapters/resource-adapter';
import type { RawResourceCollection } from '@/types/api';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
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
    appendIfPresent(upstreamParams, 'take', searchParams.get('take') ?? '18');
    appendIfPresent(upstreamParams, 'cursor', searchParams.get('cursor') ?? undefined);

    const raw = await fetchUpstreamJson<RawResourceCollection>('/api/resources', upstreamParams);
    return NextResponse.json(normalizeResourceCollection(raw));
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : 'Failed to fetch resources',
      },
      { status: 500 },
    );
  }
}
