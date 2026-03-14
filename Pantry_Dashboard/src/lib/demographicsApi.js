/**
 * NYC Open Data Demographics API Client
 *
 * Fetches census data and maps demographics to cultural food preferences.
 * No API key required - all endpoints are public.
 */

const NYC_OPEN_DATA_BASE = 'https://data.cityofnewyork.us/resource';

/**
 * Fetch census data by zip code
 * Dataset: Modified Zip Code Tabulation Areas (MODZCTA)
 *
 * @param {string} zipCode - NYC zip code (5 digits)
 * @returns {Promise<Object>} Census demographics for the zip code
 */
export async function getDemographicsByZipCode(zipCode) {
  try {
    // NYC Demographics by ZCTA (Zip Code Tabulation Area)
    // Dataset: https://data.cityofnewyork.us/City-Government/Demographic-Statistics-By-Zip-Code/kku6-nxdu
    const url = `${NYC_OPEN_DATA_BASE}/kku6-nxdu.json?$where=zip_code='${zipCode}'&$limit=1`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`NYC Open Data API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data || data.length === 0) {
      return null; // No data for this zip code
    }

    return parseNYCDemographics(data[0]);
  } catch (error) {
    console.error('Error fetching demographics:', error);
    return null;
  }
}

/**
 * Parse NYC demographics data into useful format
 */
function parseNYCDemographics(raw) {
  return {
    zipCode: raw.zip_code,
    jurisdiction: raw.jurisdiction_name,

    // Population
    population: {
      total: parseInt(raw.count_participants) || 0,
      male: parseInt(raw.count_male) || 0,
      female: parseInt(raw.count_female) || 0,
    },

    // Age groups
    age: {
      under18: parseInt(raw.percent_18) || 0,
      age19to64: parseInt(raw.percent_19_to_64) || 0,
      age65plus: parseInt(raw.percent_65) || 0,
    },

    // Race/Ethnicity (percentages)
    ethnicity: {
      asian: parseFloat(raw.percent_asian_non_hispanic) || 0,
      black: parseFloat(raw.percent_black_non_hispanic) || 0,
      hispanic: parseFloat(raw.percent_hispanic_latino) || 0,
      white: parseFloat(raw.percent_white_non_hispanic) || 0,
      other: parseFloat(raw.percent_other) || 0,
    },

    // Education & Income indicators
    socioeconomic: {
      receivesPublicAssistance: parseFloat(raw.percent_receives_public_assistance) || 0,
      poverty: parseFloat(raw.percent_poverty) || 0,
    },

    // Raw data for reference
    raw
  };
}

/**
 * Map demographics to cultural food preferences
 *
 * Based on dominant ethnic groups, suggests culturally relevant foods.
 *
 * @param {Object} demographics - Demographics object from getDemographicsByZipCode
 * @returns {Object} Cultural food preferences with confidence scores
 */
export function getCulturalFoodPreferences(demographics) {
  if (!demographics || !demographics.ethnicity) {
    return {
      foods: ['rice', 'beans', 'bread', 'chicken', 'vegetables'],
      confidence: 'low',
      reasoning: 'No demographic data available - using generic foods'
    };
  }

  const eth = demographics.ethnicity;
  const culturalFoods = [];
  const reasoningParts = [];

  // Asian communities (South Asian, East Asian, Southeast Asian)
  if (eth.asian > 30) {
    culturalFoods.push(
      'rice', 'lentils', 'chickpeas', 'tofu', 'soy sauce',
      'ginger', 'garlic', 'noodles', 'curry', 'halal',
      'jasmine rice', 'basmati rice', 'naan', 'roti'
    );
    reasoningParts.push(`${eth.asian.toFixed(0)}% Asian (suggests rice, lentils, curry, halal)`);
  } else if (eth.asian > 15) {
    culturalFoods.push('rice', 'noodles', 'tofu', 'soy sauce');
    reasoningParts.push(`${eth.asian.toFixed(0)}% Asian (moderate)`);
  }

  // Hispanic/Latino communities
  if (eth.hispanic > 30) {
    culturalFoods.push(
      'rice', 'beans', 'black beans', 'pinto beans', 'tortillas',
      'corn', 'cilantro', 'lime', 'avocado', 'plantains',
      'chili peppers', 'salsa', 'queso', 'arroz'
    );
    reasoningParts.push(`${eth.hispanic.toFixed(0)}% Hispanic/Latino (suggests rice, beans, tortillas)`);
  } else if (eth.hispanic > 15) {
    culturalFoods.push('rice', 'beans', 'tortillas', 'corn');
    reasoningParts.push(`${eth.hispanic.toFixed(0)}% Hispanic/Latino (moderate)`);
  }

  // Black/African American communities
  if (eth.black > 30) {
    culturalFoods.push(
      'rice', 'collard greens', 'black-eyed peas', 'sweet potatoes',
      'cornbread', 'okra', 'grits', 'yams', 'hot sauce'
    );
    reasoningParts.push(`${eth.black.toFixed(0)}% Black/African American (suggests soul food staples)`);
  } else if (eth.black > 15) {
    culturalFoods.push('rice', 'sweet potatoes', 'collard greens');
    reasoningParts.push(`${eth.black.toFixed(0)}% Black/African American (moderate)`);
  }

  // White communities (European heritage - diverse)
  if (eth.white > 50) {
    culturalFoods.push(
      'pasta', 'bread', 'potatoes', 'cheese', 'beef',
      'tomatoes', 'olive oil', 'lettuce', 'carrots'
    );
    reasoningParts.push(`${eth.white.toFixed(0)}% White/European (suggests European staples)`);
  }

  // Universal staples (always include)
  const universalFoods = [
    'bread', 'milk', 'eggs', 'chicken', 'canned vegetables',
    'peanut butter', 'pasta', 'cereal'
  ];

  // Combine and deduplicate
  const allFoods = [...new Set([...culturalFoods, ...universalFoods])];

  // Calculate confidence
  const maxEthnicity = Math.max(eth.asian, eth.hispanic, eth.black, eth.white);
  let confidence = 'medium';
  if (maxEthnicity > 50) confidence = 'high';
  if (maxEthnicity < 20) confidence = 'low';

  return {
    foods: allFoods,
    confidence,
    reasoning: reasoningParts.length > 0
      ? reasoningParts.join('; ')
      : 'Mixed demographics - using diverse food preferences',
    demographics: {
      asian: eth.asian,
      hispanic: eth.hispanic,
      black: eth.black,
      white: eth.white
    }
  };
}

/**
 * Get cultural food preferences for a specific zip code
 *
 * @param {string} zipCode - NYC zip code
 * @returns {Promise<Object>} Food preferences based on demographics
 */
export async function getFoodPreferencesByZipCode(zipCode) {
  const demographics = await getDemographicsByZipCode(zipCode);

  if (!demographics) {
    return {
      zipCode,
      found: false,
      foods: ['rice', 'beans', 'bread', 'chicken', 'vegetables'],
      confidence: 'low',
      reasoning: 'No demographic data available for this zip code'
    };
  }

  const preferences = getCulturalFoodPreferences(demographics);

  return {
    zipCode,
    found: true,
    ...preferences,
    demographics: demographics.ethnicity,
    population: demographics.population.total
  };
}

/**
 * Batch fetch demographics for multiple zip codes
 *
 * @param {string[]} zipCodes - Array of zip codes
 * @returns {Promise<Object>} Map of zipCode -> demographics
 */
export async function getDemographicsForZipCodes(zipCodes) {
  const results = {};

  // Fetch in parallel (with rate limiting)
  const batchSize = 10;
  for (let i = 0; i < zipCodes.length; i += batchSize) {
    const batch = zipCodes.slice(i, i + batchSize);
    const promises = batch.map(zip => getDemographicsByZipCode(zip));
    const batchResults = await Promise.all(promises);

    batch.forEach((zip, idx) => {
      results[zip] = batchResults[idx];
    });

    // Brief delay between batches to avoid rate limiting
    if (i + batchSize < zipCodes.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  return results;
}

/**
 * Calculate cultural match score between pantry foods and demographic preferences
 *
 * @param {string[]} pantryFoods - Foods available at pantry
 * @param {string[]} demographicFoods - Culturally preferred foods
 * @returns {number} Match score (0-100)
 */
export function calculateCulturalMatchScore(pantryFoods, demographicFoods) {
  if (!pantryFoods || pantryFoods.length === 0) return 0;
  if (!demographicFoods || demographicFoods.length === 0) return 0;

  // Normalize to lowercase for matching
  const normalizedPantry = pantryFoods.map(f => f.toLowerCase());
  const normalizedDemo = demographicFoods.map(f => f.toLowerCase());

  // Count matches (allow partial matches)
  let matches = 0;
  for (const demoFood of normalizedDemo) {
    const hasMatch = normalizedPantry.some(pantryFood =>
      pantryFood.includes(demoFood) || demoFood.includes(pantryFood)
    );
    if (hasMatch) matches++;
  }

  // Score based on percentage of demographic preferences met
  return Math.round((matches / normalizedDemo.length) * 100);
}
