import authService from "./authService";
import socketService from "./socketService";

class ChatService {
  constructor() {
    this.conversations = new Map();
    this.currentConversation = null;
    this.isInitialized = false;

    // Event listeners
    this.eventListeners = new Map();

    console.log("💬 Chat Service initialized");
  }

  // Initialize chat service
  async initialize(user) {
    if (this.isInitialized) {
      console.log("💬 Chat service already initialized");
      return;
    }

    try {
      // Connect to socket server
      socketService.connect({
        userId: user.userId || user.email,
        userEmail: user.email,
      });

      // Set up socket event listeners
      this.setupSocketListeners();

      // Load user conversations from API
      await this.loadConversations();

      this.isInitialized = true;
      console.log("💬 Chat service initialized successfully");

      this.emit("chat_initialized");
    } catch (error) {
      console.error("💬 Failed to initialize chat service:", error);
      throw error;
    }
  }

  // Set up socket event listeners
  setupSocketListeners() {
    socketService.on("socket_connected", () => {
      console.log("💬 Socket connected, chat service ready");
      this.emit("connection_status_changed", { connected: true });
    });

    socketService.on("socket_disconnected", (reason) => {
      console.log("💬 Socket disconnected:", reason);
      this.emit("connection_status_changed", { connected: false, reason });
    });

    socketService.on("new_message", (data) => {
      this.handleNewMessage(data);
    });

    socketService.on("new_conversation", (data) => {
      this.handleNewConversation(data);
    });

    socketService.on("conversation_created", (data) => {
      this.handleConversationCreated(data);
    });

    socketService.on("user_conversations", (data) => {
      this.handleUserConversations(data);
    });
  }

  // Load conversations from API
  async loadConversations() {
    try {
      const response = await authService.apiRequest("/api/chat/conversations");
      const data = await response.json();

      if (data.success) {
        data.data.forEach((conversation) => {
          this.conversations.set(conversation.id, conversation);
        });

        console.log(`💬 Loaded ${data.data.length} conversations`);
        this.emit(
          "conversations_loaded",
          Array.from(this.conversations.values())
        );
      }
    } catch (error) {
      console.error("💬 Failed to load conversations:", error);
    }
  }

  // Handle new message from socket
  handleNewMessage(data) {
    const { conversationId, message } = data;
    const conversation = this.conversations.get(conversationId);

    if (conversation) {
      conversation.messages.push(message);
      conversation.lastActivity = message.timestamp;

      // Update unread count if not current conversation
      if (this.currentConversation !== conversationId && !message.isOwn) {
        conversation.unreadCount = (conversation.unreadCount || 0) + 1;
      }

      this.emit("message_received", { conversationId, message, conversation });
    }
  }

  // Handle new conversation from socket
  handleNewConversation(data) {
    const { conversation } = data;
    this.conversations.set(conversation.id, conversation);
    this.emit("conversation_added", conversation);
  }

  // Handle conversation created confirmation
  handleConversationCreated(data) {
    const { conversation } = data;
    this.conversations.set(conversation.id, conversation);
    this.emit("conversation_created", conversation);
  }

  // Handle user conversations from socket
  handleUserConversations(data) {
    const { conversations } = data;
    conversations.forEach((conversation) => {
      this.conversations.set(conversation.id, conversation);
    });
    this.emit("conversations_updated", conversations);
  }

  // Create a new conversation
  async createConversation(otherUserId, otherUserEmail, rideDetails = null) {
    try {
      // Check if conversation already exists
      const existingConversation = Array.from(this.conversations.values()).find(
        (conv) => conv.otherUser.userId === otherUserId
      );

      if (existingConversation) {
        console.log("💬 Conversation already exists:", existingConversation.id);
        return existingConversation;
      }

      // Create conversation via socket
      const success = socketService.createConversation(
        otherUserId,
        otherUserEmail,
        rideDetails
      );

      if (!success) {
        throw new Error("Failed to create conversation - socket not connected");
      }

      // Return promise that resolves when conversation is created
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Conversation creation timeout"));
        }, 10000);

