const { ObjectId } = require("mongodb");
const routeMatchingService = require("./RouteMatchingService");
const chatService = require("./chatService");
const securityService = require("./securityService");
// Proxy service removed - users will see actual phone numbers after connection
const { rideBuddyCacheService } = require("./cacheService");
const {
  createRideBuddySearch,
  findRideBuddySearches,
  updateRideBuddySearch,
  createRideBuddyRequest,
  findRideBuddyRequests,
  updateRideBuddyRequest,
  createRideBuddyMatch,
  findRideBuddyMatches,
  updateRideBuddyMatch,
  createRideBuddyChat,
  findRideBuddyChats,
  updateRideBuddyChat,
  findUserByEmail,
} = require("./database");

// Update route matching service configuration
routeMatchingService.updateConfig({
  defaultRadius: 2, // 2km default search radius for nearby connections
  minOverlapPercentage: 25, // 25% minimum route overlap
  maxResults: 20, // Maximum 20 matches per search
});

/**
 * Clean up existing active searches for a user
 * @param {String} userId - User ID to clean up searches for
 */
const cleanupUserSearches = async (userId) => {
  try {
    const existingSearches = await findRideBuddySearches({
      userId: new ObjectId(userId),
      status: "active",
    });

    for (const search of existingSearches) {
      await updateRideBuddySearch(search._id, { status: "replaced" });
    }
  } catch (error) {
    console.error("Error cleaning up user searches:", error);
    // Don't throw error, just log it
  }
};

/**
 * Clean up expired searches (5 minutes instead of 10)
 */
const cleanupExpiredSearches = async () => {
  try {
    const now = new Date();

    // Find expired searches
    const expiredSearches = await findRideBuddySearches({
      status: "active",
      expiresAt: { $lt: now },
    });

    console.log(
      `🧹 Found ${expiredSearches.length} expired searches to clean up`
    );

    // Update expired searches
    for (const search of expiredSearches) {
      await updateRideBuddySearch(search._id, {
        status: "expired",
        expiredAt: now,
      });

      // Notify user if they're online
      try {
        await chatService.notifySearchExpired(search.userId.toString());
      } catch (notifyError) {
        console.error("Error notifying search expiry:", notifyError);
      }
    }

    return expiredSearches.length;
  } catch (error) {
    console.error("Error cleaning up expired searches:", error);
    return 0;
  }
};

/**
 * Check for mutual requests and create auto-connection
 * @param {String} senderId - ID of user sending request
 * @param {String} receiverId - ID of user receiving request
 * @returns {Object|null} - Existing mutual request or null
 */
const checkForMutualRequests = async (senderId, receiverId) => {
  try {
    // Check if receiver has already sent a request to sender
    const existingRequests = await findRideBuddyRequests({
      senderId: new ObjectId(receiverId),
      receiverId: new ObjectId(senderId),
      status: "pending",
    });

    return existingRequests.length > 0 ? existingRequests[0] : null;
  } catch (error) {
    console.error("Error checking for mutual requests:", error);
    return null;
  }
};

/**
 * Create automatic connection when mutual requests are detected
 * @param {Object} request1 - First request
 * @param {Object} request2 - Second request (new one being created)
 * @returns {Object} - Match and chat results
 */
const createAutoConnection = async (request1, request2) => {
  try {
    console.log("🤝 Creating auto-connection for mutual requests");

    // Mark both requests as auto-accepted
    await updateRideBuddyRequest(request1._id, {
      status: "auto-accepted",
      autoConnectedAt: new Date(),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes for auto-accepted connections
    });

    await updateRideBuddyRequest(request2._id, {
      status: "auto-accepted",
      autoConnectedAt: new Date(),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes for auto-accepted connections
    });

    // Create match immediately
    const matchData = {
      user1Id: request1.senderId,
      user1Email: request1.senderEmail,
      user1Name: request1.senderName,
      user1Phone: request1.senderPhone,
      user2Id: request2.senderId,
      user2Email: request2.senderEmail,
      user2Name: request2.senderName,
      user2Phone: request2.senderPhone,
      routeDetails: request1.routeDetails,
      connectionType: "auto-mutual",
    };

    const matchResult = await createRideBuddyMatch(matchData);

    // Create chat room
    const chatData = {
      matchId: matchResult.insertedId,
      participants: [
        {
          userId: request1.senderId,
          email: request1.senderEmail,
          name: request1.senderName,
          joinedAt: new Date(),
        },
        {
          userId: request2.senderId,
          email: request2.senderEmail,
          name: request2.senderName,
          joinedAt: new Date(),
        },
      ],
    };

    const chatResult = await createRideBuddyChat(chatData);

    // Update match with chat ID
    await updateRideBuddyMatch(matchResult.insertedId, {
      chatId: chatResult.insertedId,
    });

    // Clean up both users' active searches
    await cleanupUserSearches(request1.senderId.toString());
    await cleanupUserSearches(request2.senderId.toString());

    // Notify both users about auto-connection
    await Promise.all([
      chatService.notifyAutoConnection(request1.senderId.toString(), {
        matchId: matchResult.insertedId,
        chatId: chatResult.insertedId,
        partnerName: request2.senderName,
        partnerPhone: request2.senderPhone,
        partnerId: request2.senderId.toString(),
        routeDetails: request1.routeDetails,
      }),
      chatService.notifyAutoConnection(request2.senderId.toString(), {
        matchId: matchResult.insertedId,
        chatId: chatResult.insertedId,
        partnerName: request1.senderName,
        partnerPhone: request1.senderPhone,
        partnerId: request1.senderId.toString(),
        routeDetails: request1.routeDetails,
      }),
    ]);

    console.log("✅ Auto-connection created successfully");
    return { matchResult, chatResult };
  } catch (error) {
    console.error("Error creating auto-connection:", error);
    throw error;
  }
};

/**
 * Clean up expired requests
 */
const cleanupExpiredRequests = async () => {
  try {
    const now = new Date();

    // Find expired pending requests
    const expiredRequests = await findRideBuddyRequests({
      status: "pending",
      expiresAt: { $lt: now },
    });

    console.log(
      `🧹 Found ${expiredRequests.length} expired requests to clean up`
    );

    // Update expired requests to "expired" status
    for (const request of expiredRequests) {
      await updateRideBuddyRequest(request._id, {
        status: "expired",
        expiredAt: now,
      });
      console.log(
        `🧹 Expired request ${request._id} from ${request.senderName} to ${request.receiverName}`
      );
    }

    return expiredRequests.length;
  } catch (error) {
    console.error("Error cleaning up expired requests:", error);
    return 0;
  }
};

