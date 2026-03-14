/**
 * NYC Demographics API - Usage Examples
 */

import {
  getDemographicsByZipCode,
  getFoodPreferencesByZipCode,
  getCulturalFoodPreferences,
  calculateCulturalMatchScore,
  getDemographicsForZipCodes
} from './demographicsApi.js';

/**
 * Example 1: Get demographics for a single zip code
 */
export async function exampleGetDemographics() {
  console.log('📊 Example: Get demographics for Jackson Heights (11372)');

  const demographics = await getDemographicsByZipCode('11372');

  if (demographics) {
    console.log('Zip Code:', demographics.zipCode);
    console.log('Population:', demographics.population.total);
    console.log('Ethnicity breakdown:');
    console.log('  Asian:', demographics.ethnicity.asian + '%');
    console.log('  Hispanic:', demographics.ethnicity.hispanic + '%');
    console.log('  Black:', demographics.ethnicity.black + '%');
    console.log('  White:', demographics.ethnicity.white + '%');
  } else {
    console.log('No data found for this zip code');
  }

  return demographics;
}

/**
 * Example 2: Get cultural food preferences for a zip code
 */
export async function exampleGetFoodPreferences() {
  console.log('🍽️ Example: Get food preferences for Jackson Heights (11372)');

  const preferences = await getFoodPreferencesByZipCode('11372');

  console.log('Zip Code:', preferences.zipCode);
  console.log('Found data?', preferences.found);
  console.log('Confidence:', preferences.confidence);
  console.log('Reasoning:', preferences.reasoning);
  console.log('\nRecommended foods:', preferences.foods.slice(0, 10).join(', '));

  return preferences;
}

/**
 * Example 3: Calculate cultural match for a pantry
 */
export async function exampleCalculateMatch() {
  console.log('🎯 Example: Calculate cultural match score');

  // Get demographic preferences for zip code
  const preferences = await getFoodPreferencesByZipCode('11372');

  // Example pantry foods
  const pantryFoods = [
    'rice', 'lentils', 'chickpeas', 'naan', 'curry',
    'tomato sauce', 'pasta', 'canned beans', 'bread'
  ];

  const score = calculateCulturalMatchScore(pantryFoods, preferences.foods);

  console.log('Pantry foods:', pantryFoods.join(', '));
  console.log('Demographic foods:', preferences.foods.slice(0, 10).join(', '));
  console.log('\n🎯 Cultural match score:', score + '%');

  return score;
}

/**
 * Example 4: Compare multiple zip codes
 */
export async function exampleCompareZipCodes() {
  console.log('📍 Example: Compare demographics across zip codes\n');

  const zipCodes = ['11372', '10002', '10314', '11206'];

  for (const zip of zipCodes) {
    const prefs = await getFoodPreferencesByZipCode(zip);

    console.log(`${zip}:`);
    console.log(`  Population: ${prefs.population || 'N/A'}`);
    if (prefs.demographics) {
      console.log(`  Asian: ${prefs.demographics.asian}%`);
      console.log(`  Hispanic: ${prefs.demographics.hispanic}%`);
      console.log(`  Top foods: ${prefs.foods.slice(0, 5).join(', ')}`);
    }
    console.log(`  Confidence: ${prefs.confidence}\n`);
  }
}

/**
 * Example 5: Batch fetch multiple zip codes
 */
export async function exampleBatchFetch() {
  console.log('⚡ Example: Batch fetch demographics');

  const zipCodes = ['11372', '10002', '10314', '11206', '10001'];

  console.log('Fetching data for', zipCodes.length, 'zip codes...');

  const results = await getDemographicsForZipCodes(zipCodes);

  console.log('\nResults:');
  Object.entries(results).forEach(([zip, data]) => {
    if (data) {
      console.log(`  ${zip}: Pop ${data.population.total}, ${data.ethnicity.asian}% Asian`);
    } else {
      console.log(`  ${zip}: No data`);
    }
  });

  return results;
}

/**
 * Run all examples
 */
export async function runAllExamples() {
  console.log('🚀 Running NYC Demographics API Examples\n');

  try {
    await exampleGetDemographics();
    console.log('\n---\n');

    await exampleGetFoodPreferences();
    console.log('\n---\n');

    await exampleCalculateMatch();
    console.log('\n---\n');

    await exampleCompareZipCodes();
    console.log('---\n');

    await exampleBatchFetch();

    console.log('\n✅ All examples completed!');
  } catch (error) {
    console.error('❌ Error running examples:', error);
  }
}

// Uncomment to run:
// runAllExamples();
