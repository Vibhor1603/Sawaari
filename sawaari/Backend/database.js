const { MongoClient } = require("mongodb");
const performanceMonitor = require("./performanceMonitor");
require("dotenv").config();

// Enhanced database connection with connection pooling and security
class DatabaseService {
  constructor() {
    this.client = null;
    this.db = null;
    this.isConnected = false;
    this.connectionOptions = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4, // Use IPv4, skip trying IPv6
      retryWrites: true,
      w: "majority",
    };
  }

  async connect() {
    if (this.isConnected && this.client) {
      return this.db;
    }

    try {
      this.client = new MongoClient(
        process.env.MONGO_URL || "mongodb://localhost:27017/",
        this.connectionOptions
      );

      await this.client.connect();
      this.db = this.client.db(process.env.DB_NAME || "Sawaari");
      this.isConnected = true;

      console.log("Connected to MongoDB successfully");
      return this.db;
    } catch (error) {
      console.error("Failed to connect to MongoDB:", error);
      throw new Error("Database connection failed");
    }
  }

  async disconnect() {
    if (this.client && this.isConnected) {
      await this.client.close();
      this.isConnected = false;
      console.log("Disconnected from MongoDB");
    }
  }

  async getCollection(collectionName) {
    if (!this.isConnected) {
      await this.connect();
    }
    return this.db.collection(collectionName);
  }

  // Enhanced error handling wrapper
  async executeOperation(operation) {
    try {
      if (!this.isConnected) {
        console.log("Database not connected, attempting to connect...");
        await this.connect();
      }
      return await operation();
    } catch (error) {
      console.error("Database operation failed:", error);
      console.error("Error details:", {
        name: error.name,
        message: error.message,
        code: error.code,
        stack: error.stack,
      });

      // Try to reconnect if connection was lost
      if (
        error.name === "MongoNetworkError" ||
        error.name === "MongoServerSelectionError"
      ) {
        console.log("Attempting to reconnect to database...");
        this.isConnected = false;
        try {
          await this.connect();
          return await operation();
        } catch (retryError) {
          console.error("Retry failed:", retryError);
          throw new Error(`Database operation failed: ${retryError.message}`);
        }
      }

      throw new Error(`Database operation failed: ${error.message}`);
    }
  }
}

// Create singleton instance
const dbService = new DatabaseService();

