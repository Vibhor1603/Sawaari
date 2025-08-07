const { haversineDistance, calculateFare } = require("./routeService");
const { findRideBuddySearches } = require("./database");
const { rideBuddyCacheService } = require("./cacheService");
const { ObjectId } = require("mongodb");

/**
 * Enhanced RouteMatchingService - Functional approach for route matching and calculation
 * Implements algorithms for finding overlapping routes, calculating shared fares,
 * proximity-based user matching, and real-time bidirectional search matching
 */

// Configuration constants
const DEFAULT_CONFIG = {
  defaultRadius: 2, // 2km default radius
  minOverlapPercentage: 30, // 30% minimum overlap for meaningful matches
  maxResults: 50, // Maximum number of results to return
  searchExpiryMinutes: 5, // 5 minutes search expiry
};

/**
 * Convert route waypoints into directional steps
 * @param {Array} waypoints - Array of waypoint names
 * @returns {Array} - Array of directional steps (e.g., ["A-B", "B-C"])
 */
const convertToDirectionalSteps = (waypoints) => {
  if (!waypoints || waypoints.length < 2) {
    return [];
  }

  const steps = [];
  for (let i = 0; i < waypoints.length - 1; i++) {
    const step = `${waypoints[i]}-${waypoints[i + 1]}`;
    steps.push(step);
  }
  return steps;
};

/**
 * Calculate the overlap percentage between two routes using step-based directional logic
 * @param {Object} route1 - First route with source, destination, and waypoints
 * @param {Object} route2 - Second route with source, destination, and waypoints
 * @returns {Object} - Overlap details including percentage and shared distance
 */
