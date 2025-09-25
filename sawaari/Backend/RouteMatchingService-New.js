const routeMatchingManager = require("./RouteMatchingManager");

// Function to process a new search and find matches
async function processNewSearch(userId, searchData) {
  const { source, destination, searchRadius = 2 } = searchData;

  // Create a new search entry
  const searchId = ObjectId().toString();
  const search = {
    _id: searchId,
    userId,
    source,
    destination,
    searchRadius,
    matches: [],
    matchCount: 0,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes expiry
  };

  // Start tracking the search
  routeMatchingManager.trackSearch(searchId, userId, search);

  // Save the search to database
  await saveSearch(search);

  // Find initial matches
  const matches = await findInitialMatches(
    userId,
    source,
    destination,
    searchRadius
  );

  // Process and notify about matches
  for (const match of matches) {
    routeMatchingManager.emitNewMatch(searchId, userId, match);
  }

  return {
    success: true,
    searchId,
    matches,
    matchCount: matches.length,
    searchRadius,
    expiresAt: search.expiresAt,
  };
}

async function findInitialMatches(userId, source, destination, radius) {
  // Your existing match finding logic here
  const activeRoutes = await findActiveRoutes();
  const matches = [];

  for (const route of activeRoutes) {
    if (route.userId === userId) continue; // Skip user's own routes

    const overlap = calculateRouteOverlap(
      { source, destination },
      { source: route.source, destination: route.destination }
    );

    if (overlap.overlapPercentage >= 30) {
      // Min 30% overlap
      matches.push({
        userId: route.userId,
        userName: route.userName,
        source: route.source,
        destination: route.destination,
        overlapPercentage: overlap.overlapPercentage,
        sharedDistance: overlap.sharedDistance,
      });
    }
  }

  return matches;
}

// Export functions
module.exports = {
  processNewSearch,
  findInitialMatches,
  // ... other exports
};
