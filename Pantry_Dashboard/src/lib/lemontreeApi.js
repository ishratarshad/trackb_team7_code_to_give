/**
 * LemonTree API Client
 * Base URL: https://platform.foodhelpline.org
 *
 * All endpoints are public (no auth required) and return superjson-serialized data.
 */

import superjson from 'superjson';

const BASE_URL = 'https://platform.foodhelpline.org';

/**
 * Fetch and deserialize superjson response from LemonTree API
 */
async function fetchLemonTree(endpoint, params = {}) {
  const url = new URL(endpoint, BASE_URL);

  // Add query parameters
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, value);
    }
  });

  try {
    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`LemonTree API error: ${response.status} ${response.statusText}`);
    }

    const raw = await response.json();

    // Deserialize superjson response
    const data = superjson.deserialize(raw);

    return data;
  } catch (error) {
    console.error('LemonTree API request failed:', error);
    throw error;
  }
}

/**
 * Get list of food pantries and soup kitchens
 *
 * @param {Object} options
 * @param {number} options.lat - Latitude for distance-based results
 * @param {number} options.lng - Longitude for distance-based results
 * @param {string} options.location - Zip code (alternative to lat/lng)
 * @param {string} options.text - Full-text search on resource name
 * @param {string} options.resourceTypeId - "FOOD_PANTRY" or "SOUP_KITCHEN"
 * @param {string} options.tagId - Filter by tag ID
 * @param {string} options.occurrencesWithin - ISO 8601 interval
 * @param {string} options.region - Region ID or comma-separated zip codes
 * @param {string} options.sort - "distance", "referrals", "reviews", "confidence", "createdAt"
 * @param {number} options.take - Results per page (default: 40)
 * @param {string} options.cursor - Pagination cursor from previous response
 *
 * @returns {Promise<{count: number, resources: Array, cursor?: string, location?: Object}>}
 */
export async function getResources(options = {}) {
  return fetchLemonTree('/api/resources', options);
}

/**
 * Get a single resource by ID
 *
 * @param {string} id - Resource ID
 * @returns {Promise<Object>} Resource object
 */
export async function getResource(id) {
  const raw = await fetch(`${BASE_URL}/api/resources/${id}`).then(r => r.json());
  return superjson.deserialize(raw);
}

/**
 * Get lightweight GeoJSON map markers within a bounding box
 *
 * @param {Object} bounds
 * @param {[number, number]} bounds.sw - Southwest corner [lng, lat]
 * @param {[number, number]} bounds.ne - Northeast corner [lng, lat]
 * @returns {Promise<Object>} GeoJSON FeatureCollection
 */
export async function getMarkersWithinBounds({ sw, ne }) {
  const url = `${BASE_URL}/api/resources/markersWithinBounds?corner=${sw[0]},${sw[1]}&corner=${ne[0]},${ne[1]}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch markers: ${response.status}`);
  }

  return response.json(); // Returns GeoJSON directly (not superjson)
}

/**
 * Paginate through all resources
 *
 * @param {Object} options - Same options as getResources()
 * @yields {Object} Individual resource objects
 */
export async function* getAllResources(options = {}) {
  let cursor;

  do {
    const params = { take: 40, ...options };
    if (cursor) {
      params.cursor = cursor;
    }

    const data = await getResources(params);

    // Yield each resource
    for (const resource of data.resources) {
      yield resource;
    }

    cursor = data.cursor;
  } while (cursor);
}

/**
 * Get resources near a location (helper function)
 *
 * @param {string} zipCode - NYC zip code
 * @param {number} take - Number of results (default: 40)
 * @returns {Promise<Object>} Resources near the zip code
 */
export async function getResourcesByZipCode(zipCode, take = 40) {
  return getResources({ location: zipCode, take });
}

/**
 * Search resources by name
 *
 * @param {string} query - Search text
 * @param {number} take - Number of results (default: 20)
 * @returns {Promise<Object>} Matching resources
 */
export async function searchResources(query, take = 20) {
  return getResources({ text: query, take });
}

/**
 * Get only food pantries (exclude soup kitchens)
 *
 * @param {Object} options - Same options as getResources()
 * @returns {Promise<Object>} Food pantries only
 */
export async function getFoodPantries(options = {}) {
  return getResources({ ...options, resourceTypeId: 'FOOD_PANTRY' });
}

/**
 * Get only soup kitchens (exclude food pantries)
 *
 * @param {Object} options - Same options as getResources()
 * @returns {Promise<Object>} Soup kitchens only
 */
export async function getSoupKitchens(options = {}) {
  return getResources({ ...options, resourceTypeId: 'SOUP_KITCHEN' });
}

/**
 * Check if a resource is currently open
 *
 * @param {Object} resource - Resource object from API
 * @returns {boolean} True if resource is open now
 */
export function isOpenNow(resource) {
  const now = new Date();

  if (!resource.occurrences || resource.occurrences.length === 0) {
    return false;
  }

  return resource.occurrences.some(occurrence => {
    if (occurrence.skippedAt) return false; // Cancelled

    const startTime = new Date(occurrence.startTime);
    const endTime = new Date(occurrence.endTime);

    return startTime <= now && endTime >= now;
  });
}

/**
 * Get next occurrence for a resource
 *
 * @param {Object} resource - Resource object from API
 * @returns {Object|null} Next occurrence or null
 */
export function getNextOccurrence(resource) {
  const now = new Date();

  if (!resource.occurrences || resource.occurrences.length === 0) {
    return null;
  }

  const upcoming = resource.occurrences
    .filter(occ => !occ.skippedAt && new Date(occ.startTime) > now)
    .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

  return upcoming[0] || null;
}