const calculateRouteOverlap = (route1, route2) => {
  if (!route1 || !route2) {
    return { overlapPercentage: 0, sharedDistance: 0, commonSteps: [] };
  }

  // Generate cache key for route overlap calculation
  const cacheKey = generateOverlapCacheKey(route1, route2);

  // Check cache first
  const cached = rideBuddyCacheService.getRouteCalculation(cacheKey);
  if (cached) {
    return cached;
  }

  // Extract waypoints from routes - handle both route.waypoints and route.route.waypoints
  const waypoints1 =
    route1.waypoints && route1.waypoints.length > 0
      ? route1.waypoints
      : route1.route?.waypoints && route1.route.waypoints.length > 0
      ? route1.route.waypoints
      : [route1.source?.name, route1.destination?.name].filter(Boolean);
  const waypoints2 =
    route2.waypoints && route2.waypoints.length > 0
      ? route2.waypoints
      : route2.route?.waypoints && route2.route.waypoints.length > 0
      ? route2.route.waypoints
      : [route2.source?.name, route2.destination?.name].filter(Boolean);

  console.log(`🔍 Step-based route overlap calculation:`, {
    route1: {
      source: route1.source?.name,
      dest: route1.destination?.name,
      waypoints: waypoints1,
    },
    route2: {
      source: route2.source?.name,
      dest: route2.destination?.name,
      waypoints: waypoints2,
    },
  });

  if (!waypoints1.length || !waypoints2.length) {
    console.log(`❌ No waypoints found for routes`);
    const result = {
      overlapPercentage: 0,
      sharedDistance: 0,
      commonSteps: [],
    };
    rideBuddyCacheService.setRouteCalculation(cacheKey, result, 300000); // 5 minutes cache
    return result;
  }

  // Convert routes to directional steps
  const steps1 = convertToDirectionalSteps(waypoints1);
  const steps2 = convertToDirectionalSteps(waypoints2);

  console.log(`📊 Route steps:`, {
    route1Steps: steps1,
    route2Steps: steps2,
  });

  if (steps1.length === 0 || steps2.length === 0) {
    console.log(`❌ No steps found for routes`);
    const result = {
      overlapPercentage: 0,
      sharedDistance: 0,
      commonSteps: [],
    };
    rideBuddyCacheService.setRouteCalculation(cacheKey, result, 300000);
    return result;
  }

  // Find all unique steps from both routes
  const allSteps = new Set([...steps1, ...steps2]);
  const totalUniqueSteps = allSteps.size;

  // Find shared steps (steps that appear in both routes with same direction)
  const sharedSteps = steps1.filter((step) => steps2.includes(step));
  const sharedStepsCount = sharedSteps.length;

  // Method 1: Step-based overlap (original logic)
  const stepBasedOverlap =
    totalUniqueSteps > 0 ? (sharedStepsCount / totalUniqueSteps) * 100 : 0;

  // Method 2: Waypoint-based overlap (practical similarity with direction consideration)
  const commonWaypoints = waypoints1.filter((wp) => waypoints2.includes(wp));
  const totalUniqueWaypoints = new Set([...waypoints1, ...waypoints2]).size;
  let waypointBasedOverlap =
    totalUniqueWaypoints > 0
      ? (commonWaypoints.length / totalUniqueWaypoints) * 100
      : 0;

  // Reduce waypoint overlap if routes are in reverse direction
  if (
    commonWaypoints.length > 0 &&
    waypoints1.length >= 2 &&
    waypoints2.length >= 2
  ) {
    const isReverse =
      waypoints1[0] === waypoints2[waypoints2.length - 1] &&
      waypoints1[waypoints1.length - 1] === waypoints2[0];
    if (isReverse) {
      waypointBasedOverlap = waypointBasedOverlap * 0.1; // Heavily penalize reverse routes
    }
  }

  // Method 3: Sequential overlap (considers route order and direction)
  let sequentialOverlap = 0;
  const minLength = Math.min(waypoints1.length, waypoints2.length);
  let matchingFromStart = 0;

  // Count matching waypoints from start (same direction)
  for (let i = 0; i < minLength; i++) {
    if (waypoints1[i] === waypoints2[i]) {
      matchingFromStart++;
    } else {
      break;
    }
  }

  const maxLength = Math.max(waypoints1.length, waypoints2.length);
  sequentialOverlap = maxLength > 0 ? (matchingFromStart / maxLength) * 100 : 0;

  // Use the highest overlap percentage for better practical matching
  const overlapPercentage = Math.max(
    stepBasedOverlap,
    waypointBasedOverlap,
    sequentialOverlap
  );

  console.log(`📊 Multi-method overlap calculation:`, {
    stepBased: Math.round(stepBasedOverlap * 100) / 100,
    waypointBased: Math.round(waypointBasedOverlap * 100) / 100,
    sequential: Math.round(sequentialOverlap * 100) / 100,
    finalOverlap: Math.round(overlapPercentage * 100) / 100,
    sharedSteps,
    commonWaypoints,
    calculation: `Best of: ${Math.round(
      stepBasedOverlap
    )}% (steps), ${Math.round(waypointBasedOverlap)}% (waypoints), ${Math.round(
      sequentialOverlap
    )}% (sequential)`,
  });

  // Calculate shared distance based on route distances and overlap
  const route1Distance = route1.distance || 0;
  const route2Distance = route2.distance || 0;
  const avgDistance = (route1Distance + route2Distance) / 2;
  const sharedDistance = (overlapPercentage / 100) * avgDistance;

  const result = {
    overlapPercentage: Math.round(overlapPercentage * 100) / 100, // Round to 2 decimal places
    sharedDistance: Math.round(sharedDistance * 100) / 100,
    commonSteps: sharedSteps,
    totalSteps1: steps1.length,
    totalSteps2: steps2.length,
    totalUniqueSteps,
    sharedStepsCount,
    // Keep backward compatibility and add new data
    commonWaypoints: commonWaypoints, // Actual common waypoints
    sharedStepsForBackwardCompatibility: sharedSteps, // For backward compatibility
    totalCommonWaypoints: sharedStepsCount,
    route1Waypoints: waypoints1.length,
    route2Waypoints: waypoints2.length,
  };

  // Cache the result for 30 minutes (route calculations are relatively stable)
  rideBuddyCacheService.setRouteCalculation(cacheKey, result, 1800000);

  console.log(`✅ Final step-based overlap result:`, {
    overlapPercentage: result.overlapPercentage,
    sharedSteps: result.commonSteps,
    calculation: `${sharedStepsCount}/${totalUniqueSteps} = ${result.overlapPercentage}%`,
  });

  return result;
};

