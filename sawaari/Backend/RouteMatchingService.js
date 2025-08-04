const { haversineDistance, calculateFare } = require("./routeService");
const { findRideBuddySearches } = require("./database");
const { rideBuddyCacheService } = require("./cacheService");

/**
 * RouteMatchingService - Handles route matching and calculation for ride buddy system
 * Implements algorithms for finding overlapping routes, calculating shared fares,
 * and proximity-based user matching
 */
class RouteMatchingService {
  constructor(options = {}) {
    this.defaultRadius = options.defaultRadius || 2; // 2km default radius
    this.minOverlapPercentage = options.minOverlapPercentage || 25; // 25% minimum overlap
    this.maxResults = options.maxResults || 50; // Maximum number of results to return
  }

  /**
   * Calculate the overlap percentage between two routes with caching
   * @param {Object} route1 - First route with source, destination, and waypoints
   * @param {Object} route2 - Second route with source, destination, and waypoints
   * @returns {Object} - Overlap details including percentage and shared distance
   */
  calculateRouteOverlap(route1, route2) {
    if (!route1 || !route2) {
      return { overlapPercentage: 0, sharedDistance: 0, commonWaypoints: [] };
    }

    // Generate cache key for route overlap calculation
    const cacheKey = this._generateOverlapCacheKey(route1, route2);

    // Check cache first
    const cached = rideBuddyCacheService.getRouteCalculation(cacheKey);
    if (cached) {
      return cached;
    }

    // Extract waypoints from routes
    const waypoints1 =
      route1.waypoints ||
      [route1.source?.name, route1.destination?.name].filter(Boolean);
    const waypoints2 =
      route2.waypoints ||
      [route2.source?.name, route2.destination?.name].filter(Boolean);

    if (!waypoints1.length || !waypoints2.length) {
      const result = {
        overlapPercentage: 0,
        sharedDistance: 0,
        commonWaypoints: [],
      };
      rideBuddyCacheService.setRouteCalculation(cacheKey, result, 300000); // 5 minutes cache
      return result;
    }

    // Find common waypoints in sequence
    const commonWaypoints = this._findCommonWaypoints(waypoints1, waypoints2);

    // Calculate overlap percentage based on common waypoints
    const maxWaypoints = Math.max(waypoints1.length, waypoints2.length);
    let overlapPercentage =
      maxWaypoints > 0 ? (commonWaypoints.length / maxWaypoints) * 100 : 0;

    // Special handling for simple source-destination routes (2 waypoints each)
    if (waypoints1.length === 2 && waypoints2.length === 2) {
      // Check for exact route match (same source and destination in same order)
      if (waypoints1[0] === waypoints2[0] && waypoints1[1] === waypoints2[1]) {
        overlapPercentage = 100;
      }
      // Check for partial matches (same source or destination in same direction)
      else if (waypoints1[0] === waypoints2[0]) {
        // Same source, check if destinations are similar/nearby
        overlapPercentage = 60; // 60% overlap for same source
      } else if (waypoints1[1] === waypoints2[1]) {
        // Same destination, check if sources are similar/nearby
        overlapPercentage = 60; // 60% overlap for same destination
      }
      // No reverse or cross matching - only same direction routes
    }

    // Calculate shared distance based on route distances and overlap
    const route1Distance = route1.distance || 0;
    const route2Distance = route2.distance || 0;
    const avgDistance = (route1Distance + route2Distance) / 2;
    const sharedDistance = (overlapPercentage / 100) * avgDistance;

    const result = {
      overlapPercentage: Math.round(overlapPercentage * 100) / 100, // Round to 2 decimal places
      sharedDistance: Math.round(sharedDistance * 100) / 100,
      commonWaypoints,
      totalCommonWaypoints: commonWaypoints.length,
      route1Waypoints: waypoints1.length,
      route2Waypoints: waypoints2.length,
    };

    // Cache the result for 30 minutes (route calculations are relatively stable)
    rideBuddyCacheService.setRouteCalculation(cacheKey, result, 1800000);

    return result;
  }

