'use client';

import dynamic from 'next/dynamic';
import { startTransition, useDeferredValue, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, LoaderCircle } from 'lucide-react';
import {
  useRouter,
  useSearchParams,
  type ReadonlyURLSearchParams,
} from 'next/navigation';

import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { InsightsView } from '@/components/dashboard/insights-view';
import { ResourceFilters } from '@/components/dashboard/resource-filters';
import { ResourceDetailDrawer } from '@/components/resources/resource-detail-drawer';
import { ResourceCard } from '@/components/resources/resource-card';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingCard } from '@/components/ui/loading-card';
import { useBookmarks } from '@/hooks/use-bookmarks';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import {
  useInfiniteResources,
  useMarkers,
  useResource,
  useResourcesWithinBounds,
  useReviewSummaries,
} from '@/hooks/use-resources';
import { createTimeframedSummaryMap } from '@/lib/analytics';
import { getBoroughLabel, matchesBorough } from '@/lib/boroughs';
import { distanceInMiles, roundBounds } from '@/lib/geo';
import type {
  Borough,
  Bounds,
  Coordinates,
  DashboardFilterState,
  Resource,
  ResourceListSort,
  ReviewPayload,
  TimeframeOption,
} from '@/types/resources';

// --- TEAM 7: JSON DATA LINK ---
import supplyProfiles from '@/src/data/supply_profiles.json';

const ResourceMap = dynamic(
  () => import('@/components/dashboard/resource-map').then((module) => module.ResourceMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[460px] items-center justify-center rounded-[28px] bg-white/70 text-slate">
        Loading map…
      </div>
    ),
  },
);

const DEFAULT_CENTER: Coordinates = {
  latitude: 40.7128,
  longitude: -74.006,
};

const LIST_PAGE_SIZE = 8;
const HIGH_WAIT_THRESHOLD_MINUTES = 45;
const HIGH_FAILURE_THRESHOLD = 30;
const INACCURATE_THRESHOLD = 20;

type DashboardView = 'explore' | 'insights';
type InsightsScope = 'all' | 'bookmarked';

type MapViewportState = {
  bounds: Bounds | null;
  center: Coordinates;
};

const DEFAULT_FILTERS: DashboardFilterState = {
  location: '',
  searchText: '',
  borough: '',
  resourceTypeId: '',
  tagId: '',
  timeframe: '30d',
  openNowOnly: false,
  openSoonOnly: false,
  syncListToMap: true,
  highestWait: false,
  highFailureRate: false,
  inaccurateListings: false,
  sort: 'alpha-asc',
  nearbyRadiusMiles: 2,
  hasFreshProduce: false,
  hasHalal: false,
  hasKosher: false,
  hasMeat: false,
  hasDairy: false,
  hasCanned: false,
  hasGrains: false,
};

function isBorough(value: string | null): value is Borough {
  return (
    value === 'manhattan' ||
    value === 'brooklyn' ||
    value === 'queens' ||
    value === 'bronx' ||
    value === 'staten-island' ||
    value === 'unknown'
  );
}

function isResourceSort(value: string | null): value is ResourceListSort {
  return (
    value === 'alpha-asc' ||
    value === 'open-now' ||
    value === 'open-soon' ||
    value === 'wait-desc' ||
    value === 'rating-desc' ||
    value === 'rating-asc' ||
    value === 'reviews-desc'
  );
}

function isTimeframeOption(value: string | null): value is TimeframeOption {
  return value === 'all' || value === '7d' || value === '30d' || value === '90d' || value === '12m';
}

function readBooleanParam(
  searchParams: ReadonlyURLSearchParams,
  key: string,
  defaultValue = false,
) {
  const value = searchParams.get(key);
  if (value === null) return defaultValue;
  return value === '1' || value === 'true';
}

function readNumberParam(
  searchParams: ReadonlyURLSearchParams,
  key: string,
  defaultValue: number,
) {
  const value = Number(searchParams.get(key));
  return Number.isFinite(value) ? value : defaultValue;
}