/**
 * Find common waypoints between two route waypoint arrays
 * Considers sequence and proximity of waypoints
 * @param {Array} waypoints1 - First route waypoints
 * @param {Array} waypoints2 - Second route waypoints
 * @returns {Array} - Array of common waypoints
 */
const findCommonWaypoints = (waypoints1, waypoints2) => {
  const commonWaypoints = [];
  const used2 = new Set();

  for (let i = 0; i < waypoints1.length; i++) {
    const wp1 = waypoints1[i];
    for (let j = 0; j < waypoints2.length; j++) {
      if (used2.has(j)) continue;

      const wp2 = waypoints2[j];

      // Exact match
      if (wp1 === wp2) {
        commonWaypoints.push(wp1);
        used2.add(j);
        break;
      }

      // Fuzzy match for similar location names
      if (isSimilarLocation(wp1, wp2)) {
        commonWaypoints.push(wp1);
        used2.add(j);
        break;
      }
    }
  }

  return commonWaypoints;
};

/**
 * Check if two location names are similar (fuzzy matching)
 * @param {String} loc1 - First location name
 * @param {String} loc2 - Second location name
 * @returns {Boolean} - True if locations are similar
 */
const isSimilarLocation = (loc1, loc2) => {
  if (!loc1 || !loc2) return false;

  const normalize = (str) =>
    str
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, "");

  const norm1 = normalize(loc1);
  const norm2 = normalize(loc2);

  // Check if one is contained in the other
  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    return true;
  }

  // Check Levenshtein distance for typos
  const distance = levenshteinDistance(norm1, norm2);
  const maxLength = Math.max(norm1.length, norm2.length);
  const similarity = 1 - distance / maxLength;

  return similarity >= 0.8; // 80% similarity threshold
};

/**
 * Calculate Levenshtein distance between two strings
 * @param {String} str1 - First string
 * @param {String} str2 - Second string
 * @returns {Number} - Levenshtein distance
 */
const levenshteinDistance = (str1, str2) => {
  const matrix = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
};

/**
 * Find users within a specified radius of given coordinates or by location name
 * @param {Object} centerLocation - Location with coordinates {latitude, longitude} or name
 * @param {Number} radiusKm - Search radius in kilometers
 * @param {String} excludeUserId - User ID to exclude from results
 * @returns {Array} - Array of nearby user searches
 */
const findNearbyUsers = async (
  centerLocation,
  radiusKm = null,
  excludeUserId = null
) => {
  const searchRadius = radiusKm || DEFAULT_CONFIG.defaultRadius;

  try {
    // Get all active ride buddy searches
    const allSearches = await findRideBuddySearches({
      status: "active",
      expiresAt: { $gt: new Date() },
    });

    // Filter searches
    const nearbyUsers = allSearches.filter((search) => {
      // Exclude the current user
      if (
        excludeUserId &&
        search.userId.toString() === excludeUserId.toString()
      ) {
        return false;
      }

      // If we have coordinates, use distance-based filtering
      if (
        centerLocation &&
        centerLocation.latitude &&
        centerLocation.longitude &&
        search.source?.coordinates &&
        search.destination?.coordinates
      ) {
        const sourceDistance = calculateDistance(
          centerLocation,
          search.source.coordinates
        );
        const destinationDistance = calculateDistance(
          centerLocation,
          search.destination.coordinates
        );

        return (
          sourceDistance <= searchRadius || destinationDistance <= searchRadius
        );
      }

      // Fallback to name-based matching when coordinates are not available
      // For now, include all users and let the overlap calculation handle filtering
      console.log(
        `📍 No coordinates available for ${search.userName}, using name-based matching`
      );
      return true; // Include all users for name-based matching
    });

    console.log(`🔍 After filtering: ${nearbyUsers.length} nearby users found`);

    // Sort by proximity if coordinates are available, otherwise keep original order
    if (centerLocation && centerLocation.latitude && centerLocation.longitude) {
      nearbyUsers.sort((a, b) => {
        const distanceA = Math.min(
          calculateDistance(centerLocation, a.source?.coordinates),
          calculateDistance(centerLocation, a.destination?.coordinates)
        );
        const distanceB = Math.min(
          calculateDistance(centerLocation, b.source?.coordinates),
          calculateDistance(centerLocation, b.destination?.coordinates)
        );
        return distanceA - distanceB;
      });
    }

    return nearbyUsers.slice(0, DEFAULT_CONFIG.maxResults);
  } catch (error) {
    console.error("Error finding nearby users:", error);
    throw new Error("Failed to find nearby users");
  }
};