// Enhanced ride buddy database operations
const ridebuddy_db = async (data) => {
  return await dbService.executeOperation(async () => {
    const collection = await dbService.getCollection("rideBuddy");

    // Add timestamp and sanitize data
    const sanitizedData = {
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await collection.insertOne(sanitizedData);
    return {
      success: true,
      insertedId: result.insertedId,
      message: "Ride buddy data saved successfully",
    };
  });
};

const rideInfo_db = async (filters = {}) => {
  return await dbService.executeOperation(async () => {
    const collection = await dbService.getCollection("rideBuddy");

    // Add basic filtering and sorting
    const query = {
      ...filters,
      // Only return recent entries (last 30 days)
      createdAt: {
        $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      },
    };

    const result = await collection
      .find(query)
      .sort({ createdAt: -1 })
      .limit(100) // Limit results for performance
      .toArray();

    return result;
  });
};

// User management operations
const createUser = async (userData) => {
  return await dbService.executeOperation(async () => {
    const collection = await dbService.getCollection("users");

    console.log("📞 createUser received data:", {
      name: userData.name,
      email: userData.email,
      phone: userData.phone,
      hasPhone: !!userData.phone,
      phoneLength: userData.phone ? userData.phone.length : 0,
    });

    const userDoc = {
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
      loginAttempts: 0,
      lastLogin: null,
    };

    console.log("📞 User document to be inserted:", {
      name: userDoc.name,
      email: userDoc.email,
      phone: userDoc.phone,
      hasPhone: !!userDoc.phone,
      phoneLength: userDoc.phone ? userDoc.phone.length : 0,
    });

    const result = await collection.insertOne(userDoc);

    console.log("📞 User inserted successfully:", {
      insertedId: result.insertedId,
      success: true,
    });

    return {
      success: true,
      insertedId: result.insertedId,
      message: "User created successfully",
    };
  });
};

const findUserByEmail = async (email) => {
  return await dbService.executeOperation(async () => {
    const collection = await dbService.getCollection("users");
    const user = await collection.findOne({
      email: email.toLowerCase(),
      isActive: true,
    });

    console.log("📞 findUserByEmail result:", {
      email: email.toLowerCase(),
      found: !!user,
      hasPhone: !!user?.phone,
      phone: user?.phone,
      phoneLength: user?.phone ? user.phone.length : 0,
    });

    return user;
  });
};

const updateUserLoginInfo = async (email, loginData) => {
  return await dbService.executeOperation(async () => {
    const collection = await dbService.getCollection("users");
    return await collection.updateOne(
      { email: email.toLowerCase() },
      {
        $set: {
          lastLogin: new Date(),
          updatedAt: new Date(),
          ...loginData,
        },
      }
    );
  });
};

// Hotspots operations
const getHotspots = async () => {
  return await dbService.executeOperation(async () => {
    const collection = await dbService.getCollection("hotspots");
    return await collection.find({}).toArray();
  });
};

// Feedback operations
const saveFeedback = async (feedbackData) => {
  return await dbService.executeOperation(async () => {
    const collection = await dbService.getCollection("feedbacks");

    const feedbackDoc = {
      ...feedbackData,
      createdAt: new Date(),
      status: "pending",
      isRead: false,
    };

    const result = await collection.insertOne(feedbackDoc);
    return {
      success: true,
      insertedId: result.insertedId,
      message: "Feedback saved successfully",
    };
  });
};

// Refresh token operations
const saveRefreshToken = async (userId, tokenData) => {
  return await dbService.executeOperation(async () => {
    const collection = await dbService.getCollection("refreshTokens");

    // Remove old tokens for this user
    await collection.deleteMany({ userId });

    const tokenDoc = {
      userId,
      ...tokenData,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    };

    return await collection.insertOne(tokenDoc);
  });
};

const findRefreshToken = async (tokenId) => {
  return await dbService.executeOperation(async () => {
    const collection = await dbService.getCollection("refreshTokens");
    return await collection.findOne({
      tokenId,
      expiresAt: { $gt: new Date() },
    });
  });
};

const revokeRefreshToken = async (tokenId) => {
  return await dbService.executeOperation(async () => {
    const collection = await dbService.getCollection("refreshTokens");
    return await collection.deleteOne({ tokenId });
  });
};

// Ride Buddy Collections Operations

// RideBuddySearches Collection Operations
const createRideBuddySearch = async (searchData) => {
  return await dbService.executeOperation(async () => {
    const collection = await dbService.getCollection("rideBuddySearches");

    const searchDoc = {
      ...searchData,
      status: "active",
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      lastActive: new Date(),
    };

    const result = await collection.insertOne(searchDoc);
    return {
      success: true,
      insertedId: result.insertedId,
      message: "Ride buddy search created successfully",
    };
  });
};

const findRideBuddySearches = async (filters = {}) => {
  return await dbService.executeOperation(async () => {
    const collection = await dbService.getCollection("rideBuddySearches");

    const query = {
      ...filters,
      status: "active",
      expiresAt: { $gt: new Date() },
    };

    return await collection.find(query).sort({ createdAt: -1 }).toArray();
  });
};

const updateRideBuddySearch = async (searchId, updateData) => {
  return await dbService.executeOperation(async () => {
    const collection = await dbService.getCollection("rideBuddySearches");
    return await collection.updateOne(
      { _id: searchId },
      {
        $set: {
          ...updateData,
          updatedAt: new Date(),
          lastActive: new Date(),
        },
      }
    );
  });
};

const deleteRideBuddySearch = async (searchId) => {
  return await dbService.executeOperation(async () => {
    const collection = await dbService.getCollection("rideBuddySearches");
    return await collection.deleteOne({ _id: searchId });
  });
};

// RideBuddyRequests Collection Operations
const createRideBuddyRequest = async (requestData) => {
  return await dbService.executeOperation(async () => {
    const collection = await dbService.getCollection("rideBuddyRequests");

    const requestDoc = {
      ...requestData,
      status: "pending",
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    };

    const result = await collection.insertOne(requestDoc);
    return {
      success: true,
      insertedId: result.insertedId,
      message: "Ride buddy request created successfully",
    };
  });
};

const findRideBuddyRequests = async (filters = {}) => {
  return await dbService.executeOperation(async () => {
    const collection = await dbService.getCollection("rideBuddyRequests");

    const query = {
      ...filters,
      expiresAt: { $gt: new Date() },
    };

    return await collection.find(query).sort({ createdAt: -1 }).toArray();
  });
};

const updateRideBuddyRequest = async (requestId, updateData) => {
  return await dbService.executeOperation(async () => {
    const collection = await dbService.getCollection("rideBuddyRequests");
    return await collection.updateOne(
      { _id: requestId },
      {
        $set: {
          ...updateData,
          respondedAt: new Date(),
        },
      }
    );
  });
};

const deleteRideBuddyRequest = async (requestId) => {
  return await dbService.executeOperation(async () => {
    const collection = await dbService.getCollection("rideBuddyRequests");
    return await collection.deleteOne({ _id: requestId });
  });
};

// RideBuddyMatches Collection Operations
const createRideBuddyMatch = async (matchData) => {
  return await dbService.executeOperation(async () => {
    const collection = await dbService.getCollection("rideBuddyMatches");

    const matchDoc = {
      ...matchData,
      status: "active",
      createdAt: new Date(),
    };

    const result = await collection.insertOne(matchDoc);
    return {
      success: true,
      insertedId: result.insertedId,
      message: "Ride buddy match created successfully",
    };
  });
};

const findRideBuddyMatches = async (filters = {}) => {
  return await dbService.executeOperation(async () => {
    const collection = await dbService.getCollection("rideBuddyMatches");
    return await collection.find(filters).sort({ createdAt: -1 }).toArray();
  });
};

const updateRideBuddyMatch = async (matchId, updateData) => {
  return await dbService.executeOperation(async () => {
    const collection = await dbService.getCollection("rideBuddyMatches");
    return await collection.updateOne(
      { _id: matchId },
      {
        $set: {
          ...updateData,
          updatedAt: new Date(),
        },
      }
    );
  });
};

const deleteRideBuddyMatch = async (matchId) => {
  return await dbService.executeOperation(async () => {
    const collection = await dbService.getCollection("rideBuddyMatches");
    return await collection.deleteOne({ _id: matchId });
  });
};

// RideBuddyChats Collection Operations
const createRideBuddyChat = async (chatData) => {
  return await dbService.executeOperation(async () => {
    const collection = await dbService.getCollection("rideBuddyChats");

    const chatDoc = {
      ...chatData,
      messages: [],
      status: "active",
      createdAt: new Date(),
      lastMessageAt: new Date(),
    };

    const result = await collection.insertOne(chatDoc);
    return {
      success: true,
      insertedId: result.insertedId,
      message: "Ride buddy chat created successfully",
    };
  });
};

const findRideBuddyChats = async (filters = {}) => {
  return await dbService.executeOperation(async () => {
    const collection = await dbService.getCollection("rideBuddyChats");
    return await collection.find(filters).sort({ lastMessageAt: -1 }).toArray();
  });
};

const addMessageToChat = async (chatId, messageData) => {
  return await dbService.executeOperation(async () => {
    const collection = await dbService.getCollection("rideBuddyChats");

    const message = {
      ...messageData,
      timestamp: new Date(),
      readBy: [messageData.senderId], // Sender has read the message
    };

    return await collection.updateOne(
      { _id: chatId },
      {
        $push: { messages: message },
        $set: { lastMessageAt: new Date() },
      }
    );
  });
};

const markMessagesAsRead = async (chatId, userId) => {
  return await dbService.executeOperation(async () => {
    const collection = await dbService.getCollection("rideBuddyChats");
    return await collection.updateOne(
      { _id: chatId },
      {
        $addToSet: { "messages.$[].readBy": userId },
      }
    );
  });
};

const updateRideBuddyChat = async (chatId, updateData) => {
  return await dbService.executeOperation(async () => {
    const collection = await dbService.getCollection("rideBuddyChats");

    console.log(`Updating chat ${chatId} with data:`, updateData);

    // Check if updateData contains MongoDB operators (like $push, $set, etc.)
    const hasOperators = Object.keys(updateData).some((key) =>
      key.startsWith("$")
    );

    let updateQuery;
    if (hasOperators) {
      // If updateData already contains operators, use it directly but ensure updatedAt is set
      updateQuery = {
        ...updateData,
        $set: {
          ...(updateData.$set || {}),
          updatedAt: new Date(),
        },
      };
    } else {
      // If no operators, wrap in $set as before
      updateQuery = {
        $set: {
          ...updateData,
          updatedAt: new Date(),
        },
      };
    }

    console.log(`Final update query for chat ${chatId}:`, updateQuery);

    const result = await collection.updateOne({ _id: chatId }, updateQuery);

    console.log(`Update result for chat ${chatId}:`, {
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
      acknowledged: result.acknowledged,
    });

    return result;
  });
};

// Helper function to check if chat is expired
const isChatExpired = (chat) => {
  const CHAT_DURATION = 10 * 60 * 1000; // 10 minutes
  const chatAge = Date.now() - new Date(chat.createdAt).getTime();
  return chatAge > CHAT_DURATION;
};

// Helper function to get chat time remaining
const getChatTimeRemaining = (chat) => {
  const CHAT_DURATION = 10 * 60 * 1000; // 10 minutes
  const chatAge = Date.now() - new Date(chat.createdAt).getTime();
  return Math.max(0, CHAT_DURATION - chatAge);
};

// Cleanup operations for expired data
const cleanupExpiredSearches = async () => {
  return await dbService.executeOperation(async () => {
    const collection = await dbService.getCollection("rideBuddySearches");
    const result = await collection.deleteMany({
      expiresAt: { $lt: new Date() },
    });
    console.log(`Cleaned up ${result.deletedCount} expired searches`);
    return result;
  });
};

const cleanupExpiredRequests = async () => {
  return await dbService.executeOperation(async () => {
    const collection = await dbService.getCollection("rideBuddyRequests");
    const result = await collection.deleteMany({
      expiresAt: { $lt: new Date() },
    });
    console.log(`Cleaned up ${result.deletedCount} expired requests`);
    return result;
  });
};

// Initialize database indexes for ride buddy collections with performance optimizations
const initializeRideBuddyIndexes = async () => {
  try {
    await dbService.connect();

    // RideBuddySearches indexes - optimized for performance
    const searchesCollection = await dbService.getCollection(
      "rideBuddySearches"
    );

    // Compound indexes for common query patterns
    await searchesCollection.createIndex({ status: 1, expiresAt: 1 });
    await searchesCollection.createIndex({ userId: 1, status: 1 });
    await searchesCollection.createIndex({ userEmail: 1, status: 1 });
    await searchesCollection.createIndex({ status: 1, createdAt: -1 });

    // Geospatial indexes for location-based queries
    await searchesCollection.createIndex({ "source.coordinates": "2dsphere" });
    await searchesCollection.createIndex({
      "destination.coordinates": "2dsphere",
    });

    // TTL index for automatic cleanup
    await searchesCollection.createIndex(
      { expiresAt: 1 },
      { expireAfterSeconds: 0 }
    );

    // Text index for location name searches
    await searchesCollection.createIndex({
      "source.name": "text",
      "destination.name": "text",
    });

    // RideBuddyRequests indexes - optimized for performance
    const requestsCollection = await dbService.getCollection(
      "rideBuddyRequests"
    );

    // Compound indexes for common query patterns
    await requestsCollection.createIndex({ receiverId: 1, status: 1 });
    await requestsCollection.createIndex({ senderId: 1, status: 1 });
    await requestsCollection.createIndex({ status: 1, expiresAt: 1 });
    await requestsCollection.createIndex({ status: 1, createdAt: -1 });

    // TTL index for automatic cleanup
    await requestsCollection.createIndex(
      { expiresAt: 1 },
      { expireAfterSeconds: 0 }
    );

    // Unique index to prevent duplicate requests
    await requestsCollection.createIndex(
      { senderId: 1, receiverId: 1, status: 1 },
      {
        unique: true,
        partialFilterExpression: { status: "pending" },
      }
    );

    // RideBuddyMatches indexes - optimized for performance
    const matchesCollection = await dbService.getCollection("rideBuddyMatches");

    // Compound indexes for user queries
    await matchesCollection.createIndex({ user1Id: 1, status: 1 });
    await matchesCollection.createIndex({ user2Id: 1, status: 1 });
    await matchesCollection.createIndex({ status: 1, createdAt: -1 });

    // Note: MongoDB doesn't support $or in index specifications
    // The separate user1Id and user2Id indexes above handle both user queries efficiently

    // RideBuddyChats indexes - optimized for performance
    const chatsCollection = await dbService.getCollection("rideBuddyChats");

    // Compound indexes for common queries
    await chatsCollection.createIndex({ matchId: 1, status: 1 });
    await chatsCollection.createIndex({ "participants.userId": 1, status: 1 });
    await chatsCollection.createIndex({ status: 1, lastMessageAt: -1 });

    // Sparse index for message queries
    await chatsCollection.createIndex(
      { "messages.timestamp": -1 },
      { sparse: true }
    );

    // Security Collections Indexes - optimized for performance

    // UserBlocks indexes
    const blocksCollection = await dbService.getCollection("userBlocks");
    await blocksCollection.createIndex({ blockerId: 1, status: 1 });
    await blocksCollection.createIndex({ blockedId: 1, status: 1 });
    await blocksCollection.createIndex({ status: 1, createdAt: -1 });

    // Unique compound index to prevent duplicate blocks
    await blocksCollection.createIndex(
      { blockerId: 1, blockedId: 1 },
      { unique: true }
    );

    // UserReports indexes
    const reportsCollection = await dbService.getCollection("userReports");
    await reportsCollection.createIndex({ reporterId: 1, status: 1 });
    await reportsCollection.createIndex({ reportedId: 1, status: 1 });
    await reportsCollection.createIndex({ status: 1, category: 1 });
    await reportsCollection.createIndex({ status: 1, createdAt: -1 });
    await reportsCollection.createIndex({ archived: 1, createdAt: -1 });

    // Additional performance indexes for common collections

    // Users collection optimization
    const usersCollection = await dbService.getCollection("users");
    await usersCollection.createIndex({ email: 1 }, { unique: true });
    await usersCollection.createIndex({ isActive: 1, lastLogin: -1 });

    // Hotspots collection optimization
    const hotspotsCollection = await dbService.getCollection("hotspots");
    await hotspotsCollection.createIndex({ name: 1 });
    await hotspotsCollection.createIndex({ coordinates: "2dsphere" });

    // Feedbacks collection optimization
    const feedbacksCollection = await dbService.getCollection("feedbacks");
    await feedbacksCollection.createIndex({ status: 1, createdAt: -1 });
    await feedbacksCollection.createIndex({ isRead: 1, createdAt: -1 });

    console.log("✅ Optimized database indexes initialized successfully");
  } catch (error) {
    console.error("❌ Failed to initialize optimized indexes:", error);
    throw error;
  }
};

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("Received SIGINT, closing database connection...");
  await dbService.disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("Received SIGTERM, closing database connection...");
  await dbService.disconnect();
  process.exit(0);
});

module.exports = {
  dbService,
  ridebuddy_db,
  rideInfo_db,
  createUser,
  findUserByEmail,
  updateUserLoginInfo,
  getHotspots,
  saveFeedback,
  saveRefreshToken,
  findRefreshToken,
  revokeRefreshToken,
  // Ride Buddy Collections Operations
  createRideBuddySearch,
  findRideBuddySearches,
  updateRideBuddySearch,
  deleteRideBuddySearch,
  createRideBuddyRequest,
  findRideBuddyRequests,
  updateRideBuddyRequest,
  deleteRideBuddyRequest,
  createRideBuddyMatch,
  findRideBuddyMatches,
  updateRideBuddyMatch,
  deleteRideBuddyMatch,
  createRideBuddyChat,
  findRideBuddyChats,
  addMessageToChat,
  markMessagesAsRead,
  updateRideBuddyChat,
  cleanupExpiredSearches,
  cleanupExpiredRequests,
  initializeRideBuddyIndexes,
  isChatExpired,
  getChatTimeRemaining,
};
