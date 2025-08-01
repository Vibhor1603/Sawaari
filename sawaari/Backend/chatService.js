// Enhanced Real-time Chat Service for Ride Buddy System
const { v4: uuidv4 } = require("uuid");
const jwt = require("jsonwebtoken");
const { ObjectId } = require("mongodb");
const { JWTService } = require("./jwtToken");
const {
  findRideBuddyChats,
  updateRideBuddyChat,
  findRideBuddyMatches,
  findRideBuddyRequests,
} = require("./database");
const securityService = require("./securityService");

class ChatService {
  constructor() {
    // In-memory storage for demo (use database in production)
    this.conversations = new Map(); // conversationId -> conversation data
    this.userConversations = new Map(); // userId -> Set of conversationIds
    this.activeConnections = new Map(); // userId -> socket connection
    this.userRooms = new Map(); // userId -> Set of room names
    this.rideBuddyNotifications = new Map(); // userId -> pending notifications
    this.chatMessages = new Map(); // chatId -> array of messages (temporary storage)
    this.chatCreationTimes = new Map(); // chatId -> creation timestamp

    console.log("🚀 Enhanced Chat Service initialized for Ride Buddy System");

    // Start cleanup interval for expired chats
    this.startChatCleanup();
  }

  // Initialize Socket.IO for real-time communication with ride buddy features
  initializeSocket(io) {
    this.io = io;

    // Middleware for socket authentication
    io.use(async (socket, next) => {
      let token = null;
      try {
        // Check multiple locations for the token
        token =
          socket.handshake.auth.token ||
          socket.handshake.query.token ||
          socket.request.headers.authorization?.replace("Bearer ", "");

        if (!token) {
          return next(new Error("Authentication token required"));
        }

        // Verify JWT token using JWTService for consistency
        console.log("🔍 Attempting to verify JWT token...");
        console.log("Token length:", token.length);
        console.log(
          "JWT_ACCESS_SECRET length:",
          process.env.JWT_ACCESS_SECRET?.length || "undefined"
        );

        const verificationResult = JWTService.verifyAccessToken(token);

        if (!verificationResult.valid) {
          if (verificationResult.expired) {
            throw new Error("Token expired");
          } else {
            throw new Error(verificationResult.error || "Invalid token");
          }
        }

        const decoded = verificationResult.decoded;
        socket.userId = decoded.userId;
        socket.userEmail = decoded.email;
        socket.userName = decoded.name || decoded.email || "User";

        console.log(
          "✅ Socket authentication successful for user:",
          socket.userId,
          socket.userEmail
        );
        next();
      } catch (error) {
        console.error("❌ Socket authentication error:", error.message);
        console.error("Error name:", error.name);
        console.error(
          "Token received:",
          token ? token.substring(0, 20) + "..." : "null"
        );
        console.error(
          "JWT_ACCESS_SECRET available:",
          !!process.env.JWT_ACCESS_SECRET
        );

        // Try to decode without verification to see token contents
        if (token) {
          try {
            const decoded = jwt.decode(token);
            console.error("Token payload (unverified):", decoded);

            // Check if token is expired
            if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
              console.error("🕐 Token is expired");
              next(new Error("Token expired - please sign in again"));
              return;
            }

            // Check token type
            if (decoded.type !== "access") {
              console.error("🔑 Wrong token type:", decoded.type);
              next(new Error("Invalid token type"));
              return;
            }
          } catch (decodeError) {
            console.error("Cannot decode token:", decodeError.message);
          }
        }

        // Provide specific error messages based on error type
        if (error.name === "TokenExpiredError") {
          next(new Error("Token expired - please sign in again"));
        } else if (error.name === "JsonWebTokenError") {
          next(new Error("Invalid token format"));
        } else if (error.message.includes("Invalid token type")) {
          next(new Error("Invalid token type"));
        } else {
          next(new Error("Authentication failed"));
        }
      }
    });

