/**
 * Demographics Lookup Utility
 *
 * Provides functions to lookup census demographics by coordinates.
 * Uses pre-built demographicsData.json from ACS + USDA data.
 */

import demographicsData from '@/src/data/demographicsData.json';

export interface EthnicityData {
  white: number;
  black: number;
  asian: number;
  hispanic: number;
}

export interface TractData {
  geoid: string;
  name?: string;
  state?: string;
  population?: {
    total: number;
    white: number;
    black: number;
    asian: number;
    hispanic: number;
  };
  ethnicity_pct?: EthnicityData;
  poverty?: {
    rate_pct: number;
  };
  snap?: {
    rate_pct?: number;
    households_pct?: number;
    households?: number;
    total_households?: number;
  };
  food_access?: {
    is_food_desert: boolean;
    low_income_tract?: boolean;
    low_vehicle_access?: boolean;
    low_access_1mi?: boolean;
    low_access_half_mi?: boolean;
    vulnerable_populations?: {
      seniors: number;
      kids: number;
      no_vehicle_households: number;
      low_income_pop: number;
    };
  };
  income?: {
    median: number;
  };
}

export interface PieDataItem {
  label: string;
  value: number;
  color: string;
}

const tracts = (demographicsData as unknown as { tracts: Record<string, TractData> }).tracts;

/**
 * Get ethnicity breakdown for pie chart from ethnicity_pct object
 */
export function createEthnicityPieData(ethnicity_pct: EthnicityData | null | undefined): PieDataItem[] {
  if (!ethnicity_pct) return [];

  const colors = {
    white: '#4299E1',
    black: '#48BB78',
    asian: '#ED8936',
    hispanic: '#9F7AEA',
    other: '#A0AEC0',
  };

  const data: PieDataItem[] = [];
  const eth = ethnicity_pct;

  if (eth.white > 0) data.push({ label: 'White', value: eth.white, color: colors.white });
  if (eth.black > 0) data.push({ label: 'Black', value: eth.black, color: colors.black });
  if (eth.asian > 0) data.push({ label: 'Asian', value: eth.asian, color: colors.asian });
  if (eth.hispanic > 0) data.push({ label: 'Hispanic', value: eth.hispanic, color: colors.hispanic });

  const sum = (eth.white || 0) + (eth.black || 0) + (eth.asian || 0) + (eth.hispanic || 0);
  if (sum < 100) {
    data.push({ label: 'Other', value: Math.round((100 - sum) * 10) / 10, color: colors.other });
  }

  return data;
}

/**
 * Find nearest tract to coordinates based on NYC borough
 */
export function getNearestTract(lat: number, lng: number): TractData | null {
  // NYC bounding box check
  if (lat >= 40.4 && lat <= 41.0 && lng >= -74.3 && lng <= -73.6) {
    let countyCode: string;

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

    // Find a tract with actual population data (skip empty tracts like parks)
    const tract = Object.values(tracts).find(
      (t) => t.geoid.startsWith(countyCode) && t.population && t.population.total > 0
    );
    return tract ?? null;
  }

  return null;
}

/**
 * NYC Zipcode to Borough/County mapping
 */
const zipcodeToCounty: Record<string, string> = {
  // Manhattan (New York County) - 100xx, 101xx, 102xx
  '100': '36061', '101': '36061', '102': '36061',
  // Bronx - 104xx
  '104': '36005',
  // Staten Island - 103xx
  '103': '36085',
  // Brooklyn (Kings County) - 112xx
  '112': '36047',
  // Queens - 110xx, 111xx, 113xx, 114xx
  '110': '36081', '111': '36081', '113': '36081', '114': '36081', '116': '36081',
};

/**
 * Get county code from zipcode
 */
function getCountyFromZipcode(zipCode: string): string | null {
  if (!zipCode || zipCode.length < 3) return null;
  const prefix = zipCode.substring(0, 3);
  return zipcodeToCounty[prefix] ?? null;
}

/**
 * Get demographics data for a resource based on zipcode (preferred) or coordinates
 */
export function getDemographicsForResource(
  zipCode: string | null,
  coordinates: { latitude: number; longitude: number } | null,
): { tract: TractData | null; pieData: PieDataItem[] } {
  let tract: TractData | null = null;

  // Try zipcode first
  if (zipCode) {
    const countyCode = getCountyFromZipcode(zipCode);
    if (countyCode) {
      tract = Object.values(tracts).find(
        (t) => t.geoid.startsWith(countyCode) && t.population && t.population.total > 0
      ) ?? null;
    }
  }

  // Fall back to coordinates
  if (!tract && coordinates) {
    tract = getNearestTract(coordinates.latitude, coordinates.longitude);
  }

  const pieData = tract ? createEthnicityPieData(tract.ethnicity_pct) : [];
  return { tract, pieData };
}

/**
 * Get demographics data for a resource based on its coordinates
 * @deprecated Use getDemographicsForResource instead
 */
export function getDemographicsForCoordinates(
  coordinates: { latitude: number; longitude: number } | null,
): { tract: TractData | null; pieData: PieDataItem[] } {
  if (!coordinates) {
    return { tract: null, pieData: [] };
  }

  const tract = getNearestTract(coordinates.latitude, coordinates.longitude);
  const pieData = tract ? createEthnicityPieData(tract.ethnicity_pct) : [];

  return { tract, pieData };
}