        const handleCreated = (conversation) => {
          clearTimeout(timeout);
          this.off("conversation_created", handleCreated);
          resolve(conversation);
        };

        this.on("conversation_created", handleCreated);
      });
    } catch (error) {
      console.error("💬 Failed to create conversation:", error);
      throw error;
    }
  }

  // Send a message
  async sendMessage(conversationId, message, messageType = "text") {
    try {
      const success = socketService.sendMessage(
        conversationId,
        message,
        messageType
      );

      if (!success) {
        throw new Error("Failed to send message - socket not connected");
      }

      // Optimistically add message to local conversation
      const conversation = this.conversations.get(conversationId);
      if (conversation) {
        const optimisticMessage = {
          id: `temp-${Date.now()}`,
          senderId: authService.getCurrentUser()?.userId,
          senderEmail: authService.getCurrentUser()?.email,
          message: message,
          messageType: messageType,
          timestamp: new Date().toISOString(),
          isOwn: true,
          pending: true,
        };

        conversation.messages.push(optimisticMessage);
        this.emit("message_sent", {
          conversationId,
          message: optimisticMessage,
        });
      }

      return true;
    } catch (error) {
      console.error("💬 Failed to send message:", error);
      throw error;
    }
  }

  // Join a conversation (for real-time updates)
  joinConversation(conversationId) {
    this.currentConversation = conversationId;
    socketService.joinConversation(conversationId);

    // Mark messages as read
    this.markMessagesAsRead(conversationId);
  }

  // Leave current conversation
  leaveConversation() {
    this.currentConversation = null;
  }

  // Mark messages as read
  async markMessagesAsRead(conversationId) {
    try {
      const conversation = this.conversations.get(conversationId);
      if (conversation && conversation.unreadCount > 0) {
        const response = await authService.apiRequest(
          `/api/chat/conversations/${conversationId}/read`,
          { method: "POST" }
        );

        const data = await response.json();
        if (data.success) {
          conversation.unreadCount = 0;
          this.emit("messages_marked_read", conversationId);
        }
      }
    } catch (error) {
      console.error("💬 Failed to mark messages as read:", error);
    }
  }

  // Load more messages for a conversation
  async loadMoreMessages(conversationId, offset = 0, limit = 50) {
    try {
      const response = await authService.apiRequest(
        `/api/chat/conversations/${conversationId}/messages?limit=${limit}&offset=${offset}`
      );

      const data = await response.json();
      if (data.success) {
        const conversation = this.conversations.get(conversationId);
        if (conversation) {
          // Prepend older messages
          conversation.messages = [
            ...data.data.messages,
            ...conversation.messages,
          ];
          this.emit("messages_loaded", {
            conversationId,
            messages: data.data.messages,
          });
        }

        return data.data;
      }
    } catch (error) {
      console.error("💬 Failed to load more messages:", error);
      throw error;
    }
  }

  // Get all conversations
  getConversations() {
    return Array.from(this.conversations.values()).sort(
      (a, b) => new Date(b.lastActivity) - new Date(a.lastActivity)
    );
  }

  // Get a specific conversation
  getConversation(conversationId) {
    return this.conversations.get(conversationId);
  }

  // Get total unread count
  getTotalUnreadCount() {
    return Array.from(this.conversations.values()).reduce(
      (total, conv) => total + (conv.unreadCount || 0),
      0
    );
  }

  // Check if connected
  isConnected() {
    return socketService.isSocketConnected();
  }

  // Cleanup
  cleanup() {
    socketService.disconnect();
    this.conversations.clear();
    this.eventListeners.clear();
    this.isInitialized = false;
    console.log("💬 Chat service cleaned up");
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

  // Emit events to listeners
  emit(event, data) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in chat event listener for ${event}:`, error);
        }
      });
    }
  }
}

// Create singleton instance
const chatService = new ChatService();

export default chatService;
