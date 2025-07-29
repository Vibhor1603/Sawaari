// Cache Service - In-memory caching with TTL support for performance optimization
// Implements LRU cache with automatic cleanup and performance monitoring

class CacheService {
  constructor(options = {}) {
    this.maxSize = options.maxSize || 1000; // Maximum number of cache entries
    this.defaultTTL = options.defaultTTL || 300000; // 5 minutes default TTL
    this.cleanupInterval = options.cleanupInterval || 60000; // 1 minute cleanup interval

    // Cache storage
    this.cache = new Map();
    this.accessTimes = new Map(); // Track access times for LRU
    this.expirationTimes = new Map(); // Track expiration times

    // Performance metrics
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      cleanups: 0,
    };

    // Start periodic cleanup
    this.startCleanup();

    console.log("🚀 Cache Service initialized with max size:", this.maxSize);
  }

  // Get value from cache
  get(key) {
    const now = Date.now();

    // Check if key exists and hasn't expired
    if (this.cache.has(key)) {
      const expirationTime = this.expirationTimes.get(key);

      if (expirationTime && now > expirationTime) {
        // Expired, remove from cache
        this.delete(key);
        this.stats.misses++;
        return null;
      }

      // Update access time for LRU
      this.accessTimes.set(key, now);
      this.stats.hits++;

      return this.cache.get(key);
    }

    this.stats.misses++;
    return null;
  }

  // Set value in cache with optional TTL
  set(key, value, ttl = null) {
    const now = Date.now();
    const actualTTL = ttl || this.defaultTTL;

    // If cache is full, evict least recently used item
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    // Set the value
    this.cache.set(key, value);
    this.accessTimes.set(key, now);
    this.expirationTimes.set(key, now + actualTTL);

    this.stats.sets++;
  }

  // Delete value from cache
  delete(key) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
      this.accessTimes.delete(key);
      this.expirationTimes.delete(key);
      this.stats.deletes++;
      return true;
    }
    return false;
  }

  // Check if key exists in cache (without updating access time)
  has(key) {
    if (this.cache.has(key)) {
      const expirationTime = this.expirationTimes.get(key);
      const now = Date.now();

      if (expirationTime && now > expirationTime) {
        this.delete(key);
        return false;
      }

      return true;
    }
    return false;
  }

  // Clear all cache entries
  clear() {
    const size = this.cache.size;
    this.cache.clear();
    this.accessTimes.clear();
    this.expirationTimes.clear();
    console.log(`🧹 Cache cleared, removed ${size} entries`);
  }

  // Evict least recently used item
  evictLRU() {
    let oldestKey = null;
    let oldestTime = Date.now();

    for (const [key, accessTime] of this.accessTimes.entries()) {
      if (accessTime < oldestTime) {
        oldestTime = accessTime;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.delete(oldestKey);
      this.stats.evictions++;
    }
  }

  // Clean up expired entries
  cleanup() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, expirationTime] of this.expirationTimes.entries()) {
      if (now > expirationTime) {
        this.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 Cache cleanup: removed ${cleanedCount} expired entries`);
    }

    this.stats.cleanups++;
    return cleanedCount;
  }

  // Start periodic cleanup
  startCleanup() {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);
  }

  // Stop periodic cleanup
  stopCleanup() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  // Get cache statistics
  getStats() {
    const hitRate =
      this.stats.hits + this.stats.misses > 0
        ? (
            (this.stats.hits / (this.stats.hits + this.stats.misses)) *
            100
          ).toFixed(2)
        : 0;

    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      size: this.cache.size,
      maxSize: this.maxSize,
      memoryUsage: this.getMemoryUsage(),
    };
  }

  // Estimate memory usage (rough calculation)
  getMemoryUsage() {
    let totalSize = 0;

    for (const [key, value] of this.cache.entries()) {
      totalSize += this.estimateSize(key) + this.estimateSize(value);
    }

    return {
      estimated: `${(totalSize / 1024 / 1024).toFixed(2)} MB`,
      entries: this.cache.size,
    };
  }

  // Estimate size of an object (rough calculation)
  estimateSize(obj) {
    if (obj === null || obj === undefined) return 0;
    if (typeof obj === "string") return obj.length * 2; // UTF-16
    if (typeof obj === "number") return 8;
    if (typeof obj === "boolean") return 4;
    if (typeof obj === "object") {
      return JSON.stringify(obj).length * 2; // Rough estimate
    }
    return 0;
  }

  // Get cache keys (for debugging)
  getKeys() {
    return Array.from(this.cache.keys());
  }

  // Get cache size
  size() {
    return this.cache.size;
  }
}

// Specialized cache instances for different data types
class RideBuddyCacheService {
  constructor() {
    // Different cache instances for different data types with appropriate TTLs
    this.searchCache = new CacheService({
      maxSize: 500,
      defaultTTL: 60000, // 1 minute for search results
      cleanupInterval: 30000, // 30 seconds cleanup
    });

    this.matchCache = new CacheService({
      maxSize: 200,
      defaultTTL: 300000, // 5 minutes for matches
      cleanupInterval: 60000, // 1 minute cleanup
    });

    this.userCache = new CacheService({
      maxSize: 1000,
      defaultTTL: 600000, // 10 minutes for user data
      cleanupInterval: 120000, // 2 minutes cleanup
    });

    this.routeCache = new CacheService({
      maxSize: 300,
      defaultTTL: 1800000, // 30 minutes for route calculations
      cleanupInterval: 300000, // 5 minutes cleanup
    });

    console.log("🚀 Ride Buddy Cache Service initialized");
  }

  // Search-related caching
  getSearchResults(searchKey) {
    return this.searchCache.get(searchKey);
  }

  setSearchResults(searchKey, results, ttl = null) {
    this.searchCache.set(searchKey, results, ttl);
  }

  // Match-related caching
  getMatches(userId) {
    return this.matchCache.get(`matches:${userId}`);
  }

  setMatches(userId, matches, ttl = null) {
    this.matchCache.set(`matches:${userId}`, matches, ttl);
  }

  // Request-related caching
  getRequests(userId) {
    return this.matchCache.get(`requests:${userId}`);
  }

  setRequests(userId, requests, ttl = null) {
    this.matchCache.set(`requests:${userId}`, requests, ttl);
  }

  // User-related caching
  getUser(userId) {
    return this.userCache.get(`user:${userId}`);
  }

  setUser(userId, userData, ttl = null) {
    this.userCache.set(`user:${userId}`, userData, ttl);
  }

  // Route calculation caching
  getRouteCalculation(routeKey) {
    return this.routeCache.get(routeKey);
  }

  setRouteCalculation(routeKey, calculation, ttl = null) {
    this.routeCache.set(routeKey, calculation, ttl);
  }

  // Generate cache keys
  generateSearchKey(source, destination, userId) {
    return `search:${userId}:${source}:${destination}`;
  }

  generateRouteKey(source, destination) {
    return `route:${source}:${destination}`;
  }

  // Clear specific cache types
  clearSearchCache() {
    this.searchCache.clear();
  }

  clearMatchCache() {
    this.matchCache.clear();
  }

  clearUserCache() {
    this.userCache.clear();
  }

  clearRouteCache() {
    this.routeCache.clear();
  }

  // Clear all caches
  clearAll() {
    this.searchCache.clear();
    this.matchCache.clear();
    this.userCache.clear();
    this.routeCache.clear();
    console.log("🧹 All ride buddy caches cleared");
  }

  // Get comprehensive statistics
  getStats() {
    return {
      search: this.searchCache.getStats(),
      match: this.matchCache.getStats(),
      user: this.userCache.getStats(),
      route: this.routeCache.getStats(),
      timestamp: new Date().toISOString(),
    };
  }

  // Invalidate user-related caches when user data changes
  invalidateUserCaches(userId) {
    this.userCache.delete(`user:${userId}`);
    this.matchCache.delete(`matches:${userId}`);

    // Clear search results that might involve this user
    const searchKeys = this.searchCache
      .getKeys()
      .filter((key) => key.includes(userId));
    searchKeys.forEach((key) => this.searchCache.delete(key));

    console.log(`🧹 Invalidated caches for user: ${userId}`);
  }

  // Shutdown all cache services
  shutdown() {
    this.searchCache.stopCleanup();
    this.matchCache.stopCleanup();
    this.userCache.stopCleanup();
    this.routeCache.stopCleanup();
    console.log("🛑 Ride Buddy Cache Service shutdown");
  }
}

// Create singleton instance
const rideBuddyCacheService = new RideBuddyCacheService();

// Graceful shutdown
process.on("SIGINT", () => {
  rideBuddyCacheService.shutdown();
});

process.on("SIGTERM", () => {
  rideBuddyCacheService.shutdown();
});

module.exports = {
  CacheService,
  rideBuddyCacheService,
};
