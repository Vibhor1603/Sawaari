import { io } from "socket.io-client";

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.connectionTimeout = 10000; // 10 seconds

    // Connection pooling and optimization
    this.connectionPool = new Map();
    this.messageQueue = [];
    this.isReconnecting = false;

    // Performance monitoring
    this.metrics = {
      connectTime: null,
      messagesSent: 0,
      messagesReceived: 0,
      reconnections: 0,
      errors: 0,
    };

    // Event listeners storage with cleanup tracking
    this.eventListeners = new Map();
    this.activeListeners = new Set();

    console.log("🔌 Optimized Socket Service initialized");
  }

  // Connect to the server with optimizations
  connect(tokenOrUserData) {
    if (this.socket && this.isConnected && !this.isReconnecting) {
      console.log("✅ Socket already connected");
      return Promise.resolve();
    }

    if (this.isReconnecting) {
      console.log("🔄 Connection already in progress");
      return Promise.resolve();
    }

    this.isReconnecting = true;
    const connectStartTime = Date.now();

    return new Promise((resolve, reject) => {
      const serverUrl =
        import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

      // Get authentication token - handle both string token and userData object
      let token;
      let userData;

      if (typeof tokenOrUserData === "string") {
        // Token passed directly as string
        token = tokenOrUserData;
        userData = null;
      } else if (tokenOrUserData && typeof tokenOrUserData === "object") {
        // UserData object passed
        token = tokenOrUserData.token;
        userData = tokenOrUserData;
      } else {
        // Fallback to storage
        token =
          localStorage.getItem("token") ||
          sessionStorage.getItem("token") ||
          sessionStorage.getItem("sawaari_auth_token");
        userData = null;
      }

      if (!token) {
        console.error("🔌 No authentication token available");
        this.isReconnecting = false;
        reject(new Error("Authentication token required"));
        return;
      }

      // Store user data for later use
      if (userData) {
        this.userData = userData;
      }

      // Optimized connection options
      this.socket = io(serverUrl, {
        transports: ["websocket", "polling"],
        timeout: this.connectionTimeout,
        forceNew: false, // Reuse existing connection if possible
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
        reconnectionDelayMax: 5000,
        maxReconnectionAttempts: this.maxReconnectAttempts,
        // Performance optimizations
        upgrade: true,
        rememberUpgrade: true,
        compression: true,
        // Authentication
        auth: {
          token: token,
        },
      });

      // Connection timeout handler
      const connectionTimeout = setTimeout(() => {
        this.metrics.errors++;
        this.isReconnecting = false;
        reject(new Error("Connection timeout"));
      }, this.connectionTimeout);

      // Connection event handlers with performance tracking
      this.socket.on("connect", () => {
        clearTimeout(connectionTimeout);
        this.metrics.connectTime = Date.now() - connectStartTime;
        console.log(`🔌 Connected to server in ${this.metrics.connectTime}ms`);

        this.isConnected = true;
        this.isReconnecting = false;
        this.reconnectAttempts = 0;

        // Process queued messages
        this.processMessageQueue();

        // Authenticate user
        if (userData) {
          this.authenticate(userData);
        }

        // Emit custom connect event
        this.emit("socket_connected");
        resolve();
      });

      this.socket.on("disconnect", (reason) => {
        console.log("🔌 Disconnected from server:", reason);
        this.isConnected = false;
        this.isReconnecting = false;
        this.emit("socket_disconnected", reason);
      });

      this.socket.on("connect_error", (error) => {
        clearTimeout(connectionTimeout);
        console.error("🔌 Connection error:", error);
        this.metrics.errors++;
        this.reconnectAttempts++;
        this.isReconnecting = false;

        // Handle authentication errors specifically
        if (
          error.message &&
          (error.message.includes("Token expired") ||
            error.message.includes("Invalid token") ||
            error.message.includes("Authentication failed"))
        ) {
          console.error("🔑 Authentication error - redirecting to login");
          this.emit("auth_error", error.message);
          reject(error);
          return;
        }

        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          console.error("🔌 Max reconnection attempts reached");
          this.emit("socket_connection_failed", error);
          reject(error);
        }
      });

      this.socket.on("reconnect", (attemptNumber) => {
        console.log(`🔄 Reconnected after ${attemptNumber} attempts`);
        this.metrics.reconnections++;
        this.isReconnecting = false;
      });

      // Optimized event handlers with performance tracking
      this.socket.on("new_message", (data) => {
        this.metrics.messagesReceived++;
        this.emit("new_message", data);
      });

      this.socket.on("new-message", (data) => {
        this.metrics.messagesReceived++;
        this.emit("new-message", data);
      });

      this.socket.on("chat-joined", (data) => {
        this.metrics.messagesReceived++;
        this.emit("chat-joined", data);
      });

      this.socket.on("chat-expired", (data) => {
        this.metrics.messagesReceived++;
        this.emit("chat-expired", data);
      });

      this.socket.on("chat-error", (data) => {
        this.metrics.messagesReceived++;
        this.emit("chat-error", data);
      });

      this.socket.on("user-joined", (data) => {
        this.metrics.messagesReceived++;
        this.emit("user-joined", data);
      });

      this.socket.on("user-left", (data) => {
        this.metrics.messagesReceived++;
        this.emit("user-left", data);
      });

      this.socket.on("user-typing", (data) => {
        this.metrics.messagesReceived++;
        this.emit("user-typing", data);
      });

      this.socket.on("message-sent", (data) => {
        this.metrics.messagesReceived++;
        this.emit("message-sent", data);
      });

      this.socket.on("new_conversation", (data) => {
        this.metrics.messagesReceived++;
        this.emit("new_conversation", data);
      });

      this.socket.on("conversation_created", (data) => {
        this.metrics.messagesReceived++;
        this.emit("conversation_created", data);
      });

      this.socket.on("user_conversations", (data) => {
        this.metrics.messagesReceived++;
        this.emit("user_conversations", data);
      });

      // Ride buddy specific events
      this.socket.on("ride_request", (data) => {
        this.metrics.messagesReceived++;
        this.emit("ride_request", data);
      });

      this.socket.on("request_response", (data) => {
        this.metrics.messagesReceived++;
        this.emit("request_response", data);
      });

      this.socket.on("match_confirmed", (data) => {
        this.metrics.messagesReceived++;
        this.emit("match_confirmed", data);
      });

      // New ride buddy notification events
      this.socket.on("ride_buddy_new_request", (data) => {
        console.log("🔔 Received new ride buddy request:", data);
        this.metrics.messagesReceived++;
        this.emit("ride_buddy_new_request", data);
        this.emit("new_notification", {
          type: "ride_request",
          title: "New Ride Request",
          message: `${data.senderName} wants to share a ride with you`,
          data: data,
        });
      });

      this.socket.on("ride_buddy_request_response", (data) => {
        console.log("🔔 Received ride buddy request response:", data);
        this.metrics.messagesReceived++;
        this.emit("ride_buddy_request_response", data);
      });

      this.socket.on("new_notification", (data) => {
        console.log("🔔 Received general notification:", data);
        this.metrics.messagesReceived++;
        this.emit("new_notification", data);
      });

      this.socket.on("error", (error) => {
        console.error("🔌 Socket error:", error);
        this.metrics.errors++;
        this.emit("socket_error", error);
      });
    });
  }

  // Authenticate user with the server
  authenticate(userData) {
    if (!this.socket || !this.isConnected) {
      console.warn("🔌 Cannot authenticate: not connected");
      return;
    }

    console.log("🔐 Authenticating user:", userData.userEmail);
    this.socket.emit("authenticate", userData);
  }

  // Disconnect from server
  disconnect() {
    if (this.socket) {
      console.log("🔌 Disconnecting from server");
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  // Join a conversation room
  joinConversation(conversationId) {
    if (!this.socket || !this.isConnected) {
      console.warn("🔌 Cannot join conversation: not connected");
      return;
    }

    console.log("💬 Joining conversation:", conversationId);
    this.socket.emit("join_conversation", { conversationId });
  }

  // Send a message with queuing support (legacy conversation system)
  sendConversationMessage(conversationId, message, messageType = "text") {
    const messageData = {
      conversationId,
      message,
      messageType,
    };

    if (!this.socket || !this.isConnected) {
      console.warn("🔌 Cannot send message: not connected, queuing message");
      this.messageQueue.push({ event: "send_message", data: messageData });
      return false;
    }

    console.log("💬 Sending message to conversation:", conversationId);
    this.socket.emit("send_message", messageData);
    this.metrics.messagesSent++;

    return true;
  }

  // Process queued messages when connection is restored
  processMessageQueue() {
    if (this.messageQueue.length === 0) return;

    console.log(`📤 Processing ${this.messageQueue.length} queued messages`);

    while (this.messageQueue.length > 0) {
      const { event, data } = this.messageQueue.shift();
      if (this.socket && this.isConnected) {
        this.socket.emit(event, data);
        this.metrics.messagesSent++;
      }
    }
  }

  // Create a new conversation
  createConversation(otherUserId, otherUserEmail, rideDetails = null) {
    if (!this.socket || !this.isConnected) {
      console.warn("🔌 Cannot create conversation: not connected");
      return false;
    }

    console.log("💬 Creating conversation with:", otherUserEmail);
    this.socket.emit("create_conversation", {
      otherUserId,
      otherUserEmail,
      rideDetails,
    });

    return true;
  }

  // Event listener management
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event).add(callback);
  }

  off(event, callback) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).delete(callback);
    }
  }

  // Emit custom events to registered listeners
  emit(event, data) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  // Get connection status
  isSocketConnected() {
    return this.isConnected && this.socket && this.socket.connected;
  }

  // Get connection status (for LiveChat component)
  getConnectionStatus() {
    return {
      connected: this.isSocketConnected(),
      isConnected: this.isConnected,
      socket: !!this.socket,
      reconnectAttempts: this.reconnectAttempts,
    };
  }

  // Get socket ID
  getSocketId() {
    return this.socket ? this.socket.id : null;
  }

  // Get performance metrics
  getMetrics() {
    return {
      ...this.metrics,
      queuedMessages: this.messageQueue.length,
      activeListeners: this.activeListeners.size,
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      timestamp: new Date().toISOString(),
    };
  }

  // Clear message queue
  clearMessageQueue() {
    const clearedCount = this.messageQueue.length;
    this.messageQueue = [];
    console.log(`🧹 Cleared ${clearedCount} queued messages`);
    return clearedCount;
  }

  // Optimized event listener management with automatic cleanup
  onNewRideRequest(callback) {
    this.on("ride_request", callback);
    this.activeListeners.add("ride_request");
  }

  offNewRideRequest(callback) {
    this.off("ride_request", callback);
  }

  onRequestUpdate(callback) {
    this.on("request_response", callback);
    this.activeListeners.add("request_response");
  }

  offRequestUpdate(callback) {
    this.off("request_response", callback);
  }

  onNewMatch(callback) {
    this.on("match_confirmed", callback);
    this.activeListeners.add("match_confirmed");
  }

  offNewMatch(callback) {
    this.off("match_confirmed", callback);
  }

  onError(callback) {
    this.on("socket_error", callback);
    this.activeListeners.add("socket_error");
  }

  offError(callback) {
    this.off("socket_error", callback);
  }

  onDisconnect(callback) {
    this.on("socket_disconnected", callback);
    this.activeListeners.add("socket_disconnected");
  }

  offDisconnect(callback) {
    this.off("socket_disconnected", callback);
  }

  // Live chat methods (updated for new backend events)
  joinChatRoom(chatId, userId) {
    if (!this.socket || !this.isConnected) {
      console.warn("🔌 Cannot join chat room: not connected");
      console.log("Socket state:", {
        socket: !!this.socket,
        connected: this.isConnected,
      });
      return;
    }

    console.log("💬 Joining live chat room:", chatId, "for user:", userId);
    console.log("Emitting join-chat event with data:", { chatId, userId });
    this.socket.emit("join-chat", { chatId, userId });
  }

  leaveChatRoom(chatId) {
    if (!this.socket || !this.isConnected) {
      console.warn("🔌 Cannot leave chat room: not connected");
      return;
    }

    console.log("💬 Leaving live chat room:", chatId);
    this.socket.emit("leave-chat", { chatId });
  }

  sendMessage(chatId, message, senderId) {
    if (!this.socket || !this.isConnected) {
      console.warn("🔌 Cannot send message: not connected");
      return null;
    }

    // Validate input
    if (!chatId || !message || !senderId) {
      console.error("❌ Invalid message data:", { chatId, message, senderId });
      return null;
    }

    console.log("💬 Sending live chat message:", {
      chatId,
      senderId,
      messageLength: message.length,
    });
    const messageData = {
      chatId,
      message: message.trim(),
      senderId,
      timestamp: new Date().toISOString(),
    };

    try {
      this.socket.emit("send-message", messageData);
      this.metrics.messagesSent++;
      console.log("✅ Message sent to server:", messageData);
      return messageData;
    } catch (error) {
      console.error("❌ Error sending message:", error);
      return null;
    }
  }

  sendTyping(chatId, userId, isTyping) {
    if (!this.socket || !this.isConnected) {
      return;
    }

    this.socket.emit("typing", { chatId, userId, isTyping });
  }

  // New event listeners for live chat
  onNewMessage(callback) {
    this.on("new-message", callback);
    this.activeListeners.add("new-message");
  }

  onChatExpired(callback) {
    this.on("chat-expired", callback);
    this.activeListeners.add("chat-expired");
  }

  onUserJoined(callback) {
    this.on("user-joined", callback);
    this.activeListeners.add("user-joined");
  }

  onUserLeft(callback) {
    this.on("user-left", callback);
    this.activeListeners.add("user-left");
  }

  onTyping(callback) {
    this.on("user-typing", callback);
    this.activeListeners.add("user-typing");
  }

  // Legacy ride buddy chat methods (for backward compatibility)
  sendChatMessage(chatId, message, messageType = "text") {
    if (!this.socket || !this.isConnected) {
      console.warn("🔌 Cannot send chat message: not connected");
      return false;
    }

    console.log("💬 Sending ride buddy chat message:", chatId);
    this.socket.emit("send_ride_buddy_message", {
      chatId,
      message,
      messageType,
    });
    this.metrics.messagesSent++;
    return true;
  }

  onChatMessage(callback) {
    this.on("ride_buddy_new_message", callback);
    this.activeListeners.add("ride_buddy_new_message");
  }

  offChatMessage(callback) {
    this.off("ride_buddy_new_message", callback);
  }

  onConnect(callback) {
    this.on("socket_connected", callback);
    this.activeListeners.add("socket_connected");
  }

  offConnect(callback) {
    this.off("socket_connected", callback);
  }

  // Cleanup all event listeners
  cleanup() {
    this.eventListeners.clear();
    this.activeListeners.clear();
    this.clearMessageQueue();
    console.log("🧹 Socket service cleaned up");
  }

  // Health check
  healthCheck() {
    return {
      connected: this.isSocketConnected(),
      socketId: this.getSocketId(),
      metrics: this.getMetrics(),
      healthy: this.isSocketConnected() && this.metrics.errors < 10,
    };
  }
}

// Create singleton instance
const socketService = new SocketService();

export default socketService;