function readFiltersFromSearchParams(searchParams: ReadonlyURLSearchParams): DashboardFilterState {
  const sort = searchParams.get('sort');
  const timeframe = searchParams.get('timeframe');
  const borough = searchParams.get('borough');

  return {
    ...DEFAULT_FILTERS,
    location: searchParams.get('location') ?? '',
    searchText: searchParams.get('text') ?? '',
    borough: isBorough(borough) ? borough : '',
    resourceTypeId: searchParams.get('resourceTypeId') ?? '',
    tagId: searchParams.get('tagId') ?? '',
    timeframe: isTimeframeOption(timeframe) ? timeframe : DEFAULT_FILTERS.timeframe,
    openNowOnly: readBooleanParam(searchParams, 'openNowOnly'),
    openSoonOnly: readBooleanParam(searchParams, 'openSoonOnly'),
    syncListToMap: readBooleanParam(searchParams, 'syncListToMap', true),
    highestWait: readBooleanParam(searchParams, 'highestWait'),
    highFailureRate: readBooleanParam(searchParams, 'highFailureRate'),
    inaccurateListings: readBooleanParam(searchParams, 'inaccurateListings'),
    hasFreshProduce: readBooleanParam(searchParams, 'hasFreshProduce'),
    hasHalal: readBooleanParam(searchParams, 'hasHalal'),
    hasKosher: readBooleanParam(searchParams, 'hasKosher'),
    hasMeat: readBooleanParam(searchParams, 'hasMeat'),
    hasDairy: readBooleanParam(searchParams, 'hasDairy'),
    hasCanned: readBooleanParam(searchParams, 'hasCanned'),
    hasGrains: readBooleanParam(searchParams, 'hasGrains'),
    sort: isResourceSort(sort) ? sort : DEFAULT_FILTERS.sort,
    nearbyRadiusMiles: readNumberParam(
      searchParams,
      'nearbyRadiusMiles',
      DEFAULT_FILTERS.nearbyRadiusMiles,
    ),
  };
}

function readDashboardView(searchParams: ReadonlyURLSearchParams): DashboardView {
  return searchParams.get('view') === 'insights' ? 'insights' : 'explore';
}

function readInsightsScope(searchParams: ReadonlyURLSearchParams): InsightsScope {
  return searchParams.get('insightsScope') === 'bookmarked' ? 'bookmarked' : 'all';
}

function createDashboardSearchParams({
  filters,
  view,
  insightsScope,
  resourceId,
}: {
  filters: DashboardFilterState;
  view: DashboardView;
  insightsScope: InsightsScope;
  resourceId?: string | null;
}) {
  const params = new URLSearchParams();
  if (filters.location) params.set('location', filters.location);
  if (filters.searchText) params.set('text', filters.searchText);
  if (filters.borough) params.set('borough', filters.borough);
  if (filters.resourceTypeId) params.set('resourceTypeId', filters.resourceTypeId);
  if (filters.tagId) params.set('tagId', filters.tagId);
  if (filters.timeframe !== DEFAULT_FILTERS.timeframe) params.set('timeframe', filters.timeframe);
  if (filters.openNowOnly) params.set('openNowOnly', '1');
  if (filters.openSoonOnly) params.set('openSoonOnly', '1');
  if (!filters.syncListToMap) params.set('syncListToMap', '0');
  if (filters.highestWait) params.set('highestWait', '1');
  if (filters.highFailureRate) params.set('highFailureRate', '1');
  if (filters.inaccurateListings) params.set('inaccurateListings', '1');
  if (filters.hasFreshProduce) params.set('hasFreshProduce', '1');
  if (filters.hasHalal) params.set('hasHalal', '1');
  if (filters.hasKosher) params.set('hasKosher', '1');
  if (filters.hasMeat) params.set('hasMeat', '1');
  if (filters.hasDairy) params.set('hasDairy', '1');
  if (filters.hasCanned) params.set('hasCanned', '1');
  if (filters.hasGrains) params.set('hasGrains', '1');
  if (filters.sort !== DEFAULT_FILTERS.sort) params.set('sort', filters.sort);
  if (filters.nearbyRadiusMiles !== DEFAULT_FILTERS.nearbyRadiusMiles) params.set('nearbyRadiusMiles', String(filters.nearbyRadiusMiles));
  if (view === 'insights') params.set('view', 'insights');
  if (insightsScope === 'bookmarked') params.set('insightsScope', 'bookmarked');
  if (resourceId) params.set('resourceId', resourceId);
  return params;
}

function normalizeSearchText(value: string) {
  return value.trim().toLowerCase();
}

function isOpenSoon(resource: Resource) {
  return resource.status.source === 'occurrences' && resource.status.opensSoon;
}

function getNextOccurrenceTimestamp(resource: Resource) {
  if (!resource.status.nextOccurrenceStart) return Number.MAX_SAFE_INTEGER;
  const parsed = new Date(resource.status.nextOccurrenceStart).getTime();
  return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
}

function compareNames(left: Resource, right: Resource) {
  return left.name.localeCompare(right.name);
}

