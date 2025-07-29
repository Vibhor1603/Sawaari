// Real-time Ride Buddy Service
// Handles Socket.IO events and real-time notifications for ride buddy system

const chatService = require("./chatService");
const {
  findRideBuddyRequests,
  findRideBuddyMatches,
  findRideBuddyChats,
  updateRideBuddyRequest,
} = require("./database");

class RealTimeRideBuddyService {
  constructor() {
    this.connectedUsers = new Map(); // userId -> socket info
    this.userNotifications = new Map(); // userId -> pending notifications

    console.log("🚀 Real-time Ride Buddy Service initialized");
  }

  // Initialize with Socket.IO instance
  initialize(io) {
    this.io = io;

    // Listen for ride buddy specific events
    io.on("connection", (socket) => {
      // These events are handled by the enhanced chatService
      // This service provides additional utility methods
    });
  }

  // Send notification to specific user
  async sendNotificationToUser(userId, eventName, data) {
    try {
      const userSocket = chatService.activeConnections.get(userId);
      if (userSocket) {
        userSocket.emit(eventName, {
          ...data,
          timestamp: new Date().toISOString(),
        });
        return true;
      } else {
        // Store notification for when user comes online
        if (!this.userNotifications.has(userId)) {
          this.userNotifications.set(userId, []);
        }
        this.userNotifications.get(userId).push({
          eventName,
          data: {
            ...data,
            timestamp: new Date().toISOString(),
          },
        });
        return false;
      }
    } catch (error) {
      console.error("Error sending notification to user:", error);
      return false;
    }
  }

  // Broadcast to multiple users
  async broadcastToUsers(userIds, eventName, data) {
    const results = [];
    for (const userId of userIds) {
      const sent = await this.sendNotificationToUser(userId, eventName, data);
      results.push({ userId, sent });
    }
    return results;
  }

  // Send pending notifications when user connects
  async sendPendingNotifications(userId) {
    const notifications = this.userNotifications.get(userId) || [];
    if (notifications.length > 0) {
      const userSocket = chatService.activeConnections.get(userId);
      if (userSocket) {
        for (const notification of notifications) {
          userSocket.emit(notification.eventName, notification.data);
        }
        // Clear notifications after sending
        this.userNotifications.delete(userId);
      }
    }
  }

  // Get real-time statistics
  getRealtimeStats() {
    return {
      connectedUsers: chatService.activeConnections.size,
      pendingNotifications: Array.from(this.userNotifications.values()).reduce(
        (total, notifications) => total + notifications.length,
        0
      ),
      activeChats: chatService.conversations.size,
      timestamp: new Date().toISOString(),
    };
  }

  // Cleanup expired notifications
  cleanupExpiredNotifications() {
    const now = new Date();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    for (const [userId, notifications] of this.userNotifications.entries()) {
      const validNotifications = notifications.filter((notification) => {
        const notificationTime = new Date(notification.data.timestamp);
        return now - notificationTime < maxAge;
      });

      if (validNotifications.length === 0) {
        this.userNotifications.delete(userId);
      } else if (validNotifications.length !== notifications.length) {
        this.userNotifications.set(userId, validNotifications);
      }
    }
  }

  // Periodic cleanup (call this from a scheduled job)
  startPeriodicCleanup() {
    setInterval(() => {
      this.cleanupExpiredNotifications();
    }, 60 * 60 * 1000); // Run every hour
  }
}

// Create singleton instance
const realTimeRideBuddyService = new RealTimeRideBuddyService();

module.exports = realTimeRideBuddyService;
