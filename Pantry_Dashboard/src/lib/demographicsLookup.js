/**
 * Demographics Lookup Utility
 *
 * Provides functions to lookup census demographics by zip code or GEOID.
 * Uses pre-built demographicsData.json from ACS + USDA data.
 */

import demographicsData from '../data/demographicsData.json';

/**
 * Get demographics for a specific census tract (GEOID)
 * @param {string} geoid - 11-digit census tract ID
 * @returns {Object|null} Demographics data or null if not found
 */
export function getDemographicsByGeoid(geoid) {
  return demographicsData.tracts[geoid] || null;
}

/**
 * Get demographics for a zip code
 * Note: Zip codes don't map 1:1 to census tracts, so this returns
 * aggregated data for all tracts that might overlap with this zip.
 *
 * @param {string} zipCode - 5-digit zip code
 * @returns {Object|null} Aggregated demographics or null
 */
export function getDemographicsByZipCode(zipCode) {
  if (!zipCode || zipCode.length < 5) return null;

  // NY state FIPS = 36, NJ = 34
  // Try to find tracts that might match this zip area
  // This is approximate - proper matching would need a zip-to-tract crosswalk

  const zip5 = zipCode.substring(0, 5);

  // Search for tracts in the same general area
  // For NYC zips (100xx-104xx), look for NYC county codes
  const nycZipPrefixes = ['100', '101', '102', '103', '104', '110', '111', '112', '113', '114'];
  const isNYC = nycZipPrefixes.some(p => zip5.startsWith(p));

  // NYC county FIPS codes: 36061 (Manhattan), 36047 (Brooklyn), 36081 (Queens),
  // 36005 (Bronx), 36085 (Staten Island)
  const nycCountyCodes = ['36061', '36047', '36081', '36005', '36085'];

  let matchingTracts = [];

  if (isNYC) {
    // Find all tracts in NYC
    matchingTracts = Object.values(demographicsData.tracts).filter(t =>
      nycCountyCodes.some(code => t.geoid.startsWith(code))
    );
  } else {
    // For non-NYC, just return null - would need proper crosswalk
    return null;
  }

  if (matchingTracts.length === 0) return null;

  // Aggregate demographics
  return aggregateTracts(matchingTracts);
}

/**
 * Get all food desert tracts
 * @returns {Array} Array of tract data where is_food_desert = true
 */
export function getFoodDeserts() {
  return Object.values(demographicsData.tracts).filter(
    t => t.food_access?.is_food_desert
  );
}

/**
 * Get high poverty tracts (poverty rate > threshold)
 * @param {number} threshold - Poverty rate threshold (default 20%)
 * @returns {Array} Array of tract data
 */
export function getHighPovertyTracts(threshold = 20) {
  return Object.values(demographicsData.tracts).filter(
    t => t.poverty?.rate_pct > threshold
  );
}

/**
 * Get demographics summary stats
 * @returns {Object} Summary statistics
 */
export function getDemographicsSummary() {
  return demographicsData.stats;
}

/**
 * Search tracts by county or state name
 * @param {string} query - Search query
 * @returns {Array} Matching tracts
 */
export function searchTracts(query) {
  const q = query.toLowerCase();
  return Object.values(demographicsData.tracts).filter(t =>
    t.name?.toLowerCase().includes(q) ||
    t.state?.toLowerCase().includes(q)
  );
}

/**
 * Get ethnicity breakdown for pie chart
 * @param {string} geoid - Census tract GEOID
 * @returns {Array} Array of { label, value, color } for pie chart
 */
export function getEthnicityPieData(geoid) {
  const tract = demographicsData.tracts[geoid];
  if (!tract || !tract.ethnicity_pct) return [];

  const colors = {
    white: '#4299E1',     // blue
    black: '#48BB78',     // green
    asian: '#ED8936',     // orange
    hispanic: '#9F7AEA',  // purple
    other: '#A0AEC0',     // gray
  };

  const data = [];
  const eth = tract.ethnicity_pct;

  if (eth.white > 0) data.push({ label: 'White', value: eth.white, color: colors.white });
  if (eth.black > 0) data.push({ label: 'Black', value: eth.black, color: colors.black });
  if (eth.asian > 0) data.push({ label: 'Asian', value: eth.asian, color: colors.asian });
  if (eth.hispanic > 0) data.push({ label: 'Hispanic', value: eth.hispanic, color: colors.hispanic });

  // Calculate "other" from remaining
  const sum = eth.white + eth.black + eth.asian + eth.hispanic;
  if (sum < 100) {
    data.push({ label: 'Other', value: Math.round((100 - sum) * 10) / 10, color: colors.other });
  }

  return data;
}

/**
 * Aggregate multiple tracts into summary statistics
 * @param {Array} tracts - Array of tract objects
 * @returns {Object} Aggregated demographics
 */
function aggregateTracts(tracts) {
  if (!tracts.length) return null;

  const totals = {
    population: 0,
    white: 0,
    black: 0,
    asian: 0,
    hispanic: 0,
    foodDeserts: 0,
    highPoverty: 0,
  };

  for (const t of tracts) {
    totals.population += t.population?.total || 0;
    totals.white += t.population?.white || 0;
    totals.black += t.population?.black || 0;
    totals.asian += t.population?.asian || 0;
    totals.hispanic += t.population?.hispanic || 0;
    if (t.food_access?.is_food_desert) totals.foodDeserts++;
    if (t.poverty?.rate_pct > 20) totals.highPoverty++;
  }

  const pop = totals.population || 1;

  return {
    tract_count: tracts.length,
    population: {
      total: totals.population,
      white: totals.white,
      black: totals.black,
      asian: totals.asian,
      hispanic: totals.hispanic,
    },
    ethnicity_pct: {
      white: Math.round(totals.white / pop * 1000) / 10,
      black: Math.round(totals.black / pop * 1000) / 10,
      asian: Math.round(totals.asian / pop * 1000) / 10,
      hispanic: Math.round(totals.hispanic / pop * 1000) / 10,
    },
    food_deserts: totals.foodDeserts,
    high_poverty_tracts: totals.highPoverty,
  };
}

/**
 * Find nearest tract to coordinates (simple approximation)
 * Note: This is a rough approximation - proper geospatial lookup would need tract boundaries
 *
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Object|null} Nearest tract data (based on county)
 */
export function getNearestTract(lat, lng) {
  // NYC bounding box check
  if (lat >= 40.4 && lat <= 41.0 && lng >= -74.3 && lng <= -73.6) {
    // Rough NYC borough assignment based on coordinates
    let countyCode;

    if (lat > 40.8) {
      countyCode = '36005'; // Bronx
    } else if (lng < -73.95 && lat > 40.7) {
      countyCode = '36061'; // Manhattan
    } else if (lng > -73.85) {
      countyCode = '36081'; // Queens
    } else if (lat < 40.65) {
      countyCode = '36085'; // Staten Island
    } else {
      countyCode = '36047'; // Brooklyn
    }

    // Return first tract in that county
    const tract = Object.values(demographicsData.tracts).find(t =>
      t.geoid.startsWith(countyCode)
    );

    return tract || null;
  }

  return null;
}

export default {
  getDemographicsByGeoid,
  getDemographicsByZipCode,
  getFoodDeserts,
  getHighPovertyTracts,
  getDemographicsSummary,
  searchTracts,
  getEthnicityPieData,
  getNearestTract,
};
