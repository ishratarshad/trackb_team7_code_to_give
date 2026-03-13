# Lemontree Food Classifier - Layer 1

**Vision tagging for food pantry images using Claude AI**

## What This Does

```
pantry photo → Claude Vision → raw food tags with confidence scores
```

## Quick Start

```bash
npm install
cp .env.example .env.local   # Add your ANTHROPIC_API_KEY
npm run classify -- --count 1000 --output data/layer1-1000.json
```

## Data Available

- **234,000+ images** available from Lemontree feed
- Images from client visits to food pantries across the US
- Each image has: pantry name, ZIP code, neighborhood, lat/lng

## Output Format (for Layer 2)

```json
{
  "exportedAt": "2026-03-13T...",
  "totalImages": 1000,
  "results": [
    {
      "imageId": "xahqbcrallcqpgsrmj54hqkc",
      "imageUrl": "https://lemontree-feed-photos.s3.amazonaws.com/...",
      "source": {
        "resourceId": "cleh7op8t0008l00f527l985c",
        "resourceName": "Holy Communion Lutheran Church",
        "zipCode": "08089",
        "neighborhoodName": "Chesilhurst",
        "latitude": 39.72,
        "longitude": -74.88
      },
      "rawTags": [
        { "label": "jasmine rice", "confidence": 0.95, "category": "grains" },
        { "label": "canned black beans", "confidence": 0.9, "category": "canned" },
        { "label": "bananas", "confidence": 0.85, "category": "produce" }
      ],
      "flags": {
        "hasFreshProduce": true,
        "hasMeat": false,
        "hasDairy": false,
        "hasGrains": true,
        "hasCanned": true,
        "hasHalal": false,
        "hasKosher": false
      },
      "overallConfidence": "high",
      "estimatedVariety": "medium"
    }
  ]
}
```

## For Layer 2 (Normalization)

Your job: take `rawTags` and normalize into canonical taxonomy:

```
Raw tags:                    Normalized:
"white rice"          →      rice → staples
"jasmine rice"        →      rice → staples
"Uncle Ben's rice"    →      rice → staples

Then compute supply profile:
  staples: 42%
  produce: 18%
  protein: 21%
  canned goods: 19%
```

## Files

```
ai-classifier/
├── scripts/classify-batch.ts    # Classification script
├── data/                        # Output JSON files
│   └── layer1-1000.json         # Classified images for Layer 2
├── .env.local                   # ANTHROPIC_API_KEY (not committed)
└── package.json
```

## Commands

```bash
# Classify 100 images (default)
npm run classify

# Classify specific count
npm run classify -- --count 500 --output data/my-export.json

# Classify all (234K+ images - expensive!)
npm run classify -- --all --output data/layer1-all.json
```

## Data Source

Lemontree `/api/feed` endpoint - client-submitted food photos from pantry visits.
