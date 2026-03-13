/**
 * LemonTree API Client - Usage Examples
 *
 * Run in browser console or as a test to verify API connection
 */

import {
  getResources,
  getResource,
  getResourcesByZipCode,
  searchResources,
  getFoodPantries,
  isOpenNow,
  getNextOccurrence,
  getAllResources
} from './lemontreeApi.js';

/**
 * Example 1: Get resources near a zip code
 */
export async function exampleGetNearby() {
  console.log('📍 Example: Get pantries near zip code 10001');

  const result = await getResourcesByZipCode('10001', 5);

  console.log(`Found ${result.count} total resources`);
  console.log(`Showing ${result.resources.length} resources`);
  console.log('First resource:', result.resources[0]?.name);

  return result;
}

/**
 * Example 2: Get a specific resource by ID
 */
export async function exampleGetSingle() {
  console.log('🏪 Example: Get single resource');

  // Use a resource ID from the first example
  const resources = await getResourcesByZipCode('10001', 1);
  const firstId = resources.resources[0]?.id;

  if (!firstId) {
    console.log('No resources found');
    return;
  }

  const resource = await getResource(firstId);

  console.log('Resource:', resource.name);
  console.log('Address:', resource.addressStreet1, resource.city);
  console.log('Rating:', resource.ratingAverage || 'N/A');
  console.log('Review count:', resource._count?.reviews || 0);
  console.log('Open now?', isOpenNow(resource));

  return resource;
}

/**
 * Example 3: Search for resources by name
 */
export async function exampleSearch() {
  console.log('🔍 Example: Search for "church"');

  const result = await searchResources('church', 5);

  console.log(`Found ${result.resources.length} results`);
  result.resources.forEach((r, i) => {
    console.log(`${i + 1}. ${r.name} - ${r.city}, ${r.state}`);
  });

  return result;
}

/**
 * Example 4: Get only food pantries (filter by type)
 */
export async function exampleFoodPantriesOnly() {
  console.log('🥫 Example: Get food pantries only');

  const result = await getFoodPantries({ location: '10001', take: 5 });

  console.log(`Found ${result.resources.length} food pantries`);
  result.resources.forEach(r => {
    console.log(`- ${r.name} (${r.resourceType.id})`);
  });

  return result;
}

/**
 * Example 5: Get next occurrence time
 */
export async function exampleNextOccurrence() {
  console.log('⏰ Example: Get next occurrence');

  const result = await getResourcesByZipCode('10001', 1);
  const resource = result.resources[0];

  if (!resource) {
    console.log('No resources found');
    return;
  }

  const nextOcc = getNextOccurrence(resource);

  console.log('Resource:', resource.name);
  if (nextOcc) {
    console.log('Next occurrence:', new Date(nextOcc.startTime).toLocaleString());
  } else {
    console.log('No upcoming occurrences');
  }

  return nextOcc;
}

/**
 * Example 6: Paginate through all resources in a region
 */
export async function examplePagination() {
  console.log('📄 Example: Paginate through resources');

  let count = 0;
  const maxResults = 10; // Limit for demo

  for await (const resource of getAllResources({ location: '10001' })) {
    count++;
    console.log(`${count}. ${resource.name}`);

    if (count >= maxResults) {
      console.log(`... (stopping at ${maxResults} for demo)`);
      break;
    }
  }

  return count;
}

/**
 * Run all examples
 */
export async function runAllExamples() {
  console.log('🚀 Running all LemonTree API examples\n');

  try {
    await exampleGetNearby();
    console.log('\n---\n');

    await exampleGetSingle();
    console.log('\n---\n');

    await exampleSearch();
    console.log('\n---\n');

    await exampleFoodPantriesOnly();
    console.log('\n---\n');

    await exampleNextOccurrence();
    console.log('\n---\n');

    await examplePagination();

    console.log('\n✅ All examples completed!');
  } catch (error) {
    console.error('❌ Error running examples:', error);
  }
}

// Uncomment to run automatically:
// runAllExamples();