// Enhanced cleanup for expired requests
const cleanupExpiredPendingRequests = async () => {
  try {
    const now = new Date();
    const PENDING_EXPIRY = 10 * 60 * 1000; // 10 minutes for pending requests

    // Find expired pending requests
    const expiredPendingRequests = await findRideBuddyRequests({
      status: "pending",
      expiresAt: { $lt: now }, // Use expiresAt field instead of createdAt
    });

    console.log(
      `🧹 Found ${expiredPendingRequests.length} expired pending requests to clean up`
    );

    // Update expired pending requests to "expired" status
    for (const request of expiredPendingRequests) {
      await updateRideBuddyRequest(request._id, {
        status: "expired",
        expiredAt: now,
      });
      console.log(
        `🧹 Expired pending request ${request._id} from ${request.senderName} to ${request.receiverName}`
      );
    }

    return expiredPendingRequests.length;
  } catch (error) {
    console.error("Error cleaning up expired pending requests:", error);
    return 0;
  }
};

// Start periodic cleanup - enhanced with search cleanup
setInterval(async () => {
  const cleanedUpExpired = await cleanupExpiredRequests();
  const cleanedUpSearches = await cleanupExpiredSearches();
  const cleanedUpDuplicates = await cleanupDuplicateRequests();
  const cleanedUpPending = await cleanupExpiredPendingRequests();
  const cleanedUpMatches = await cleanupExpiredMatches();

  if (
    cleanedUpExpired > 0 ||
    cleanedUpPending > 0 ||
    cleanedUpMatches > 0 ||
    cleanedUpDuplicates > 0 ||
    cleanedUpSearches > 0
  ) {
    console.log(
      `🧹 Cleaned up ${cleanedUpExpired} expired requests, ${cleanedUpDuplicates} duplicates, ${cleanedUpPending} expired pending requests, ${cleanedUpMatches} expired matches, and ${cleanedUpSearches} expired searches`
    );
  }
}, 60000); // Run every minute

/**
 * Filter matches based on user preferences
 * @param {Array} matches - Array of potential matches
 * @param {Object} preferences - User preferences for filtering
 * @returns {Array} - Filtered matches
 */
const filterMatchesByPreferences = (matches, preferences) => {
  return matches.filter((match) => {
    // Add preference-based filtering logic here
    // For now, return all matches
    return true;
  });
};

/**
 * POST /api/ride-buddy/search
 * Create a ride buddy search and find potential matches with enhanced real-time matching
 */
