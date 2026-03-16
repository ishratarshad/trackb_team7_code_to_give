import type { BookmarkedResource, Resource } from '@/types/resources';

const STORAGE_KEY = 'lemontree-bookmarks-v1';
const listeners = new Set<() => void>();
const EMPTY_BOOKMARKS: BookmarkedResource[] = [];

let bookmarksCache: BookmarkedResource[] = EMPTY_BOOKMARKS;
let serializedCache = '[]';
let hasInitialized = false;
let storageListenerAttached = false;

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function parseStorageValue(rawValue: string | null) {
  try {
    const parsed = rawValue ? (JSON.parse(rawValue) as BookmarkedResource[]) : EMPTY_BOOKMARKS;
    return Array.isArray(parsed) ? parsed : EMPTY_BOOKMARKS;
  } catch {
    return EMPTY_BOOKMARKS;
  }
}

function ensureBookmarksCache() {
  if (hasInitialized || !canUseStorage()) {
    return bookmarksCache;
  }

  hasInitialized = true;
  serializedCache = window.localStorage.getItem(STORAGE_KEY) ?? '[]';
  bookmarksCache = parseStorageValue(serializedCache);

  return bookmarksCache;
}

function emitChange() {
  listeners.forEach((listener) => listener());
}

function setBookmarksCache(nextBookmarks: BookmarkedResource[]) {
  bookmarksCache = nextBookmarks;
  serializedCache = JSON.stringify(nextBookmarks);

  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, serializedCache);
}

function attachStorageListener() {
  if (storageListenerAttached || !canUseStorage()) {
    return;
  }

  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY) {
      return;
    }

    const nextSerialized = event.newValue ?? '[]';
    if (nextSerialized === serializedCache) {
      return;
    }

    serializedCache = nextSerialized;
    bookmarksCache = parseStorageValue(nextSerialized);
    emitChange();
  });

  storageListenerAttached = true;
}

export function subscribeToBookmarks(listener: () => void) {
  ensureBookmarksCache();
  attachStorageListener();
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function getBookmarkSnapshot() {
  return ensureBookmarksCache();
}

export function getBookmarkServerSnapshot() {
  return EMPTY_BOOKMARKS;
}

function toBookmarkedResource(resource: Resource | BookmarkedResource): BookmarkedResource {
  return {
    id: resource.id,
    name: resource.name,
    description: resource.description,
    descriptionEs: resource.descriptionEs,
    address: resource.address,
    streetAddress: resource.streetAddress,
    cityStateZip: resource.cityStateZip,
    city: resource.city,
    state: resource.state,
    zipCode: resource.zipCode,
    borough: resource.borough,
    boroughLabel: resource.boroughLabel,
    coordinates: resource.coordinates,
    timezone: resource.timezone,
    phone: resource.phone,
    website: resource.website,
    resourceTypeId: resource.resourceTypeId,
    resourceTypeLabel: resource.resourceTypeLabel,
    resourceStatus: resource.resourceStatus,
    usageLimitSummary: resource.usageLimitSummary,
    tags: resource.tags,
    images: resource.images,
    primaryImageUrl: resource.primaryImageUrl,
    confidence: resource.confidence,
    ratingAverage: resource.ratingAverage,
    reviewCount: resource.reviewCount,
    travelDistanceMiles: resource.travelDistanceMiles,
    openByAppointment: resource.openByAppointment,
    scheduleSummary: resource.scheduleSummary,
    weeklySchedule: resource.weeklySchedule,
    status: resource.status,
    occurrences: resource.occurrences,
    hasFreshProduce: resource.hasFreshProduce,
    hasHalal: resource.hasHalal,
    hasKosher: resource.hasKosher,
    hasMeat: resource.hasMeat,
    hasDairy: resource.hasDairy,
    hasCanned: resource.hasCanned,
    hasGrains: resource.hasGrains,
  };
}

export function addBookmark(resource: Resource | BookmarkedResource) {
  const bookmarks = ensureBookmarksCache();
  if (bookmarks.some((item) => item.id === resource.id)) {
    return;
  }

  setBookmarksCache([toBookmarkedResource(resource), ...bookmarks]);
  emitChange();
}

export function removeBookmark(resourceId: string) {
  const bookmarks = ensureBookmarksCache();
  const nextBookmarks = bookmarks.filter((item) => item.id !== resourceId);

  if (nextBookmarks.length === bookmarks.length) {
    return;
  }

  setBookmarksCache(nextBookmarks);
  emitChange();
}

export function toggleBookmark(resource: Resource | BookmarkedResource) {
  const bookmarks = ensureBookmarksCache();
  if (bookmarks.some((item) => item.id === resource.id)) {
    removeBookmark(resource.id);
    return false;
  }

  addBookmark(resource);
  return true;
}