/**
 * Calculate distance between two coordinate points
 * @param {Object} point1 - First point with latitude and longitude
 * @param {Array|Object} point2 - Second point as [lng, lat] array or {latitude, longitude} object
 * @returns {Number} - Distance in kilometers
 */
const calculateDistance = (point1, point2) => {
  if (!point1 || !point2) return Infinity;

  let lat2, lng2;

  // Handle different coordinate formats
  if (Array.isArray(point2)) {
    // GeoJSON format [longitude, latitude]
    lng2 = point2[0];
    lat2 = point2[1];
  } else if (point2.latitude && point2.longitude) {
    // Object format {latitude, longitude}
    lat2 = point2.latitude;
    lng2 = point2.longitude;
  } else {
    return Infinity;
  }

  return haversineDistance(point1.latitude, point1.longitude, lat2, lng2);
};

/**
 * Calculate shared fare based on route overlap percentage
 * @param {Object} route1 - First route with fare information
 * @param {Object} route2 - Second route with fare information
 * @param {Number} overlapPercentage - Percentage of route overlap
 * @returns {Object} - Shared fare calculation details
 */
const calculateSharedFare = (route1, route2, overlapPercentage) => {
  if (!route1 || !route2 || overlapPercentage <= 0) {
    return {
      sharedFare: 0,
      savings1: 0,
      savings2: 0,
      originalFare1: route1?.estimatedFare || 0,
      originalFare2: route2?.estimatedFare || 0,
    };
  }

  const originalFare1 = route1.estimatedFare || 0;
  const originalFare2 = route2.estimatedFare || 0;

  // Calculate shared portion fare
  const sharedPortionFare1 = (originalFare1 * overlapPercentage) / 100;
  const sharedPortionFare2 = (originalFare2 * overlapPercentage) / 100;

  // Average the shared portion and split it
  const avgSharedFare = (sharedPortionFare1 + sharedPortionFare2) / 2;
  const sharedFarePerPerson = avgSharedFare / 2;

  // Calculate individual costs after sharing
  const nonSharedFare1 = originalFare1 - sharedPortionFare1;
  const nonSharedFare2 = originalFare2 - sharedPortionFare2;

  const totalCost1 = nonSharedFare1 + sharedFarePerPerson;
  const totalCost2 = nonSharedFare2 + sharedFarePerPerson;

  // Calculate savings
  const savings1 = originalFare1 - totalCost1;
  const savings2 = originalFare2 - totalCost2;

  return {
    sharedFare: Math.round(sharedFarePerPerson * 100) / 100,
    totalCost1: Math.round(totalCost1 * 100) / 100,
    totalCost2: Math.round(totalCost2 * 100) / 100,
    savings1: Math.round(savings1 * 100) / 100,
    savings2: Math.round(savings2 * 100) / 100,
    originalFare1,
    originalFare2,
    overlapPercentage,
    sharedDistance:
      route1.distance && route2.distance
        ? ((route1.distance + route2.distance) / 2) * (overlapPercentage / 100)
        : 0,
  };
};

/**
 * Find potential matches for a given route with caching and bidirectional search
 * @param {Object} userRoute - User's route information
 * @param {Object} options - Search options (radius, minOverlap, etc.)
 * @returns {Array} - Array of potential matches with overlap and fare details
 */
