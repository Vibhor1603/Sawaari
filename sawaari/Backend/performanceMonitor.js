// Performance Monitor - Tracks and optimizes system performance
// Monitors database queries, API response times, and resource usage

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      apiRequests: new Map(), // endpoint -> { count, totalTime, avgTime, errors }
      dbQueries: new Map(), // collection -> { count, totalTime, avgTime, errors }
      memoryUsage: [],
      activeConnections: 0,
      cacheHitRate: 0,
      startTime: Date.now(),
    };

    this.thresholds = {
      slowApiRequest: 1000, // 1 second
      slowDbQuery: 500, // 500ms
      highMemoryUsage: 500 * 1024 * 1024, // 500MB
      maxActiveConnections: 100,
    };

    this.alerts = [];
    this.isMonitoring = false;

    console.log("📊 Performance Monitor initialized");
  }

  // Start monitoring
  start() {
    if (this.isMonitoring) return;

    this.isMonitoring = true;

    // Monitor memory usage every 30 seconds
    this.memoryInterval = setInterval(() => {
      this.recordMemoryUsage();
    }, 30000);

    // Clean up old metrics every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldMetrics();
    }, 300000);

    console.log("📊 Performance monitoring started");
  }

  // Stop monitoring
  stop() {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;

    if (this.memoryInterval) {
      clearInterval(this.memoryInterval);
      this.memoryInterval = null;
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    console.log("📊 Performance monitoring stopped");
  }

  // Record API request performance
  recordApiRequest(endpoint, duration, success = true) {
    if (!this.metrics.apiRequests.has(endpoint)) {
      this.metrics.apiRequests.set(endpoint, {
        count: 0,
        totalTime: 0,
        avgTime: 0,
        errors: 0,
        slowRequests: 0,
      });
    }

    const metric = this.metrics.apiRequests.get(endpoint);
    metric.count++;
    metric.totalTime += duration;
    metric.avgTime = metric.totalTime / metric.count;

    if (!success) {
      metric.errors++;
    }

    if (duration > this.thresholds.slowApiRequest) {
      metric.slowRequests++;
      this.addAlert("slow_api_request", {
        endpoint,
        duration,
        threshold: this.thresholds.slowApiRequest,
      });
    }
  }

  // Record database query performance
  recordDbQuery(collection, operation, duration, success = true) {
    const key = `${collection}.${operation}`;

    if (!this.metrics.dbQueries.has(key)) {
      this.metrics.dbQueries.set(key, {
        count: 0,
        totalTime: 0,
        avgTime: 0,
        errors: 0,
        slowQueries: 0,
      });
    }

    const metric = this.metrics.dbQueries.get(key);
    metric.count++;
    metric.totalTime += duration;
    metric.avgTime = metric.totalTime / metric.count;

    if (!success) {
      metric.errors++;
    }

    if (duration > this.thresholds.slowDbQuery) {
      metric.slowQueries++;
      this.addAlert("slow_db_query", {
        collection,
        operation,
        duration,
        threshold: this.thresholds.slowDbQuery,
      });
    }
  }

  // Record memory usage
  recordMemoryUsage() {
    const usage = process.memoryUsage();
    const timestamp = Date.now();

    this.metrics.memoryUsage.push({
      timestamp,
      rss: usage.rss,
      heapTotal: usage.heapTotal,
      heapUsed: usage.heapUsed,
      external: usage.external,
    });

    // Keep only last 100 memory readings (50 minutes of data)
    if (this.metrics.memoryUsage.length > 100) {
      this.metrics.memoryUsage = this.metrics.memoryUsage.slice(-100);
    }

    // Check for high memory usage
    if (usage.heapUsed > this.thresholds.highMemoryUsage) {
      this.addAlert("high_memory_usage", {
        heapUsed: usage.heapUsed,
        threshold: this.thresholds.highMemoryUsage,
        percentage: ((usage.heapUsed / usage.heapTotal) * 100).toFixed(2),
      });
    }
  }

  // Update active connections count
  updateActiveConnections(count) {
    this.metrics.activeConnections = count;

    if (count > this.thresholds.maxActiveConnections) {
      this.addAlert("high_connection_count", {
        count,
        threshold: this.thresholds.maxActiveConnections,
      });
    }
  }

  // Update cache hit rate
  updateCacheHitRate(hitRate) {
    this.metrics.cacheHitRate = hitRate;
  }

  // Add performance alert
  addAlert(type, data) {
    const alert = {
      type,
      data,
      timestamp: new Date().toISOString(),
      id: Date.now() + Math.random(),
    };

    this.alerts.push(alert);

    // Keep only last 50 alerts
    if (this.alerts.length > 50) {
      this.alerts = this.alerts.slice(-50);
    }

    console.warn(`⚠️ Performance Alert [${type}]:`, data);
  }

  // Get performance summary
  getSummary() {
    const uptime = Date.now() - this.metrics.startTime;
    const currentMemory = process.memoryUsage();

    // Calculate API performance summary
    const apiSummary = {
      totalRequests: 0,
      avgResponseTime: 0,
      errorRate: 0,
      slowRequestRate: 0,
    };

    for (const [endpoint, metric] of this.metrics.apiRequests.entries()) {
      apiSummary.totalRequests += metric.count;
      apiSummary.avgResponseTime += metric.avgTime * metric.count;
      apiSummary.errorRate += metric.errors;
      apiSummary.slowRequestRate += metric.slowRequests;
    }

    if (apiSummary.totalRequests > 0) {
      apiSummary.avgResponseTime = Math.round(
        apiSummary.avgResponseTime / apiSummary.totalRequests
      );
      apiSummary.errorRate = (
        (apiSummary.errorRate / apiSummary.totalRequests) *
        100
      ).toFixed(2);
      apiSummary.slowRequestRate = (
        (apiSummary.slowRequestRate / apiSummary.totalRequests) *
        100
      ).toFixed(2);
    }

    // Calculate DB performance summary
    const dbSummary = {
      totalQueries: 0,
      avgQueryTime: 0,
      errorRate: 0,
      slowQueryRate: 0,
    };

    for (const [key, metric] of this.metrics.dbQueries.entries()) {
      dbSummary.totalQueries += metric.count;
      dbSummary.avgQueryTime += metric.avgTime * metric.count;
      dbSummary.errorRate += metric.errors;
      dbSummary.slowQueryRate += metric.slowQueries;
    }

    if (dbSummary.totalQueries > 0) {
      dbSummary.avgQueryTime = Math.round(
        dbSummary.avgQueryTime / dbSummary.totalQueries
      );
      dbSummary.errorRate = (
        (dbSummary.errorRate / dbSummary.totalQueries) *
        100
      ).toFixed(2);
      dbSummary.slowQueryRate = (
        (dbSummary.slowQueryRate / dbSummary.totalQueries) *
        100
      ).toFixed(2);
    }

    return {
      uptime: Math.round(uptime / 1000), // seconds
      memory: {
        current: {
          heapUsed: Math.round(currentMemory.heapUsed / 1024 / 1024), // MB
          heapTotal: Math.round(currentMemory.heapTotal / 1024 / 1024), // MB
          rss: Math.round(currentMemory.rss / 1024 / 1024), // MB
        },
        usage: (
          (currentMemory.heapUsed / currentMemory.heapTotal) *
          100
        ).toFixed(2),
      },
      api: apiSummary,
      database: dbSummary,
      connections: this.metrics.activeConnections,
      cacheHitRate: `${this.metrics.cacheHitRate}%`,
      alerts: this.alerts.length,
      timestamp: new Date().toISOString(),
    };
  }

  // Get detailed metrics
  getDetailedMetrics() {
    return {
      apiRequests: Object.fromEntries(this.metrics.apiRequests),
      dbQueries: Object.fromEntries(this.metrics.dbQueries),
      memoryUsage: this.metrics.memoryUsage.slice(-10), // Last 10 readings
      activeConnections: this.metrics.activeConnections,
      cacheHitRate: this.metrics.cacheHitRate,
      alerts: this.alerts.slice(-10), // Last 10 alerts
      thresholds: this.thresholds,
    };
  }

  // Get performance recommendations
  getRecommendations() {
    const recommendations = [];
    const summary = this.getSummary();

    // API performance recommendations
    if (
      parseFloat(summary.api.avgResponseTime) > this.thresholds.slowApiRequest
    ) {
      recommendations.push({
        type: "api_performance",
        priority: "high",
        message: `Average API response time (${summary.api.avgResponseTime}ms) exceeds threshold. Consider optimizing slow endpoints.`,
        actions: ["Add caching", "Optimize database queries", "Add pagination"],
      });
    }

    if (parseFloat(summary.api.errorRate) > 5) {
      recommendations.push({
        type: "api_reliability",
        priority: "high",
        message: `API error rate (${summary.api.errorRate}%) is high. Review error handling and validation.`,
        actions: [
          "Improve error handling",
          "Add input validation",
          "Monitor dependencies",
        ],
      });
    }

    // Database performance recommendations
    if (
      parseFloat(summary.database.avgQueryTime) > this.thresholds.slowDbQuery
    ) {
      recommendations.push({
        type: "database_performance",
        priority: "medium",
        message: `Average database query time (${summary.database.avgQueryTime}ms) is slow. Consider optimization.`,
        actions: [
          "Add database indexes",
          "Optimize queries",
          "Use connection pooling",
        ],
      });
    }

    // Memory usage recommendations
    if (parseFloat(summary.memory.usage) > 80) {
      recommendations.push({
        type: "memory_usage",
        priority: "high",
        message: `Memory usage (${summary.memory.usage}%) is high. Consider optimization.`,
        actions: [
          "Implement garbage collection",
          "Optimize data structures",
          "Add memory limits",
        ],
      });
    }

    // Cache performance recommendations
    if (parseFloat(summary.cacheHitRate) < 70) {
      recommendations.push({
        type: "cache_performance",
        priority: "medium",
        message: `Cache hit rate (${summary.cacheHitRate}) is low. Review caching strategy.`,
        actions: [
          "Increase cache TTL",
          "Cache more data",
          "Optimize cache keys",
        ],
      });
    }

    return recommendations;
  }

  // Clean up old metrics
  cleanupOldMetrics() {
    const cutoffTime = Date.now() - 24 * 60 * 60 * 1000; // 24 hours ago

    // Clean up old alerts
    this.alerts = this.alerts.filter(
      (alert) => new Date(alert.timestamp).getTime() > cutoffTime
    );

    console.log("🧹 Performance metrics cleaned up");
  }

  // Middleware for Express to track API performance
  middleware() {
    return (req, res, next) => {
      const startTime = Date.now();
      const originalSend = res.send;

      res.send = function (data) {
        const duration = Date.now() - startTime;
        const success = res.statusCode < 400;

        performanceMonitor.recordApiRequest(
          `${req.method} ${req.route?.path || req.path}`,
          duration,
          success
        );

        return originalSend.call(this, data);
      };

      next();
    };
  }

  // Database operation wrapper for performance tracking
  wrapDbOperation(collection, operation, dbOperation) {
    return async (...args) => {
      const startTime = Date.now();
      let success = true;

      try {
        const result = await dbOperation(...args);
        return result;
      } catch (error) {
        success = false;
        throw error;
      } finally {
        const duration = Date.now() - startTime;
        this.recordDbQuery(collection, operation, duration, success);
      }
    };
  }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor();

// Graceful shutdown
process.on("SIGINT", () => {
  performanceMonitor.stop();
});

process.on("SIGTERM", () => {
  performanceMonitor.stop();
});

module.exports = performanceMonitor;
