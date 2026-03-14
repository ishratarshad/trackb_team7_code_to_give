import { NextResponse } from 'next/server';

import { fetchUpstreamJson } from '@/lib/api-utils';
import { normalizeResource } from '@/lib/adapters/resource-adapter';
import type { RawResource } from '@/types/api';

export async function GET(
  _request: Request,
  context: {
    params: Promise<{
      resourceId: string;
    }>;
  },
) {
  try {
    const { resourceId } = await context.params;
    const raw = await fetchUpstreamJson<RawResource>(`/api/resources/${resourceId}`);
    return NextResponse.json(normalizeResource(raw));
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : 'Failed to fetch resource',
      },
      { status: 500 },
    );
  }
}
