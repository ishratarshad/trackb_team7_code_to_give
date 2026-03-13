/**
 * Layer 1: Batch Food Image Classification Script
 * Classifies ALL food photos from Lemontree feed using Claude Vision
 *
 * Usage:
 *   npm run classify                    # Classify 100 images
 *   npm run classify -- --count 500     # Classify 500 images
 *   npm run classify -- --all           # Classify ALL images
 */

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs";
import * as path from "path";

const MODEL = "claude-sonnet-4-20250514";
const BASE_URL = "https://platform.foodhelpline.org";

// Types
interface FoodTag {
  label: string;
  confidence: number;
  category?: string;
}

interface VisionTaggingResult {
  imageId: string;
  imageUrl: string;
  classifiedAt: string;
  modelUsed: string;
  source: {
    resourceId: string;
    resourceName: string;
    zipCode: string | null;
    neighborhoodName: string | null;
    latitude: number | null;
    longitude: number | null;
  };
  rawTags: FoodTag[];
  flags: {
    hasFreshProduce: boolean;
    hasMeat: boolean;
    hasDairy: boolean;
    hasGrains: boolean;
    hasCanned: boolean;
    hasHalal: boolean;
    hasKosher: boolean;
  };
  overallConfidence: "low" | "medium" | "high";
  estimatedVariety: "low" | "medium" | "high";
  notes: string;
}

interface Layer1Export {
  exportedAt: string;
  totalImages: number;
  results: VisionTaggingResult[];
}

interface FeedItem {
  id: string;
  photoUrl: string;
  publishedAt: string;
  resourceReview: {
    resource: {
      id: string;
      name: string;
    };
  };
  client: {
    zipCode: string;
    latitude: number;
    longitude: number;
    neighborhoodName: string;
  };
}

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const LAYER1_PROMPT = `You are a food classification system for a food pantry analytics platform. Analyze this image of food from a food pantry distribution.

Return a JSON object with the following structure:

{
  "rawTags": [
    { "label": "exact food item name", "confidence": 0.0-1.0, "category": "broad category" }
  ],
  "flags": {
    "hasFreshProduce": boolean,
    "hasMeat": boolean,
    "hasDairy": boolean,
    "hasGrains": boolean,
    "hasCanned": boolean,
    "hasHalal": boolean,
    "hasKosher": boolean
  },
  "overallConfidence": "low" | "medium" | "high",
  "estimatedVariety": "low" | "medium" | "high",
  "notes": "any relevant observations"
}

Guidelines for rawTags:
- List EVERY distinct food item you can identify
- Use specific names (e.g., "jasmine rice" not just "rice", "canned black beans" not just "beans")
- Include brand names if visible
- confidence: 1.0 = certain, 0.8+ = very confident, 0.5-0.8 = somewhat confident, <0.5 = uncertain
- category should be one of: "produce", "protein", "dairy", "grains", "canned", "packaged", "beverages", "condiments", "snacks", "other"

For flags:
- hasHalal: true if you see halal certification OR items commonly halal
- hasKosher: true if you see kosher certification symbols

Return ONLY the JSON object, no other text.`;

/**
 * Fetch ALL feed photos with pagination
 */
async function fetchAllFeedPhotos(maxCount?: number): Promise<FeedItem[]> {
  const allItems: FeedItem[] = [];
  let cursor: string | undefined;
  let page = 1;

  console.log("Fetching all photos from Lemontree feed...");

  do {
    const url = `${BASE_URL}/api/feed?take=1000${cursor ? `&cursor=${cursor}` : ""}`;
    const response = await fetch(url);
    const raw = await response.json();
    const items = raw.json.feedItems.filter((item: FeedItem) => item.photoUrl);

    allItems.push(...items);
    cursor = raw.json.cursor;

    console.log(`  Page ${page}: fetched ${items.length} photos (total: ${allItems.length})`);
    page++;

    if (maxCount && allItems.length >= maxCount) {
      return allItems.slice(0, maxCount);
    }

    // Small delay between pagination requests
    if (cursor) {
      await new Promise((r) => setTimeout(r, 100));
    }
  } while (cursor);

  return allItems;
}

function generateImageId(url: string): string {
  const match = url.match(/\/([^/]+)\.(jpg|jpeg|png|webp)/i);
  if (match) return match[1];
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    hash = (hash << 5) - hash + url.charCodeAt(i);
    hash = hash & hash;
  }
  return `img_${Math.abs(hash).toString(36)}`;
}

