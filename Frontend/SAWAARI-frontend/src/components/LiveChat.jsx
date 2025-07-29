import { useState, useEffect, useRef, useContext, useCallback } from "react";
import PropTypes from "prop-types";
import { AuthContext } from "../AuthContext";
import socketService from "../services/socketService";
import toast from "../utils/toast";

const LiveChat = ({ chatId, partnerName, onClose }) => {
  const { user } = useContext(AuthContext);
  const userId = user?.userId || user?.id;
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(600); // 10 minutes in seconds
  const [chatExpired, setChatExpired] = useState(false);
  const [connected, setConnected] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const timerRef = useRef(null);

  // Handler functions with useCallback to prevent re-renders
  const handleNewMessage = useCallback((messageData) => {
    console.log("LiveChat: New message received", messageData);
    setMessages((prev) => [...prev, messageData]);
  }, []);

  const handleChatJoined = useCallback(
    ({ messages: chatMessages, timeRemaining: remaining }) => {
      console.log("LiveChat: Chat joined successfully!", {
        chatMessages,
        remaining,
      });
      setMessages(chatMessages || []);
      setTimeRemaining(Math.floor(remaining / 1000));
      setConnected(true);
      toast.success("Connected to chat!");
    },
    []
  );

  const handleChatExpired = useCallback(() => {
    console.log("LiveChat: Chat expired");
    setChatExpired(true);
    toast.info("Chat session has expired (10 minutes)");
  }, []);

  const handleUserJoined = useCallback(
    ({ userId: joinedUserId }) => {
      console.log("LiveChat: User joined", joinedUserId);
      if (joinedUserId !== userId) {
        toast.success(`${partnerName} joined the chat`);
      }
    },
    [userId, partnerName]
  );

  const handleUserLeft = useCallback(
    ({ userId: leftUserId }) => {
      console.log("LiveChat: User left", leftUserId);
      if (leftUserId !== userId) {
        toast.info(`${partnerName} left the chat`);
      }
    },
    [userId, partnerName]
  );

  const handleTyping = useCallback(
    ({ userId: typingUserId, isTyping: typing }) => {
      console.log("LiveChat: Typing indicator", {
        userId: typingUserId,
        typing,
      });
      if (typingUserId !== userId) {
        setPartnerTyping(typing);
      }
    },
    [userId]
  );

  const handleChatError = useCallback(
    ({ error, code, details }) => {
      console.error("LiveChat: Chat error", { error, code, details });

      // Handle specific error codes
      switch (code) {
        case "CHAT_NOT_FOUND":
          toast.error("This chat no longer exists. It may have expired.");
          setTimeout(() => onClose(), 2000); // Auto-close after 2 seconds
          break;
        case "CHAT_ACCESS_DENIED":
          toast.error("You don't have access to this chat.");
          setTimeout(() => onClose(), 2000);
          break;
        case "INVALID_CHAT_ID":
          toast.error("Invalid chat ID. Please try again.");
          setTimeout(() => onClose(), 2000);
          break;
        case "INVALID_USER_ID":
          toast.error("Authentication error. Please sign in again.");
          setTimeout(() => onClose(), 2000);
          break;
        case "INVALID_MESSAGE_DATA":
        case "INVALID_MESSAGE_CONTENT":
          toast.error("Invalid message. Please try again.");
          break;
        case "DATABASE_ERROR":
          toast.error("Database error. Please try again.");
          break;
        case "MESSAGE_SEND_ERROR":
          toast.error("Failed to send message. Please try again.");
          break;
        default:
          toast.error(error || "Chat error occurred");
      }
    },
    [onClose]
  );

  const handleMessageSent = useCallback(({ messageId, timestamp }) => {
    console.log("LiveChat: Message sent confirmation", {
      messageId,
      timestamp,
    });
    // Message was successfully sent and saved to database
  }, []);

  useEffect(() => {
    if (!chatId || !userId) {
      console.log("LiveChat: Missing chatId or userId", {
        chatId,
        userId,
        user,
      });
      return;
    }

    console.log("LiveChat: Joining chat room", chatId, "for user", userId);
    console.log(
      "Socket connection status:",
      socketService.getConnectionStatus()
    );

    // Set a timeout to detect if chat-joined event never comes
    const joinTimeout = setTimeout(() => {
      console.error("LiveChat: Chat join timeout - no response from server");
      toast.error("Failed to connect to chat. Please try again.");
      setConnected(false);
    }, 10000); // 10 second timeout

    // Clear timeout when chat-joined is received
    const originalHandleChatJoined = handleChatJoined;
    const wrappedHandleChatJoined = (data) => {
      clearTimeout(joinTimeout);
      originalHandleChatJoined(data);
    };

    // Set up event listeners first
    socketService.onNewMessage(handleNewMessage);
    socketService.onChatExpired(handleChatExpired);
    socketService.onUserJoined(handleUserJoined);
    socketService.onUserLeft(handleUserLeft);
    socketService.onTyping(handleTyping);
    socketService.on("chat-joined", wrappedHandleChatJoined);
    socketService.on("chat-error", handleChatError);
    socketService.on("message-sent", handleMessageSent);

    // Join chat room
    if (socketService.getConnectionStatus().connected) {
      console.log("Socket is connected, joining chat room...");
      socketService.joinChatRoom(chatId, userId);
    } else {
      console.log("Socket not connected, waiting for connection...");
      // Wait for socket to connect then join
      socketService.onConnect(() => {
        console.log("Socket connected, now joining chat room...");
        socketService.joinChatRoom(chatId, userId);
      });
    }

    return () => {
      console.log("LiveChat: Cleaning up chat room", chatId);
      // Clean up
      socketService.leaveChatRoom(chatId);
      socketService.off("new-message", handleNewMessage);
      socketService.off("chat-expired", handleChatExpired);
      socketService.off("user-joined", handleUserJoined);
      socketService.off("user-left", handleUserLeft);
      socketService.off("user-typing", handleTyping);
      socketService.off("chat-joined", wrappedHandleChatJoined);
      clearTimeout(joinTimeout);
      socketService.off("chat-error", handleChatError);
      socketService.off("message-sent", handleMessageSent);

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [
    chatId,
    userId,
    handleChatError,
    handleChatExpired,
    handleChatJoined,
    handleMessageSent,
    handleNewMessage,
    handleTyping,
    handleUserJoined,
    handleUserLeft,
    user,
  ]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Start countdown timer
    if (connected && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            setChatExpired(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [connected, timeRemaining]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleTypingChange = useCallback(
    (typing) => {
      if (isTyping !== typing) {
        setIsTyping(typing);
        socketService.sendTyping(chatId, userId, typing);
      }

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set new timeout to stop typing indicator
      if (typing) {
        typingTimeoutRef.current = setTimeout(() => {
          setIsTyping(false);
          socketService.sendTyping(chatId, userId, false);
        }, 2000);
      }
    },
    [isTyping, chatId, userId]
  );

  const handleSendMessage = useCallback(
    (e) => {
      e.preventDefault();

      if (!newMessage.trim() || chatExpired || !connected) {
        console.log("LiveChat: Cannot send message", {
          hasMessage: !!newMessage.trim(),
          chatExpired,
          connected,
        });
        return;
      }

      console.log("LiveChat: Sending message", newMessage.trim());

      // Validate required data
      if (!chatId || !userId) {
        console.error("LiveChat: Missing chatId or userId", { chatId, userId });
        toast.error("Cannot send message - missing chat information");
        return;
      }

      const messageData = socketService.sendMessage(
        chatId,
        newMessage.trim(),
        userId
      );

      if (messageData) {
        console.log("LiveChat: Message sent successfully");
        setNewMessage("");
        // Stop typing indicator
        handleTypingChange(false);
      } else {
        console.error("LiveChat: Failed to send message");
        toast.error("Failed to send message. Please try again.");
      }
    },
    [newMessage, chatExpired, connected, chatId, userId, handleTypingChange]
  );

  const handleInputChange = useCallback(
    (e) => {
      setNewMessage(e.target.value);

      if (e.target.value.trim() && !chatExpired && connected) {
        handleTypingChange(true);
      } else {
        handleTypingChange(false);
      }
    },
    [chatExpired, connected, handleTypingChange]
  );

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const formatMessageTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="live-chat-overlay">
      <div className="live-chat-container">
        {/* Chat Header */}
        <div className="chat-header">
          <div className="chat-header-info">
            <div className="partner-avatar">
              <i className="fas fa-user"></i>
            </div>
            <div className="partner-details">
              <h4>{partnerName}</h4>
              <span className="chat-status">
                {chatExpired ? (
                  <span className="status-expired">
                    <i className="fas fa-clock"></i> Chat Expired
                  </span>
                ) : connected ? (
                  <span
                    className={`status-active ${
                      timeRemaining <= 60
                        ? "time-warning"
                        : timeRemaining <= 180
                        ? "time-caution"
                        : ""
                    }`}
                  >
                    <i className="fas fa-circle"></i> Active •
                    <span className="countdown-timer">
                      <i className="fas fa-clock"></i>{" "}
                      {formatTime(timeRemaining)} left
                    </span>
                  </span>
                ) : (
                  <span className="status-connecting">
                    <i className="fas fa-spinner fa-spin"></i> Connecting...
                  </span>
                )}
              </span>
            </div>
          </div>
          <button className="close-chat-btn" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Chat Messages */}
        <div className="chat-messages">
          {!connected ? (
            <div className="chat-welcome">
              <div className="welcome-icon">
                <i className="fas fa-spinner fa-spin"></i>
              </div>
              <h3>Connecting to chat...</h3>
              <p>Please wait while we connect you to {partnerName}</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="chat-welcome">
              <div className="welcome-icon">
                <i className="fas fa-comments"></i>
              </div>
              <h3>Chat started!</h3>
              <p>
                You have 10 minutes to coordinate your ride with {partnerName}
              </p>
            </div>
          ) : (
            messages.map((message) => {
              const isOwnMessage =
                message.senderId === user?.id || message.senderId === userId;
              return (
                <div
                  key={message.id}
                  className={`message ${
                    isOwnMessage ? "own-message" : "partner-message"
                  }`}
                >
                  <div className="message-content">
                    <div className="message-header">
                      <span className="message-sender">
                        {isOwnMessage ? "You" : partnerName}
                      </span>
                      <span className="message-indicator">
                        {isOwnMessage ? (
                          <i className="fas fa-arrow-right sent-indicator"></i>
                        ) : (
                          <i className="fas fa-arrow-left received-indicator"></i>
                        )}
                      </span>
                    </div>
                    <p className="message-text">{message.message}</p>
                    <div className="message-footer">
                      <span className="message-time">
                        {formatMessageTime(message.timestamp)}
                      </span>
                      {isOwnMessage && (
                        <span className="message-status">
                          <i className="fas fa-check delivered"></i>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {partnerTyping && connected && (
            <div className="typing-indicator">
              <div className="typing-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <span className="typing-text">{partnerName} is typing...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input */}
        <div className="chat-input-container">
          {chatExpired ? (
            <div className="chat-expired-notice">
              <i className="fas fa-clock"></i>
              <span>
                Chat session has expired. Use the contact details above to
                continue communication.
              </span>
            </div>
          ) : !connected ? (
            <div className="chat-connecting-notice">
              <i className="fas fa-spinner fa-spin"></i>
              <span>Connecting to chat...</span>
            </div>
          ) : (
            <form onSubmit={handleSendMessage} className="chat-input-form">
              <div className="input-group">
                <input
                  type="text"
                  value={newMessage}
                  onChange={handleInputChange}
                  placeholder="Type your message..."
                  className="message-input"
                  maxLength={500}
                  disabled={chatExpired || !connected}
                />
                <button
                  type="submit"
                  className="send-btn"
                  disabled={!newMessage.trim() || chatExpired || !connected}
                >
                  <i className="fas fa-paper-plane"></i>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

LiveChat.propTypes = {
  chatId: PropTypes.string.isRequired,
  partnerName: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default LiveChat;