function sortResources(
  resources: Resource[],
  sort: ResourceListSort,
  reviewPayloadById: Map<string, ReviewPayload>,
) {
  return [...resources].sort((left, right) => {
    if (sort === 'open-now') {
      const leftOpenScore = left.status.isOpen ? 2 : left.status.opensSoon ? 1 : 0;
      const rightOpenScore = right.status.isOpen ? 2 : right.status.opensSoon ? 1 : 0;
      return rightOpenScore - leftOpenScore || compareNames(left, right);
    }
    if (sort === 'open-soon') {
      const leftSoonScore = left.status.opensSoon ? 2 : left.status.isOpen ? 1 : 0;
      const rightSoonScore = right.status.opensSoon ? 2 : right.status.isOpen ? 1 : 0;
      return (
        rightSoonScore - leftSoonScore ||
        getNextOccurrenceTimestamp(left) - getNextOccurrenceTimestamp(right) ||
        compareNames(left, right)
      );
    }
    if (sort === 'wait-desc') {
      const leftWait = reviewPayloadById.get(left.id)?.summary.averageWaitMinutes ?? Number.MIN_SAFE_INTEGER;
      const rightWait = reviewPayloadById.get(right.id)?.summary.averageWaitMinutes ?? Number.MIN_SAFE_INTEGER;
      return rightWait - leftWait || compareNames(left, right);
    }
    if (sort === 'rating-desc') {
      return (right.ratingAverage ?? Number.MIN_SAFE_INTEGER) - (left.ratingAverage ?? Number.MIN_SAFE_INTEGER) || compareNames(left, right);
    }
    if (sort === 'rating-asc') {
      return (left.ratingAverage ?? Number.MAX_SAFE_INTEGER) - (right.ratingAverage ?? Number.MAX_SAFE_INTEGER) || compareNames(left, right);
    }
    if (sort === 'reviews-desc') {
      return right.reviewCount - left.reviewCount || compareNames(left, right);
    }
    return compareNames(left, right);
  });
}

function matchesText(resource: Resource, query: string) {
  if (!query) return true;
  const haystack = [
    resource.name,
    resource.address,
    resource.description,
    resource.resourceTypeLabel,
    resource.tags.map((tag) => tag.label).join(' '),
  ].join(' ').toLowerCase();
  return haystack.includes(query);
}

function matchesLocation(resource: Resource, query: string) {
  if (!query) return true;
  const haystack = [
    resource.address,
    resource.streetAddress,
    resource.cityStateZip,
    resource.city,
    resource.state,
    resource.zipCode,
  ].filter(Boolean).join(' ').toLowerCase();
  return haystack.includes(query);
}

function matchesSelectedBorough(resource: Resource, borough: DashboardFilterState['borough']) {
  return matchesBorough(resource, borough);
}

function matchesStructuredFlags(
  resource: Resource,
  filters: DashboardFilterState,
  reviewPayloadById: Map<string, ReviewPayload>,
) {
  if (!filters.highestWait && !filters.highFailureRate && !filters.inaccurateListings) {
    return true;
  }
  const summary = reviewPayloadById.get(resource.id)?.summary;
  if (!summary) return false;
  if (filters.highestWait && (summary.averageWaitMinutes ?? 0) < HIGH_WAIT_THRESHOLD_MINUTES) return false;
  if (filters.highFailureRate && (summary.didNotReceiveHelpPercentage ?? 0) < HIGH_FAILURE_THRESHOLD) return false;
  if (filters.inaccurateListings && (summary.inaccuratePercentage ?? 0) < INACCURATE_THRESHOLD) return false;
  return true;
}

function filterResources({
  resources,
  filters,
  searchText,
  locationText,
  reviewPayloadById,
}: {
  resources: Resource[];
  filters: DashboardFilterState;
  searchText: string;
  locationText: string;
  reviewPayloadById: Map<string, ReviewPayload>;
}) {
  return resources.filter((resource) => {
    if (!matchesText(resource, searchText)) return false;
    if (!matchesLocation(resource, locationText)) return false;
    if (!matchesSelectedBorough(resource, filters.borough)) return false;
    if (filters.resourceTypeId && resource.resourceTypeId !== filters.resourceTypeId) return false;
    if (filters.tagId && !resource.tags.some((tag) => tag.id === filters.tagId)) return false;
    if (filters.openNowOnly && !resource.status.isOpen) return false;
    if (filters.openSoonOnly && !isOpenSoon(resource)) return false;

    // AI Matches
    if (filters.hasFreshProduce && !resource.hasFreshProduce) return false;
    if (filters.hasHalal && !resource.hasHalal) return false;
    if (filters.hasKosher && !resource.hasKosher) return false;
    if (filters.hasMeat && !resource.hasMeat) return false;
    if (filters.hasDairy && !resource.hasDairy) return false;
    if (filters.hasCanned && !resource.hasCanned) return false;
    if (filters.hasGrains && !resource.hasGrains) return false;

    if (!matchesStructuredFlags(resource, filters, reviewPayloadById)) return false;
    return true;
  });
}

