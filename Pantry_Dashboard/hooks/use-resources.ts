'use client';

import { useInfiniteQuery, useQueries, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { resourceService } from '@/services/resource-service';
import { reviewService } from '@/services/review-service';
import type { Borough, Bounds, ResourceQueryInput, ReviewPayload } from '@/types/resources';

export function useInfiniteResources(input: ResourceQueryInput) {
  return useInfiniteQuery({
    queryKey: ['resources', input],
    queryFn: ({ pageParam, signal }) =>
      resourceService.listResources(
        {
          ...input,
          cursor: typeof pageParam === 'string' ? pageParam : undefined,
        },
        signal,
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.cursor ?? undefined,
  });
}

export function useResource(resourceId: string | null) {
  return useQuery({
    queryKey: ['resource', resourceId],
    queryFn: ({ signal }) => resourceService.getResource(resourceId as string, signal),
    enabled: Boolean(resourceId),
  });
}

export function useMarkers(bounds: Bounds | null, borough?: Borough | '') {
  return useQuery({
    queryKey: ['markers', bounds, borough],
    queryFn: ({ signal }) => resourceService.getMarkers(bounds as Bounds, borough, signal),
    enabled: Boolean(bounds),
  });
}

export function useResourcesWithinBounds(
  bounds: Bounds | null,
  take = 8,
  cursor?: string | null,
  borough?: Borough | '',
) {
  return useQuery({
    queryKey: ['resources-within-bounds', bounds, take, cursor, borough],
    queryFn: ({ signal }) =>
      resourceService.getResourcesWithinBounds(bounds as Bounds, take, cursor, borough, signal),
    enabled: Boolean(bounds),
  });
}

export function useReviewSummary(resourceId: string | null) {
  return useQuery({
    queryKey: ['review-summary', resourceId],
    queryFn: ({ signal }) => reviewService.getReviews(resourceId as string, signal),
    enabled: Boolean(resourceId),
  });
}

export function useReviewSummaries(resourceIds: string[]) {
  const uniqueIds = useMemo(
    () => Array.from(new Set(resourceIds.filter(Boolean))),
    [resourceIds],
  );

  const results = useQueries({
    queries: uniqueIds.map((resourceId) => ({
      queryKey: ['review-summary', resourceId],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        reviewService.getReviews(resourceId, signal),
      staleTime: 1000 * 60 * 5,
    })),
  });

  const dataById = useMemo(() => {
    const next = new Map<string, ReviewPayload>();

    uniqueIds.forEach((resourceId, index) => {
      const payload = results[index]?.data;

      if (payload) {
        next.set(resourceId, payload);
      }
    });

    return next;
  }, [results, uniqueIds]);

  return {
    dataById,
    isLoading: results.some((result) => result.isLoading),
    isFetching: results.some((result) => result.isFetching),
    isError: results.some((result) => result.isError),
  };
}
