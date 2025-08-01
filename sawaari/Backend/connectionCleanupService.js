// Automatic cleanup service for expired ride buddy connections
const {
  findRideBuddyRequests,
  updateRideBuddyRequest,
  findRideBuddyMatches,
  updateRideBuddyMatch,
} = require("./database");

class ConnectionCleanupService {
  constructor() {
    this.cleanupInterval = null;
    this.CONNECTION_DURATION = 10 * 60 * 1000; // 10 minutes
    this.CLEANUP_INTERVAL = 5 * 60 * 1000; // Run cleanup every 5 minutes
  }

  start() {
    console.log("🧹 Starting connection cleanup service...");

    // Run initial cleanup
    this.performCleanup();

    // Schedule periodic cleanup
    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, this.CLEANUP_INTERVAL);

    console.log(
      `✅ Connection cleanup service started (runs every ${
        this.CLEANUP_INTERVAL / 60000
      } minutes)`
    );
  }

  stop() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log("🛑 Connection cleanup service stopped");
    }
  }

  async performCleanup() {
    try {
      const now = Date.now();
      const cutoffTime = new Date(now - this.CONNECTION_DURATION);

      console.log("🧹 Running connection cleanup...");

      // Find expired accepted requests
      const expiredRequests = await findRideBuddyRequests({
        status: "accepted",
        updatedAt: { $lt: cutoffTime },
      });

      let cleanedRequests = 0;
      let cleanedMatches = 0;

      // Clean up expired requests and their associated matches
      for (const request of expiredRequests) {
        console.log(
          `🕐 Expiring connection: ${request._id} (age: ${Math.round(
            (now - new Date(request.updatedAt).getTime()) / 60000
          )} minutes)`
        );

        // Update request status to expired
        await updateRideBuddyRequest(request._id, {
          status: "expired",
          expiredAt: new Date(),
        });
        cleanedRequests++;

        // Find and update associated matches
        const matches = await findRideBuddyMatches({
          requestId: request._id,
        });

        for (const match of matches) {
          await updateRideBuddyMatch(match._id, {
            status: "expired",
            expiredAt: new Date(),
          });
          cleanedMatches++;
        }
      }

      if (cleanedRequests > 0 || cleanedMatches > 0) {
        console.log(
          `✅ Cleanup completed: ${cleanedRequests} requests, ${cleanedMatches} matches expired`
        );
      }
    } catch (error) {
      console.error("❌ Error during connection cleanup:", error);
    }
  }
}

// Create singleton instance
const connectionCleanupService = new ConnectionCleanupService();

module.exports = connectionCleanupService;