function getCurrentPageLabel(currentPage: number, totalPages: number) {
  return `Page ${currentPage} of ${Math.max(totalPages, 1)}`;
}

function getPaginationFilterKey(filters: DashboardFilterState) {
  return JSON.stringify({
    location: filters.location,
    searchText: filters.searchText,
    borough: filters.borough,
    resourceTypeId: filters.resourceTypeId,
    tagId: filters.tagId,
    timeframe: filters.timeframe,
    openNowOnly: filters.openNowOnly,
    openSoonOnly: filters.openSoonOnly,
    syncListToMap: filters.syncListToMap,
    highestWait: filters.highestWait,
    highFailureRate: filters.highFailureRate,
    inaccurateListings: filters.inaccurateListings,
    hasFreshProduce: filters.hasFreshProduce,
    hasHalal: filters.hasHalal,
    hasKosher: filters.hasKosher,
    hasMeat: filters.hasMeat,
    hasDairy: filters.hasDairy,
    hasCanned: filters.hasCanned,
    hasGrains: filters.hasGrains,
    sort: filters.sort,
  });
}

export function DashboardClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { bookmarkIds } = useBookmarks();
  const [filters, setFilters] = useState<DashboardFilterState>(() =>
    readFiltersFromSearchParams(searchParams),
  );
  const [activeView, setActiveView] = useState<DashboardView>(() => readDashboardView(searchParams));
  const [insightsScope, setInsightsScope] = useState<InsightsScope>(() =>
    readInsightsScope(searchParams),
  );
  const [mobilePane, setMobilePane] = useState<'map' | 'list'>('map');
  const [mapViewport, setMapViewport] = useState<MapViewportState>({
    bounds: null,
    center: DEFAULT_CENTER,
  });
  const [resourcePagination, setResourcePagination] = useState({
    key: '',
    index: 0,
  });
  const [boundsPagination, setBoundsPagination] = useState({
    key: '',
    cursors: [] as string[],
  });

  const deferredSearchText = useDeferredValue(filters.searchText);
  const deferredLocation = useDeferredValue(filters.location);
  const normalizedSearchText = normalizeSearchText(deferredSearchText);
  const normalizedLocation = normalizeSearchText(deferredLocation);
  const normalizedBounds = useMemo(() => roundBounds(mapViewport.bounds), [mapViewport.bounds]);
  const debouncedBounds = useDebouncedValue(normalizedBounds, 180);
  const debouncedCenter = useDebouncedValue(mapViewport.center, 180);
  const selectedResourceId = searchParams.get('resourceId');

  const filterKey = useMemo(() => getPaginationFilterKey(filters), [filters]);
  const resourcePaginationKey = useMemo(
    () => JSON.stringify({ center: debouncedCenter, filters: filterKey }),
    [debouncedCenter, filterKey],
  );
  const boundsPaginationKey = useMemo(
    () => JSON.stringify({ bounds: debouncedBounds, filters: filterKey }),
    [debouncedBounds, filterKey],
  );

  const effectiveResourcePageIndex = resourcePagination.key === resourcePaginationKey ? resourcePagination.index : 0;
  const effectiveBoundsCursors = boundsPagination.key === boundsPaginationKey ? boundsPagination.cursors : [];
  const currentBoundsCursor = effectiveBoundsCursors[effectiveBoundsCursors.length - 1] ?? null;

  const resourcesQuery = useInfiniteResources({
    lat: debouncedCenter.latitude,
    lng: debouncedCenter.longitude,
    location: deferredLocation || undefined,
    text: deferredSearchText || undefined,
    borough: filters.borough || undefined,
    resourceTypeId: filters.resourceTypeId || undefined,
    tagId: filters.tagId || undefined,
    sort: 'distance',
    take: LIST_PAGE_SIZE,
  });

  const boundedResourcesQuery = useResourcesWithinBounds(
    filters.syncListToMap ? debouncedBounds : null,
    LIST_PAGE_SIZE,
    currentBoundsCursor,
    filters.borough,
  );
  const markersQuery = useMarkers(debouncedBounds, filters.borough);

  const resourcePages = useMemo(() => resourcesQuery.data?.pages ?? [], [resourcesQuery.data]);
  const currentResourcePage = resourcePages[Math.min(effectiveResourcePageIndex, Math.max(resourcePages.length - 1, 0))] ?? null;

  const listBaseResources = useMemo(
    () => filters.syncListToMap ? boundedResourcesQuery.data?.resources ?? [] : currentResourcePage?.resources ?? [],
    [boundedResourcesQuery.data?.resources, currentResourcePage?.resources, filters.syncListToMap],
  );

  const rawLoadedResources = useMemo(
    () => filters.syncListToMap ? boundedResourcesQuery.data?.resources ?? [] : resourcePages.flatMap((page) => page.resources),
    [boundedResourcesQuery.data?.resources, filters.syncListToMap, resourcePages],
  );

  // --- TEAM 7: HYDRATION LOGIC (THE LINK) ---
  const loadedResources = useMemo(() => {
    return rawLoadedResources.map(resource => {
      const aiData = (supplyProfiles as any[]).find(p => p.id === resource.id);
      return {
        ...resource,
        hasFreshProduce: aiData?.hasFreshProduce ?? resource.hasFreshProduce,
        hasHalal: aiData?.hasHalal ?? resource.hasHalal,
        hasKosher: aiData?.hasKosher ?? resource.hasKosher,
        hasMeat: aiData?.hasMeat ?? resource.hasMeat,
        hasDairy: aiData?.hasDairy ?? resource.hasDairy,
        hasCanned: aiData?.hasCanned ?? resource.hasCanned,
        hasGrains: aiData?.hasGrains ?? resource.hasGrains,
      };
    });
  }, [rawLoadedResources]);

  const reviewResourceIds = useMemo(() => loadedResources.map((resource) => resource.id), [loadedResources]);
  const reviewSummariesQuery = useReviewSummaries(reviewResourceIds);
  const timeframedReviewPayloadById = useMemo(
    () => createTimeframedSummaryMap(reviewSummariesQuery.dataById, filters.timeframe),
    [filters.timeframe, reviewSummariesQuery.dataById],
  );

  const visibleListResources = useMemo(
    () => sortResources(
      filterResources({
        resources: listBaseResources.map(r => loadedResources.find(lr => lr.id === r.id) || r),
        filters,
        searchText: normalizedSearchText,
        locationText: normalizedLocation,
        reviewPayloadById: timeframedReviewPayloadById,
      }),
      filters.sort,
      timeframedReviewPayloadById,
    ),
    [filters, listBaseResources, loadedResources, normalizedLocation, normalizedSearchText, timeframedReviewPayloadById],
  );

  const allFilteredResources = useMemo(
    () => sortResources(
      filterResources({
        resources: loadedResources,
        filters,
        searchText: normalizedSearchText,
        locationText: normalizedLocation,
        reviewPayloadById: timeframedReviewPayloadById,
      }),
      filters.sort,
      timeframedReviewPayloadById,
    ),
    [filters, loadedResources, normalizedLocation, normalizedSearchText, timeframedReviewPayloadById],
  );

  // --- TOP SHORTAGES LOGIC ---
  const topDisruptions = useMemo(() => {
    return [...allFilteredResources]
      .map(resource => {
        const summary = timeframedReviewPayloadById.get(resource.id)?.summary;
        return {
          id: resource.id,
          name: resource.name,
          score: (summary?.averageWaitMinutes ?? 0) + (summary?.didNotReceiveHelpPercentage ?? 0),
          wait: summary?.averageWaitMinutes ?? 0,
          unmet: summary?.didNotReceiveHelpPercentage ?? 0
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }, [allFilteredResources, timeframedReviewPayloadById]);

  const foodInsightsStats = useMemo(() => {
    const total = visibleListResources.length;
    if (total === 0) return null;

    const getPct = (key: keyof Resource) => {
      const count = visibleListResources.filter((r) => r[key] === true).length;
      return ((count / total) * 100).toFixed(1);
    };

    return {
      produce: getPct('hasFreshProduce'),
      halal: getPct('hasHalal'),
      kosher: getPct('hasKosher'),
      protein: getPct('hasMeat'),
      dairy: getPct('hasDairy'),
      canned: getPct('hasCanned'),
      grains: getPct('hasGrains'),
    };
  }, [visibleListResources]);

  const insightsResources = useMemo(
    () => insightsScope === 'bookmarked' ? allFilteredResources.filter((resource) => bookmarkIds.has(resource.id)) : allFilteredResources,
    [allFilteredResources, bookmarkIds, insightsScope],
  );

  const selectedResourceQuery = useResource(selectedResourceId);
  const selectedResource = loadedResources.find((resource) => resource.id === selectedResourceId) ?? selectedResourceQuery.data ?? null;

  const selectedCoordinates = selectedResource?.coordinates ?? markersQuery.data?.markers.find((marker) => marker.id === selectedResourceId)?.coordinates ?? null;

  const nearbyIds = useMemo(() => {
    if (!selectedCoordinates) return [] as string[];
    return visibleListResources
      .filter((resource) => resource.coordinates && resource.id !== selectedResourceId && distanceInMiles(selectedCoordinates, resource.coordinates) <= filters.nearbyRadiusMiles)
      .map((resource) => resource.id);
  }, [filters.nearbyRadiusMiles, selectedCoordinates, selectedResourceId, visibleListResources]);

  const resourceTypes = useMemo(
    () => Array.from(new Map(loadedResources.filter((resource) => resource.resourceTypeId).map((resource) => [resource.resourceTypeId as string, { id: resource.resourceTypeId as string, label: resource.resourceTypeLabel }])).values()),
    [loadedResources],
  );

  const tags = useMemo(
    () => Array.from(new Map(loadedResources.flatMap((resource) => resource.tags).map((tag) => [tag.id, { id: tag.id, label: tag.label }])).values()),
    [loadedResources],
  );

  const totalPages = filters.syncListToMap
    ? Math.max(1, Math.ceil((boundedResourcesQuery.data?.totalMarkers ?? 0) / LIST_PAGE_SIZE))
    : Math.max(1, Math.ceil((resourcePages[0]?.count ?? visibleListResources.length) / LIST_PAGE_SIZE));
  const currentPageNumber = filters.syncListToMap ? effectiveBoundsCursors.length + 1 : Math.min(effectiveResourcePageIndex, Math.max(resourcePages.length - 1, 0)) + 1;
  const pageLabel = getCurrentPageLabel(currentPageNumber, totalPages);

  const canGoPrevious = filters.syncListToMap ? effectiveBoundsCursors.length > 0 : currentPageNumber > 1;
  const canGoNext = filters.syncListToMap ? Boolean(boundedResourcesQuery.data?.cursor) : currentPageNumber < resourcePages.length || resourcesQuery.hasNextPage;
  const activeBoroughLabel = filters.borough ? getBoroughLabel(filters.borough) : 'All boroughs';
  const insightsScopeLabel = filters.syncListToMap ? 'Scope follows the current map viewport...' : 'Scope follows the currently fetched search results...';

  function replaceUrl(resourceId?: string | null, view = activeView, nextInsightsScope: InsightsScope = insightsScope) {
    startTransition(() => {
      const params = createDashboardSearchParams({ filters, view, insightsScope: nextInsightsScope, resourceId });
      const suffix = params.toString();
      router.replace(suffix ? `/?${suffix}` : '/', { scroll: false });
    });
  }

  function updateFilters(patch: Partial<DashboardFilterState>) {
    setFilters((current) => ({ ...current, ...patch }));
  }

  function updateView(nextView: DashboardView) {
    setActiveView(nextView);
    replaceUrl(selectedResourceId, nextView);
  }

  function updateInsightsScope(nextScope: InsightsScope) {
    setInsightsScope(nextScope);
    replaceUrl(selectedResourceId, activeView, nextScope);
  }

  function openResource(resourceId: string) { replaceUrl(resourceId); }
  function closeResource() { replaceUrl(null); }

  async function goToNextPage() {
    if (filters.syncListToMap) {
      const nextCursor = boundedResourcesQuery.data?.cursor;
      if (!nextCursor) return;
      setBoundsPagination({ key: boundsPaginationKey, cursors: [...effectiveBoundsCursors, nextCursor] });
      return;
    }
    if (currentPageNumber < resourcePages.length) {
      setResourcePagination({ key: resourcePaginationKey, index: currentPageNumber });
      return;
    }
    if (!resourcesQuery.hasNextPage) return;
    const result = await resourcesQuery.fetchNextPage();
    const nextPageCount = result.data?.pages.length ?? resourcePages.length;
    setResourcePagination({ key: resourcePaginationKey, index: Math.min(currentPageNumber, Math.max(nextPageCount - 1, 0)) });
  }

  function goToPreviousPage() {
    if (filters.syncListToMap) {
      setBoundsPagination({ key: boundsPaginationKey, cursors: effectiveBoundsCursors.slice(0, -1) });
      return;
    }
    setResourcePagination({ key: resourcePaginationKey, index: Math.max(currentPageNumber - 2, 0) });
  }

  const showListLoading = (filters.syncListToMap && boundedResourcesQuery.isLoading) || (!filters.syncListToMap && resourcesQuery.isLoading);
  const showPageTransitionLoading = boundedResourcesQuery.isFetching || resourcesQuery.isFetchingNextPage;

  return (
    <>
      <DashboardShell
        title="Food resource operations dashboard"
        description="Explore pantry and meal-service locations on the map, scan compact cards, and view dietary availability insights."
        aside={
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-full border border-line/80 bg-white/80 p-1">
              <button type="button" onClick={() => updateView('explore')} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${activeView === 'explore' ? 'bg-pine text-white' : 'text-slate'}`}>Explore</button>
              <button type="button" onClick={() => updateView('insights')} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${activeView === 'insights' ? 'bg-pine text-white' : 'text-slate'}`}>Insights</button>
            </div>
            <div className="rounded-full border border-line/80 bg-white/80 px-4 py-2.5 text-sm font-semibold text-slate">{markersQuery.data?.markers.length ?? 0} map pins</div>
          </div>
        }
      >
        {activeView === 'explore' ? (
          <>
            <div className="mb-3 flex gap-2 lg:hidden">
              <button type="button" onClick={() => setMobilePane('map')} className={`flex-1 rounded-full px-4 py-2.5 text-sm font-semibold transition ${mobilePane === 'map' ? 'bg-pine text-white' : 'border border-line/80 bg-white/80 text-slate'}`}>Map</button>
              <button type="button" onClick={() => setMobilePane('list')} className={`flex-1 rounded-full px-4 py-2.5 text-sm font-semibold transition ${mobilePane === 'list' ? 'bg-pine text-white' : 'border border-line/80 bg-white/80 text-slate'}`}>Resources</button>
            </div>

            <div className="grid gap-3 xl:grid-cols-[minmax(0,1.32fr),minmax(420px,1fr)]">
              <section className={`panel-surface overflow-hidden p-2.5 lg:h-[calc(100vh-8.6rem)] ${mobilePane === 'list' ? 'hidden lg:block' : 'block'}`}>
                <ResourceMap markers={markersQuery.data?.markers ?? []} listedResources={visibleListResources} selectedResourceId={selectedResourceId} selectedCoordinates={selectedCoordinates} nearbyRadiusMiles={filters.nearbyRadiusMiles} onViewportChange={setMapViewport} onOpenResource={openResource} />
              </section>

              <section className={`panel-surface flex min-h-[580px] flex-col overflow-hidden lg:h-[calc(100vh-8.6rem)] ${mobilePane === 'map' ? 'hidden lg:flex' : 'flex'}`}>
                <div className="border-b border-line/70 bg-card/95 px-4 py-3 backdrop-blur lg:px-4 lg:py-3.5">
                  <ResourceFilters filters={filters} onChange={updateFilters} resourceTypes={resourceTypes} tags={tags} resultCount={visibleListResources.length} selectedName={selectedResource?.name} pageLabel={pageLabel} />
                </div>

                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3 lg:px-4">
                  
                  {/* --- TOP SHORTAGES BOARD --- */}
                  {topDisruptions.length > 0 && (
                    <div className="panel-surface mb-4 border-l-4 border-l-amber-500 bg-white/40 p-4 backdrop-blur-sm shadow-sm">
                      <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-slate/60">
                          Operational Priority Board (Top 5 Gaps)
                        </h3>
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                          ACTION REQUIRED
                        </span>
                      </div>
                      <div className="space-y-2">
                        {topDisruptions.map((item, idx) => (
                          <div 
                            key={item.id} 
                            onClick={() => openResource(item.id)}
                            className="flex cursor-pointer items-center justify-between rounded-xl bg-white/80 p-2.5 transition hover:bg-mist border border-transparent hover:border-amber-200"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-black text-slate/20">#{idx + 1}</span>
                              <p className="text-sm font-bold text-ink truncate max-w-[180px]">{item.name}</p>
                            </div>
                            <div className="flex gap-4">
                              <div className="text-right">
                                <p className="text-[10px] font-bold text-slate/40 uppercase">Wait</p>
                                <p className="text-xs font-bold text-ink">{item.wait}m</p>
                              </div>
                              <div className="text-right">
                                <p className="text-[10px] font-bold text-slate/40 uppercase">Unmet</p>
                                <p className="text-xs font-bold text-amber-600">{item.unmet}%</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* --- INSIGHTS BAR --- */}
                  {foodInsightsStats && (
                    <div className="flex flex-wrap gap-2 rounded-[22px] bg-white/60 border border-line/50 p-4 mb-2 shadow-sm backdrop-blur-sm justify-between">
                      <div className="flex-1 min-w-[60px] text-center">
                        <p className="text-lg font-bold text-pine">{foodInsightsStats.produce}%</p>
                        <p className="text-[10px] text-slate/50 uppercase font-bold tracking-tight">Produce</p>
                      </div>
                      <div className="flex-1 min-w-[60px] text-center border-l border-line/40">
                        <p className="text-lg font-bold text-pine">{foodInsightsStats.halal}%</p>
                        <p className="text-[10px] text-slate/50 uppercase font-bold tracking-tight">Halal</p>
                      </div>
                      <div className="flex-1 min-w-[60px] text-center border-l border-line/40">
                        <p className="text-lg font-bold text-pine">{foodInsightsStats.kosher}%</p>
                        <p className="text-[10px] text-slate/50 uppercase font-bold tracking-tight">Kosher</p>
                      </div>
                      <div className="flex-1 min-w-[60px] text-center border-l border-line/40">
                        <p className="text-lg font-bold text-pine">{foodInsightsStats.protein}%</p>
                        <p className="text-[10px] text-slate/50 uppercase font-bold tracking-tight">Protein</p>
                      </div>
                      <div className="flex-1 min-w-[60px] text-center border-l border-line/40">
                        <p className="text-lg font-bold text-pine">{foodInsightsStats.dairy}%</p>
                        <p className="text-[10px] text-slate/50 uppercase font-bold tracking-tight">Dairy</p>
                      </div>
                      <div className="flex-1 min-w-[60px] text-center border-l border-line/40">
                        <p className="text-lg font-bold text-pine">{foodInsightsStats.canned}%</p>
                        <p className="text-[10px] text-slate/50 uppercase font-bold tracking-tight">Canned</p>
                      </div>
                      <div className="flex-1 min-w-[60px] text-center border-l border-line/40">
                        <p className="text-lg font-bold text-pine">{foodInsightsStats.grains}%</p>
                        <p className="text-[10px] text-slate/50 uppercase font-bold tracking-tight">Grains</p>
                      </div>
                    </div>
                  )}

                  {filters.syncListToMap && boundedResourcesQuery.data ? (
                    <div className="rounded-[22px] bg-mist/75 px-4 py-2.5 text-sm text-slate">Viewport contains {boundedResourcesQuery.data.totalMarkers} markers.</div>
                  ) : (
                    <div className="rounded-[22px] bg-mist/75 px-4 py-2.5 text-sm text-slate">Showing compact page of resources.</div>
                  )}

                  {showListLoading ? (
                    <div className="space-y-3"><LoadingCard /><LoadingCard /><LoadingCard /></div>
                  ) : null}

                  {!showListLoading && visibleListResources.length === 0 ? (
                    <EmptyState title="No resources match filters" description="Try relaxing a filter or widening the map." />
                  ) : null}

                  {!showListLoading && visibleListResources.map((resource) => (
                    <ResourceCard key={resource.id} resource={resource} reviewPayload={timeframedReviewPayloadById.get(resource.id) ?? null} selected={resource.id === selectedResourceId} nearby={nearbyIds.includes(resource.id)} onMoreInfo={() => openResource(resource.id)} />
                  ))}

                  <div className="sticky bottom-0 z-10 -mx-1 mt-1 rounded-[22px] border border-line/70 bg-white/92 px-3 py-3 shadow-soft backdrop-blur">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm text-slate">{pageLabel}{showPageTransitionLoading ? ' • loading…' : ''}</p>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={goToPreviousPage} disabled={!canGoPrevious} className="inline-flex items-center gap-2 rounded-full border border-line/80 bg-white px-4 py-2 text-sm font-semibold text-slate transition hover:border-pine/30 hover:text-pine disabled:opacity-45">
                          <ChevronLeft className="h-4 w-4" /> Previous
                        </button>
                        <button type="button" onClick={goToNextPage} disabled={!canGoNext || showPageTransitionLoading} className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-pine disabled:opacity-45">
                          {showPageTransitionLoading && <LoaderCircle className="h-4 w-4 animate-spin" />}
                          Next Page <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </>
        ) : (
          <div className="grid gap-4">
            <section className="panel-surface border-b border-line/70 bg-card/95 px-4 py-4 backdrop-blur">
              <ResourceFilters filters={filters} onChange={updateFilters} resourceTypes={resourceTypes} tags={tags} resultCount={insightsResources.length} selectedName={selectedResource?.name} pageLabel={null} />
            </section>
            <InsightsView resources={insightsResources} reviewPayloadById={timeframedReviewPayloadById} timeframe={filters.timeframe} scopeLabel={insightsScopeLabel} activeBoroughLabel={activeBoroughLabel} insightsScope={insightsScope} onInsightsScopeChange={updateInsightsScope} isLoading={reviewSummariesQuery.isLoading} onOpenResource={openResource} />
          </div>
        )}
      </DashboardShell>
      <ResourceDetailDrawer resourceId={selectedResourceId} open={Boolean(selectedResourceId)} timeframe={filters.timeframe} onClose={closeResource} />
    </>
  );
}