  /**
   * Find common waypoints between two route waypoint arrays
   * Considers sequence and proximity of waypoints
   * @param {Array} waypoints1 - First route waypoints
   * @param {Array} waypoints2 - Second route waypoints
   * @returns {Array} - Array of common waypoints
   */
  _findCommonWaypoints(waypoints1, waypoints2) {
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
        if (this._isSimilarLocation(wp1, wp2)) {
          commonWaypoints.push(wp1);
          used2.add(j);
          break;
        }
      }
    }

    return commonWaypoints;
  }

  /**
   * Check if two location names are similar (fuzzy matching)
   * @param {String} loc1 - First location name
   * @param {String} loc2 - Second location name
   * @returns {Boolean} - True if locations are similar
   */
  _isSimilarLocation(loc1, loc2) {
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
    const distance = this._levenshteinDistance(norm1, norm2);
    const maxLength = Math.max(norm1.length, norm2.length);
    const similarity = 1 - distance / maxLength;

    return similarity >= 0.8; // 80% similarity threshold
  }

  /**
   * Calculate Levenshtein distance between two strings
   * @param {String} str1 - First string
   * @param {String} str2 - Second string
   * @returns {Number} - Levenshtein distance
   */
  _levenshteinDistance(str1, str2) {
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
  }

  /**
   * Find users within a specified radius of given coordinates or by location name
   * @param {Object} centerLocation - Location with coordinates {latitude, longitude} or name
   * @param {Number} radiusKm - Search radius in kilometers
   * @param {String} excludeUserId - User ID to exclude from results
   * @returns {Array} - Array of nearby user searches
   */
  async findNearbyUsers(centerLocation, radiusKm = null, excludeUserId = null) {
    const searchRadius = radiusKm || this.defaultRadius;

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
          const sourceDistance = this._calculateDistance(
            centerLocation,
            search.source.coordinates
          );

          const destinationDistance = this._calculateDistance(
            centerLocation,
            search.destination.coordinates
          );

          return (
            sourceDistance <= searchRadius ||
            destinationDistance <= searchRadius
          );
        }

        // Fallback to name-based matching when coordinates are not available
        // For now, include all users and let the overlap calculation handle filtering
        console.log(
          `📍 No coordinates available for ${search.userName}, using name-based matching`
        );
        return true; // Include all users for name-based matching
      });

      console.log(
        `🔍 After filtering: ${nearbyUsers.length} nearby users found`
      );

      // Sort by proximity if coordinates are available, otherwise keep original order
      if (
        centerLocation &&
        centerLocation.latitude &&
        centerLocation.longitude
      ) {
        nearbyUsers.sort((a, b) => {
          const distanceA = Math.min(
            this._calculateDistance(centerLocation, a.source?.coordinates),
            this._calculateDistance(centerLocation, a.destination?.coordinates)
          );

          const distanceB = Math.min(
            this._calculateDistance(centerLocation, b.source?.coordinates),
            this._calculateDistance(centerLocation, b.destination?.coordinates)
          );

          return distanceA - distanceB;
        });
      }

      return nearbyUsers.slice(0, this.maxResults);
    } catch (error) {
      console.error("Error finding nearby users:", error);
      throw new Error("Failed to find nearby users");
    }
  }

  /**
   * Calculate distance between two coordinate points
   * @param {Object} point1 - First point with latitude and longitude
   * @param {Array|Object} point2 - Second point as [lng, lat] array or {latitude, longitude} object
   * @returns {Number} - Distance in kilometers
   */
  _calculateDistance(point1, point2) {
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
  }

  /**
   * Calculate shared fare based on route overlap percentage
   * @param {Object} route1 - First route with fare information
   * @param {Object} route2 - Second route with fare information
   * @param {Number} overlapPercentage - Percentage of route overlap
   * @returns {Object} - Shared fare calculation details
   */
  calculateSharedFare(route1, route2, overlapPercentage) {
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
          ? ((route1.distance + route2.distance) / 2) *
            (overlapPercentage / 100)
          : 0,
    };
  }

  /**
   * Find potential matches for a given route with caching
   * @param {Object} userRoute - User's route information
   * @param {Object} options - Search options (radius, minOverlap, etc.)
   * @returns {Array} - Array of potential matches with overlap and fare details
   */
  async findPotentialMatches(userRoute, options = {}) {
    const searchRadius = options.radius || this.defaultRadius;
    const minOverlap =
      options.minOverlapPercentage || this.minOverlapPercentage;

    if (!userRoute || !userRoute.source || !userRoute.destination) {
      throw new Error("User route with source and destination is required");
    }

    // Generate cache key for this search
    const searchKey = rideBuddyCacheService.generateSearchKey(
      userRoute.source.name,
      userRoute.destination.name,
      userRoute.userId
    );

    // Check cache first (short TTL for dynamic matching)
    const cached = rideBuddyCacheService.getSearchResults(searchKey);
    if (cached) {
      return cached;
    }

    try {
      // Find nearby users based on source location
      // Pass null as centerLocation to trigger name-based matching when coordinates are not available
      const centerLocation = userRoute.source.coordinates
        ? {
            latitude: userRoute.source.coordinates[1],
            longitude: userRoute.source.coordinates[0],
          }
        : null;

      const nearbyUsers = await this.findNearbyUsers(
        centerLocation,
        searchRadius,
        userRoute.userId
      );

      // Calculate overlap and fare sharing for each nearby user
      const potentialMatches = [];

      console.log(
        `🔍 Processing ${nearbyUsers.length} nearby users for overlap calculation`
      );

      for (const nearbyUser of nearbyUsers) {
        const overlapResult = this.calculateRouteOverlap(userRoute, nearbyUser);

        // Only include matches with sufficient overlap
        if (overlapResult.overlapPercentage >= minOverlap) {
          const fareResult = this.calculateSharedFare(
            userRoute,
            nearbyUser,
            overlapResult.overlapPercentage
          );

          potentialMatches.push({
            userId: nearbyUser.userId,
            userEmail: nearbyUser.userEmail,
            userName: nearbyUser.userName,
            route: {
              source: nearbyUser.source,
              destination: nearbyUser.destination,
              distance: nearbyUser.route?.distance || 0,
              estimatedFare: nearbyUser.route?.estimatedFare || 0,
            },
            overlap: overlapResult,
            fareSharing: fareResult,
            proximity: {
              sourceDistance: this._calculateDistance(
                userRoute.source.coordinates
                  ? {
                      latitude: userRoute.source.coordinates[1],
                      longitude: userRoute.source.coordinates[0],
                    }
                  : userRoute.source,
                nearbyUser.source?.coordinates
              ),
              destinationDistance: this._calculateDistance(
                userRoute.destination.coordinates
                  ? {
                      latitude: userRoute.destination.coordinates[1],
                      longitude: userRoute.destination.coordinates[0],
                    }
                  : userRoute.destination,
                nearbyUser.destination?.coordinates
              ),
            },
            searchTimestamp: nearbyUser.createdAt,
            lastActive: nearbyUser.lastActive,
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

      // Cache results for 1 minute (dynamic data, short cache)
      rideBuddyCacheService.setSearchResults(
        searchKey,
        potentialMatches,
        60000
      );

      return potentialMatches;
    } catch (error) {
      console.error("Error finding potential matches:", error);
      throw new Error("Failed to find potential matches");
    }
  }

  /**
   * Rank matches based on various criteria
   * @param {Array} matches - Array of potential matches
   * @param {Object} preferences - User preferences for ranking
   * @returns {Array} - Ranked array of matches
   */
  rankMatches(matches, preferences = {}) {
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
  }

  /**
   * Get configuration settings
   * @returns {Object} - Current configuration
   */
  getConfig() {
    return {
      defaultRadius: this.defaultRadius,
      minOverlapPercentage: this.minOverlapPercentage,
      maxResults: this.maxResults,
    };
  }

  /**
   * Update configuration settings
   * @param {Object} newConfig - New configuration settings
   */
  updateConfig(newConfig) {
    if (newConfig.defaultRadius !== undefined) {
      this.defaultRadius = Math.max(1, Math.min(50, newConfig.defaultRadius)); // 1-50km range
    }
    if (newConfig.minOverlapPercentage !== undefined) {
      this.minOverlapPercentage = Math.max(
        0,
        Math.min(100, newConfig.minOverlapPercentage)
      );
    }
    if (newConfig.maxResults !== undefined) {
      this.maxResults = Math.max(1, Math.min(100, newConfig.maxResults));
    }
  }

  /**
   * Generate cache key for route overlap calculation
   * @param {Object} route1 - First route
   * @param {Object} route2 - Second route
   * @returns {String} - Cache key
   */
  _generateOverlapCacheKey(route1, route2) {
    const key1 = `${route1.source?.name || "unknown"}-${
      route1.destination?.name || "unknown"
    }`;
    const key2 = `${route2.source?.name || "unknown"}-${
      route2.destination?.name || "unknown"
    }`;

    // Sort keys to ensure consistent caching regardless of route order
    const sortedKeys = [key1, key2].sort();
    return `overlap:${sortedKeys[0]}:${sortedKeys[1]}`;
  }
}

module.exports = RouteMatchingService;
