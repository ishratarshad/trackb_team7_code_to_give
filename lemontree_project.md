# Lemontree Partner Intelligence Platform
## Claude Code Project Brief — Full Technical Specification

---

## Project Overview

We are building a **partner-facing analytics dashboard** for a nonprofit called **Lemontree** as part of the Morgan Stanley Code to Give hackathon. Lemontree helps people navigate local food assistance resources (food pantries, soup kitchens) and collects data on how well those resources serve communities.

The core problem: Lemontree has rich data — pantry locations, client reviews, food photos, wait times — but partners like the NYC Mayor's Office of Food Policy, food banks, and donors cannot easily explore or understand it. Everything is currently manual and ad hoc.

Our solution transforms that data into a **guided, visual, AI-powered dashboard** that non-technical partners can use independently.

**The flagship feature**: An AI food image classifier that automatically tags what food is in each client-submitted photo (e.g. "halal meat", "fresh produce", "rice", "canned goods") using Claude Vision, then maps those tags against neighborhood demographic data — so partners can instantly see if the food being distributed culturally matches the community it serves.

This directly addresses a real use case: the NYC Mayor's Office asked Lemontree whether food offerings in neighborhoods like Jackson Heights matched South Asian dietary preferences. Currently this takes days of manual work. We make it one click.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14+ (App Router) |
| Frontend | React |
| Backend | Next.js API Routes (Node.js) |
| Map | Leaflet or Mapbox GL JS |
| AI | Anthropic Claude API (claude-claude-sonnet-4-20250514) |
| Demographics | NYC Open Data API (free, no auth) |
| API Deserialization | superjson |
| Deployment | Vercel |
| Styling | Tailwind CSS |

**Critical note**: Lemontree's own production app is built on Next.js deployed on Vercel with a Node backend. We are deliberately matching their stack so our code can be merged into their codebase after the hackathon.

---

## Lemontree API

**Base URL**: `https://platform.foodhelpline.org`

All endpoints are **public — no authentication required**. CORS is enabled. All responses use **superjson serialization** — you must deserialize using the `superjson` npm package or access `raw.json` directly.

### Deserialization Pattern

```javascript
import superjson from "superjson";

const raw = await fetch("https://platform.foodhelpline.org/api/resources").then(r => r.json());
const { count, resources, cursor } = superjson.deserialize(raw);
// Date fields like startTime are now real Date objects
```

Or skip deserialization and use `raw.json` directly — Date fields are ISO 8601 strings you can parse with `new Date(...)`.

---

### GET /api/resources

List food pantries and soup kitchens.

**Query Parameters:**

| Param | Type | Description |
|---|---|---|
| `lat` | number | Latitude for distance-based results |
| `lng` | number | Longitude for distance-based results |
| `location` | string | Zip code (e.g. `10001`) — alternative to lat/lng |
| `text` | string | Full-text search on resource name |
| `resourceTypeId` | string | `FOOD_PANTRY` or `SOUP_KITCHEN` |
| `tagId` | string | Filter by tag ID |
| `occurrencesWithin` | string | ISO 8601 interval — only resources with occurrences in window |
| `region` | string | Region ID or comma-separated zip codes |
| `sort` | string | `distance`, `referrals`, `referralsAsc`, `reviews`, `confidence`, `createdAt` |
| `take` | number | Results per page (default: 40) |
| `cursor` | string | Pagination cursor from previous response |

**Pagination** — pass cursor from previous response as `?cursor=<value>`:

