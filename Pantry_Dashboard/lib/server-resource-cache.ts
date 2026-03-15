import { normalizeResource } from '@/lib/adapters/resource-adapter';
import { fetchUpstreamJson } from '@/lib/api-utils';
import type { RawResource } from '@/types/api';
import type { Resource } from '@/types/resources';

const RESOURCE_CACHE_TTL_MS = 1000 * 60 * 5;
const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 50;

const resourceCache = new Map<
  string,
  {
    expiresAt: number;
    resource: Resource;
  }
>();

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getCachedResource(resourceId: string): Promise<Resource | null> {
  const now = Date.now();
  const cached = resourceCache.get(resourceId);

  if (cached && cached.expiresAt > now) {
    return cached.resource;
  }

  try {
    const rawResource = await fetchUpstreamJson<RawResource>(`/api/resources/${resourceId}`);
    const resource = normalizeResource(rawResource);

    resourceCache.set(resourceId, {
      expiresAt: now + RESOURCE_CACHE_TTL_MS,
      resource,
    });

    return resource;
  } catch {
    return null;
  }
}

export async function getCachedResources(resourceIds: string[]): Promise<Resource[]> {
  const results: (Resource | null)[] = [];
  const now = Date.now();

  // Separate cached and uncached IDs
  const uncachedIds: { index: number; id: string }[] = [];

  for (let i = 0; i < resourceIds.length; i++) {
    const id = resourceIds[i];
    const cached = resourceCache.get(id);

    if (cached && cached.expiresAt > now) {
      results[i] = cached.resource;
    } else {
      results[i] = null;
      uncachedIds.push({ index: i, id });
    }
  }

  // Fetch uncached resources in batches to avoid overwhelming the API
  for (let i = 0; i < uncachedIds.length; i += BATCH_SIZE) {
    const batch = uncachedIds.slice(i, i + BATCH_SIZE);

    const batchResults = await Promise.all(
      batch.map(async ({ id }) => {
        try {
          const rawResource = await fetchUpstreamJson<RawResource>(`/api/resources/${id}`);
          const resource = normalizeResource(rawResource);

          resourceCache.set(id, {
            expiresAt: Date.now() + RESOURCE_CACHE_TTL_MS,
            resource,
          });

          return resource;
        } catch {
          return null;
        }
      })
    );

    // Store batch results
    for (let j = 0; j < batch.length; j++) {
      results[batch[j].index] = batchResults[j];
    }

    // Add delay between batches to avoid rate limiting
    if (i + BATCH_SIZE < uncachedIds.length) {
      await delay(BATCH_DELAY_MS);
    }
  }

  return results.filter((r): r is Resource => r !== null);
}