async function classifyImage(
  imageUrl: string,
  context: {
    resourceId: string;
    resourceName: string;
    zipCode: string | null;
    neighborhoodName: string | null;
    latitude: number | null;
    longitude: number | null;
  }
): Promise<VisionTaggingResult | null> {
  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "url", url: imageUrl },
            },
            { type: "text", text: LAYER1_PROMPT },
          ],
        },
      ],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());

    return {
      imageId: generateImageId(imageUrl),
      imageUrl,
      classifiedAt: new Date().toISOString(),
      modelUsed: MODEL,
      source: context,
      rawTags: parsed.rawTags || [],
      flags: {
        hasFreshProduce: parsed.flags?.hasFreshProduce || false,
        hasMeat: parsed.flags?.hasMeat || false,
        hasDairy: parsed.flags?.hasDairy || false,
        hasGrains: parsed.flags?.hasGrains || false,
        hasCanned: parsed.flags?.hasCanned || false,
        hasHalal: parsed.flags?.hasHalal || false,
        hasKosher: parsed.flags?.hasKosher || false,
      },
      overallConfidence: parsed.overallConfidence || "medium",
      estimatedVariety: parsed.estimatedVariety || "medium",
      notes: parsed.notes || "",
    };
  } catch (error) {
    console.error(`  ✗ Failed: ${imageUrl.slice(-30)}`);
    return null;
  }
}

async function main() {
  // Parse args
  const args = process.argv.slice(2);
  let count: number | undefined = 100;
  let outputFile = "data/layer1-export.json";
  let classifyAll = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--count" && args[i + 1]) {
      count = parseInt(args[i + 1], 10);
    }
    if (args[i] === "--output" && args[i + 1]) {
      outputFile = args[i + 1];
    }
    if (args[i] === "--all") {
      classifyAll = true;
      count = undefined;
    }
  }

  console.log(`\n🍋 Layer 1 Food Image Classifier`);
  console.log(`================================`);
  console.log(`Mode: ${classifyAll ? "ALL IMAGES" : `${count} images`}`);
  console.log(`Output: ${outputFile}\n`);

  // Fetch photos
  const feedItems = await fetchAllFeedPhotos(count);
  console.log(`\nTotal photos to classify: ${feedItems.length}\n`);

  // Classify each image
  const results: VisionTaggingResult[] = [];
  const BATCH_SIZE = 5;
  const DELAY_MS = 1000;
  const startTime = Date.now();

  for (let i = 0; i < feedItems.length; i += BATCH_SIZE) {
    const batch = feedItems.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(feedItems.length / BATCH_SIZE);

    process.stdout.write(`[Batch ${batchNum}/${totalBatches}] `);

    const batchResults = await Promise.all(
      batch.map(async (item) => {
        return classifyImage(item.photoUrl, {
          resourceId: item.resourceReview?.resource?.id || "unknown",
          resourceName: item.resourceReview?.resource?.name || "Unknown Pantry",
          zipCode: item.client?.zipCode || null,
          neighborhoodName: item.client?.neighborhoodName || null,
          latitude: item.client?.latitude || null,
          longitude: item.client?.longitude || null,
        });
      })
    );

    let successCount = 0;
    for (const result of batchResults) {
      if (result) {
        results.push(result);
        successCount++;
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
    const rate = (results.length / (Date.now() - startTime) * 1000 * 60).toFixed(1);
    console.log(`✓ ${successCount}/${batch.length} success | Total: ${results.length}/${feedItems.length} | ${elapsed}s elapsed | ~${rate}/min`);

    // Save progress every 100 images
    if (results.length % 100 === 0 && results.length > 0) {
      const progressFile = outputFile.replace(".json", `-progress-${results.length}.json`);
      const progressData: Layer1Export = {
        exportedAt: new Date().toISOString(),
        totalImages: results.length,
        results,
      };
      const outputDir = path.dirname(progressFile);
      if (outputDir && !fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      fs.writeFileSync(progressFile, JSON.stringify(progressData, null, 2));
      console.log(`  💾 Progress saved: ${progressFile}`);
    }

    // Rate limit
    if (i + BATCH_SIZE < feedItems.length) {
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  }

  // Export final results
  const exportData: Layer1Export = {
    exportedAt: new Date().toISOString(),
    totalImages: results.length,
    results,
  };

  const outputDir = path.dirname(outputFile);
  if (outputDir && !fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  fs.writeFileSync(outputFile, JSON.stringify(exportData, null, 2));

  const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  console.log(`\n================================`);
  console.log(`✅ Done! Classified ${results.length}/${feedItems.length} images`);
  console.log(`⏱️  Total time: ${totalTime} minutes`);
  console.log(`📁 Output saved to: ${outputFile}`);
}

main().catch(console.error);
