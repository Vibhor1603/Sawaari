const { ObjectId } = require("mongodb");
const crypto = require("crypto");
const { dbService } = require("./database");

/**
 * Security Service for Ride Buddy System
 * Handles user blocking, reporting, and privacy features
 */
class SecurityService {
  constructor() {
    this.encryptionKey = process.env.ENCRYPTION_KEY || crypto.randomBytes(32);
    this.algorithm = "aes-256-gcm";
  }

  // ===== USER BLOCKING FUNCTIONALITY =====

  /**
   * Block a user from interacting with the current user
   * @param {String} blockerId - ID of user doing the blocking
   * @param {String} blockedId - ID of user being blocked
   * @param {String} reason - Reason for blocking
   */
  async blockUser(blockerId, blockedId, reason = "") {
    try {
      const collection = await dbService.getCollection("userBlocks");

      // Check if already blocked
      const existingBlock = await collection.findOne({
        blockerId: new ObjectId(blockerId),
        blockedId: new ObjectId(blockedId),
        status: "active",
      });

      if (existingBlock) {
        return {
          success: false,
          message: "User is already blocked",
        };
      }

      // Create block record
      const blockData = {
        blockerId: new ObjectId(blockerId),
        blockedId: new ObjectId(blockedId),
        reason: this.sanitizeInput(reason),
        status: "active",
        createdAt: new Date(),
      };

      const result = await collection.insertOne(blockData);

      // Clean up any existing matches/requests between these users
      await this.cleanupUserInteractions(blockerId, blockedId);

      return {
        success: true,
        blockId: result.insertedId,
        message: "User blocked successfully",
      };
    } catch (error) {
      console.error("Block user error:", error);
      throw new Error("Failed to block user");
    }
  }

  /**
   * Unblock a previously blocked user
   * @param {String} blockerId - ID of user doing the unblocking
   * @param {String} blockedId - ID of user being unblocked
   */
  async unblockUser(blockerId, blockedId) {
    try {
      const collection = await dbService.getCollection("userBlocks");

      const result = await collection.updateOne(
        {
          blockerId: new ObjectId(blockerId),
          blockedId: new ObjectId(blockedId),
          status: "active",
        },
        {
          $set: {
            status: "removed",
            removedAt: new Date(),
          },
        }
      );

      return {
        success: result.modifiedCount > 0,
        message:
          result.modifiedCount > 0
            ? "User unblocked successfully"
            : "Block not found",
      };
    } catch (error) {
      console.error("Unblock user error:", error);
      throw new Error("Failed to unblock user");
    }
  }

  /**
   * Get list of blocked users for a user
   * @param {String} userId - ID of user to get blocked list for
   */
  async getBlockedUsers(userId) {
    try {
      const collection = await dbService.getCollection("userBlocks");
      const usersCollection = await dbService.getCollection("users");

      const blocks = await collection
        .find({
          blockerId: new ObjectId(userId),
          status: "active",
        })
        .sort({ createdAt: -1 })
        .toArray();

      // Get user details for blocked users
      const blockedUsers = await Promise.all(
        blocks.map(async (block) => {
          const user = await usersCollection.findOne(
            { _id: block.blockedId },
            { projection: { name: 1, email: 1 } }
          );
          return {
            blockId: block._id,
            user: user || {
              name: "Unknown User",
              email: "unknown@example.com",
            },
            reason: block.reason,
            blockedAt: block.createdAt,
          };
        })
      );

      return {
        success: true,
        blockedUsers,
        count: blockedUsers.length,
      };
    } catch (error) {
      console.error("Get blocked users error:", error);
      throw new Error("Failed to get blocked users");
    }
  }

