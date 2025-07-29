const cron = require("node-cron");
const securityService = require("./securityService");
const {
  cleanupExpiredSearches,
  cleanupExpiredRequests,
} = require("./database");

/**
 * Scheduled Cleanup Service
 * Handles automatic data cleanup and maintenance tasks
 */
class ScheduledCleanupService {
  constructor() {
    this.isRunning = false;
    this.cleanupStats = {
      lastRun: null,
      totalRuns: 0,
      lastResults: null,
    };
  }

  /**
   * Initialize scheduled cleanup tasks
   */
  initialize() {
    if (this.isRunning) {
      console.log("Scheduled cleanup service is already running");
      return;
    }

    // Run cleanup every hour
    cron.schedule("0 * * * *", async () => {
      await this.performScheduledCleanup();
    });

    // Run comprehensive cleanup daily at 2 AM
    cron.schedule("0 2 * * *", async () => {
      await this.performComprehensiveCleanup();
    });

    // Run security cleanup every 6 hours
    cron.schedule("0 */6 * * *", async () => {
      await this.performSecurityCleanup();
    });

    this.isRunning = true;
    console.log("🕒 Scheduled cleanup service initialized");
    console.log("  - Hourly cleanup: Every hour");
    console.log("  - Daily comprehensive cleanup: 2:00 AM");
    console.log("  - Security cleanup: Every 6 hours");
  }

  /**
   * Perform regular scheduled cleanup
   */
  async performScheduledCleanup() {
    try {
      console.log("🧹 Starting scheduled cleanup...");
      const startTime = Date.now();

      const results = {
        expiredSearches: 0,
        expiredRequests: 0,
        timestamp: new Date(),
      };

      // Clean up expired ride buddy searches
      try {
        const searchCleanup = await cleanupExpiredSearches();
        results.expiredSearches = searchCleanup.deletedCount || 0;
      } catch (error) {
        console.error("Error cleaning up expired searches:", error);
      }

      // Clean up expired ride buddy requests
      try {
        const requestCleanup = await cleanupExpiredRequests();
        results.expiredRequests = requestCleanup.deletedCount || 0;
      } catch (error) {
        console.error("Error cleaning up expired requests:", error);
      }

      const duration = Date.now() - startTime;
      this.cleanupStats.lastRun = new Date();
      this.cleanupStats.totalRuns++;
      this.cleanupStats.lastResults = results;

      console.log(`✅ Scheduled cleanup completed in ${duration}ms:`, results);
    } catch (error) {
      console.error("❌ Scheduled cleanup failed:", error);
    }
  }

  /**
   * Perform comprehensive daily cleanup
   */
  async performComprehensiveCleanup() {
    try {
      console.log("🧹 Starting comprehensive daily cleanup...");
      const startTime = Date.now();

      // Perform regular cleanup first
      await this.performScheduledCleanup();

      // Perform security service cleanup
      const securityResults = await securityService.performDataCleanup();

      const duration = Date.now() - startTime;
      console.log(`✅ Comprehensive cleanup completed in ${duration}ms:`, {
        securityResults,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error("❌ Comprehensive cleanup failed:", error);
    }
  }

  /**
   * Perform security-specific cleanup
   */
  async performSecurityCleanup() {
    try {
      console.log("🔒 Starting security cleanup...");
      const startTime = Date.now();

      const results = {
        archivedReports: 0,
        cleanedBlocks: 0,
        timestamp: new Date(),
      };

      // Archive old resolved reports (older than 90 days)
      try {
        const { dbService } = require("./database");
        const reportsCollection = await dbService.getCollection("userReports");
        const oldDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

        const archivedReports = await reportsCollection.updateMany(
          {
            createdAt: { $lt: oldDate },
            status: { $in: ["resolved", "dismissed"] },
            archived: { $ne: true },
          },
          {
            $set: { archived: true, archivedAt: new Date() },
          }
        );
        results.archivedReports = archivedReports.modifiedCount || 0;
      } catch (error) {
        console.error("Error archiving old reports:", error);
      }

      // Clean up old block records (keep for audit but mark as cleaned)
      try {
        const { dbService } = require("./database");
        const blocksCollection = await dbService.getCollection("userBlocks");
        const oldDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000); // 1 year

        const cleanedBlocks = await blocksCollection.updateMany(
          {
            createdAt: { $lt: oldDate },
            status: "removed",
            cleaned: { $ne: true },
          },
          {
            $set: { cleaned: true, cleanedAt: new Date() },
          }
        );
        results.cleanedBlocks = cleanedBlocks.modifiedCount || 0;
      } catch (error) {
        console.error("Error cleaning old blocks:", error);
      }

      const duration = Date.now() - startTime;
      console.log(`✅ Security cleanup completed in ${duration}ms:`, results);
    } catch (error) {
      console.error("❌ Security cleanup failed:", error);
    }
  }

  /**
   * Get cleanup statistics
   */
  getStats() {
    return {
      isRunning: this.isRunning,
      ...this.cleanupStats,
    };
  }

  /**
   * Stop the scheduled cleanup service
   */
  stop() {
    this.isRunning = false;
    console.log("🛑 Scheduled cleanup service stopped");
  }
}

// Create singleton instance
const scheduledCleanupService = new ScheduledCleanupService();

// Auto-initialize if not in test environment
if (process.env.NODE_ENV !== "test") {
  scheduledCleanupService.initialize();
}

module.exports = scheduledCleanupService;
