const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

class LocationService {
  constructor() {
    this.cache = new Map();
    this.searchCache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  // Get paginated locations from database
  async getLocationsPaginated(page = 1, limit = 20) {
    const cacheKey = `paginated_${page}_${limit}`;

    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/hotspots/paginated?page=${page}&limit=${limit}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || "Failed to fetch locations");
      }

      // Cache the result
      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now(),
      });

      return result;
    } catch (error) {
      console.error("Error fetching paginated locations:", error);
      throw error;
    }
  }

  // Search locations in real-time from database
  async searchLocations(query, limit = 20) {
    if (!query || query.trim().length === 0) {
      return { success: true, data: [], count: 0 };
    }

    const cacheKey = `search_${query.trim().toLowerCase()}_${limit}`;

    // Check cache first
    if (this.searchCache.has(cacheKey)) {
      const cached = this.searchCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/hotspots/search?q=${encodeURIComponent(
          query.trim()
        )}&limit=${limit}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || "Failed to search locations");
      }

      // Cache the result
      this.searchCache.set(cacheKey, {
        data: result,
        timestamp: Date.now(),
      });

      return result;
    } catch (error) {
      console.error("Error searching locations:", error);
      throw error;
    }
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
    this.searchCache.clear();
  }

  // Get cache stats
  getCacheStats() {
    return {
      paginatedCacheSize: this.cache.size,
      searchCacheSize: this.searchCache.size,
      cacheTimeout: this.cacheTimeout,
    };
  }
}

// Create singleton instance
const locationService = new LocationService();

export default locationService;