    io.on("connection", (socket) => {
      console.log(`👤 User connected: ${socket.id} (${socket.userEmail})`);

      // Store active connection
      this.activeConnections.set(socket.userId, socket);

      // Initialize user rooms if not exists
      if (!this.userRooms.has(socket.userId)) {
        this.userRooms.set(socket.userId, new Set());
      }

      // Join user to their personal notification room
      const userRoom = `user_${socket.userId}`;
      socket.join(userRoom);
      this.userRooms.get(socket.userId).add(userRoom);

      // Send pending notifications
      this.sendPendingNotifications(socket.userId);

      // RIDE BUDDY SPECIFIC EVENTS

      // Handle ride buddy authentication (legacy support)
      socket.on("authenticate", (userData) => {
        console.log(`✅ User re-authenticated: ${socket.userEmail}`);
        this.sendUserConversations(socket.userId);
        this.sendPendingRideBuddyNotifications(socket.userId);
      });

      // Handle joining ride buddy chat rooms
      socket.on("join_ride_buddy_chat", async (data) => {
        await this.handleJoinRideBuddyChat(socket, data);
      });

      // Handle ride buddy chat messages with validation
      socket.on("send_ride_buddy_message", async (data) => {
        await this.handleRideBuddyMessage(socket, data);
      });

      // Handle ride buddy match notifications
      socket.on("subscribe_ride_buddy_notifications", () => {
        const notificationRoom = `ride_buddy_notifications_${socket.userId}`;
        socket.join(notificationRoom);
        this.userRooms.get(socket.userId).add(notificationRoom);
        console.log(
          `🔔 User ${socket.userEmail} subscribed to ride buddy notifications`
        );
      });

      // Handle typing indicators for ride buddy chats
      socket.on("ride_buddy_typing", (data) => {
        this.handleTypingIndicator(socket, data);
      });

      // NEW LIVE CHAT EVENTS FOR RIDE BUDDY

      // Handle joining a chat room
      socket.on("join-chat", async (data) => {
        await this.handleJoinChat(socket, data);
      });

      // Handle leaving a chat room
      socket.on("leave-chat", (data) => {
        this.handleLeaveChat(socket, data);
      });

      // Handle sending messages
      socket.on("send-message", async (data) => {
        await this.handleSendMessage(socket, data);
      });

      // Handle typing indicators
      socket.on("typing", (data) => {
        this.handleTyping(socket, data);
      });

      // Handle ride buddy match status updates
      socket.on("update_match_status", async (data) => {
        await this.handleMatchStatusUpdate(socket, data);
      });

      // LEGACY CHAT EVENTS (for backward compatibility)

      // Handle joining a conversation
      socket.on("join_conversation", (data) => {
        const { conversationId } = data;
        socket.join(conversationId);
        this.userRooms.get(socket.userId).add(conversationId);
        console.log(
          `👥 User ${socket.userEmail} joined conversation ${conversationId}`
        );
      });

      // Handle sending messages
      socket.on("send_message", (data) => {
        this.handleMessage(socket, data);
      });

      // Handle creating new conversations
      socket.on("create_conversation", (data) => {
        this.createConversation(socket, data);
      });

      // Handle disconnection
      socket.on("disconnect", () => {
        if (socket.userId) {
          // Clean up user rooms
          if (this.userRooms.has(socket.userId)) {
            this.userRooms.delete(socket.userId);
          }

          this.activeConnections.delete(socket.userId);
          console.log(`👋 User disconnected: ${socket.userEmail}`);
        }
      });

      // Handle connection errors
      socket.on("error", (error) => {
        console.error(`Socket error for user ${socket.userEmail}:`, error);
      });
    });

