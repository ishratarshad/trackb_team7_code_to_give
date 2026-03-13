/**
 * Process Layer 1 classified images into pantry data for the dashboard
 * Input: ../../ai-classifier/data/layer1-1000.json (984 images, 557 pantries)
 * Output: ../src/data/pantryData.json
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const inputPath = join(__dirname, '../../ai-classifier/data/layer1-1000.json');
const outputPath = join(__dirname, '../src/data/pantryData.json');

console.log('📊 Processing classified images...\n');

const classifierData = JSON.parse(readFileSync(inputPath, 'utf-8'));
const results = classifierData.results || [];

// Group images by pantry (resourceId)
const pantryMap = new Map();

for (const image of results) {
  const source = image.source;
  const resourceId = source.resourceId;

  if (!pantryMap.has(resourceId)) {
    pantryMap.set(resourceId, {
      id: resourceId,
      name: source.resourceName,
      zipCode: source.zipCode,
      neighborhood: source.neighborhoodName,
      latitude: source.latitude,
      longitude: source.longitude,
      images: [],
      foodItems: new Set(),
      foodCategories: new Set(),
      flags: {
        hasFreshProduce: false,
        hasMeat: false,
        hasDairy: false,
        hasGrains: false,
        hasCanned: false,
        hasHalal: false,
        hasKosher: false
      }
    });
  }

  const pantry = pantryMap.get(resourceId);

  // Add image
  pantry.images.push({
    imageId: image.imageId,
    imageUrl: image.imageUrl,
    classifiedAt: image.classifiedAt
  });

  // Aggregate food tags (confidence >= 0.7)
  if (image.rawTags) {
    for (const tag of image.rawTags) {
      if (tag.confidence >= 0.7) {
        pantry.foodItems.add(tag.label);
        if (tag.category) {
          pantry.foodCategories.add(tag.category);
        }
      }
    }
  }

  // Aggregate flags
  if (image.flags) {
    Object.keys(image.flags).forEach(key => {
      if (image.flags[key]) {
        pantry.flags[key] = true;
      }
    });
  }
}

// Convert to array
const pantries = Array.from(pantryMap.values()).map(pantry => ({
  id: pantry.id,
  name: pantry.name,
  zipCode: pantry.zipCode,
  neighborhood: pantry.neighborhood,
  latitude: pantry.latitude,
  longitude: pantry.longitude,
  imageCount: pantry.images.length,
  foods: Array.from(pantry.foodItems),
  foodCategories: Array.from(pantry.foodCategories),
  flags: pantry.flags,
  // Keep first 3 images for preview
  imageUrls: pantry.images.slice(0, 3).map(img => img.imageUrl)
})).filter(pantry => {
  // Only include pantries with valid coordinates
  return pantry.latitude && pantry.longitude;
});

// Sort by image count (most images first)
pantries.sort((a, b) => b.imageCount - a.imageCount);

const stats = {
  totalPantries: pantries.length,
  totalImages: results.length,
  avgImagesPerPantry: (results.length / pantries.length).toFixed(1),
  pantryWithMostImages: pantries[0]?.name || 'N/A',
  mostImagesCount: pantries[0]?.imageCount || 0
};

const output = {
  generatedAt: new Date().toISOString(),
  source: 'layer1-1000.json (Claude Sonnet 4 classification)',
  stats,
  pantries
};

writeFileSync(outputPath, JSON.stringify(output, null, 2));

console.log('✅ Processing complete!\n');
console.log(`📍 Pantries: ${stats.totalPantries}`);
console.log(`🖼️  Images: ${stats.totalImages}`);
console.log(`📊 Avg images/pantry: ${stats.avgImagesPerPantry}`);
console.log(`🏆 Most images: ${stats.pantryWithMostImages} (${stats.mostImagesCount} images)\n`);
console.log(`💾 Output: ${outputPath}`);