```javascript
async function* allResources(params = {}) {
  let cursor;
  do {
    const qs = new URLSearchParams({ take: 40, ...params, ...(cursor ? { cursor } : {}) });
    const raw = await fetch(`https://platform.foodhelpline.org/api/resources?${qs}`).then(r => r.json());
    const data = raw.json;
    yield* data.resources;
    cursor = data.cursor;
  } while (cursor);
}
```

**Response Shape:**

```typescript
{
  count: number;
  cursor?: string;
  resources: Resource[];
  location?: { id: string; name: string; latitude: number; longitude: number; };
}
```

**Full Resource Object:**

```typescript
{
  id: string;
  name: string | null;
  description: string | null;
  description_es: string | null;
  addressStreet1: string | null;
  addressStreet2: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  latitude: number | null;
  longitude: number | null;
  timezone: string;
  website: string | null;
  openByAppointment: boolean;
  resourceType: { id: "FOOD_PANTRY" | "SOUP_KITCHEN"; name: string; name_es: string; };
  resourceStatus: { id: "PUBLISHED" | "UNPUBLISHED" | "REMOVED" };
  usageLimitCount: number | null;
  usageLimitIntervalCount: number | null;
  usageLimitIntervalUnit: string | null; // "week", "month", etc.
  usageLimitCalendarReset: boolean;
  contacts: [{
    phone: string;
    availability: { day: number; startHour: number; endHour: number; }[];
  }];
  images: [{ url: string }]; // IMPORTANT: First image only
  shifts: Shift[];
  occurrences: Occurrence[]; // Next 4 upcoming occurrences
  occurrenceSkipRanges: { startTime: Date; endTime: Date; archivedAt: Date | null; shifts: { id: string }[]; }[];
  tags: { id: string; name: string; name_es: string; tagCategoryId: string; }[];
  travelSummary?: { distance: number | null; }; // Only present when lat/lng provided
  confidence: number | null; // 0-1 data quality score
  ratingAverage: number | null; // 1-5 star average
  _count: { reviews: number; resourceSubscriptions: number; };
}
```

**Shift object:**
```typescript
{
  id: string;
  startTime: Date;
  endTime: Date;
  recurrencePattern: string | null; // iCal RRULE e.g. "FREQ=WEEKLY;BYDAY=MO,WE,FR"
  durationMinutes: number | null;
  isAllDay: boolean;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  locationName: string | null;
  tags: Tag[];
}
```

**Occurrence object:**
```typescript
{
  id: string;
  startTime: Date;
  endTime: Date;
  confirmedAt: Date | null; // Non-null = confirmed open
  skippedAt: Date | null;   // Non-null = cancelled
  title: string | null;
  description: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  holidays: { name: string; date: Date; }[];
}
```

---

### GET /api/resources/:id

Get a single resource by ID. Same response shape as a single item from the list endpoint.

```
GET https://platform.foodhelpline.org/api/resources/clxyz123
```

---

### GET /api/resources/markersWithinBounds

Lightweight GeoJSON map markers for a geographic bounding box. Returns only ID, type, and coordinates. Max 1000 results.

```
GET https://platform.foodhelpline.org/api/resources/markersWithinBounds?corner=<lng,lat>&corner=<lng,lat>
```

**Parameters:**
- `corner` — Two `"lng,lat"` strings for opposite corners of the bounding box

**Returns:** GeoJSON FeatureCollection. Each feature has properties: `{ id, resourceTypeId }`

**Example:**
```
curl "https://platform.foodhelpline.org/api/resources/markersWithinBounds?corner=-74.02,40.70&corner=-73.97,40.75"
```

**Usage pattern:** Use `markersWithinBounds` to render map pins efficiently, then fetch individual resources on demand with `GET /api/resources/:id`.

---

### GET /api/resources.pdf

Generates a print-ready flyer PDF listing nearby food resources for a given location.

```
GET https://platform.foodhelpline.org/api/resources.pdf?lat=40.6782&lng=-73.9442&locationName=Crown+Heights
```

Returns `application/pdf`. Can be embedded in `<iframe>` or streamed to a file.

---

## Review Data Structure

Reviews are client-submitted feedback after visiting a food pantry. **Important**: There is no documented public endpoint to list reviews — we need to confirm with Lemontree if a reviews endpoint exists. The resource object contains `ratingAverage` and `_count.reviews` but not individual review records.

**Full Review Schema:**

```typescript
{
  id: string;
  attended: boolean | null;           // Did client actually receive help?
  createdAt: string;                  // ISO 8601 datetime
  deletedAt: string | null;           // Soft delete timestamp
  didNotAttendReason: string | null;  // e.g. "Location was closed", "Too far to travel"
  informationAccurate: boolean | null; // Were listing details (hours, location) correct?
  photoPublic: boolean | null;        // Can photo be shown publicly?
  photoUrl: string | null;            // URL to food photo — KEY FIELD FOR AI CLASSIFIER
  rating: number | null;              // 1-5 star rating
  shareTextWithResource: boolean;     // Default false — protects client privacy
  text: string | null;                // Written review text
  waitTimeMinutes: number | null;     // Minutes waited in line
  authorId: string;
  resourceId: string;
  occurrenceId: string | null;        // Specific visit occurrence (not always captured)
  userId: string | null;
  reviewedByUserId: string | null;
}
```

**Key fields for our features:**
- `photoUrl` → source image for AI food classification
- `waitTimeMinutes` → wait time trend analysis
- `text` → free text for AI categorization
- `rating` → satisfaction scoring
- `didNotAttendReason` → unmet demand analysis ("Too far to travel" feeds travel distance feature)
- `attended` → boolean for unmet demand
- `informationAccurate` → flags bad listings automatically

---

## The AI Food Image Classifier — Primary Feature

This is the **flagship differentiator** of our project. Lemontree has client-submitted photos of food received at pantries. Currently these are completely untagged — just raw images with basic metadata (pantry, date, occurrence). We use Claude Vision to automatically classify what food appears in each photo.

### What We're Building

1. Fetch food photos from Lemontree API (via resource images and review photoUrls)
2. Send each image URL to Claude Vision API with a structured classification prompt
3. Store the returned food tags
4. Make photos filterable/searchable by food type, cuisine category, cultural relevance
5. Display on a map view filtered by neighborhood + overlaid with demographic data

### Why This Matters

The NYC Mayor's Office of Food Policy asked Lemontree: *"Does the food offered in different neighborhoods match the dietary preferences and cultural backgrounds of people living there?"* Currently answering this requires days of manual work. Our classifier makes it one click:

- Zoom into Jackson Heights (heavily South Asian neighborhood)
- See AI-tagged food photos from all pantries in that area
- Compare against census demographic data
- Instantly reveal cultural food mismatch

### Claude Vision API Call

**Model**: `claude-sonnet-4-20250514`  
**API Endpoint**: `https://api.anthropic.com/v1/messages`