const findPotentialMatches = async (userRoute, options = {}) => {
  const searchRadius = options.radius || DEFAULT_CONFIG.defaultRadius;
  const minOverlap =
    options.minOverlapPercentage || DEFAULT_CONFIG.minOverlapPercentage;

  if (!userRoute || !userRoute.source || !userRoute.destination) {
    throw new Error("User route with source and destination is required");
  }

  try {
    // Find active searches instead of all searches for real-time bidirectional matching
    const activeSearches = await findRideBuddySearches({
      status: "active",
      expiresAt: { $gt: new Date() },
      userId: { $ne: new ObjectId(userRoute.userId) },
    });

    console.log(
      `🔍 Found ${activeSearches.length} active searches for bidirectional matching`
    );

    const potentialMatches = [];

    for (const search of activeSearches) {
      const overlapResult = calculateRouteOverlap(userRoute, search);

      // Only include matches with sufficient overlap
      if (overlapResult.overlapPercentage >= minOverlap) {
        const fareResult = calculateSharedFare(
          userRoute,
          search,
          overlapResult.overlapPercentage
        );

        potentialMatches.push({
          userId: search.userId,
          userEmail: search.userEmail,
          userName: search.userName,
          route: {
            source: search.source,
            destination: search.destination,
            distance: search.route?.distance || 0,
            estimatedFare: search.route?.estimatedFare || 0,
          },
          overlap: overlapResult,
          fareSharing: fareResult,
          proximity: {
            sourceDistance: calculateDistance(
              userRoute.source.coordinates
                ? {
                    latitude: userRoute.source.coordinates[1],
                    longitude: userRoute.source.coordinates[0],
                  }
                : userRoute.source,
              search.source?.coordinates
            ),
            destinationDistance: calculateDistance(
              userRoute.destination.coordinates
                ? {
                    latitude: userRoute.destination.coordinates[1],
                    longitude: userRoute.destination.coordinates[0],
                  }
                : userRoute.destination,
              search.destination?.coordinates
            ),
          },
          searchTimestamp: search.createdAt,
          lastActive: search.lastActive,
          searchId: search._id,
        });
      }
    }

    // Sort matches by overlap percentage (highest first), then by proximity
    potentialMatches.sort((a, b) => {
      if (b.overlap.overlapPercentage !== a.overlap.overlapPercentage) {
        return b.overlap.overlapPercentage - a.overlap.overlapPercentage;
      }

      // If overlap is same, sort by proximity
      const proximityA = Math.min(
        a.proximity.sourceDistance,
        a.proximity.destinationDistance
      );
      const proximityB = Math.min(
        b.proximity.sourceDistance,
        b.proximity.destinationDistance
      );
      return proximityA - proximityB;
    });

    console.log(
      `✅ Found ${potentialMatches.length} potential matches with bidirectional search`
    );
    return potentialMatches;
  } catch (error) {
    console.error("Error finding potential matches:", error);
    throw new Error("Failed to find potential matches");
  }
};

/**
 * Rank matches based on various criteria
 * @param {Array} matches - Array of potential matches
 * @param {Object} preferences - User preferences for ranking
 * @returns {Array} - Ranked array of matches
 */
const rankMatches = (matches, preferences = {}) => {
  if (!matches || !matches.length) return [];

  const weights = {
    overlapPercentage: preferences.overlapWeight || 0.4,
    savings: preferences.savingsWeight || 0.3,
    proximity: preferences.proximityWeight || 0.2,
    recency: preferences.recencyWeight || 0.1,
  };

  // Calculate composite score for each match
  const rankedMatches = matches.map((match) => {
    const overlapScore = match.overlap.overlapPercentage / 100;
    const savingsScore = Math.min(match.fareSharing.savings1 / 100, 1); // Normalize to 0-1
    const minProximity = Math.min(
      match.proximity.sourceDistance,
      match.proximity.destinationDistance
    );
    const proximityScore = Math.max(0, 1 - minProximity / 10); // 10km max distance

    const hoursSinceSearch =
      (new Date() - new Date(match.searchTimestamp)) / (1000 * 60 * 60);
    const recencyScore = Math.max(0, 1 - hoursSinceSearch / 24); // 24 hours max

    const compositeScore =
      overlapScore * weights.overlapPercentage +
      savingsScore * weights.savings +
      proximityScore * weights.proximity +
      recencyScore * weights.recency;

    return {
      ...match,
      ranking: {
        compositeScore: Math.round(compositeScore * 1000) / 1000,
        overlapScore,
        savingsScore,
        proximityScore,
        recencyScore,
      },
    };
  });

  // Sort by composite score (highest first)
  rankedMatches.sort(
    (a, b) => b.ranking.compositeScore - a.ranking.compositeScore
  );

  return rankedMatches;
};

