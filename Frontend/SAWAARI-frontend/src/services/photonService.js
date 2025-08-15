// Photon API service for geocoding and location search
class PhotonService {
  constructor() {
    this.baseUrl = "https://photon.komoot.io/api";
    this.cache = new Map();
    this.cacheTimeout = 10 * 60 * 1000; // 10 minutes for better caching
    this.lastRequestTime = 0;
    this.minRequestInterval = 50; // Very fast response
    this.abortController = null; // For canceling previous requests
  }

  // Rate limiting helper
  async waitForRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.minRequestInterval) {
      const waitTime = this.minRequestInterval - timeSinceLastRequest;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }

  // Search locations using Photon API
  async searchLocations(query, options = {}) {
    if (!query || query.trim().length < 2) {
      return { features: [] };
    }

    const {
      limit = 5,
      bbox = null, // [minLon, minLat, maxLon, maxLat]
      lang = "en",
    } = options;

    const cacheKey = `${query.trim().toLowerCase()}_${limit}_${
      bbox ? bbox.join(",") : "no-bbox"
    }`;

    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      // Cancel previous request if exists
      if (this.abortController) {
        this.abortController.abort();
      }

      // Create new abort controller for this request
      this.abortController = new AbortController();

      // Apply rate limiting
      await this.waitForRateLimit();

      // Build URL with parameters for worldwide search
      const params = new URLSearchParams({
        q: query.trim(),
        limit: limit.toString(),
        lang,
      });

      // Add comprehensive OSM tags for better worldwide results
      params.append("osm_tag", "place");
      params.append("osm_tag", "amenity");
      params.append("osm_tag", "highway");
      params.append("osm_tag", "building");
      params.append("osm_tag", "tourism");

      // Add bounding box if provided
      if (bbox && Array.isArray(bbox) && bbox.length === 4) {
        params.append("bbox", bbox.join(","));
      }

      const url = `${this.baseUrl}?${params.toString()}`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        signal: this.abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Validate response format
      if (!data || !Array.isArray(data.features)) {
        throw new Error("Invalid response format from Photon API");
      }

      // Process and format results
      const processedData = {
        features: data.features.map((feature) => ({
          ...feature,
          properties: {
            ...feature.properties,
            // Ensure we have a display name
            displayName: this.formatDisplayName(feature.properties),
            // Extract coordinates for easier access
            coordinates: feature.geometry?.coordinates || [0, 0],
          },
        })),
      };

      // Cache the result
      this.cache.set(cacheKey, {
        data: processedData,
        timestamp: Date.now(),
      });

      return processedData;
    } catch (error) {
      // Don't log aborted requests as errors
      if (error.name === "AbortError") {
        return { features: [] };
      }

      console.error("Error searching locations with Photon API:", error);

      // Return empty results on error instead of throwing
      return {
        features: [],
        error: error.message,
      };
    }
  }

  // Format display name from properties
  formatDisplayName(properties) {
    const { name, city, state, country, street, housenumber } = properties;

    const parts = [];

    // Add house number and street
    if (housenumber && street) {
      parts.push(`${housenumber} ${street}`);
    } else if (street) {
      parts.push(street);
    }

    // Add name if it's different from street
    if (name && name !== street) {
      parts.unshift(name);
    }

    // Add city
    if (city) {
      parts.push(city);
    }

    // Add state
    if (state && state !== city) {
      parts.push(state);
    }

    // Add country
    if (country) {
      parts.push(country);
    }

    return parts.length > 0 ? parts.join(", ") : name || "Unknown Location";
  }

  // Get coordinates for a specific location
  getCoordinates(feature) {
    if (feature?.geometry?.coordinates) {
      const [lon, lat] = feature.geometry.coordinates;
      return { latitude: lat, longitude: lon };
    }
    return null;
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
  }

  // Get cache stats
  getCacheStats() {
    return {
      cacheSize: this.cache.size,
      cacheTimeout: this.cacheTimeout,
      lastRequestTime: this.lastRequestTime,
    };
  }
}

// Create singleton instance
const photonService = new PhotonService();

export default photonService;