```javascript
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function classifyFoodImage(imageUrl: string) {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "url",
              url: imageUrl,
            },
          },
          {
            type: "text",
            text: `Analyze this food pantry distribution photo and return a JSON object with the following fields:

{
  "foodItems": string[],           // Specific foods visible (e.g. ["rice", "canned tomatoes", "chicken"])
  "foodCategories": string[],      // Broad categories (e.g. ["grains", "protein", "canned goods", "fresh produce"])
  "cuisineRelevance": string[],    // Cultural/cuisine relevance (e.g. ["South Asian", "Latin American", "halal", "kosher"])
  "hasFreshProduce": boolean,      // Is there fresh produce visible?
  "hasMeat": boolean,              // Is there meat visible?
  "hasDairy": boolean,             // Is there dairy visible?
  "hasGrains": boolean,            // Is there bread, rice, pasta, or grains visible?
  "hasCanned": boolean,            // Are there canned goods visible?
  "estimatedVariety": "low" | "medium" | "high",  // How varied is the food selection?
  "confidence": "low" | "medium" | "high",         // How confident are you in this classification?
  "notes": string                  // Any relevant observations about the food
}

Return ONLY the JSON object, no other text.`
          }
        ]
      }
    ]
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
```

### Batch Processing Images

Since we may have hundreds of images, process them in batches to avoid rate limits:

```javascript
async function classifyAllImages(imageUrls: string[]) {
  const results = [];
  const BATCH_SIZE = 5;
  const DELAY_MS = 1000; // 1 second between batches

  for (let i = 0; i < imageUrls.length; i += BATCH_SIZE) {
    const batch = imageUrls.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(url => classifyFoodImage(url))
    );
    results.push(...batchResults);
    
    if (i + BATCH_SIZE < imageUrls.length) {
      await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    }
  }
  
  return results;
}
```

### Storing Classifications

Cache classification results to avoid re-processing on every request. Store in a local JSON file or in-memory cache during the hackathon:

```typescript
interface ClassifiedImage {
  imageUrl: string;
  resourceId: string;
  resourceName: string;
  zipCode: string | null;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;          // When review was submitted
  occurrenceId: string | null;
  classification: {
    foodItems: string[];
    foodCategories: string[];
    cuisineRelevance: string[];
    hasFreshProduce: boolean;
    hasMeat: boolean;
    hasDairy: boolean;
    hasGrains: boolean;
    hasCanned: boolean;
    estimatedVariety: "low" | "medium" | "high";
    confidence: "low" | "medium" | "high";
    notes: string;
  } | null;
}
```

---

## Other Core Features

### 1. Neighborhood Map

- Use `markersWithinBounds` to load pantry pins efficiently
- On pin click → fetch full resource via `GET /api/resources/:id`
- Overlay NYC census data by zip code (demographic breakdown)
- Filters: neighborhood/zip, resource type (FOOD_PANTRY vs SOUP_KITCHEN), open now

**Checking if a resource is open right now:**
```javascript
const now = new Date();
const openNow = resource.occurrences.filter(
  o => !o.skippedAt && new Date(o.startTime) <= now && new Date(o.endTime) >= now
);
```

