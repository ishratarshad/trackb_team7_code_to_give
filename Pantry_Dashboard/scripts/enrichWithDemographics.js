/**
 * Enrich pantry data with demographic-based cultural matching
 *
 * Reads: src/data/pantryData.json
 * Outputs: src/data/pantryDataWithDemographics.json
 *
 * For each pantry:
 * - Fetch demographics for its zip code
 * - Get culturally preferred foods based on demographics
 * - Calculate accurate cultural match score
 * - Add demographic insights
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Can't use ES6 imports for these in Node without complications
// So we'll use dynamic import
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function enrichPantries() {
  console.log('📊 Enriching pantry data with demographics...\n');

  // Import demographics API
  const demographicsApi = await import('../src/lib/demographicsApi.js');

  // Read pantry data
  const inputPath = join(__dirname, '../src/data/pantryData.json');
  const outputPath = join(__dirname, '../src/data/pantryDataWithDemographics.json');

  const pantryData = JSON.parse(readFileSync(inputPath, 'utf-8'));
  const pantries = pantryData.pantries;

  console.log(`Processing ${pantries.length} pantries...\n`);

  // Get unique zip codes
  const zipCodes = [...new Set(pantries.map(p => p.zipCode).filter(Boolean))];
  console.log(`Found ${zipCodes.length} unique zip codes`);

  // Batch fetch demographics for all zip codes
  console.log('Fetching demographics data...');
  const demographicsMap = await demographicsApi.getDemographicsForZipCodes(zipCodes);

  // Enrich each pantry
  let enrichedCount = 0;
  let noDataCount = 0;

  const enrichedPantries = pantries.map((pantry, index) => {
    if ((index + 1) % 50 === 0) {
      console.log(`  Processed ${index + 1}/${pantries.length} pantries...`);
    }

    const zipCode = pantry.zipCode;

    if (!zipCode) {
      noDataCount++;
      return {
        ...pantry,
        demographics: null,
        culturalMatch: {
          score: 0,
          confidence: 'none',
          reasoning: 'No zip code available',
          recommendedFoods: []
        }
      };
    }

    const demographics = demographicsMap[zipCode];

    if (!demographics) {
      noDataCount++;
      return {
        ...pantry,
        demographics: null,
        culturalMatch: {
          score: 0,
          confidence: 'none',
          reasoning: 'No demographic data for this zip code',
          recommendedFoods: []
        }
      };
    }

    // Get cultural food preferences for this zip code
    const preferences = demographicsApi.getCulturalFoodPreferences(demographics);

    // Calculate cultural match score
    const normalizedFoods = pantry.foods.map(f => f.toLowerCase());
    const score = demographicsApi.calculateCulturalMatchScore(
      normalizedFoods,
      preferences.foods
    );

    enrichedCount++;

    return {
      ...pantry,
      demographics: {
        population: demographics.population.total,
        ethnicity: demographics.ethnicity,
        poverty: demographics.socioeconomic.poverty,
        jurisdiction: demographics.jurisdiction
      },
      culturalMatch: {
        score,
        confidence: preferences.confidence,
        reasoning: preferences.reasoning,
        recommendedFoods: preferences.foods,
        missingFoods: preferences.foods.filter(food => {
          return !normalizedFoods.some(pf => pf.includes(food) || food.includes(pf));
        }).slice(0, 10) // Top 10 missing
      }
    };
  });

  // Calculate new stats
  const enrichedWithDemographics = enrichedPantries.filter(p => p.demographics);
  const avgScore = enrichedWithDemographics.reduce((sum, p) => sum + p.culturalMatch.score, 0) / enrichedWithDemographics.length;

  const output = {
    generatedAt: new Date().toISOString(),
    source: 'pantryData.json + NYC Open Data demographics',
    stats: {
      ...pantryData.stats,
      pantriesWithDemographics: enrichedCount,
      pantriesWithoutDemographics: noDataCount,
      averageCulturalMatchScore: avgScore.toFixed(1),
      uniqueZipCodes: zipCodes.length
    },
    pantries: enrichedPantries
  };

  writeFileSync(outputPath, JSON.stringify(output, null, 2));

  console.log('\n✅ Enrichment complete!\n');
  console.log(`📊 Stats:`);
  console.log(`   Pantries enriched: ${enrichedCount}`);
  console.log(`   Missing demographics: ${noDataCount}`);
  console.log(`   Average cultural match: ${avgScore.toFixed(1)}%`);
  console.log(`   Unique zip codes: ${zipCodes.length}\n`);
  console.log(`💾 Output: ${outputPath}`);
}

// Run the enrichment
enrichPantries().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
