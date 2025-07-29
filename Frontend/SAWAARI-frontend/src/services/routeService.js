import authService from "./authService";

class RouteService {
  constructor() {
    this.baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
    this.initialized = false;
    this.initPromise = null;
    this.lastInitTime = 0;
    this.initCooldown = 5000; // 5 seconds between init calls

    // Cache for API responses to prevent duplicate calls
    this.cache = {
      routes: new Map(),
      locations: null,
      fareEstimates: new Map(),
      lastCacheTime: 0,
    };

    // Rate limiting
    this.lastApiCall = 0;
    this.minApiInterval = 100; // Minimum 100ms between API calls

    console.log(
      "🚀 ROUTE SERVICE INITIALIZED - Real API calls with smart caching"
    );
  }

  // Rate limiting wrapper
  async _rateLimitedCall(apiCall) {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastApiCall;

    if (timeSinceLastCall < this.minApiInterval) {
      await new Promise((resolve) =>
        setTimeout(resolve, this.minApiInterval - timeSinceLastCall)
      );
    }

    this.lastApiCall = Date.now();
    return apiCall();
  }

  // Initialize route graph with smart caching
  async initializeGraph() {
    const now = Date.now();

    // If already initialized recently, return cached result
    if (this.initialized && now - this.lastInitTime < this.initCooldown) {
      return {
        success: true,
        message: "Graph already initialized (cached)",
        nodeCount: 10,
        edgeCount: 15,
      };
    }

    // If initialization is in progress, wait for it
    if (this.initPromise) {
      return this.initPromise;
    }

    // Start new initialization
    this.initPromise = this._rateLimitedCall(async () => {
      try {
        const response = await authService.apiRequest(
          "/api/routes/initialize",
          {
            method: "POST",
          }
        );
        const result = await response.json();

        if (result.success) {
          this.initialized = true;
          this.lastInitTime = now;
        }

        return result;
      } catch (error) {
        console.error("Failed to initialize graph:", error);
        throw error;
      } finally {
        this.initPromise = null;
      }
    });

    return this.initPromise;
  }

  // Get graph status
  async getGraphStatus() {
    return this._rateLimitedCall(async () => {
      try {
        const response = await authService.apiRequest("/api/routes/status");
        return response.json();
      } catch (error) {
        console.error("Failed to get graph status:", error);
        throw error;
      }
    });
  }

  // Calculate route with caching
  async calculateRoute(source, destination) {
    const cacheKey = `${source}-${destination}`;

    // Check cache first
    if (this.cache.routes.has(cacheKey)) {
      const cached = this.cache.routes.get(cacheKey);
      const cacheAge = Date.now() - cached.timestamp;

      // Use cache if less than 5 minutes old
      if (cacheAge < 300000) {
        return { success: true, data: cached.data, cached: true };
      }
    }

    return this._rateLimitedCall(async () => {
      try {
        const response = await authService.apiRequest("/api/routes/calculate", {
          method: "POST",
          body: JSON.stringify({ source, destination }),
        });
        const result = await response.json();

        // Cache the result
        if (result.success) {
          this.cache.routes.set(cacheKey, {
            data: result.data,
            timestamp: Date.now(),
          });
        }

        return result;
      } catch (error) {
        console.error("Failed to calculate route:", error);
        throw error;
      }
    });
  }

  // Store route for ride buddy
  async storeRoute(userId, source, destination) {
    return this._rateLimitedCall(async () => {
      try {
        const response = await authService.apiRequest("/api/routes/store", {
          method: "POST",
          body: JSON.stringify({ userId, source, destination }),
        });
        return response.json();
      } catch (error) {
        console.error("Failed to store route:", error);
        throw error;
      }
    });
  }

  // Find matching routes for ride buddy
  async findMatchingRoutes(routeData) {
    return this._rateLimitedCall(async () => {
      try {
        const response = await authService.apiRequest(
          "/api/routes/find-matches",
          {
            method: "POST",
            body: JSON.stringify({ routeData }),
          }
        );
        return response.json();
      } catch (error) {
        console.error("Failed to find matching routes:", error);
        throw error;
      }
    });
  }

  // Get available locations with caching
  async getAvailableLocations() {
    // Check cache first
    if (this.cache.locations) {
      const cacheAge = Date.now() - this.cache.lastCacheTime;

      // Use cache if less than 10 minutes old
      if (cacheAge < 600000) {
        return { success: true, data: this.cache.locations, cached: true };
      }
    }

    return this._rateLimitedCall(async () => {
      try {
        const response = await authService.apiRequest("/api/routes/locations");
        const result = await response.json();

        // Cache the result
        if (result.success) {
          this.cache.locations = result.data;
          this.cache.lastCacheTime = Date.now();
        }

        return result;
      } catch (error) {
        console.error("Failed to get available locations:", error);
        throw error;
      }
    });
  }

  // Get route suggestions
  async getRouteSuggestions(from, limit = 5) {
    return this._rateLimitedCall(async () => {
      try {
        const params = new URLSearchParams({ from, limit: limit.toString() });
        const response = await authService.apiRequest(
          `/api/routes/suggestions?${params}`
        );
        return response.json();
      } catch (error) {
        console.error("Failed to get route suggestions:", error);
        throw error;
      }
    });
  }

  // Calculate fare estimates with caching
  async calculateFareEstimates(source, destination, waitingTime = 0) {
    const cacheKey = `${source}-${destination}-${waitingTime}`;

    // Check cache first
    if (this.cache.fareEstimates.has(cacheKey)) {
      const cached = this.cache.fareEstimates.get(cacheKey);
      const cacheAge = Date.now() - cached.timestamp;

      // Use cache if less than 2 minutes old
      if (cacheAge < 120000) {
        return { success: true, data: cached.data, cached: true };
      }
    }

    return this._rateLimitedCall(async () => {
      try {
        const response = await authService.apiRequest(
          "/api/routes/fare-estimates",
          {
            method: "POST",
            body: JSON.stringify({ source, destination, waitingTime }),
          }
        );
        const result = await response.json();

        // Cache the result
        if (result.success) {
          this.cache.fareEstimates.set(cacheKey, {
            data: result.data,
            timestamp: Date.now(),
          });
        }

        return result;
      } catch (error) {
        console.error("Failed to calculate fare estimates:", error);
        throw error;
      }
    });
  }
}

const routeService = new RouteService();

export default routeService;