### 2. Guided Insights Explorer

Pre-built questions partners can answer with filters — NOT a blank dashboard. These are the questions Lemontree's partners actually ask:

- "Which pantries have the longest average wait times in [neighborhood]?"
- "Which pantries have the most reviews marked as information inaccurate?"
- "What food types are most common in [zip code]?"
- "Which pantries are clients traveling furthest to reach?"
- "Show me all food photos from [pantry] between [date range]"
- "Which neighborhoods have the fewest pantries per capita?"

### 3. Ask the Data (Chatbot)

A data-aware assistant that answers questions about Lemontree's actual data. NOT a general chatbot — it gets fed the real API data as context.

```javascript
async function askAboutData(question: string, contextData: any) {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: `You are a data analyst assistant for Lemontree, a food assistance nonprofit. 
    You answer questions about food pantry data. Only answer based on the data provided.
    If the data doesn't contain enough information to answer, say so clearly.
    Format responses clearly for non-technical partners like government officials and donors.`,
    messages: [
      {
        role: "user",
        content: `Here is the relevant data context:
${JSON.stringify(contextData, null, 2)}

Question: ${question}`
      }
    ]
  });
  
  return response.content[0].type === "text" ? response.content[0].text : "";
}
```

---

## NYC Open Data — Demographics Integration

Use the NYC Open Data API to get census demographic data by zip code or neighborhood. No API key required.

**Census data by zip code:**
```
https://data.cityofnewyork.us/resource/kku6-nxdu.json
```

**NTA (Neighborhood Tabulation Areas) demographics:**
```
https://data.cityofnewyork.us/resource/swpk-hkpp.json
```

Join Lemontree resource zip codes against census data to get:
- Total population
- Race/ethnicity breakdown
- Median household income
- Poverty rate
- Population density

---

## Project Structure

```
lemontree-dashboard/
├── app/
│   ├── page.tsx                    # Main dashboard page
│   ├── layout.tsx
│   ├── map/
│   │   └── page.tsx                # Interactive map view
│   ├── insights/
│   │   └── page.tsx                # Guided insights explorer
│   └── images/
│       └── page.tsx                # AI image browser
├── app/api/
│   ├── resources/
│   │   └── route.ts                # Proxy + cache Lemontree resources
│   ├── resources/[id]/
│   │   └── route.ts                # Single resource
│   ├── classify/
│   │   └── route.ts                # Claude Vision classification endpoint
│   ├── insights/
│   │   └── route.ts                # Pre-computed insights
│   └── demographics/
│       └── route.ts                # NYC Open Data proxy
├── components/
│   ├── Map.tsx                     # Interactive map component
│   ├── ImageBrowser.tsx            # AI-tagged photo browser
│   ├── InsightsPanel.tsx           # Guided questions UI
│   ├── DemographicOverlay.tsx      # Census data overlay
│   ├── ResourceCard.tsx            # Pantry detail card
│   └── Chatbot.tsx                 # Ask the data component
├── lib/
│   ├── lemontree.ts                # Lemontree API client
│   ├── classifier.ts               # Claude Vision food classifier
│   ├── demographics.ts             # NYC Open Data client
│   └── cache.ts                    # Simple in-memory/file cache
├── types/
│   └── index.ts                    # TypeScript type definitions
└── .env.local
    ANTHROPIC_API_KEY=
    NEXT_PUBLIC_MAPBOX_TOKEN=       # If using Mapbox
```

---

## Next.js API Route — Classification Endpoint

```typescript
// app/api/classify/route.ts
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Simple in-memory cache — keyed by image URL
const classificationCache = new Map<string, any>();

export async function POST(req: NextRequest) {
  const { imageUrl, resourceId, resourceName, zipCode } = await req.json();

  if (!imageUrl) {
    return NextResponse.json({ error: "imageUrl required" }, { status: 400 });
  }

  // Return cached result if exists
  if (classificationCache.has(imageUrl)) {
    return NextResponse.json({ classification: classificationCache.get(imageUrl) });
  }

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "url", url: imageUrl }
            },
            {
              type: "text",
              text: `Analyze this food pantry distribution photo and return ONLY a JSON object:
{
  "foodItems": string[],
  "foodCategories": string[],
  "cuisineRelevance": string[],
  "hasFreshProduce": boolean,
  "hasMeat": boolean,
  "hasDairy": boolean,
  "hasGrains": boolean,
  "hasCanned": boolean,
  "estimatedVariety": "low" | "medium" | "high",
  "confidence": "low" | "medium" | "high",
  "notes": string
}`
            }
          ]
        }
      ]
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "{}";
    const classification = JSON.parse(text.replace(/```json|```/g, "").trim());
    
    classificationCache.set(imageUrl, classification);
    
    return NextResponse.json({ classification });
  } catch (error) {
    return NextResponse.json({ error: "Classification failed" }, { status: 500 });
  }
}
```