    console.log(
      "🔌 Enhanced Socket.IO server initialized with ride buddy features"
    );
  }

  // Create a new conversation between two users
  createConversation(socket, data) {
    const { otherUserId, otherUserEmail, rideDetails } = data;
    const conversationId = uuidv4();

    const conversation = {
      id: conversationId,
      participants: [
        { userId: socket.userId, userEmail: socket.userEmail },
        { userId: otherUserId, userEmail: otherUserEmail },
      ],
      messages: [],
      rideDetails: rideDetails || null,
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
    };

    // Store conversation
    this.conversations.set(conversationId, conversation);

    // Add to user conversation lists
    if (!this.userConversations.has(socket.userId)) {
      this.userConversations.set(socket.userId, new Set());
    }
    if (!this.userConversations.has(otherUserId)) {
      this.userConversations.set(otherUserId, new Set());
    }

    this.userConversations.get(socket.userId).add(conversationId);
    this.userConversations.get(otherUserId).add(conversationId);

    // Join both users to the conversation room
    socket.join(conversationId);

    // Notify the other user if they're online
    const otherUserSocket = this.activeConnections.get(otherUserId);
    if (otherUserSocket) {
      otherUserSocket.join(conversationId);
      otherUserSocket.emit("new_conversation", {
        conversation: this.sanitizeConversation(conversation, otherUserId),
      });
    }

    // Send confirmation to creator
    socket.emit("conversation_created", {
      conversation: this.sanitizeConversation(conversation, socket.userId),
    });

    console.log(
      `💬 New conversation created: ${conversationId} between ${socket.userEmail} and ${otherUserEmail}`
    );

    return conversationId;
  }

  // Handle incoming messages
  handleMessage(socket, data) {
    const { conversationId, message, messageType = "text" } = data;

    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      socket.emit("error", { message: "Conversation not found" });
      return;
    }

    // Check if user is participant
    const isParticipant = conversation.participants.some(
      (p) => p.userId === socket.userId
    );
    if (!isParticipant) {
      socket.emit("error", {
        message: "Not authorized to send messages in this conversation",
      });
      return;
    }

    // Create message object
    const messageObj = {
      id: uuidv4(),
      senderId: socket.userId,
      senderEmail: socket.userEmail,
      message: message,
      messageType: messageType,
      timestamp: new Date().toISOString(),
      read: false,
    };

    // Add message to conversation
    conversation.messages.push(messageObj);
    conversation.lastActivity = new Date().toISOString();

    // Broadcast message to all participants in the conversation
    this.io.to(conversationId).emit("new_message", {
      conversationId: conversationId,
      message: messageObj,
    });

    console.log(
      `📨 Message sent in conversation ${conversationId}: ${message.substring(
        0,
        50
      )}...`
    );
  }

  // Send user their conversations
  sendUserConversations(userId) {
    const userConvIds = this.userConversations.get(userId) || new Set();
    const conversations = [];

    for (const convId of userConvIds) {
      const conversation = this.conversations.get(convId);
      if (conversation) {
        conversations.push(this.sanitizeConversation(conversation, userId));
      }
    }

    const userSocket = this.activeConnections.get(userId);
    if (userSocket) {
      userSocket.emit("user_conversations", { conversations });
    }
  }

  // Remove sensitive data from conversation before sending
  sanitizeConversation(conversation, forUserId) {
    const otherParticipant = conversation.participants.find(
      (p) => p.userId !== forUserId
    );

    return {
      id: conversation.id,
      otherUser: otherParticipant,
      messages: conversation.messages.map((msg) => ({
        id: msg.id,
        senderId: msg.senderId,
        senderEmail: msg.senderEmail,
        message: msg.message,
        messageType: msg.messageType,
        timestamp: msg.timestamp,
        isOwn: msg.senderId === forUserId,
      })),
      rideDetails: conversation.rideDetails,
      lastActivity: conversation.lastActivity,
      unreadCount: conversation.messages.filter(
        (msg) => msg.senderId !== forUserId && !msg.read
      ).length,
    };
  }

  // REST API endpoints

  // Get user conversations
  async getUserConversations(userId) {
    const userConvIds = this.userConversations.get(userId) || new Set();
    const conversations = [];

    for (const convId of userConvIds) {
      const conversation = this.conversations.get(convId);
      if (conversation) {
        conversations.push(this.sanitizeConversation(conversation, userId));
      }
    }

    return {
      success: true,
      data: conversations.sort(
        (a, b) => new Date(b.lastActivity) - new Date(a.lastActivity)
      ),
    };
  }

  // Get conversation messages
  async getConversationMessages(
    conversationId,
    userId,
    limit = 50,
    offset = 0
  ) {
    const conversation = this.conversations.get(conversationId);

    if (!conversation) {
      return { success: false, error: "Conversation not found" };
    }

    // Check if user is participant
    const isParticipant = conversation.participants.some(
      (p) => p.userId === userId
    );
    if (!isParticipant) {
      return {
        success: false,
        error: "Not authorized to view this conversation",
      };
    }

    const messages = conversation.messages
      .slice(-limit - offset, -offset || undefined)
      .map((msg) => ({
        id: msg.id,
        senderId: msg.senderId,
        senderEmail: msg.senderEmail,
        message: msg.message,
        messageType: msg.messageType,
        timestamp: msg.timestamp,
        isOwn: msg.senderId === userId,
      }));

    return {
      success: true,
      data: {
        conversationId,
        messages,
        hasMore: conversation.messages.length > limit + offset,
      },
    };
  }

  // Mark messages as read
  async markMessagesAsRead(conversationId, userId) {
    const conversation = this.conversations.get(conversationId);

    if (!conversation) {
      return { success: false, error: "Conversation not found" };
    }

    // Mark all messages from other users as read
    conversation.messages.forEach((msg) => {
      if (msg.senderId !== userId) {
        msg.read = true;
      }
    });

    return { success: true };
  }

  // Get conversation statistics
  getStats() {
    return {
      totalConversations: this.conversations.size,
      activeUsers: this.activeConnections.size,
      totalMessages: Array.from(this.conversations.values()).reduce(
        (total, conv) => total + conv.messages.length,
        0
      ),
    };
  }

  // RIDE BUDDY SPECIFIC METHODS

  // Send pending notifications to user
  async sendPendingNotifications(userId) {
    try {
      // Get pending ride buddy requests for this user
      const pendingRequests = await findRideBuddyRequests({
        receiverId: { $in: [new ObjectId(userId), userId] },
        status: "pending",
      });

      if (pendingRequests.length > 0) {
        const userSocket = this.activeConnections.get(userId);
        if (userSocket) {
          userSocket.emit("ride_buddy_pending_requests", {
            requests: pendingRequests.map((req) => ({
              requestId: req._id,
              senderName: req.senderName,
              senderEmail: req.senderEmail,
              routeDetails: req.routeDetails,
              message: req.message,
              createdAt: req.createdAt,
            })),
            count: pendingRequests.length,
          });
        }
      }
    } catch (error) {
      console.error("Error sending pending notifications:", error);
    }
  }

  // Send pending ride buddy notifications
  async sendPendingRideBuddyNotifications(userId) {
    const notifications = this.rideBuddyNotifications.get(userId) || [];
    if (notifications.length > 0) {
      const userSocket = this.activeConnections.get(userId);
      if (userSocket) {
        userSocket.emit("ride_buddy_notifications", { notifications });
        // Clear notifications after sending
        this.rideBuddyNotifications.delete(userId);
      }
    }
  }

  // Handle joining ride buddy chat rooms
  async handleJoinRideBuddyChat(socket, data) {
    try {
      const { chatId } = data;

      // Validate chat exists and user is participant
      const chats = await findRideBuddyChats({
        _id: new ObjectId(chatId),
        "participants.userId": {
          $in: [new ObjectId(socket.userId), socket.userId],
        },
        status: "active",
      });

      if (chats.length === 0) {
        socket.emit("error", {
          message: "Chat not found or access denied",
          code: "CHAT_ACCESS_DENIED",
        });
        return;
      }

      const chat = chats[0];
      const chatRoom = `ride_buddy_chat_${chatId}`;

      // Join the chat room
      socket.join(chatRoom);
      this.userRooms.get(socket.userId).add(chatRoom);

      // Get other participant info
      const otherParticipant = chat.participants.find(
        (p) => p.userId.toString() !== socket.userId
      );

      // Send chat history and participant info
      socket.emit("ride_buddy_chat_joined", {
        chatId: chatId,
        matchId: chat.matchId,
        otherUser: otherParticipant
          ? {
              id: otherParticipant.userId,
              name: otherParticipant.name,
              email: otherParticipant.email,
            }
          : null,
        messages: (chat.messages || []).map((msg) => ({
          id: msg._id || uuidv4(),
          senderId: msg.senderId,
          senderName: msg.senderName,
          message: msg.message,
          messageType: msg.messageType || "text",
          timestamp: msg.timestamp,
          isOwn: msg.senderId.toString() === socket.userId,
        })),
      });

      // Notify other participant that user joined
      if (otherParticipant) {
        socket.to(chatRoom).emit("ride_buddy_user_joined", {
          chatId: chatId,
          userId: socket.userId,
          userName: socket.userName,
        });
      }

      console.log(
        `👥 User ${socket.userEmail} joined ride buddy chat ${chatId}`
      );
    } catch (error) {
      console.error("Error joining ride buddy chat:", error);
      socket.emit("error", {
        message: "Failed to join chat",
        code: "CHAT_JOIN_ERROR",
      });
    }
  }

  // Handle ride buddy messages with validation
  async handleRideBuddyMessage(socket, data) {
    try {
      const { chatId, message, messageType = "text" } = data;

      // Validate input
      if (!chatId || !message || message.trim().length === 0) {
        socket.emit("error", {
          message: "Chat ID and message are required",
          code: "INVALID_MESSAGE_DATA",
        });
        return;
      }

      // Validate and sanitize message using security service
      let sanitizedMessage;
      try {
        sanitizedMessage = securityService.validateMessage(message.trim());
      } catch (validationError) {
        socket.emit("error", {
          message: validationError.message,
          code: "INVALID_MESSAGE_CONTENT",
        });
        return;
      }

      // Validate chat exists and user is participant
      const chats = await findRideBuddyChats({
        _id: new ObjectId(chatId),
        "participants.userId": {
          $in: [new ObjectId(socket.userId), socket.userId],
        },
        status: "active",
      });

      if (chats.length === 0) {
        socket.emit("error", {
          message: "Chat not found or access denied",
          code: "CHAT_ACCESS_DENIED",
        });
        return;
      }

      // Create message object
      const messageObj = {
        _id: uuidv4(),
        senderId: socket.userId,
        senderName: socket.userName,
        message: sanitizedMessage,
        messageType: messageType,
        timestamp: new Date(),
        readBy: [socket.userId], // Mark as read by sender
      };

      // Update chat in database
      await updateRideBuddyChat(new ObjectId(chatId), {
        $push: { messages: messageObj },
        $set: { lastMessageAt: new Date() },
      });

      // Broadcast message to chat room
      const chatRoom = `ride_buddy_chat_${chatId}`;
      this.io.to(chatRoom).emit("ride_buddy_new_message", {
        chatId: chatId,
        message: {
          id: messageObj._id,
          senderId: messageObj.senderId,
          senderName: messageObj.senderName,
          message: messageObj.message,
          messageType: messageObj.messageType,
          timestamp: messageObj.timestamp,
          isOwn: false, // Will be set correctly by each client
        },
      });

      console.log(
        `📨 Ride buddy message sent in chat ${chatId}: ${sanitizedMessage.substring(
          0,
          50
        )}...`
      );
    } catch (error) {
      console.error("Error handling ride buddy message:", error);
      socket.emit("error", {
        message: "Failed to send message",
        code: "MESSAGE_SEND_ERROR",
      });
    }
  }

  // Handle typing indicators
  handleTypingIndicator(socket, data) {
    try {
      const { chatId, isTyping } = data;

      if (!chatId) {
        return;
      }

      const chatRoom = `ride_buddy_chat_${chatId}`;

      // Broadcast typing indicator to other participants
      socket.to(chatRoom).emit("ride_buddy_typing_indicator", {
        chatId: chatId,
        userId: socket.userId,
        userName: socket.userName,
        isTyping: isTyping,
      });
    } catch (error) {
      console.error("Error handling typing indicator:", error);
    }
  }

  // Handle match status updates
  async handleMatchStatusUpdate(socket, data) {
    try {
      const { matchId, status } = data;

      if (!matchId || !status) {
        socket.emit("error", {
          message: "Match ID and status are required",
          code: "INVALID_STATUS_DATA",
        });
        return;
      }

      // Validate match exists and user is participant
      const matches = await findRideBuddyMatches({
        _id: { $oid: matchId },
        $or: [
          { user1Id: { $in: [socket.userId, { $oid: socket.userId }] } },
          { user2Id: { $in: [socket.userId, { $oid: socket.userId }] } },
        ],
      });

      if (matches.length === 0) {
        socket.emit("error", {
          message: "Match not found or access denied",
          code: "MATCH_ACCESS_DENIED",
        });
        return;
      }

      const match = matches[0];

      // Determine other user
      const otherUserId =
        match.user1Id.toString() === socket.userId
          ? match.user2Id.toString()
          : match.user1Id.toString();

      // Notify other user about status update
      const otherUserSocket = this.activeConnections.get(otherUserId);
      if (otherUserSocket) {
        otherUserSocket.emit("ride_buddy_match_status_update", {
          matchId: matchId,
          status: status,
          updatedBy: {
            id: socket.userId,
            name: socket.userName,
          },
          timestamp: new Date(),
        });
      }

      console.log(
        `🔄 Match status updated: ${matchId} -> ${status} by ${socket.userName}`
      );
    } catch (error) {
      console.error("Error handling match status update:", error);
      socket.emit("error", {
        message: "Failed to update match status",
        code: "STATUS_UPDATE_ERROR",
      });
    }
  }

  // Sanitize message content
  sanitizeMessage(message) {
    if (typeof message !== "string") {
      return null;
    }

    // Remove potentially harmful content
    const sanitized = message
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "") // Remove script tags
      .replace(/<[^>]*>/g, "") // Remove HTML tags
      .replace(/javascript:/gi, "") // Remove javascript: protocol
      .trim();

    // Check message length
    if (sanitized.length === 0 || sanitized.length > 1000) {
      return null;
    }

    return sanitized;
  }

  // Notify user about new ride buddy request
  async notifyRideBuddyRequest(receiverId, requestData) {
    try {
      console.log(
        `🔔 Attempting to notify user ${receiverId} about new request`
      );
      console.log(`Active connections: ${this.activeConnections.size}`);
      console.log(`User connected: ${this.activeConnections.has(receiverId)}`);

      const userSocket = this.activeConnections.get(receiverId);
      if (userSocket) {
        console.log(`✅ Sending real-time notification to user ${receiverId}`);
        // Send real-time notification with complete data
        userSocket.emit("ride_buddy_new_request", {
          requestId: requestData._id || requestData.requestId,
          senderId: requestData.senderId,
          senderName: requestData.senderName,
          senderEmail: requestData.senderEmail,
          senderPhone: requestData.senderPhone,
          routeDetails: requestData.routeDetails,
          message: requestData.message,
          timestamp: requestData.timestamp || new Date().toISOString(),
        });

        // Also emit a generic notification event that the frontend can catch
        userSocket.emit("new_notification", {
          type: "ride_request",
          title: "New Ride Request",
          message: `${requestData.senderName} wants to share a ride with you`,
          data: requestData,
          timestamp: new Date(),
        });

        console.log(`📤 Notification sent successfully to user ${receiverId}`);
      } else {
        console.log(
          `⚠️ User ${receiverId} not connected, storing notification for later`
        );
        // Store notification for when user comes online
        if (!this.rideBuddyNotifications.has(receiverId)) {
          this.rideBuddyNotifications.set(receiverId, []);
        }
        this.rideBuddyNotifications.get(receiverId).push({
          type: "new_request",
          data: requestData,
          timestamp: new Date(),
        });
      }
    } catch (error) {
      console.error("Error notifying ride buddy request:", error);
    }
  }

  // Notify user about request response
  async notifyRequestResponse(senderId, responseData) {
    try {
      const userSocket = this.activeConnections.get(senderId);
      if (userSocket) {
        const notificationData = {
          requestId: responseData.requestId,
          action: responseData.action,
          responderName: responseData.responderName,
          message: responseData.message,
          timestamp: new Date(),
        };

        // Add additional data for accepted requests
        if (responseData.action === "accepted") {
          notificationData.matchId = responseData.matchId;
          notificationData.chatId = responseData.chatId;
          notificationData.responderId = responseData.responderId;
          notificationData.responderPhone = responseData.responderPhone;
          notificationData.routeDetails = responseData.routeDetails;
          notificationData.estimatedSharedFare =
            responseData.routeDetails?.estimatedSharedFare;
        }

        userSocket.emit("ride_buddy_request_response", notificationData);
      } else {
        // Store notification for when user comes online
        if (!this.rideBuddyNotifications.has(senderId)) {
          this.rideBuddyNotifications.set(senderId, []);
        }
        this.rideBuddyNotifications.get(senderId).push({
          type: "request_response",
          data: responseData,
          timestamp: new Date(),
        });
      }
    } catch (error) {
      console.error("Error notifying request response:", error);
    }
  }

  // Notify users about new match
  async notifyNewMatch(user1Id, user2Id, matchData) {
    try {
      const notifications = [
        {
          userId: user1Id,
          partnerName: matchData.user2Name,
          partnerId: user2Id,
          partnerPhone: matchData.user2Phone,
          isUser1: true,
        },
        {
          userId: user2Id,
          partnerName: matchData.user1Name,
          partnerId: user1Id,
          partnerPhone: matchData.user1Phone,
          isUser1: false,
        },
      ];

      for (const notification of notifications) {
        const userSocket = this.activeConnections.get(notification.userId);
        if (userSocket) {
          userSocket.emit("ride_buddy_new_match", {
            matchId: matchData.matchId,
            chatId: matchData.chatId,
            partnerId: notification.partnerId,
            partnerName: notification.partnerName,
            partnerPhone: notification.partnerPhone,
            routeDetails: matchData.routeDetails,
            estimatedSharedFare: matchData.routeDetails?.estimatedSharedFare,
            timestamp: new Date(),
          });
        }
      }
    } catch (error) {
      console.error("Error notifying new match:", error);
    }
  }

  // NEW LIVE CHAT HANDLER METHODS

  // Handle joining a chat room (new live chat system)
  async handleJoinChat(socket, data) {
    try {
      const { chatId, userId } = data;

      console.log(`👥 User ${userId} joining chat ${chatId}`);
      console.log("Socket user ID:", socket.userId);
      console.log("Data received:", data);

      // Validate chatId format
      if (!chatId || !ObjectId.isValid(chatId)) {
        console.error(`❌ Invalid chat ID format: ${chatId}`);
        socket.emit("chat-error", {
          error: "Invalid chat ID format",
          code: "INVALID_CHAT_ID",
        });
        return;
      }

      // Validate userId format
      if (!userId || !ObjectId.isValid(userId)) {
        console.error(`❌ Invalid user ID format: ${userId}`);
        socket.emit("chat-error", {
          error: "Invalid user ID format",
          code: "INVALID_USER_ID",
        });
        return;
      }

      // Validate chat exists and user is participant
      const chats = await findRideBuddyChats({
        _id: new ObjectId(chatId),
        "participants.userId": {
          $in: [new ObjectId(userId), userId],
        },
        status: "active",
      });

      if (chats.length === 0) {
        console.error(
          `❌ Chat not found or access denied: ${chatId} for user ${userId}`
        );

        // Check if chat exists at all (for debugging)
        const chatExists = await findRideBuddyChats({
          _id: new ObjectId(chatId),
        });

        if (chatExists.length === 0) {
          console.error(`❌ Chat ${chatId} does not exist in database`);
          socket.emit("chat-error", {
            error: "Chat not found",
            code: "CHAT_NOT_FOUND",
          });
        } else {
          console.error(
            `❌ User ${userId} is not a participant in chat ${chatId}`
          );
          socket.emit("chat-error", {
            error: "Access denied - you are not a participant in this chat",
            code: "CHAT_ACCESS_DENIED",
          });
        }
        return;
      }

      const chat = chats[0];

      // Check connection phases (10 min chat + 5 min contact details = 15 min total)
      const chatAge = Date.now() - new Date(chat.createdAt).getTime();
      const CHAT_DURATION = 10 * 60 * 1000; // 10 minutes for active chat
      const CONTACT_DURATION = 5 * 60 * 1000; // 5 minutes for contact details
      const TOTAL_CONNECTION_DURATION = CHAT_DURATION + CONTACT_DURATION; // 15 minutes total

      if (chatAge > TOTAL_CONNECTION_DURATION) {
        socket.emit("connection-expired", { chatId });
        return;
      }

      const isChatPhase = chatAge <= CHAT_DURATION;
      const isContactPhase =
        chatAge > CHAT_DURATION && chatAge <= TOTAL_CONNECTION_DURATION;

      // Join the chat room
      socket.join(chatId);
      this.userRooms.get(socket.userId).add(chatId);

      // Notify other users in the chat
      socket.to(chatId).emit("user-joined", { userId, chatId });

      // Calculate time remaining and phase information
      const chatTimeRemaining = Math.max(0, CHAT_DURATION - chatAge);
      const totalTimeRemaining = Math.max(
        0,
        TOTAL_CONNECTION_DURATION - chatAge
      );
      const contactTimeRemaining = isContactPhase
        ? Math.max(0, TOTAL_CONNECTION_DURATION - chatAge)
        : 0;

      const chatExpiresAt = new Date(
        new Date(chat.createdAt).getTime() + CHAT_DURATION
      );
      const connectionExpiresAt = new Date(
        new Date(chat.createdAt).getTime() + TOTAL_CONNECTION_DURATION
      );

      // Track chat creation time for cleanup
      this.trackChatCreation(chatId);

      // Load messages from memory instead of database
      const chatMessages = this.chatMessages?.get(chatId) || [];

      socket.emit("chat-joined", {
        chatId,
        messages: chatMessages.map((msg) => ({
          id: msg.id || Date.now().toString(),
          chatId,
          message: msg.message,
          senderId: msg.senderId.toString(),
          timestamp: msg.timestamp,
          senderName: msg.senderName || msg.senderId.toString(),
        })),
        // Phase information
        phase: isChatPhase ? "chat" : "contact",
        isChatPhase,
        isContactPhase,
        // Time information
        chatTimeRemaining,
        contactTimeRemaining,
        totalTimeRemaining,
        // Expiration times
        chatExpiresAt: chatExpiresAt.toISOString(),
        connectionExpiresAt: connectionExpiresAt.toISOString(),
      });

      console.log(
        `✅ User ${userId} joined chat ${chatId}. Time remaining: ${Math.round(
          timeRemaining / 1000
        )}s`
      );
    } catch (error) {
      console.error("Error joining chat:", error);
      socket.emit("chat-error", { error: "Failed to join chat" });
    }
  }

  // Handle leaving a chat room
  handleLeaveChat(socket, data) {
    try {
      const { chatId } = data;
      const userId = socket.userId;

      console.log(`👋 User ${userId} leaving chat ${chatId}`);

      socket.leave(chatId);

      if (this.userRooms.has(userId)) {
        this.userRooms.get(userId).delete(chatId);
      }

      socket.to(chatId).emit("user-left", { userId, chatId });
    } catch (error) {
      console.error("Error leaving chat:", error);
    }
  }

  // Handle sending messages (new live chat system)
  async handleSendMessage(socket, data) {
    try {
      const { chatId, message, senderId } = data;

      console.log(`📨 Handling send message:`, {
        chatId,
        senderId,
        messageLength: message?.length,
      });

      // Validate input
      if (!chatId || !message || !senderId) {
        console.error(`❌ Invalid message data:`, {
          chatId: !!chatId,
          message: !!message,
          senderId: !!senderId,
        });
        socket.emit("chat-error", {
          error: "Invalid message data",
          code: "INVALID_MESSAGE_DATA",
        });
        return;
      }

      // Validate ObjectId formats
      if (!ObjectId.isValid(chatId)) {
        console.error(`❌ Invalid chat ID format: ${chatId}`);
        socket.emit("chat-error", {
          error: "Invalid chat ID format",
          code: "INVALID_CHAT_ID",
        });
        return;
      }

      if (!ObjectId.isValid(senderId)) {
        console.error(`❌ Invalid sender ID format: ${senderId}`);
        socket.emit("chat-error", {
          error: "Invalid sender ID format",
          code: "INVALID_SENDER_ID",
        });
        return;
      }

      // Validate chat exists and user is participant
      const chats = await findRideBuddyChats({
        _id: new ObjectId(chatId),
        "participants.userId": {
          $in: [new ObjectId(senderId), senderId],
        },
        status: "active",
      });

      if (chats.length === 0) {
        console.error(
          `❌ Chat not found or access denied: ${chatId} for user ${senderId}`
        );
        socket.emit("chat-error", {
          error: "Chat not found or access denied",
          code: "CHAT_ACCESS_DENIED",
        });
        return;
      }

      const chat = chats[0];

      // Check connection phase and expiration
      const chatAge = Date.now() - new Date(chat.createdAt).getTime();
      const CHAT_DURATION = 10 * 60 * 1000; // 10 minutes for active chat
      const TOTAL_CONNECTION_DURATION = 15 * 60 * 1000; // 15 minutes total

      if (chatAge > TOTAL_CONNECTION_DURATION) {
        console.error(
          `❌ Connection ${chatId} has completely expired (age: ${Math.floor(
            chatAge / 1000
          )}s)`
        );
        socket.emit("connection-expired", { chatId });
        return;
      }

      if (chatAge > CHAT_DURATION) {
        console.error(
          `❌ Chat phase expired for ${chatId}, now in contact phase (age: ${Math.floor(
            chatAge / 1000
          )}s)`
        );
        socket.emit("chat-phase-expired", {
          chatId,
          phase: "contact",
          contactTimeRemaining: Math.max(
            0,
            TOTAL_CONNECTION_DURATION - chatAge
          ),
        });
        return;
      }

      // Sanitize message
      const sanitizedMessage = this.sanitizeMessage(message);
      if (!sanitizedMessage) {
        console.error(
          `❌ Message sanitization failed for: ${message.substring(0, 50)}...`
        );
        socket.emit("chat-error", {
          error: "Invalid message content",
          code: "INVALID_MESSAGE_CONTENT",
        });
        return;
      }

      // Create message object
      const messageData = {
        id: Date.now().toString(),
        chatId,
        message: sanitizedMessage,
        senderId,
        timestamp: new Date().toISOString(),
        senderName: socket.userName || senderId,
      };

      console.log(`💾 Storing message in memory (temporary):`, messageData);

      // Store message in memory only (temporary for 10 minutes)
      if (!this.chatMessages) {
        this.chatMessages = new Map();
      }

      if (!this.chatMessages.has(chatId)) {
        this.chatMessages.set(chatId, []);
      }

      this.chatMessages.get(chatId).push(messageData);

      // Clean up old messages (keep only last 100 messages per chat)
      const messages = this.chatMessages.get(chatId);
      if (messages.length > 100) {
        this.chatMessages.set(chatId, messages.slice(-100));
      }

      // Update chat last message time in database (but not the messages)
      await updateRideBuddyChat(new ObjectId(chatId), {
        $set: { lastMessageAt: new Date() },
      });

      console.log(`📡 Broadcasting message to chat room: ${chatId}`);

      // Broadcast to all users in the chat room
      this.io.to(chatId).emit("new-message", messageData);

      // Send confirmation to sender
      socket.emit("message-sent", {
        messageId: messageData.id,
        timestamp: messageData.timestamp,
      });

      console.log(
        `✅ Message sent successfully in chat ${chatId} by ${senderId}: ${sanitizedMessage.substring(
          0,
          50
        )}...`
      );
    } catch (error) {
      console.error("❌ Error sending message:", error);
      console.error("Error stack:", error.stack);
      socket.emit("chat-error", {
        error: "Failed to send message",
        code: "MESSAGE_SEND_ERROR",
        details: error.message,
      });
    }
  }

  // Handle typing indicators (new live chat system)
  handleTyping(socket, data) {
    try {
      const { chatId, userId, isTyping } = data;

      if (!chatId || !userId) {
        return;
      }

      // Broadcast typing indicator to other users in the chat
      socket.to(chatId).emit("user-typing", { userId, isTyping, chatId });
    } catch (error) {
      console.error("Error handling typing:", error);
    }
  }
  // Start cleanup interval for expired chat messages
  startChatCleanup() {
    setInterval(() => {
      this.cleanupExpiredChats();
    }, 60000); // Run every minute
  }

  // Clean up expired connections from memory
  cleanupExpiredChats() {
    const now = Date.now();
    const TOTAL_CONNECTION_DURATION = 15 * 60 * 1000; // 15 minutes total

    for (const [chatId, messages] of this.chatMessages.entries()) {
      // Check if we have creation time for this chat
      const creationTime = this.chatCreationTimes.get(chatId);
      if (creationTime && now - creationTime > TOTAL_CONNECTION_DURATION) {
        console.log(`🧹 Cleaning up expired connection for chat: ${chatId}`);
        this.chatMessages.delete(chatId);
        this.chatCreationTimes.delete(chatId);
      }
    }
  }

  // Track chat creation time when chat is first accessed
  trackChatCreation(chatId) {
    if (!this.chatCreationTimes.has(chatId)) {
      this.chatCreationTimes.set(chatId, Date.now());
    }
  }
}

module.exports = new ChatService();