const searchRideBuddies = async (req, res) => {
  try {
    const { source, destination, preferences = {} } = req.body;
    const userId = req.user.userId;
    const userEmail = req.user.email;
    const userName = req.user.name;

    // Validate required fields
    if (!source || !destination) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        message: "Source and destination are required",
      });
    }

    // Validate source and destination structure
    if (!source.name || !destination.name) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        message: "Source and destination must have name property",
      });
    }

    // Check for existing active search
    const existingSearch = await findRideBuddySearches({
      userId: new ObjectId(userId),
      status: "active",
      expiresAt: { $gt: new Date() },
    });

    if (existingSearch.length > 0) {
      return res.status(409).json({
        success: false,
        error: "Active search exists",
        message:
          "You already have an active search. Cancel it to start a new one.",
        data: {
          activeSearch: existingSearch[0],
          expiresAt: existingSearch[0].expiresAt,
          timeRemaining: Math.max(
            0,
            new Date(existingSearch[0].expiresAt) - new Date()
          ),
        },
      });
    }

    // Get user phone number
    const userPhone = req.user.phone;
    console.log(`🔍 User data in search:`, {
      userId: req.user.userId,
      email: req.user.email,
      name: req.user.name,
      phone: req.user.phone,
      hasPhone: !!req.user.phone,
    });

    // Create search data structure with 5-minute expiry
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now
    const searchData = {
      userId: new ObjectId(userId),
      userEmail,
      userName,
      userPhone,
      source: {
        name: source.name,
        coordinates: source.coordinates || null,
      },
      destination: {
        name: destination.name,
        coordinates: destination.coordinates || null,
      },
      route: {
        distance: source.distance || 0,
        estimatedFare: source.estimatedFare || 0,
        waypoints: source.waypoints || [],
      },
      searchRadius:
        preferences.searchRadius ||
        routeMatchingService.DEFAULT_CONFIG.defaultRadius,
      preferences: {
        maxPassengers: preferences.maxPassengers || 4,
        gender: preferences.gender || "any",
        smokingAllowed: preferences.smokingAllowed || false,
        maxWaitTime: preferences.maxWaitTime || 15,
      },
      status: "active",
      expiresAt,
      lastActive: new Date(),
      searchKey: `${userId}-${Date.now()}`,
    };

    // Remove any existing active searches for this user
    await cleanupUserSearches(userId);

    // Store the search in database
    const searchResult = await createRideBuddySearch(searchData);
    console.log(`✅ Search stored for user ${userName}:`, {
      searchId: searchResult.insertedId,
      source: searchData.source.name,
      destination: searchData.destination.name,
      expiresAt: searchData.expiresAt,
    });

    // Find existing active matches using enhanced matching
    let matches = [];
    try {
      const userRoute = {
        userId,
        userEmail,
        userName,
        userPhone,
        source: searchData.source,
        destination: searchData.destination,
        route: searchData.route,
      };

      // Use the new findActiveMatches method for real-time bidirectional matching
      matches = await routeMatchingService.findActiveMatches(userRoute, userId);

      // Filter matches based on user preferences
      matches = filterMatchesByPreferences(matches, searchData.preferences);

      // Filter out blocked users
      matches = await securityService.filterBlockedUsers(userId, matches);

      // Notify existing searchers about this new search
      await routeMatchingService.notifyExistingSearchers(
        userRoute,
        chatService
      );
    } catch (matchError) {
      console.error("Error finding matches:", matchError);
      // Continue without matches if matching fails
    }

    res.status(201).json({
      success: true,
      message: "Ride buddy search created successfully",
      data: {
        searchId: searchResult.insertedId,
        matches: matches.map((match) => ({
          userId: match.userId,
          userEmail: match.userEmail,
          userName: match.userName,
          route: match.route,
          overlapPercentage: match.overlap.overlapPercentage,
          sharedDistance: match.overlap.sharedDistance,
          estimatedSharedFare: match.fareSharing.sharedFare,
          savings: match.fareSharing.savings1,
          searchTimestamp: match.searchTimestamp,
          searchId: match.searchId,
        })),
        matchCount: matches.length,
        searchRadius: searchData.searchRadius,
        expiresAt,
        isActive: true,
        timeRemaining: 5 * 60 * 1000, // 5 minutes in milliseconds
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Ride buddy search error:", error);
    res.status(500).json({
      success: false,
      error: "Search failed",
      message: "Unable to process ride buddy search",
    });
  }
};

/**
 * Helper function to clean up expired connections
 */
const cleanupExpiredConnections = async (userId1, userId2) => {
  try {
    const CONNECTION_DURATION = 10 * 60 * 1000; // 10 minutes
    const now = Date.now();

    // Find expired accepted requests
    const expiredRequests = await findRideBuddyRequests({
      $or: [
        { senderId: new ObjectId(userId1), receiverId: new ObjectId(userId2) },
        { senderId: new ObjectId(userId2), receiverId: new ObjectId(userId1) },
      ],
      status: "accepted",
      updatedAt: { $lt: new Date(now - CONNECTION_DURATION) },
    });

    // Clean up expired requests and their associated matches/chats
    for (const request of expiredRequests) {
      console.log(`🧹 Cleaning up expired connection: ${request._id}`);

      // Update request status to expired
      await updateRideBuddyRequest(request._id, {
        status: "expired",
        expiredAt: new Date(),
      });

      // Find and update associated matches
      const matches = await findRideBuddyMatches({
        requestId: request._id,
      });

      for (const match of matches) {
        await updateRideBuddyMatch(match._id, {
          status: "expired",
          expiredAt: new Date(),
        });
      }
    }

    return expiredRequests.length;
  } catch (error) {
    console.error("Error cleaning up expired connections:", error);
    return 0;
  }
};

/**
 * POST /api/ride-buddy/request
 * Send a connection request to another user
 */
const sendRequest = async (req, res) => {
  try {
    const { receiverId, routeDetails, message = "" } = req.body;
    const senderId = req.user.userId;
    const senderEmail = req.user.email;
    const senderName = req.user.name;

    // Clean up any expired connections between these users first
    const cleanedUp = await cleanupExpiredConnections(senderId, receiverId);
    if (cleanedUp > 0) {
      console.log(
        `🧹 Cleaned up ${cleanedUp} expired connections between users`
      );
    }

    // Check for mutual requests (receiver has already sent request to sender)
    const mutualRequest = await checkForMutualRequests(senderId, receiverId);
    if (mutualRequest) {
      console.log("🤝 Mutual request detected, creating auto-connection");

      // Create the new request first
      const newRequestData = {
        senderId: new ObjectId(senderId),
        senderEmail,
        senderName,
        senderPhone: req.user.phone,
        receiverId: new ObjectId(receiverId),
        receiverEmail: mutualRequest.senderEmail,
        receiverName: mutualRequest.senderName,
        receiverPhone: mutualRequest.senderPhone,
        routeDetails,
        message: message.trim(),
        status: "pending", // Will be updated to auto-accepted
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        requestKey: `${senderId}-${receiverId}-${Date.now()}`,
      };

      const newRequestResult = await createRideBuddyRequest(newRequestData);
      newRequestData._id = newRequestResult.insertedId;

      // Create auto-connection
      const { matchResult, chatResult } = await createAutoConnection(
        mutualRequest,
        newRequestData
      );

      return res.status(201).json({
        success: true,
        message:
          "Automatically connected! You both sent requests to each other.",
        data: {
          requestId: newRequestResult.insertedId,
          matchId: matchResult.insertedId,
          chatId: chatResult.insertedId,
          partnerName: mutualRequest.senderName,
          partnerPhone: mutualRequest.senderPhone,
          connectionType: "auto-mutual",
          estimatedSharedFare: routeDetails.estimatedSharedFare,
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Validate required fields
    if (!receiverId || !routeDetails) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        message: "Receiver ID and route details are required",
      });
    }

    // Prevent self-requests
    if (senderId === receiverId) {
      return res.status(400).json({
        success: false,
        error: "Invalid request",
        message: "Cannot send request to yourself",
      });
    }

    // Check if users have blocked each other
    const isBlocked = await securityService.isUserBlocked(senderId, receiverId);
    if (isBlocked) {
      return res.status(403).json({
        success: false,
        error: "Request blocked",
        message: "Cannot send request to this user",
      });
    }

    // Check for any existing requests between these users (pending, accepted, or declined)
    // Also check for very recent requests (within last 10 seconds) to prevent race conditions (reduced for testing)
    const thirtySecondsAgo = new Date(Date.now() - 10 * 1000);

    const existingRequests = await findRideBuddyRequests({
      $or: [
        {
          senderId: new ObjectId(senderId),
          receiverId: new ObjectId(receiverId),
        },
        {
          senderId: new ObjectId(receiverId),
          receiverId: new ObjectId(senderId),
        },
      ],
    });

    // Also check for very recent requests from the same sender to prevent rapid-fire duplicates
    const recentRequests = await findRideBuddyRequests({
      senderId: new ObjectId(senderId),
      receiverId: new ObjectId(receiverId),
      createdAt: { $gt: thirtySecondsAgo },
    });

    if (recentRequests.length > 0) {
      console.log(
        `🚫 Blocking rapid duplicate request - found ${recentRequests.length} recent requests`
      );
      return res.status(429).json({
        success: false,
        error: "Too many requests",
        message: "Please wait before sending another request to this user",
      });
    }

    console.log(
      `🔍 Found ${existingRequests.length} existing requests between users ${senderId} and ${receiverId}`
    );
    existingRequests.forEach((req) => {
      console.log(
        `  - Request ${req._id}: ${req.status} (created: ${req.createdAt}, updated: ${req.updatedAt})`
      );
    });

    // Check for pending requests (in either direction) and if they're still valid
    const pendingRequests = existingRequests.filter(
      (req) => req.status === "pending"
    );

    if (pendingRequests.length > 0) {
      for (const pendingRequest of pendingRequests) {
        const requestAge =
          Date.now() - new Date(pendingRequest.createdAt).getTime();
        const PENDING_REQUEST_DURATION = 10 * 60 * 1000; // 10 minutes for pending requests

        if (requestAge <= PENDING_REQUEST_DURATION) {
          const direction =
            pendingRequest.senderId.toString() === senderId
              ? "outgoing"
              : "incoming";
          console.log(
            `🚫 Blocking duplicate request - found ${direction} pending request ${pendingRequest._id}`
          );

          return res.status(409).json({
            success: false,
            error: "Duplicate request",
            message:
              direction === "outgoing"
                ? "You have already sent a request to this user"
                : "This user has already sent you a request. Please check your connections tab.",
          });
        }
      }

      // All pending requests have expired, clean them up
      console.log(
        `🧹 Cleaning up ${pendingRequests.length} expired pending requests`
      );
      for (const expiredRequest of pendingRequests) {
        await updateRideBuddyRequest(expiredRequest._id, {
          status: "expired",
          expiredAt: new Date(),
        });
      }
    }

    // Check for accepted connections and if they're still active (within 15 minutes)
    const acceptedConnection = existingRequests.find(
      (req) => req.status === "accepted"
    );
    if (acceptedConnection) {
      // Check if the connection has expired (15 minutes from acceptance)
      const connectionAge =
        Date.now() - new Date(acceptedConnection.updatedAt).getTime();
      const CONNECTION_DURATION = 15 * 60 * 1000; // 15 minutes total (10 chat + 5 contact)

      if (connectionAge <= CONNECTION_DURATION) {
        return res.status(409).json({
          success: false,
          error: "Already connected",
          message:
            "You are already connected with this user. Connection expires in " +
            Math.ceil((CONNECTION_DURATION - connectionAge) / 60000) +
            " minutes.",
        });
      }

      // Connection has expired, we can allow a new request
      console.log(
        `🕐 Previous connection with user ${receiverId} has expired, allowing new request`
      );
    }

    // Allow new requests if previous ones were declined (after some time)
    const recentDeclined = existingRequests.find(
      (req) =>
        req.status === "declined" &&
        new Date() - new Date(req.updatedAt) < 24 * 60 * 60 * 1000 // 24 hours
    );

    if (recentDeclined) {
      return res.status(409).json({
        success: false,
        error: "Request too soon",
        message:
          "Please wait 24 hours before sending another request to this user",
      });
    }

    // Get receiver information from their active search
    const receiverSearches = await findRideBuddySearches({
      userId: new ObjectId(receiverId),
      status: "active",
    });

    if (receiverSearches.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Receiver not found",
        message: "Receiver does not have an active search",
      });
    }

    const receiverSearch = receiverSearches[0];

    // Get sender user data to include phone number
    const senderUser = await findUserByEmail(senderEmail);
    const senderPhone = senderUser?.phone;
    console.log(
      `📞 Sender phone number: ${senderPhone} (from user: ${senderEmail})`
    );
    console.log(`📞 Sender user data:`, {
      id: senderUser?._id,
      email: senderUser?.email,
      name: senderUser?.name,
      phone: senderUser?.phone,
      hasPhone: !!senderUser?.phone,
    });

    // Get receiver phone from search data (if available)
    const receiverPhone = receiverSearch.userPhone;
    console.log(
      `📞 Receiver phone number: ${receiverPhone} (from search: ${receiverSearch.userEmail})`
    );
    console.log(`📞 Receiver search data:`, {
      userId: receiverSearch.userId,
      email: receiverSearch.userEmail,
      name: receiverSearch.userName,
      phone: receiverSearch.userPhone,
      hasPhone: !!receiverSearch.userPhone,
    });

    // Create request data with expiration
    const requestData = {
      senderId: new ObjectId(senderId),
      senderEmail,
      senderName,
      senderPhone,
      receiverId: new ObjectId(receiverId),
      receiverEmail: receiverSearch.userEmail,
      receiverName: receiverSearch.userName,
      receiverPhone,
      routeDetails: {
        senderRoute: routeDetails.senderRoute,
        receiverRoute: routeDetails.receiverRoute,
        overlapPercentage: routeDetails.overlapPercentage,
        sharedDistance: routeDetails.sharedDistance,
        estimatedSharedFare: routeDetails.estimatedSharedFare,
      },
      message: message.trim(),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes from now
    };

    // Add a unique identifier to prevent race condition duplicates
    const requestKey = `${senderId}-${receiverId}-${Date.now()}`;
    requestData.requestKey = requestKey;

    // Save request to database
    const result = await createRideBuddyRequest(requestData);

    // Send real-time notification to receiver immediately
    try {
      console.log(
        `🔔 Sending immediate notification to user ${receiverId} (type: ${typeof receiverId})`
      );
      await chatService.notifyRideBuddyRequest(receiverId, {
        _id: result.insertedId,
        requestId: result.insertedId,
        senderId: senderId,
        senderName,
        senderEmail,
        senderPhone,
        routeDetails: requestData.routeDetails,
        message: requestData.message,
        timestamp: new Date().toISOString(),
      });
      console.log(`✅ Notification sent successfully to user ${receiverId}`);
    } catch (notificationError) {
      console.error(
        "❌ Error sending real-time notification:",
        notificationError
      );
      // Don't fail the request if notification fails
    }

    // Invalidate cache for both sender and receiver to ensure fresh data
    rideBuddyCacheService.matchCache.delete(`requests:${senderId}`);
    rideBuddyCacheService.matchCache.delete(`requests:${receiverId}`);
    console.log(
      `🧹 Invalidated request cache for users ${senderId} and ${receiverId}`
    );

    res.status(201).json({
      success: true,
      message: "Connection request sent successfully",
      data: {
        requestId: result.insertedId,
        receiverName: receiverSearch.userName,
        estimatedSharedFare: routeDetails.estimatedSharedFare,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Send request error:", error);
    res.status(500).json({
      success: false,
      error: "Request failed",
      message: "Unable to send connection request",
    });
  }
};

/**
 * PUT /api/ride-buddy/request/:id
 * Accept or decline a connection request
 */
const handleRequest = async (req, res) => {
  try {
    const { id: requestId } = req.params;
    const { action, message = "" } = req.body;
    const userId = req.user.userId;

    console.log("🔧 Handle request debug:", {
      requestId,
      action,
      message,
      userId,
      body: req.body,
      params: req.params,
      headers: {
        authorization: req.headers.authorization ? "Bearer [REDACTED]" : "None",
        contentType: req.headers["content-type"],
      },
    });

    // Validate request ID
    if (!requestId) {
      console.error(`❌ Missing request ID`);
      return res.status(400).json({
        success: false,
        error: "Missing request ID",
        message: "Request ID is required",
      });
    }

    if (!ObjectId.isValid(requestId)) {
      console.error(`❌ Invalid request ID format: ${requestId}`);
      return res.status(400).json({
        success: false,
        error: "Invalid request ID",
        message: "Request ID must be a valid ObjectId",
      });
    }

    // Validate action
    if (!action) {
      console.error(`❌ Missing action`);
      return res.status(400).json({
        success: false,
        error: "Missing action",
        message: "Action is required",
      });
    }

    if (!["accept", "decline"].includes(action)) {
      console.error(`❌ Invalid action: ${action}`);
      return res.status(400).json({
        success: false,
        error: "Invalid action",
        message: "Action must be 'accept' or 'decline'",
      });
    }

    // Validate user ID
    if (!userId) {
      console.error(`❌ Missing user ID from token`);
      return res.status(401).json({
        success: false,
        error: "Authentication required",
        message: "User ID not found in token",
      });
    }

    // Find the request
    console.log(`🔍 Looking for request ${requestId} for user ${userId}`);
    const requests = await findRideBuddyRequests({
      _id: new ObjectId(requestId),
      receiverId: new ObjectId(userId),
      status: "pending",
    });

    console.log(`📋 Found ${requests.length} matching requests`);

    if (requests.length === 0) {
      console.error(
        `❌ Request ${requestId} not found or already processed for user ${userId}`
      );

      // Check if request exists but for different user or with different status
      const anyRequest = await findRideBuddyRequests({
        _id: new ObjectId(requestId),
      });

      if (anyRequest.length > 0) {
        const req = anyRequest[0];
        console.log(`📋 Found request but not for current user:`, {
          requestId: req._id,
          senderId: req.senderId,
          receiverId: req.receiverId,
          status: req.status,
          currentUserId: userId,
        });

        if (req.receiverId.toString() !== userId) {
          return res.status(403).json({
            success: false,
            error: "Access denied",
            message: "You are not authorized to respond to this request",
          });
        } else if (req.status !== "pending") {
          return res.status(409).json({
            success: false,
            error: "Request already processed",
            message: `This request has already been ${req.status}`,
          });
        }
      }

      return res.status(404).json({
        success: false,
        error: "Request not found",
        message: "Request not found or no longer available",
      });
    }

    const request = requests[0];
    console.log(`✅ Processing request:`, {
      id: request._id,
      senderId: request.senderId,
      receiverId: request.receiverId,
      status: request.status,
      createdAt: request.createdAt,
    });

    if (action === "decline") {
      console.log(`❌ Declining request ${requestId}`);

      // Update request status to declined
      await updateRideBuddyRequest(new ObjectId(requestId), {
        status: "declined",
        responseMessage: message.trim(),
      });

      console.log(`✅ Request ${requestId} declined successfully`);

      // Send real-time notification to sender
      try {
        await chatService.notifyRequestResponse(request.senderId.toString(), {
          requestId,
          action: "declined",
          responderName: request.receiverName,
          responderId: request.receiverId.toString(),
          responderPhone: request.receiverPhone,
          message: message.trim(),
        });
        console.log(
          `📡 Decline notification sent to sender ${request.senderId}`
        );
      } catch (notificationError) {
        console.error("Error sending decline notification:", notificationError);
      }

      // Invalidate caches for both users
      rideBuddyCacheService.invalidateUserCaches(request.senderId.toString());
      rideBuddyCacheService.invalidateUserCaches(request.receiverId.toString());

      return res.status(200).json({
        success: true,
        message: "Request declined successfully",
        data: {
          requestId,
          action: "declined",
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Handle accept action
    if (action === "accept") {
      console.log(`✅ Accepting request ${requestId}`);

      // Update request status to accepted
      await updateRideBuddyRequest(new ObjectId(requestId), {
        status: "accepted",
        responseMessage: message.trim(),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes for accepted connections
      });

      console.log(`✅ Request ${requestId} accepted successfully`);

      // Create a match between the two users
      const matchData = {
        user1Id: request.senderId,
        user1Email: request.senderEmail,
        user1Name: request.senderName,
        user1Phone: request.senderPhone,
        user2Id: request.receiverId,
        user2Email: request.receiverEmail,
        user2Name: request.receiverName,
        user2Phone: request.receiverPhone,
        routeDetails: request.routeDetails,
      };

      console.log(`🔗 Creating match with data:`, matchData);
      console.log(
        `📞 Match phone numbers - user1Phone: ${request.senderPhone}, user2Phone: ${request.receiverPhone}`
      );
      const matchResult = await createRideBuddyMatch(matchData);
      console.log(`✅ Match created: ${matchResult.insertedId}`);

      // Direct phone number sharing after connection
      console.log(
        `📞 Match created ${matchResult.insertedId} - users will see actual phone numbers`
      );

      // Clean up both users' active searches so they don't appear in other searches
      await cleanupUserSearches(request.senderId.toString());
      await cleanupUserSearches(request.receiverId.toString());

      // Create a chat room for the match
      const chatData = {
        matchId: matchResult.insertedId,
        participants: [
          {
            userId: request.senderId,
            email: request.senderEmail,
            name: request.senderName,
            joinedAt: new Date(),
          },
          {
            userId: request.receiverId,
            email: request.receiverEmail,
            name: request.receiverName,
            joinedAt: new Date(),
          },
        ],
      };

      console.log(`💬 Creating chat with data:`, chatData);
      const chatResult = await createRideBuddyChat(chatData);
      console.log(`✅ Chat created: ${chatResult.insertedId}`);

      // Update match with chat ID
      await updateRideBuddyMatch(matchResult.insertedId, {
        chatId: chatResult.insertedId,
      });
      console.log(`✅ Match updated with chat ID`);

      // Send real-time notifications to both users
      try {
        console.log(`📡 Sending notifications to both users`);

        // Notify sender about acceptance
        await chatService.notifyRequestResponse(request.senderId.toString(), {
          requestId,
          action: "accepted",
          responderName: request.receiverName,
          responderId: request.receiverId.toString(),
          responderPhone: request.receiverPhone,
          matchId: matchResult.insertedId,
          chatId: chatResult.insertedId,
          routeDetails: request.routeDetails,
          message: message.trim(),
        });
        console.log(
          `📡 Acceptance notification sent to sender ${request.senderId}`
        );

        // Notify both users about new match
        await chatService.notifyNewMatch(
          request.senderId.toString(),
          request.receiverId.toString(),
          {
            matchId: matchResult.insertedId,
            chatId: chatResult.insertedId,
            user1Name: request.senderName,
            user1Phone: request.senderPhone,
            user2Name: request.receiverName,
            user2Phone: request.receiverPhone,
            routeDetails: request.routeDetails,
          }
        );
        console.log(`📡 New match notifications sent to both users`);
      } catch (notificationError) {
        console.error("Error sending match notifications:", notificationError);
      }

      // Clean up both users' active searches
      await cleanupUserSearches(request.senderId.toString());
      await cleanupUserSearches(request.receiverId.toString());

      // Invalidate caches for both users
      rideBuddyCacheService.invalidateUserCaches(request.senderId.toString());
      rideBuddyCacheService.invalidateUserCaches(request.receiverId.toString());

      console.log(`✅ Request ${requestId} processing completed successfully`);

      return res.status(200).json({
        success: true,
        message: "Request accepted successfully",
        data: {
          requestId,
          matchId: matchResult.insertedId,
          chatId: chatResult.insertedId,
          action: "accepted",
          partner: {
            id: request.senderId,
            name: request.senderName,
            email: request.senderEmail,
            phone: request.senderPhone,
            // Direct phone number - no proxy needed
          },
          routeDetails: request.routeDetails,
          estimatedSharedFare: request.routeDetails.estimatedSharedFare,
          // Direct phone numbers shared after connection
        },
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error("Handle request error:", error);
    res.status(500).json({
      success: false,
      error: "Request processing failed",
      message: "Unable to process connection request",
    });
  }
};

/**
 * GET /api/ride-buddy/debug/user
 * Debug endpoint to check user data
 */
const debugUserData = async (req, res) => {
  try {
    const userId = req.user.userId;
    const userEmail = req.user.email;

    // Get user from database
    const user = await findUserByEmail(userEmail);

    res.status(200).json({
      success: true,
      data: {
        jwtUser: {
          userId: req.user.userId,
          email: req.user.email,
          name: req.user.name,
          phone: req.user.phone,
          hasPhone: !!req.user.phone,
        },
        dbUser: user
          ? {
              id: user._id,
              email: user.email,
              name: user.name,
              phone: user.phone,
              hasPhone: !!user.phone,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("Debug user data error:", error);
    res.status(500).json({
      success: false,
      error: "Debug failed",
    });
  }
};

/**
 * Clean up expired matches from database
 */
const cleanupExpiredMatches = async () => {
  try {
    const now = new Date();
    const TOTAL_CONNECTION_DURATION = 15 * 60 * 1000; // 15 minutes total

    // Find matches that are older than 15 minutes
    const expiredMatches = await findRideBuddyMatches({
      status: "active",
      createdAt: { $lt: new Date(now.getTime() - TOTAL_CONNECTION_DURATION) },
    });

    console.log(
      `🧹 Found ${expiredMatches.length} expired matches to clean up`
    );

    // Update expired matches to "expired" status
    for (const match of expiredMatches) {
      await updateRideBuddyMatch(match._id, {
        status: "expired",
        expiredAt: now,
      });
      console.log(
        `🧹 Expired match ${match._id} between users ${match.user1Id} and ${match.user2Id}`
      );
    }

    return expiredMatches.length;
  } catch (error) {
    console.error("Error cleaning up expired matches:", error);
    return 0;
  }
};

/**
 * GET /api/ride-buddy/matches
 * Get confirmed matches for the authenticated user with caching
 */
const getMatches = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Clean up expired matches first
    await cleanupExpiredMatches();

    // Check cache first
    const cached = rideBuddyCacheService.getMatches(userId);
    if (cached) {
      // Filter out expired connections from cache
      const validCached = cached.filter((match) => {
        const connectionTime = new Date(match.createdAt).getTime();
        const now = Date.now();
        const totalDuration = 15 * 60 * 1000; // 15 minutes
        return now - connectionTime <= totalDuration;
      });

      if (validCached.length > 0) {
        return res.status(200).json({
          success: true,
          message: "Matches retrieved successfully (cached)",
          data: validCached,
          count: validCached.length,
          cached: true,
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Find matches where user is either user1 or user2
    const matches = await findRideBuddyMatches({
      $or: [
        { user1Id: new ObjectId(userId) },
        { user2Id: new ObjectId(userId) },
      ],
      status: "active",
    });

    // Validate and format matches for response
    const formattedMatches = [];

    for (const match of matches) {
      // Skip matches without chat ID
      if (!match.chatId) {
        console.warn(`Match ${match._id} has no chat ID, skipping`);
        continue;
      }

      // Verify chat still exists and is not expired
      try {
        const chats = await findRideBuddyChats({
          _id: new ObjectId(match.chatId),
          status: "active",
        });

        if (chats.length === 0) {
          console.warn(
            `Chat ${match.chatId} for match ${match._id} not found, skipping`
          );
          continue;
        }

        const chat = chats[0];
        const chatAge = Date.now() - new Date(chat.createdAt).getTime();
        const CHAT_DURATION = 10 * 60 * 1000; // 10 minutes

        if (chatAge > CHAT_DURATION) {
          console.warn(
            `Chat ${match.chatId} for match ${match._id} has expired, skipping`
          );
          continue;
        }

        // Chat is valid, include in results
        const isUser1 = match.user1Id.toString() === userId;
        const partner = isUser1
          ? {
              id: match.user2Id,
              email: match.user2Email,
              name: match.user2Name,
              phone: match.user2Phone,
            }
          : {
              id: match.user1Id,
              email: match.user1Email,
              name: match.user1Name,
              phone: match.user1Phone,
            };

        console.log(
          `📞 Match ${match._id} partner phone: ${partner.phone} (isUser1: ${isUser1})`
        );

        // Direct phone number sharing - no proxy needed
        // Users can see actual phone numbers after connection

        formattedMatches.push({
          matchId: match._id,
          chatId: match.chatId,
          partner,
          routeDetails: match.routeDetails,
          status: match.status,
          createdAt: match.createdAt,
          chatExpiresAt: new Date(
            new Date(chat.createdAt).getTime() + CHAT_DURATION
          ).toISOString(),
          chatTimeRemaining: Math.max(0, CHAT_DURATION - chatAge),
          proxyNumber: partner.proxyNumber, // Also include at root level for easy access
        });
      } catch (chatValidationError) {
        console.error(
          `Error validating chat ${match.chatId} for match ${match._id}:`,
          chatValidationError
        );
        continue;
      }
    }

    // Cache the results for 5 minutes
    rideBuddyCacheService.setMatches(userId, formattedMatches, 300000);

    res.status(200).json({
      success: true,
      message: "Matches retrieved successfully",
      data: formattedMatches,
      count: formattedMatches.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Get matches error:", error);
    res.status(500).json({
      success: false,
      error: "Retrieval failed",
      message: "Unable to retrieve matches",
    });
  }
};

/**
 * DELETE /api/ride-buddy/match/:id
 * End a match and archive the chat
 */
const endMatch = async (req, res) => {
  try {
    const { id: matchId } = req.params;
    const userId = req.user.userId;

    // Validate match ID
    if (!ObjectId.isValid(matchId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid match ID",
        message: "Match ID must be a valid ObjectId",
      });
    }

    // Find the match
    const matches = await findRideBuddyMatches({
      _id: new ObjectId(matchId),
      $or: [
        { user1Id: new ObjectId(userId) },
        { user2Id: new ObjectId(userId) },
      ],
      status: "active",
    });

    if (matches.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Match not found",
        message: "Match not found or already ended",
      });
    }

    const match = matches[0];

    // Update match status to completed
    await updateRideBuddyMatch(new ObjectId(matchId), {
      status: "completed",
      completedAt: new Date(),
    });

    // Archive the chat if it exists
    if (match.chatId) {
      await updateRideBuddyChat(match.chatId, {
        status: "archived",
      });
    }

    // Mark both users as available again by deactivating their searches
    await updateRideBuddySearch(
      { userId: match.user1Id },
      { status: "completed" }
    );
    await updateRideBuddySearch(
      { userId: match.user2Id },
      { status: "completed" }
    );

    res.status(200).json({
      success: true,
      message: "Match ended successfully",
      data: {
        matchId,
        endedAt: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("End match error:", error);
    res.status(500).json({
      success: false,
      error: "End match failed",
      message: "Unable to end match",
    });
  }
};

/**
 * GET /api/ride-buddy/requests
 * Get pending requests for the authenticated user (both sent and received)
 */
const getRequests = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Check cache first
    const cached = rideBuddyCacheService.getRequests(userId);
    if (cached) {
      return res.status(200).json({
        success: true,
        message: "Requests retrieved successfully (cached)",
        data: cached,
        cached: true,
        timestamp: new Date().toISOString(),
      });
    }

    // Find incoming requests (where user is receiver) - exclude expired and duplicates
    const incomingRequests = await findRideBuddyRequests({
      receiverId: new ObjectId(userId),
      status: "pending",
      $or: [
        { expiresAt: { $exists: false } }, // Old requests without expiration
        { expiresAt: { $gt: new Date() } }, // Non-expired requests
      ],
    });

    console.log(
      `📥 Found ${incomingRequests.length} incoming requests for user ${userId}`
    );

    // Check for duplicates in incoming requests
    const incomingIds = incomingRequests.map((req) => req._id.toString());
    const uniqueIncomingIds = [...new Set(incomingIds)];
    if (incomingIds.length !== uniqueIncomingIds.length) {
      console.warn(
        `⚠️ Found ${
          incomingIds.length - uniqueIncomingIds.length
        } duplicate incoming requests in database!`
      );
    }

    // Find outgoing requests (where user is sender) - exclude expired pending requests and duplicates
    const outgoingRequests = await findRideBuddyRequests({
      senderId: new ObjectId(userId),
      status: { $in: ["pending", "accepted", "declined"] },
      $or: [
        { status: { $in: ["accepted", "declined"] } }, // Keep accepted/declined regardless of expiration
        { expiresAt: { $exists: false } }, // Old requests without expiration
        { expiresAt: { $gt: new Date() } }, // Non-expired requests
      ],
    });

    // Deduplicate incoming requests by _id (server-side safety)
    const uniqueIncomingRequests = incomingRequests.filter(
      (request, index, self) =>
        index ===
        self.findIndex((r) => r._id.toString() === request._id.toString())
    );

    if (uniqueIncomingRequests.length !== incomingRequests.length) {
      console.warn(
        `🧹 Removed ${
          incomingRequests.length - uniqueIncomingRequests.length
        } duplicate incoming requests`
      );
    }

    // Format incoming requests
    const formattedIncoming = uniqueIncomingRequests.map((request) => ({
      _id: request._id,
      senderId: request.senderId,
      senderName: request.senderName,
      senderEmail: request.senderEmail,
      routeDetails: request.routeDetails,
      message: request.message,
      status: request.status,
      type: "incoming",
      createdAt: request.createdAt,
      expiresAt: request.expiresAt,
    }));

    // Deduplicate outgoing requests by _id (server-side safety)
    const uniqueOutgoingRequests = outgoingRequests.filter(
      (request, index, self) =>
        index ===
        self.findIndex((r) => r._id.toString() === request._id.toString())
    );

    if (uniqueOutgoingRequests.length !== outgoingRequests.length) {
      console.warn(
        `🧹 Removed ${
          outgoingRequests.length - uniqueOutgoingRequests.length
        } duplicate outgoing requests`
      );
    }

    // Format outgoing requests
    const formattedOutgoing = uniqueOutgoingRequests.map((request) => ({
      _id: request._id,
      receiverId: request.receiverId,
      receiverName: request.receiverName,
      receiverEmail: request.receiverEmail,
      routeDetails: request.routeDetails,
      message: request.message,
      status: request.status,
      type: "outgoing",
      createdAt: request.createdAt,
      expiresAt: request.expiresAt,
    }));

    const responseData = {
      requests: formattedIncoming,
      sentRequests: formattedOutgoing,
      totalIncoming: formattedIncoming.length,
      totalOutgoing: formattedOutgoing.length,
    };

    // Cache the results for 30 seconds for more responsive updates
    rideBuddyCacheService.setRequests(userId, responseData, 30000);

    res.status(200).json({
      success: true,
      message: "Requests retrieved successfully",
      data: responseData,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Get requests error:", error);
    res.status(500).json({
      success: false,
      error: "Retrieval failed",
      message: "Unable to retrieve requests",
    });
  }
};

/**
 * GET /api/ride-buddy/chats
 * Get active chat rooms for the authenticated user
 */
const getActiveChats = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Find active chats where user is a participant
    const chats = await findRideBuddyChats({
      "participants.userId": new ObjectId(userId),
      status: "active",
    });

    // Format chats for response
    const formattedChats = chats.map((chat) => {
      const otherParticipant = chat.participants.find(
        (p) => p.userId.toString() !== userId
      );

      return {
        chatId: chat._id,
        matchId: chat.matchId,
        partner: otherParticipant
          ? {
              id: otherParticipant.userId,
              email: otherParticipant.email,
              name: otherParticipant.name,
            }
          : null,
        lastMessageAt: chat.lastMessageAt,
        messageCount: chat.messages ? chat.messages.length : 0,
        createdAt: chat.createdAt,
      };
    });

    res.status(200).json({
      success: true,
      message: "Active chats retrieved successfully",
      data: formattedChats,
      count: formattedChats.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Get active chats error:", error);
    res.status(500).json({
      success: false,
      error: "Retrieval failed",
      message: "Unable to retrieve active chats",
    });
  }
};

/**
 * Clean up duplicate requests in the database
 */
const cleanupDuplicateRequests = async () => {
  try {
    console.log("🧹 Starting duplicate request cleanup...");

    // Find all requests grouped by sender-receiver pairs
    const allRequests = await findRideBuddyRequests({});

    // Group requests by sender-receiver pair and status
    const requestGroups = new Map();

    for (const request of allRequests) {
      const key = `${request.senderId}-${request.receiverId}-${request.status}`;
      if (!requestGroups.has(key)) {
        requestGroups.set(key, []);
      }
      requestGroups.get(key).push(request);
    }

    let duplicatesRemoved = 0;

    // For each group, keep only the most recent request and remove duplicates
    for (const [key, requests] of requestGroups) {
      if (requests.length > 1) {
        // Sort by creation date (newest first)
        requests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        // Keep the first (newest) request, remove the rest
        const toKeep = requests[0];
        const toRemove = requests.slice(1);

        console.log(
          `🗑️ Found ${requests.length} duplicate requests for ${key}, keeping newest: ${toKeep._id}`
        );

        for (const duplicate of toRemove) {
          await updateRideBuddyRequest(duplicate._id, {
            status: "duplicate_removed",
            removedAt: new Date(),
          });
          duplicatesRemoved++;
          console.log(
            `🗑️ Marked duplicate request ${duplicate._id} as removed`
          );
        }
      }
    }

    console.log(
      `✅ Cleanup complete: ${duplicatesRemoved} duplicate requests removed`
    );
    return duplicatesRemoved;
  } catch (error) {
    console.error("❌ Error cleaning up duplicate requests:", error);
    return 0;
  }
};

/**
 * Clean up duplicate requests API endpoint
 */
const cleanupDuplicateRequestsAPI = async (req, res) => {
  try {
    const userId = req.user.userId;

    console.log("🧹 Manual duplicate cleanup triggered by user:", userId);

    const duplicatesRemoved = await cleanupDuplicateRequests();

    res.status(200).json({
      success: true,
      message: `Cleaned up ${duplicatesRemoved} duplicate requests`,
      data: {
        duplicatesRemoved,
      },
    });
  } catch (error) {
    console.error("❌ Error cleaning up duplicate requests:", error);
    res.status(500).json({
      success: false,
      error: "Cleanup failed",
      message: "Unable to clean up duplicate requests",
    });
  }
};

/**
 * Clean up expired requests API endpoint (older than 10 minutes)
 */
const cleanupExpiredRequestsAPI = async (req, res) => {
  try {
    const userId = req.user.userId;
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    console.log("🧹 Cleaning up expired requests for user:", userId);
    console.log("🕐 Cutoff time:", tenMinutesAgo);

    // Find expired requests using database helper function
    const expiredRequests = await findRideBuddyRequests({
      $or: [
        { senderId: new ObjectId(userId) },
        { receiverId: new ObjectId(userId) },
      ],
      status: "pending",
      expiresAt: { $lt: new Date() }, // Use expiresAt field instead of createdAt
    });

    console.log(`🗑️ Found ${expiredRequests.length} expired requests`);

    if (expiredRequests.length > 0) {
      // Update expired requests to "expired" status instead of deleting
      for (const request of expiredRequests) {
        await updateRideBuddyRequest(request._id, {
          status: "expired",
          expiredAt: new Date(),
        });
      }

      // TODO: Emit socket events to notify users when socket service is properly configured
      // For now, the frontend will handle expiration checking locally
      console.log(
        `📡 Would notify ${expiredRequests.length} users about expired requests`
      );

      console.log(`✅ Cleaned up ${expiredRequests.length} expired requests`);
    }

    res.status(200).json({
      success: true,
      message: `Cleaned up ${expiredRequests.length} expired requests`,
      data: {
        cleanedCount: expiredRequests.length,
        expiredRequests: expiredRequests.map((req) => ({
          id: req._id,
          senderId: req.senderId,
          receiverId: req.receiverId,
          createdAt: req.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error("❌ Error cleaning up expired requests:", error);
    res.status(500).json({
      success: false,
      error: "Cleanup failed",
      message: "Unable to clean up expired requests",
      details: error.message,
    });
  }
};

/**
 * DELETE /api/ride-buddy/search/active
 * Cancel user's active search
 */
const cancelActiveSearch = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await updateRideBuddySearch(
      { userId: new ObjectId(userId), status: "active" },
      { status: "cancelled", cancelledAt: new Date() }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({
        success: false,
        error: "No active search found",
        message: "You do not have an active search to cancel",
      });
    }

    // Invalidate cache
    rideBuddyCacheService.invalidateUserCaches(userId);

    res.json({
      success: true,
      message: "Search cancelled successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Cancel search error:", error);
    res.status(500).json({
      success: false,
      error: "Cancel failed",
      message: "Unable to cancel search",
    });
  }
};

/**
 * GET /api/ride-buddy/search/status
 * Get user's active search status
 */
const getActiveSearchStatus = async (req, res) => {
  try {
    const userId = req.user.userId;

    const activeSearches = await findRideBuddySearches({
      userId: new ObjectId(userId),
      status: "active",
      expiresAt: { $gt: new Date() },
    });

    if (activeSearches.length === 0) {
      return res.json({
        success: true,
        data: {
          hasActiveSearch: false,
          canSearch: true,
        },
        timestamp: new Date().toISOString(),
      });
    }

    const activeSearch = activeSearches[0];
    const timeRemaining = Math.max(
      0,
      new Date(activeSearch.expiresAt) - new Date()
    );

    res.json({
      success: true,
      data: {
        hasActiveSearch: true,
        canSearch: false,
        searchId: activeSearch._id,
        source: activeSearch.source,
        destination: activeSearch.destination,
        createdAt: activeSearch.createdAt,
        expiresAt: activeSearch.expiresAt,
        timeRemaining,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Get search status error:", error);
    res.status(500).json({
      success: false,
      error: "Status check failed",
      message: "Unable to check search status",
    });
  }
};

module.exports = {
  searchRideBuddies,
  sendRequest,
  handleRequest,
  getMatches,
  endMatch,
  getRequests,
  getActiveChats,
  debugUserData,
  cleanupExpiredRequestsAPI,
  cleanupDuplicateRequestsAPI,
  cancelActiveSearch,
  getActiveSearchStatus,
};
