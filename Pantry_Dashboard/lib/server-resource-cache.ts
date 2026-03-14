import { normalizeResource } from '@/lib/adapters/resource-adapter';
import { fetchUpstreamJson } from '@/lib/api-utils';
import type { RawResource } from '@/types/api';
import type { Resource } from '@/types/resources';

const RESOURCE_CACHE_TTL_MS = 1000 * 60 * 5;

const resourceCache = new Map<
  string,
  {
    expiresAt: number;
    resource: Resource;
  }
>();

export async function getCachedResource(resourceId: string) {
  const now = Date.now();
  const cached = resourceCache.get(resourceId);

  if (cached && cached.expiresAt > now) {
    return cached.resource;
  }

  const rawResource = await fetchUpstreamJson<RawResource>(`/api/resources/${resourceId}`);
  const resource = normalizeResource(rawResource);

  resourceCache.set(resourceId, {
    expiresAt: now + RESOURCE_CACHE_TTL_MS,
    resource,
  });

  return resource;
}

export async function getCachedResources(resourceIds: string[]) {
  return Promise.all(resourceIds.map((resourceId) => getCachedResource(resourceId)));
}
