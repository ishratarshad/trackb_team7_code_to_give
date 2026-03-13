# API Library

## LemonTree API Client

Client for interacting with the LemonTree food pantry API at `https://platform.foodhelpline.org`.

### Features

- ✅ Fetch food pantries and soup kitchens
- ✅ Search by location (zip code, lat/lng)
- ✅ Search by name/text
- ✅ Filter by resource type (pantry vs soup kitchen)
- ✅ Pagination support
- ✅ Automatic superjson deserialization
- ✅ Helper functions (isOpenNow, getNextOccurrence)
- ✅ GeoJSON map markers endpoint

### Quick Start

```javascript
import { getResourcesByZipCode } from './lib/lemontreeApi';

// Get pantries near a zip code
const result = await getResourcesByZipCode('10001', 10);
console.log(result.resources);
```

### API Functions

#### Basic Queries

```javascript
import {
  getResources,
  getResource,
  getResourcesByZipCode,
  searchResources,
  getFoodPantries,
  getSoupKitchens
} from './lib/lemontreeApi';

// Get resources with custom options
const resources = await getResources({
  location: '10001',
  take: 20,
  sort: 'distance'
});

// Get single resource by ID
const resource = await getResource('clxyz123');

// Search by name
const searchResults = await searchResources('church', 10);

// Get only food pantries
const pantries = await getFoodPantries({ location: '10001' });

// Get only soup kitchens
const kitchens = await getSoupKitchens({ location: '10001' });
```

#### Map Markers

```javascript
import { getMarkersWithinBounds } from './lib/lemontreeApi';

// Get map markers in a bounding box
const markers = await getMarkersWithinBounds({
  sw: [-74.02, 40.70], // [lng, lat]
  ne: [-73.97, 40.75]
});

// Returns GeoJSON FeatureCollection
console.log(markers.features);
```

#### Pagination

```javascript
import { getAllResources } from './lib/lemontreeApi';

// Iterate through all resources (handles pagination automatically)
for await (const resource of getAllResources({ location: '10001' })) {
  console.log(resource.name);
}
```

#### Helper Functions

```javascript
import { isOpenNow, getNextOccurrence } from './lib/lemontreeApi';

const resource = await getResource('clxyz123');

// Check if open right now
if (isOpenNow(resource)) {
  console.log('Open now!');
}

// Get next occurrence
const next = getNextOccurrence(resource);
console.log('Next open:', new Date(next.startTime));
```

### Options Reference

All `getResources()` options:

| Option | Type | Description |
|--------|------|-------------|
| `lat` | number | Latitude for distance-based results |
| `lng` | number | Longitude for distance-based results |
| `location` | string | Zip code (alternative to lat/lng) |
| `text` | string | Full-text search on resource name |
| `resourceTypeId` | string | "FOOD_PANTRY" or "SOUP_KITCHEN" |
| `tagId` | string | Filter by tag ID |
| `occurrencesWithin` | string | ISO 8601 interval |
| `region` | string | Region ID or comma-separated zip codes |
| `sort` | string | "distance", "referrals", "reviews", "confidence", "createdAt" |
| `take` | number | Results per page (default: 40) |
| `cursor` | string | Pagination cursor from previous response |

### Response Structure

```typescript
{
  count: number;              // Total matching resources
  cursor?: string;            // Pagination cursor (if more results)
  resources: Resource[];      // Array of resource objects
  location?: {                // Location info (if lat/lng or location provided)
    id: string;
    name: string;
    latitude: number;
    longitude: number;
  };
}
```

### Resource Object

See [lemontree_project.md](../../../lemontree_project.md) for full schema.

Key fields:
- `id`, `name`, `description`
- `addressStreet1`, `city`, `state`, `zipCode`
- `latitude`, `longitude`
- `resourceType` - { id: "FOOD_PANTRY" | "SOUP_KITCHEN" }
- `ratingAverage` - 1-5 star average
- `_count.reviews` - Number of reviews
- `occurrences` - Next 4 upcoming occurrences
- `images` - First image only
- `tags` - Resource tags

### Examples

See `lemontreeApi.test.js` for usage examples.

To run examples in browser console:
```javascript
import { runAllExamples } from './lib/lemontreeApi.test';
runAllExamples();
```

### Notes

- All endpoints are **public** (no authentication required)
- API uses **superjson** serialization (handled automatically)
- Date fields are deserialized to JavaScript `Date` objects
- CORS is enabled
- Rate limiting: Use responsibly, cache results when possible