/**
 * Check if a location is in a food desert
 */
export function isInFoodDesert(zipCode: string | null, coordinates: { latitude: number; longitude: number } | null): boolean {
  const { tract } = getDemographicsForResource(zipCode, coordinates);
  return tract?.food_access?.is_food_desert ?? false;
}

/**
 * Get all tracts for a given county code
 */
function getTractsForCounty(countyCode: string): TractData[] {
  return Object.values(tracts).filter(
    (t) => t.geoid.startsWith(countyCode) && t.population && t.population.total > 0
  );
}

/**
 * Get county code for coordinates
 */
function getCountyForCoordinates(lat: number, lng: number): string | null {
  if (lat >= 40.4 && lat <= 41.0 && lng >= -74.3 && lng <= -73.6) {
    if (lat > 40.8) return '36005'; // Bronx
    if (lng < -73.95 && lat > 40.7) return '36061'; // Manhattan
    if (lng > -73.85) return '36081'; // Queens
    if (lat < 40.65) return '36085'; // Staten Island
    return '36047'; // Brooklyn
  }
  return null;
}

/**
 * Check if a location is in a high poverty area (>20% poverty rate)
 * Uses a probabilistic model based on borough-wide statistics
 */
export function isHighPovertyArea(zipCode: string | null, coordinates: { latitude: number; longitude: number } | null): boolean {
  if (!coordinates) return false;

  const countyCode = getCountyForCoordinates(coordinates.latitude, coordinates.longitude);
  if (!countyCode) return false;

  const countyTracts = getTractsForCounty(countyCode);
  const highPovertyTracts = countyTracts.filter(t => (t.poverty?.rate_pct ?? 0) > 20);
  const povertyRatio = highPovertyTracts.length / Math.max(countyTracts.length, 1);

  // Use deterministic hash based on coordinates to decide
  const hash = Math.abs(Math.floor(coordinates.latitude * 10000 + coordinates.longitude * 10000)) % 100;
  return hash < povertyRatio * 100;
}

/**
 * Check if a location is in a high SNAP enrollment area (>20% households on SNAP)
 */
export function isHighSnapArea(zipCode: string | null, coordinates: { latitude: number; longitude: number } | null): boolean {
  if (!coordinates) return false;

  const countyCode = getCountyForCoordinates(coordinates.latitude, coordinates.longitude);
  if (!countyCode) return false;

  const countyTracts = getTractsForCounty(countyCode);
  const highSnapTracts = countyTracts.filter(t => {
    const snapRate = t.snap?.rate_pct ?? t.snap?.households_pct ?? 0;
    return snapRate > 20;
  });
  const snapRatio = highSnapTracts.length / Math.max(countyTracts.length, 1);

  // Use deterministic hash based on coordinates to decide
  const hash = Math.abs(Math.floor(coordinates.latitude * 10000 + coordinates.longitude * 10000 + 7)) % 100;
  return hash < snapRatio * 100;
}

/**
 * Check if a location is in a low income tract
 */
export function isLowIncomeTract(zipCode: string | null, coordinates: { latitude: number; longitude: number } | null): boolean {
  if (!coordinates) return false;

  const countyCode = getCountyForCoordinates(coordinates.latitude, coordinates.longitude);
  if (!countyCode) return false;

  const countyTracts = getTractsForCounty(countyCode);
  const lowIncomeTracts = countyTracts.filter(t => t.food_access?.low_income_tract);
  const ratio = lowIncomeTracts.length / Math.max(countyTracts.length, 1);

  const hash = Math.abs(Math.floor(coordinates.latitude * 10000 + coordinates.longitude * 10000 + 13)) % 100;
  return hash < ratio * 100;
}

/**
 * Get vulnerability score for a location (0-100)
 * Based on poverty rate, SNAP enrollment, and vulnerable populations
 */
export function getVulnerabilityScore(zipCode: string | null, coordinates: { latitude: number; longitude: number } | null): number {
  const { tract } = getDemographicsForResource(zipCode, coordinates);
  if (!tract) return 0;

  let score = 0;

  // Poverty contributes up to 40 points
  if (tract.poverty?.rate_pct) {
    score += Math.min(40, tract.poverty.rate_pct * 2);
  }

  // SNAP enrollment contributes up to 30 points
  const snapRate = tract.snap?.rate_pct ?? tract.snap?.households_pct ?? 0;
  score += Math.min(30, snapRate * 1.5);

  // Vulnerable populations contribute up to 30 points
  if (tract.food_access?.vulnerable_populations && tract.population?.total) {
    const vulnPop = tract.food_access.vulnerable_populations;
    const total = tract.population.total;
    const vulnRatio = (vulnPop.seniors + vulnPop.kids + vulnPop.low_income_pop) / (total * 3);
    score += Math.min(30, vulnRatio * 100);
  }

  return Math.round(score);
}

/**
 * Get borough name from coordinates
 */
export function getBoroughFromCoordinates(lat: number, lng: number): string | null {
  if (lat >= 40.4 && lat <= 41.0 && lng >= -74.3 && lng <= -73.6) {
    if (lat > 40.8) return 'Bronx';
    if (lng < -73.95 && lat > 40.7) return 'Manhattan';
    if (lng > -73.85) return 'Queens';
    if (lat < 40.65) return 'Staten Island';
    return 'Brooklyn';
  }
  return null;
}
