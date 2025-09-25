/* eslint-disable no-unused-vars */
// Frontend service for geolocation-based hotspot loading
class GeoHotspotService {
  constructor() {
    this.baseURL = import.meta.env.VITE_API_BASE_URL;
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes cache for more responsive updates
    this.pendingRequests = new Map(); // Track pending requests to prevent duplicates
  }

  // Generate cache key for bounds (reduced precision for better cache hits)
  generateBoundsKey(bounds, zoom) {
    const { north, south, east, west } = bounds;
    return `bounds_${north.toFixed(3)}_${south.toFixed(3)}_${east.toFixed(
      3
    )}_${west.toFixed(3)}_${zoom}`;
  }

  // Generate cache key for location
  generateLocationKey(latitude, longitude, radius) {
    return `location_${latitude.toFixed(4)}_${longitude.toFixed(4)}_${radius}`;
  }

  // Check if cache entry is valid
  isCacheValid(cacheEntry) {
    return cacheEntry && Date.now() - cacheEntry.timestamp < this.cacheTimeout;
  }

  // Get hotspots within map bounds (for viewport-based loading)
  async getHotspotsInBounds(bounds, zoom = 10) {
    try {
      const cacheKey = this.generateBoundsKey(bounds, zoom);
      const cachedData = this.cache.get(cacheKey);

      // Return cached data if valid
      if (this.isCacheValid(cachedData)) {
        return {
          ...cachedData.data,
          cached: true,
        };
      }

      // Check if there's already a pending request for this key
      if (this.pendingRequests.has(cacheKey)) {
        return await this.pendingRequests.get(cacheKey);
      }

      // Create the request promise and store it
      const requestPromise = this._fetchHotspotsBounds(bounds, zoom, cacheKey);
      this.pendingRequests.set(cacheKey, requestPromise);

      try {
        const result = await requestPromise;
        return result;
      } finally {
        // Clean up pending request
        this.pendingRequests.delete(cacheKey);
      }
    } catch (error) {
      console.error("Error fetching hotspots by bounds:", error);
      return {
        success: false,
        error: error.message,
        data: [],
      };
    }
  }

  // Private method to handle the actual API call
  async _fetchHotspotsBounds(bounds, zoom, cacheKey) {
    const response = await fetch(`${this.baseURL}/api/hotspots/bounds`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ bounds, zoom }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Failed to fetch hotspots");
    }

    // Cache the result
    this.cache.set(cacheKey, {
      data: result,
      timestamp: Date.now(),
    });

    return {
      ...result,
      cached: false,
    };
  }

  // Get hotspots near a specific location
  async getHotspotsNearLocation(latitude, longitude, radius = 5) {
    try {
      const cacheKey = this.generateLocationKey(latitude, longitude, radius);
      const cachedData = this.cache.get(cacheKey);

      // Return cached data if valid
      if (this.isCacheValid(cachedData)) {
        return {
          ...cachedData.data,
          cached: true,
        };
      }

      const response = await fetch(`${this.baseURL}/api/hotspots/nearby`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ latitude, longitude, radius }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch nearby hotspots");
      }

      // Cache the result
      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now(),
      });

      return {
        ...result,
        cached: false,
      };
    } catch (error) {
      console.error("Error fetching nearby hotspots:", error);
      return {
        success: false,
        error: error.message,
        data: [],
      };
    }
  }

  // Calculate map bounds from center and zoom
  calculateBounds(center, zoom, mapSize = { width: 800, height: 600 }) {
    const { latitude, longitude } = center;

    // Approximate degrees per pixel at different zoom levels
    const degreesPerPixel = 360 / (256 * Math.pow(2, zoom));

    const latDelta = (mapSize.height / 2) * degreesPerPixel;
    const lonDelta =
      (mapSize.width / 2) *
      degreesPerPixel *
      Math.cos((latitude * Math.PI) / 180);

    return {
      north: latitude + latDelta,
      south: latitude - latDelta,
      east: longitude + lonDelta,
      west: longitude - lonDelta,
    };
  }

  // Clear cache (useful for forced refresh)
  clearCache() {
    this.cache.clear();
    this.pendingRequests.clear(); // Also clear pending requests
  }

  // Get cache statistics
  getCacheStats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (this.isCacheValid(entry)) {
        validEntries++;
      } else {
        expiredEntries++;
      }
    }

    return {
      totalEntries: this.cache.size,
      validEntries,
      expiredEntries,
      cacheTimeout: this.cacheTimeout,
    };
  }

  // Clean expired cache entries
  cleanExpiredCache() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (!this.isCacheValid(entry)) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }
}

// Create singleton instance
const geoHotspotService = new GeoHotspotService();

// Clean expired cache every 10 minutes
setInterval(() => {
  geoHotspotService.cleanExpiredCache();
}, 10 * 60 * 1000);

export default geoHotspotService;