  /**
   * Check if user A has blocked user B
   * @param {String} userId - ID of potential blocker
   * @param {String} targetUserId - ID of potentially blocked user
   */
  async isUserBlocked(userId, targetUserId) {
    try {
      const collection = await dbService.getCollection("userBlocks");

      const block = await collection.findOne({
        $or: [
          {
            blockerId: new ObjectId(userId),
            blockedId: new ObjectId(targetUserId),
          },
          {
            blockerId: new ObjectId(targetUserId),
            blockedId: new ObjectId(userId),
          },
        ],
        status: "active",
      });

      return !!block;
    } catch (error) {
      console.error("Check user blocked error:", error);
      return false;
    }
  }

  // ===== USER REPORTING FUNCTIONALITY =====

  /**
   * Report a user for inappropriate behavior
   * @param {String} reporterId - ID of user making the report
   * @param {String} reportedId - ID of user being reported
   * @param {String} reason - Reason for reporting
   * @param {String} description - Detailed description
   * @param {String} category - Category of report
   */
  async reportUser(
    reporterId,
    reportedId,
    reason,
    description = "",
    category = "other"
  ) {
    try {
      const collection = await dbService.getCollection("userReports");

      const reportData = {
        reporterId: new ObjectId(reporterId),
        reportedId: new ObjectId(reportedId),
        reason: this.sanitizeInput(reason),
        description: this.sanitizeInput(description),
        category: this.sanitizeInput(category),
        status: "pending",
        createdAt: new Date(),
        reviewedAt: null,
        reviewedBy: null,
        action: null,
      };

      const result = await collection.insertOne(reportData);

      // Auto-block if multiple reports from different users
      await this.checkAutoBlock(reportedId);

      return {
        success: true,
        reportId: result.insertedId,
        message: "Report submitted successfully",
      };
    } catch (error) {
      console.error("Report user error:", error);
      throw new Error("Failed to report user");
    }
  }

  /**
   * Get reports made by a user
   * @param {String} userId - ID of user to get reports for
   */
  async getUserReports(userId) {
    try {
      const collection = await dbService.getCollection("userReports");
      const usersCollection = await dbService.getCollection("users");

      const reports = await collection
        .find({ reporterId: new ObjectId(userId) })
        .sort({ createdAt: -1 })
        .toArray();

      // Get reported user details
      const reportsWithDetails = await Promise.all(
        reports.map(async (report) => {
          const user = await usersCollection.findOne(
            { _id: report.reportedId },
            { projection: { name: 1, email: 1 } }
          );
          return {
            reportId: report._id,
            reportedUser: user || {
              name: "Unknown User",
              email: "unknown@example.com",
            },
            reason: report.reason,
            category: report.category,
            status: report.status,
            createdAt: report.createdAt,
          };
        })
      );

      return {
        success: true,
        reports: reportsWithDetails,
        count: reportsWithDetails.length,
      };
    } catch (error) {
      console.error("Get user reports error:", error);
      throw new Error("Failed to get user reports");
    }
  }

  // ===== DATA ENCRYPTION =====

