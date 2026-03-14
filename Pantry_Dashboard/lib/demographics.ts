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

    const tract = Object.values(tracts).find((t) => t.geoid.startsWith(countyCode));
    return tract ?? null;
  }

  return null;
}

/**
 * Get demographics data for a resource based on its coordinates
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
