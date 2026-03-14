/**
 * Build demographics JSON from ACS and USDA CSV files
 *
 * Outputs: src/data/demographicsData.json
 *
 * Run: node scripts/buildDemographicsData.js
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATASETS_PATH = join(__dirname, '../../LemonTreeDatasets');

function parseCSV(content) {
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

  return lines.slice(1).map(line => {
    // Handle quoted values with commas
    const values = [];
    let current = '';
    let inQuotes = false;

    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    const row = {};
    headers.forEach((header, i) => {
      row[header] = values[i] || '';
    });
    return row;
  });
}

function parseFloat(val) {
  const num = Number(val);
  return isNaN(num) ? 0 : num;
}

function parseInt(val) {
  const num = Number(val);
  return isNaN(num) ? 0 : Math.floor(num);
}

// Load ACS merged data (has race, income, poverty, snap combined)
function loadACSData(state) {
  const filepath = join(DATASETS_PATH, 'ACS', state, `acs_merged_${state.toLowerCase()}.csv`);

  try {
    const content = readFileSync(filepath, 'utf-8');
    const rows = parseCSV(content);

    const data = {};
    for (const row of rows) {
      const geoid = row.GEOID;
      if (!geoid) continue;

      const total = parseInt(row.race_total) || 1;

      data[geoid] = {
        geoid,
        name: row.NAME || '',
        state: row.state_name || state,
        population: {
          total: parseInt(row.race_total),
          white: parseInt(row.white_non_hispanic),
          black: parseInt(row.black_alone),
          asian: parseInt(row.asian_alone),
          hispanic: parseInt(row.hispanic_latino),
        },
        // Percentages for pie chart
        ethnicity_pct: {
          white: Math.round(parseInt(row.white_non_hispanic) / total * 1000) / 10,
          black: Math.round(parseInt(row.black_alone) / total * 1000) / 10,
          asian: Math.round(parseInt(row.asian_alone) / total * 1000) / 10,
          hispanic: Math.round(parseInt(row.hispanic_latino) / total * 1000) / 10,
        },
        income: {
          median_household: parseInt(row.median_household_income),
        },
        poverty: {
          rate_pct: parseFloat(row.poverty_rate_pct),
        },
        snap: {
          rate_pct: parseFloat(row.snap_rate_pct),
          households: parseInt(row.snap_households),
          total_households: parseInt(row.total_households),
        },
      };
    }

    return data;
  } catch (err) {
    console.error(`Error loading ACS data for ${state}:`, err.message);
    return {};
  }
}

// Load USDA Food Access data
function loadUSDAData(state) {
  const filepath = join(DATASETS_PATH, 'USDA_FoodAccess', `${state.toLowerCase()}-food-access-usda.csv`);

  try {
    const content = readFileSync(filepath, 'utf-8');
    const rows = parseCSV(content);

    const data = {};
    for (const row of rows) {
      const censusTract = row.CensusTract;
      if (!censusTract) continue;

      // Pad to 11 digits for GEOID
      const geoid = String(censusTract).padStart(11, '0');

      data[geoid] = {
        geoid,
        county: row.County || '',
        state: row.State || state.toUpperCase(),
        urban: parseInt(row.Urban) === 1,
        population_2010: parseInt(row.Pop2010),
        food_desert: {
          is_food_desert: parseInt(row.LILATracts_1And10) === 1,
          low_income: parseInt(row.LowIncomeTracts) === 1,
          low_vehicle_access: parseInt(row.LILATracts_Vehicle) === 1,
        },
        vulnerable_populations: {
          seniors: parseInt(row.TractSeniors),
          kids: parseInt(row.TractKids),
          no_vehicle_households: parseInt(row.TractHUNV),
          low_income_pop: parseInt(row.TractLOWI),
        },
        poverty_rate: parseFloat(row.PovertyRate),
        median_family_income: parseInt(row.MedianFamilyIncome),
      };
    }

    return data;
  } catch (err) {
    console.error(`Error loading USDA data for ${state}:`, err.message);
    return {};
  }
}

// Build zip code to GEOID mapping (first 5 digits of GEOID)
function buildZipCodeIndex(acsData) {
  const zipIndex = {};

  for (const [geoid, data] of Object.entries(acsData)) {
    // Extract state+county from GEOID (varies by state)
    // For simplicity, group by first 5 digits
    const prefix = geoid.substring(0, 5);

    if (!zipIndex[prefix]) {
      zipIndex[prefix] = [];
    }
    zipIndex[prefix].push(geoid);
  }

  return zipIndex;
}

// Main
async function main() {
  console.log('Building demographics data...\n');

  // Load ACS data
  console.log('Loading ACS demographics...');
  const acsNY = loadACSData('NY');
  const acsNJ = loadACSData('NJ');
  console.log(`  NY: ${Object.keys(acsNY).length} census tracts`);
  console.log(`  NJ: ${Object.keys(acsNJ).length} census tracts`);

  // Load USDA data
  console.log('\nLoading USDA Food Access...');
  const usdaNY = loadUSDAData('ny');
  const usdaNJ = loadUSDAData('nj');
  console.log(`  NY: ${Object.keys(usdaNY).length} census tracts`);
  console.log(`  NJ: ${Object.keys(usdaNJ).length} census tracts`);

  // Merge ACS + USDA by GEOID
  console.log('\nMerging datasets...');
  const merged = {};

  for (const [geoid, acs] of Object.entries({ ...acsNY, ...acsNJ })) {
    const usda = usdaNY[geoid] || usdaNJ[geoid] || null;

    merged[geoid] = {
      ...acs,
      food_access: usda ? {
        is_food_desert: usda.food_desert.is_food_desert,
        low_income_tract: usda.food_desert.low_income,
        low_vehicle_access: usda.food_desert.low_vehicle_access,
        vulnerable_populations: usda.vulnerable_populations,
      } : null,
    };
  }

  // Calculate summary stats
  const tracts = Object.values(merged);
  const foodDesertCount = tracts.filter(t => t.food_access?.is_food_desert).length;
  const avgPoverty = tracts.reduce((sum, t) => sum + (t.poverty?.rate_pct || 0), 0) / tracts.length;

  const output = {
    generatedAt: new Date().toISOString(),
    sources: [
      'US Census Bureau ACS 5-Year Estimates (2018-2022)',
      'USDA Food Access Research Atlas (2019)',
    ],
    stats: {
      totalTracts: tracts.length,
      foodDesertTracts: foodDesertCount,
      foodDesertPct: Math.round(foodDesertCount / tracts.length * 1000) / 10,
      avgPovertyRate: Math.round(avgPoverty * 10) / 10,
    },
    // Index by GEOID for fast lookup
    tracts: merged,
  };

  // Write output
  const outputPath = join(__dirname, '../src/data/demographicsData.json');
  writeFileSync(outputPath, JSON.stringify(output, null, 2));

  console.log(`\n✅ Done! Output: ${outputPath}`);
  console.log(`   ${output.stats.totalTracts} census tracts`);
  console.log(`   ${output.stats.foodDesertTracts} food deserts (${output.stats.foodDesertPct}%)`);
}

main().catch(console.error);