---

## Lemontree API Client

```typescript
// lib/lemontree.ts
const BASE_URL = "https://platform.foodhelpline.org";

export async function getResources(params: Record<string, string> = {}) {
  const qs = new URLSearchParams({ take: "40", ...params });
  const raw = await fetch(`${BASE_URL}/api/resources?${qs}`).then(r => r.json());
  return raw.json; // { count, resources, cursor }
}

export async function getResource(id: string) {
  const raw = await fetch(`${BASE_URL}/api/resources/${id}`).then(r => r.json());
  return raw.json;
}

export async function getMarkersWithinBounds(sw: [number, number], ne: [number, number]) {
  // corners are [lng, lat]
  const url = `${BASE_URL}/api/resources/markersWithinBounds?corner=${sw[0]},${sw[1]}&corner=${ne[0]},${ne[1]}`;
  return fetch(url).then(r => r.json()); // Returns GeoJSON FeatureCollection
}

export async function* getAllResources(params: Record<string, string> = {}) {
  let cursor: string | undefined;
  do {
    const qs = new URLSearchParams({ take: "40", ...params, ...(cursor ? { cursor } : {}) });
    const raw = await fetch(`${BASE_URL}/api/resources?${qs}`).then(r => r.json());
    const data = raw.json;
    yield* data.resources;
    cursor = data.cursor;
  } while (cursor);
}
```

---

## Environment Variables

```bash
# .env.local
ANTHROPIC_API_KEY=your_key_here
NEXT_PUBLIC_MAPBOX_TOKEN=your_token_here   # Only if using Mapbox instead of Leaflet
```

---

## Demo Script (What We're Building Toward)

The demo tells this specific story for judges:

1. **Open the map** — all NYC food pantries load as pins via `markersWithinBounds`
2. **Zoom into Jackson Heights, Queens** — a neighborhood with a large South Asian community
3. **Enable demographic overlay** — census data shows the cultural makeup of the neighborhood
4. **Click pantries in the area** — resource cards open with AI-tagged food photos
5. **Show the cultural mismatch** — AI tags reveal most pantries offer general canned goods, not culturally relevant South Asian staples
6. **Say to judges**: *"The NYC Mayor's Office asked Lemontree this exact question. It took them days manually. This is one click."*

Secondary demo moments:
- Filter image browser by `cuisineRelevance: "halal"` across all NYC pantries
- Show wait time trend chart — which pantries consistently have 45+ minute waits
- Show `attended: false` + `didNotAttendReason` breakdown — visualizing unmet demand

---

## Judging Rubric & How We Win

| Criterion | Our Angle |
|---|---|
| **Relevance** | Directly solves the exact Mayor's Office use case Lemontree described |
| **Effectiveness & Feasibility** | Built on Lemontree's exact stack — could be merged into production today |
| **Technical Design** | Clean Next.js architecture, real AI pipeline, live API data |
| **Creativity & Innovation** | AI food classification mapped to cultural demographics — never been built for this |
| **Social & Environmental Impact** | Helps governments identify cultural food deserts and direct resources to underserved communities |

---

## Key Constraints & Notes

- **No reviews endpoint confirmed** — resource objects have `images: [{ url }]` (first image only) and `ratingAverage`. Individual reviews may need a separate undocumented endpoint — confirm with Lemontree contact
- **Cache aggressively** — store Lemontree API responses in memory so we're not hitting their API repeatedly during the demo
- **superjson** — all Lemontree API responses are superjson-encoded. Either use the `superjson` npm package to deserialize, or just use `raw.json` directly (dates will be ISO strings)
- **Hackathon scope** — keep it local for demo, don't over-engineer deployment
- **Image count** — roughly 10-20 images per resource, so potentially a few hundred total across all NYC pantries — manageable for batch classification
- **`occurrenceId` on reviews** — sometimes null (not always captured which specific distribution event a photo is from)

---

## One-Line Pitch

*"We built a tool that tells governments and food banks not just where food deserts are — but whether the food being offered actually matches the culture of the people who need it."*