  /**
   * Encrypt sensitive data
   * @param {String} text - Text to encrypt
   */
  encrypt(text) {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(
        this.algorithm,
        this.encryptionKey,
        iv
      );
      cipher.setAAD(Buffer.from("ride-buddy-data"));

      let encrypted = cipher.update(text, "utf8", "hex");
      encrypted += cipher.final("hex");

      const authTag = cipher.getAuthTag();

      return {
        encrypted,
        iv: iv.toString("hex"),
        authTag: authTag.toString("hex"),
      };
    } catch (error) {
      console.error("Encryption error:", error);
      throw new Error("Failed to encrypt data");
    }
  }

  /**
   * Decrypt sensitive data
   * @param {Object} encryptedData - Encrypted data object
   */
  decrypt(encryptedData) {
    try {
      const { encrypted, iv, authTag } = encryptedData;
      const decipher = crypto.createDecipheriv(
        this.algorithm,
        this.encryptionKey,
        Buffer.from(iv, "hex")
      );

      decipher.setAAD(Buffer.from("ride-buddy-data"));
      decipher.setAuthTag(Buffer.from(authTag, "hex"));

      let decrypted = decipher.update(encrypted, "hex", "utf8");
      decrypted += decipher.final("utf8");

      return decrypted;
    } catch (error) {
      console.error("Decryption error:", error);
      throw new Error("Failed to decrypt data");
    }
  }

  // ===== INPUT SANITIZATION =====

  /**
   * Sanitize user input to prevent XSS and injection attacks
   * @param {String} input - Input to sanitize
   */
  sanitizeInput(input) {
    if (typeof input !== "string") return input;

    return input
      .trim()
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/<[^>]*>/g, "")
      .replace(/javascript:/gi, "")
      .replace(/on\w+\s*=/gi, "")
      .substring(0, 1000); // Limit length
  }

  /**
   * Validate and sanitize message content
   * @param {String} message - Message to validate
   */
  validateMessage(message) {
    if (!message || typeof message !== "string") {
      throw new Error("Message is required and must be a string");
    }

    const sanitized = this.sanitizeInput(message);

    if (sanitized.length === 0) {
      throw new Error("Message cannot be empty after sanitization");
    }

    if (sanitized.length > 500) {
      throw new Error("Message is too long (max 500 characters)");
    }

    // Check for spam patterns
    if (this.isSpamMessage(sanitized)) {
      throw new Error("Message appears to be spam");
    }

    return sanitized;
  }

  /**
   * Check if message appears to be spam
   * @param {String} message - Message to check
   */
  isSpamMessage(message) {
    const spamPatterns = [
      /(.)\1{10,}/i, // Repeated characters
      /(https?:\/\/[^\s]+){3,}/i, // Multiple URLs
      /\b(buy|sell|cheap|free|money|cash|prize|winner)\b.*\b(now|today|urgent)\b/i,
      /\b(call|text|whatsapp)\s*\+?\d{10,}/i, // Phone numbers
    ];

    return spamPatterns.some((pattern) => pattern.test(message));
  }

  // ===== AUTOMATIC DATA CLEANUP =====

  /**
   * Clean up expired and old data
   */
  async performDataCleanup() {
    try {
      const results = {
        expiredSearches: 0,
        expiredRequests: 0,
        oldReports: 0,
        archivedChats: 0,
      };

      // Clean up expired searches (older than 24 hours)
      const searchesCollection = await dbService.getCollection(
        "rideBuddySearches"
      );
      const expiredSearches = await searchesCollection.deleteMany({
        expiresAt: { $lt: new Date() },
      });
      results.expiredSearches = expiredSearches.deletedCount;

      // Clean up expired requests (older than 24 hours)
      const requestsCollection = await dbService.getCollection(
        "rideBuddyRequests"
      );
      const expiredRequests = await requestsCollection.deleteMany({
        expiresAt: { $lt: new Date() },
      });
      results.expiredRequests = expiredRequests.deletedCount;

      // Archive old reports (older than 90 days and resolved)
      const reportsCollection = await dbService.getCollection("userReports");
      const oldDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const oldReports = await reportsCollection.updateMany(
        {
          createdAt: { $lt: oldDate },
          status: { $in: ["resolved", "dismissed"] },
        },
        {
          $set: { archived: true, archivedAt: new Date() },
        }
      );
      results.oldReports = oldReports.modifiedCount;

      // Archive old chats (older than 30 days and inactive)
      const chatsCollection = await dbService.getCollection("rideBuddyChats");
      const chatArchiveDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const oldChats = await chatsCollection.updateMany(
        {
          lastMessageAt: { $lt: chatArchiveDate },
          status: "active",
        },
        {
          $set: { status: "archived", archivedAt: new Date() },
        }
      );
      results.archivedChats = oldChats.modifiedCount;

      console.log("Data cleanup completed:", results);
      return results;
    } catch (error) {
      console.error("Data cleanup error:", error);
      throw new Error("Failed to perform data cleanup");
    }
  }

  // ===== HELPER METHODS =====

  /**
   * Clean up interactions between two users (matches, requests, chats)
   * @param {String} userId1 - First user ID
   * @param {String} userId2 - Second user ID
   */
  async cleanupUserInteractions(userId1, userId2) {
    try {
      // End any active matches
      const matchesCollection = await dbService.getCollection(
        "rideBuddyMatches"
      );
      await matchesCollection.updateMany(
        {
          $or: [
            {
              user1Id: new ObjectId(userId1),
              user2Id: new ObjectId(userId2),
            },
            {
              user1Id: new ObjectId(userId2),
              user2Id: new ObjectId(userId1),
            },
          ],
          status: "active",
        },
        {
          $set: {
            status: "cancelled",
            cancelledAt: new Date(),
            cancelReason: "User blocked",
          },
        }
      );

      // Cancel any pending requests
      const requestsCollection = await dbService.getCollection(
        "rideBuddyRequests"
      );
      await requestsCollection.updateMany(
        {
          $or: [
            {
              senderId: new ObjectId(userId1),
              receiverId: new ObjectId(userId2),
            },
            {
              senderId: new ObjectId(userId2),
              receiverId: new ObjectId(userId1),
            },
          ],
          status: "pending",
        },
        {
          $set: {
            status: "cancelled",
            cancelledAt: new Date(),
            cancelReason: "User blocked",
          },
        }
      );

      // Archive any active chats
      const chatsCollection = await dbService.getCollection("rideBuddyChats");
      await chatsCollection.updateMany(
        {
          "participants.userId": {
            $all: [new ObjectId(userId1), new ObjectId(userId2)],
          },
          status: "active",
        },
        {
          $set: {
            status: "archived",
            archivedAt: new Date(),
            archiveReason: "User blocked",
          },
        }
      );
    } catch (error) {
      console.error("Cleanup user interactions error:", error);
    }
  }

  /**
   * Check if user should be auto-blocked based on reports
   * @param {String} userId - ID of user to check
   */
  async checkAutoBlock(userId) {
    try {
      const collection = await dbService.getCollection("userReports");

      // Count recent reports from different users
      const recentDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days
      const reportCount = await collection.countDocuments({
        reportedId: new ObjectId(userId),
        createdAt: { $gte: recentDate },
        status: "pending",
      });

      // Auto-block if 3 or more reports in 7 days
      if (reportCount >= 3) {
        const usersCollection = await dbService.getCollection("users");
        await usersCollection.updateOne(
          { _id: new ObjectId(userId) },
          {
            $set: {
              isBlocked: true,
              blockedAt: new Date(),
              blockReason: "Multiple reports",
              autoBlocked: true,
            },
          }
        );

        console.log(`User ${userId} auto-blocked due to multiple reports`);
      }
    } catch (error) {
      console.error("Auto-block check error:", error);
    }
  }

  /**
   * Filter users based on blocking status
   * @param {String} currentUserId - Current user ID
   * @param {Array} userList - List of users to filter
   */
  async filterBlockedUsers(currentUserId, userList) {
    try {
      const collection = await dbService.getCollection("userBlocks");

      // Get all blocks involving current user
      const blocks = await collection
        .find({
          $or: [
            { blockerId: new ObjectId(currentUserId) },
            { blockedId: new ObjectId(currentUserId) },
          ],
          status: "active",
        })
        .toArray();

      const blockedUserIds = new Set();
      blocks.forEach((block) => {
        if (block.blockerId.toString() === currentUserId) {
          blockedUserIds.add(block.blockedId.toString());
        } else {
          blockedUserIds.add(block.blockerId.toString());
        }
      });

      // Filter out blocked users
      return userList.filter((user) => {
        const userId = user.userId || user._id || user.id;
        return !blockedUserIds.has(userId.toString());
      });
    } catch (error) {
      console.error("Filter blocked users error:", error);
      return userList; // Return original list if filtering fails
    }
  }
}

module.exports = new SecurityService();
