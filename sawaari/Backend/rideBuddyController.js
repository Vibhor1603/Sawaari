const { ObjectId } = require("mongodb");
const RouteMatchingService = require("./RouteMatchingService");
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

// Initialize route matching service
const routeMatchingService = new RouteMatchingService({
  defaultRadius: 10, // 10km default search radius
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
 * Create a ride buddy search and find potential matches
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

    // Get user phone number
    const userPhone = req.user.phone;

    // Create search data structure
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
        preferences.searchRadius || routeMatchingService.defaultRadius,
      preferences: {
        maxPassengers: preferences.maxPassengers || 4,
        gender: preferences.gender || "any",
        smokingAllowed: preferences.smokingAllowed || false,
        maxWaitTime: preferences.maxWaitTime || 15,
      },
    };

    // Remove any existing active searches for this user
    await cleanupUserSearches(userId);

    // Store the search in database
    const searchResult = await createRideBuddySearch(searchData);

    // Find potential matches using RouteMatchingService
    let matches = [];
    try {
      const userRoute = {
        userId,
        source: searchData.source,
        destination: searchData.destination,
        route: searchData.route,
      };

      matches = await routeMatchingService.findPotentialMatches(userRoute, {
        radius: searchData.searchRadius,
        minOverlapPercentage: routeMatchingService.minOverlapPercentage,
      });

      // Filter matches based on user preferences
      matches = filterMatchesByPreferences(matches, searchData.preferences);

      // Filter out blocked users
      matches = await securityService.filterBlockedUsers(userId, matches);
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
          proximity: {
            sourceDistance:
              Math.round(match.proximity.sourceDistance * 100) / 100,
            destinationDistance:
              Math.round(match.proximity.destinationDistance * 100) / 100,
          },
          searchTimestamp: match.searchTimestamp,
        })),
        matchCount: matches.length,
        searchRadius: searchData.searchRadius,
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

    // Check for pending requests and if they're still valid (within reasonable time)
    const pendingRequest = existingRequests.find(
      (req) => req.status === "pending"
    );
    if (pendingRequest) {
      // Check if the pending request has expired (24 hours)
      const requestAge =
        Date.now() - new Date(pendingRequest.createdAt).getTime();
      const PENDING_REQUEST_DURATION = 24 * 60 * 60 * 1000; // 24 hours

      if (requestAge <= PENDING_REQUEST_DURATION) {
        return res.status(409).json({
          success: false,
          error: "Duplicate request",
          message:
            "There is already a pending request between you and this user",
        });
      }

      // Pending request has expired, we can allow a new request
      console.log(
        `🕐 Previous pending request to user ${receiverId} has expired, allowing new request`
      );
    }

    // Check for accepted connections and if they're still active (within 10 minutes)
    const acceptedConnection = existingRequests.find(
      (req) => req.status === "accepted"
    );
    if (acceptedConnection) {
      // Check if the connection has expired (10 minutes from acceptance)
      const connectionAge =
        Date.now() - new Date(acceptedConnection.updatedAt).getTime();
      const CONNECTION_DURATION = 10 * 60 * 1000; // 10 minutes

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

    // Get receiver phone from search data (if available)
    const receiverPhone = receiverSearch.userPhone;

    // Create request data
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
    };

    // Save request to database
    const result = await createRideBuddyRequest(requestData);

    // Send real-time notification to receiver
    try {
      await chatService.notifyRideBuddyRequest(receiverId, {
        requestId: result.insertedId,
        senderName,
        senderEmail,
        routeDetails: requestData.routeDetails,
        message: requestData.message,
      });
    } catch (notificationError) {
      console.error("Error sending real-time notification:", notificationError);
      // Don't fail the request if notification fails
    }

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
    });

    // Validate request ID
    if (!ObjectId.isValid(requestId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid request ID",
        message: "Request ID must be a valid ObjectId",
      });
    }

    // Validate action
    if (!["accept", "decline"].includes(action)) {
      return res.status(400).json({
        success: false,
        error: "Invalid action",
        message: "Action must be 'accept' or 'decline'",
      });
    }

    // Find the request
    const requests = await findRideBuddyRequests({
      _id: new ObjectId(requestId),
      receiverId: new ObjectId(userId),
      status: "pending",
    });

    if (requests.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Request not found",
        message: "Request not found or already processed",
      });
    }

    const request = requests[0];

    if (action === "decline") {
      // Update request status to declined
      await updateRideBuddyRequest(new ObjectId(requestId), {
        status: "declined",
        responseMessage: message.trim(),
      });

      // Send real-time notification to sender
      try {
        await chatService.notifyRequestResponse(request.senderId.toString(), {
          requestId,
          action: "declined",
          responderName: request.receiverName,
          message: message.trim(),
        });
      } catch (notificationError) {
        console.error("Error sending decline notification:", notificationError);
      }

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
      // Update request status to accepted
      await updateRideBuddyRequest(new ObjectId(requestId), {
        status: "accepted",
        responseMessage: message.trim(),
      });

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

      const matchResult = await createRideBuddyMatch(matchData);

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

      const chatResult = await createRideBuddyChat(chatData);

      // Update match with chat ID
      await updateRideBuddyMatch(matchResult.insertedId, {
        chatId: chatResult.insertedId,
      });

      // Send real-time notifications to both users
      try {
        // Notify sender about acceptance
        await chatService.notifyRequestResponse(request.senderId.toString(), {
          requestId,
          action: "accepted",
          responderName: request.receiverName,
          matchId: matchResult.insertedId,
          chatId: chatResult.insertedId,
          message: message.trim(),
        });

        // Notify both users about new match
        await chatService.notifyNewMatch(
          request.senderId.toString(),
          request.receiverId.toString(),
          {
            matchId: matchResult.insertedId,
            chatId: chatResult.insertedId,
            user1Name: request.senderName,
            user2Name: request.receiverName,
            routeDetails: request.routeDetails,
          }
        );
      } catch (notificationError) {
        console.error("Error sending match notifications:", notificationError);
      }

      // Clean up both users' active searches
      await cleanupUserSearches(request.senderId.toString());
      await cleanupUserSearches(request.receiverId.toString());

      // Invalidate caches for both users
      rideBuddyCacheService.invalidateUserCaches(request.senderId.toString());
      rideBuddyCacheService.invalidateUserCaches(request.receiverId.toString());

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
 * GET /api/ride-buddy/matches
 * Get confirmed matches for the authenticated user with caching
 */
const getMatches = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Check cache first
    const cached = rideBuddyCacheService.getMatches(userId);
    if (cached) {
      return res.status(200).json({
        success: true,
        message: "Matches retrieved successfully (cached)",
        data: cached,
        count: cached.length,
        cached: true,
        timestamp: new Date().toISOString(),
      });
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

    // Find incoming requests (where user is receiver)
    const incomingRequests = await findRideBuddyRequests({
      receiverId: new ObjectId(userId),
      status: "pending",
    });

    // Find outgoing requests (where user is sender)
    const outgoingRequests = await findRideBuddyRequests({
      senderId: new ObjectId(userId),
      status: { $in: ["pending", "accepted", "declined"] },
    });

    // Format incoming requests
    const formattedIncoming = incomingRequests.map((request) => ({
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

    // Format outgoing requests
    const formattedOutgoing = outgoingRequests.map((request) => ({
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

    // Cache the results for 2 minutes
    rideBuddyCacheService.setRequests(userId, responseData, 120000);

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

module.exports = {
  searchRideBuddies,
  sendRequest,
  handleRequest,
  getMatches,
  endMatch,
  getRequests,
  getActiveChats,
};