/**
 * Find all active searches that match the given route (for real-time bidirectional matching)
 * @param {Object} userRoute - User's route information
 * @param {String} excludeUserId - User ID to exclude from results
 * @returns {Array} - Array of matching active searches
 */
const findActiveMatches = async (userRoute, excludeUserId) => {
  try {
    // First, let's see ALL active searches in the database
    const allActiveSearches = await findRideBuddySearches({
      status: "active",
      expiresAt: { $gt: new Date() },
    });

    console.log(
      `🔍 TOTAL active searches in database: ${allActiveSearches.length}`
    );
    allActiveSearches.forEach((search, index) => {
      console.log(`🔍 All search ${index + 1}:`, {
        userName: search.userName,
        userId: search.userId.toString(),
        source: search.source?.name,
        dest: search.destination?.name,
        isCurrentUser: search.userId.toString() === excludeUserId,
        expiresAt: search.expiresAt,
      });
    });

    // Get all active searches excluding the current user
    const activeSearches = await findRideBuddySearches({
      status: "active",
      expiresAt: { $gt: new Date() },
      userId: { $ne: new ObjectId(excludeUserId) },
    });

    console.log(
      `🔍 Found ${activeSearches.length} active searches to check for matches (excluding current user)`
    );
    console.log(`🔍 User route:`, {
      source: userRoute.source?.name,
      dest: userRoute.destination?.name,
      userId: excludeUserId,
    });

    // Log all active searches for debugging
    activeSearches.forEach((search, index) => {
      console.log(`🔍 Active search ${index + 1}:`, {
        userName: search.userName,
        source: search.source?.name,
        dest: search.destination?.name,
        userId: search.userId.toString(),
        expiresAt: search.expiresAt,
      });
    });

    const matches = [];

    for (const search of activeSearches) {
      console.log(`🔍 Checking search from user ${search.userName}:`, {
        source: search.source?.name,
        dest: search.destination?.name,
      });

      const overlapResult = calculateRouteOverlap(userRoute, search);
      console.log(`📊 Overlap result for ${search.userName}:`, {
        overlapPercentage: overlapResult.overlapPercentage,
        minRequired: DEFAULT_CONFIG.minOverlapPercentage,
        willMatch:
          overlapResult.overlapPercentage >=
          DEFAULT_CONFIG.minOverlapPercentage,
      });

      if (
        overlapResult.overlapPercentage >= DEFAULT_CONFIG.minOverlapPercentage
      ) {
        console.log(
          `✅ Match found with ${search.userName} (${overlapResult.overlapPercentage}% overlap)`
        );

        const fareResult = calculateSharedFare(
          userRoute,
          search,
          overlapResult.overlapPercentage
        );

        matches.push({
          userId: search.userId,
          userEmail: search.userEmail,
          userName: search.userName,
          userPhone: search.userPhone,
          route: {
            source: search.source,
            destination: search.destination,
            distance: search.route?.distance || 0,
            estimatedFare: search.route?.estimatedFare || 0,
          },
          overlap: overlapResult,
          fareSharing: fareResult,
          proximity: {
            sourceDistance: calculateDistance(
              userRoute.source.coordinates
                ? {
                    latitude: userRoute.source.coordinates[1],
                    longitude: userRoute.source.coordinates[0],
                  }
                : userRoute.source,
              search.source?.coordinates
            ),
            destinationDistance: calculateDistance(
              userRoute.destination.coordinates
                ? {
                    latitude: userRoute.destination.coordinates[1],
                    longitude: userRoute.destination.coordinates[0],
                  }
                : userRoute.destination,
              search.destination?.coordinates
            ),
          },
          searchTimestamp: search.createdAt,
          lastActive: search.lastActive,
          searchId: search._id,
        });
      } else {
        console.log(
          `❌ No match with ${search.userName} (${overlapResult.overlapPercentage}% < ${DEFAULT_CONFIG.minOverlapPercentage}%)`
        );
      }
    }

    console.log(`✅ Found ${matches.length} matching active searches`);
    return rankMatches(matches);
  } catch (error) {
    console.error("Error finding active matches:", error);
    throw new Error("Failed to find active matches");
  }
};

/**
 * Notify existing searchers about a new potential match
 * @param {Object} newUserRoute - New user's route information
 * @param {Object} socketService - Socket service for real-time notifications
 */
const notifyExistingSearchers = async (newUserRoute, socketService) => {
  try {
    const potentialMatches = await findActiveMatches(
      newUserRoute,
      newUserRoute.userId
    );

    console.log(
      `📡 Notifying ${potentialMatches.length} existing searchers about new match`
    );

    for (const match of potentialMatches) {
      try {
        await socketService.notifyNewPotentialMatch(match.userId.toString(), {
          newMatch: {
            userId: newUserRoute.userId,
            userName: newUserRoute.userName,
            userEmail: newUserRoute.userEmail,
            route: {
              source: newUserRoute.source,
              destination: newUserRoute.destination,
              distance: newUserRoute.route?.distance || 0,
              estimatedFare: newUserRoute.route?.estimatedFare || 0,
            },
            overlap: match.overlap,
            fareSharing: match.fareSharing,
            searchTimestamp: new Date().toISOString(),
          },
        });

        console.log(
          `✅ Notified user ${match.userId} about new potential match`
        );
      } catch (notifyError) {
        console.error(`❌ Failed to notify user ${match.userId}:`, notifyError);
        // Continue with other notifications even if one fails
      }
    }
  } catch (error) {
    console.error("Error notifying existing searchers:", error);
    // Don't throw error, just log it as this is a background operation
  }
};

/**
 * Get configuration settings
 * @returns {Object} - Current configuration
 */
const getConfig = () => {
  return {
    defaultRadius: DEFAULT_CONFIG.defaultRadius,
    minOverlapPercentage: DEFAULT_CONFIG.minOverlapPercentage,
    maxResults: DEFAULT_CONFIG.maxResults,
    searchExpiryMinutes: DEFAULT_CONFIG.searchExpiryMinutes,
  };
};

/**
 * Update configuration settings
 * @param {Object} newConfig - New configuration settings
 */
const updateConfig = (newConfig) => {
  if (newConfig.defaultRadius !== undefined) {
    DEFAULT_CONFIG.defaultRadius = Math.max(
      1,
      Math.min(50, newConfig.defaultRadius)
    ); // 1-50km range
  }

  if (newConfig.minOverlapPercentage !== undefined) {
    DEFAULT_CONFIG.minOverlapPercentage = Math.max(
      0,
      Math.min(100, newConfig.minOverlapPercentage)
    );
  }

  if (newConfig.maxResults !== undefined) {
    DEFAULT_CONFIG.maxResults = Math.max(
      1,
      Math.min(100, newConfig.maxResults)
    );
  }
};

/**
 * Generate cache key for route overlap calculation
 * @param {Object} route1 - First route
 * @param {Object} route2 - Second route
 * @returns {String} - Cache key
 */
const generateOverlapCacheKey = (route1, route2) => {
  const key1 = `${route1.source?.name || "unknown"}-${
    route1.destination?.name || "unknown"
  }`;
  const key2 = `${route2.source?.name || "unknown"}-${
    route2.destination?.name || "unknown"
  }`;

  // Sort keys to ensure consistent caching regardless of route order
  const sortedKeys = [key1, key2].sort();
  return `overlap:${sortedKeys[0]}:${sortedKeys[1]}`;
};

// Export all functions
module.exports = {
  calculateRouteOverlap,
  convertToDirectionalSteps,
  findCommonWaypoints,
  isSimilarLocation,
  levenshteinDistance,
  findNearbyUsers,
  calculateDistance,
  calculateSharedFare,
  findPotentialMatches,
  rankMatches,
  findActiveMatches,
  notifyExistingSearchers,
  getConfig,
  updateConfig,
  generateOverlapCacheKey,
  DEFAULT_CONFIG,
};
