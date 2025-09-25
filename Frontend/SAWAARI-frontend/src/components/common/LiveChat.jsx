/* eslint-disable no-unused-vars */
import { useState, useEffect, useRef, useContext, useCallback } from "react";
import PropTypes from "prop-types";
import { AuthContext } from "../../AuthContext";
import socketService from "../../services/socketService";
import toast from "react-hot-toast";

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

  // Phase tracking
  const [connectionPhase, setConnectionPhase] = useState("chat"); // "chat" or "contact"
  const [chatTimeRemaining, setChatTimeRemaining] = useState(600); // 10 minutes
  const [contactTimeRemaining, setContactTimeRemaining] = useState(0); // 5 minutes
  const [totalTimeRemaining, setTotalTimeRemaining] = useState(900); // 15 minutes total
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const timerRef = useRef(null);

  // Handler functions with useCallback to prevent re-renders
  const handleNewMessage = useCallback((messageData) => {
    console.log("LiveChat: New message received", messageData);
    setMessages((prev) => [...prev, messageData]);
  }, []);

  const handleChatJoined = useCallback(
    ({
      messages: chatMessages,
      phase,
      isChatPhase,
      isContactPhase,
      chatTimeRemaining: chatTime,
      contactTimeRemaining: contactTime,
      totalTimeRemaining: totalTime,
    }) => {
      console.log("LiveChat: Chat joined successfully!", {
        chatMessages,
        phase,
        isChatPhase,
        isContactPhase,
        chatTime,
        contactTime,
        totalTime,
      });

      setMessages(chatMessages || []);
      setConnectionPhase(phase || "chat");
      setChatTimeRemaining(Math.floor((chatTime || 0) / 1000));
      setContactTimeRemaining(Math.floor((contactTime || 0) / 1000));
      setTotalTimeRemaining(Math.floor((totalTime || 0) / 1000));
      setTimeRemaining(Math.floor((totalTime || 0) / 1000));
      setConnected(true);

      if (phase === "contact") {
        toast.info(
          "Chat time expired. Contact details available for 5 more minutes."
        );
      } else {
        toast.success("Connected to chat!");
      }
    },
    []
  );

  const handleChatExpired = useCallback(() => {
    console.log("LiveChat: Chat expired");
    setChatExpired(true);
    toast.info("Chat session has expired (10 minutes)");
  }, []);

  const handleChatPhaseExpired = useCallback(
    ({ phase, contactTimeRemaining: contactTime }) => {
      console.log("LiveChat: Chat phase expired, entering contact phase");
      setConnectionPhase("contact");
      setContactTimeRemaining(Math.floor((contactTime || 0) / 1000));
      setChatTimeRemaining(0);
      toast.info(
        "Chat time expired! Contact details available for 5 more minutes."
      );
    },
    []
  );

  const handleConnectionExpired = useCallback(() => {
    console.log("LiveChat: Connection completely expired");
    setChatExpired(true);
    setConnectionPhase("expired");
    toast.info("Connection expired. Contact details no longer available.");
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
    socketService.on("chat-phase-expired", handleChatPhaseExpired);
    socketService.on("connection-expired", handleConnectionExpired);

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
      socketService.off("chat-error", handleChatError);
      socketService.off("message-sent", handleMessageSent);
      socketService.off("chat-phase-expired", handleChatPhaseExpired);
      socketService.off("connection-expired", handleConnectionExpired);
      clearTimeout(joinTimeout);

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
    // Start countdown timer for total connection time
    if (connected && totalTimeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTotalTimeRemaining((prev) => {
          if (prev <= 1) {
            setChatExpired(true);
            setConnectionPhase("expired");
            return 0;
          }
          return prev - 1;
        });

        // Update phase-specific timers
        if (connectionPhase === "chat") {
          setChatTimeRemaining((prev) => {
            if (prev <= 1) {
              setConnectionPhase("contact");
              setContactTimeRemaining(5 * 60); // 5 minutes
              toast.info(
                "Chat time expired! Contact details available for 5 more minutes."
              );
              return 0;
            }
            return prev - 1;
          });
        } else if (connectionPhase === "contact") {
          setContactTimeRemaining((prev) => Math.max(0, prev - 1));
        }
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [connected, totalTimeRemaining, connectionPhase]);

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
    <div className="h-[80vh] flex flex-col bg-black/80 backdrop-blur-sm rounded-xl overflow-hidden shadow-2xl">
      {/* Enhanced Status Bar with Close Button */}
      <div className="px-3 py-2 bg-black/60 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={`w-3 h-3 rounded-full ${
              chatExpired
                ? "bg-red-500 animate-pulse"
                : connected
                ? "bg-green-500 animate-pulse shadow-lg shadow-green-500/50"
                : "bg-yellow-500 animate-pulse"
            }`}
          ></div>
          <span className="text-xs font-medium text-white">
            {chatExpired || connectionPhase === "expired" ? (
              <span className="text-red-400 font-bold">
                ⏰ Connection Expired
              </span>
            ) : connected ? (
              connectionPhase === "chat" ? (
                <span
                  className={`font-bold ${
                    chatTimeRemaining <= 60
                      ? "text-red-400"
                      : chatTimeRemaining <= 180
                      ? "text-yellow-400"
                      : "text-green-400"
                  }`}
                >
                  💬 Chat Active • ⏱️ {formatTime(chatTimeRemaining)}
                </span>
              ) : connectionPhase === "contact" ? (
                <span
                  className={`font-bold ${
                    contactTimeRemaining <= 60
                      ? "text-red-400"
                      : "text-blue-400"
                  }`}
                >
                  📞 Contact Details • ⏱️ {formatTime(contactTimeRemaining)}
                </span>
              ) : (
                <span className="text-green-400 font-bold">
                  🟢 Connected • ⏱️ {formatTime(totalTimeRemaining)}
                </span>
              )
            ) : (
              <span className="text-yellow-400 font-bold">
                ⏳ Connecting...
              </span>
            )}
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-white/60 hover:text-white transition-colors p-1 rounded-lg"
          aria-label="Close chat"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Compact Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        {!connected ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-sawaari-yellow/20 border-t-sawaari-yellow"></div>
            </div>
            <h3 className="text-base font-medium text-white mb-2">
              Connecting...
            </h3>
            <p className="text-sm text-white/60">
              Establishing connection with {partnerName}
            </p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 bg-sawaari-yellow/5 border border-sawaari-yellow/20 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
              <span className="text-3xl">💬</span>
            </div>
            <h3 className="text-base font-medium text-white mb-2">
              Chat started!
            </h3>
            <p className="text-sm text-white/60 max-w-xs">
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
                className={`flex ${
                  isOwnMessage ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-xs px-3 py-2 rounded-xl transition-all duration-300 text-white ${
                    isOwnMessage
                      ? "bg-sawaari-yellow/10 border border-sawaari-yellow/20"
                      : "bg-white/5 border border-white/10"
                  }`}
                >
                  <div className="flex items-center gap-1 mb-1">
                    <span
                      className={`text-xs font-semibold ${
                        isOwnMessage
                          ? "text-green-100 opacity-80"
                          : "opacity-70"
                      }`}
                    >
                      {isOwnMessage ? "You" : partnerName}
                    </span>
                    <span
                      className={`text-xs ${
                        isOwnMessage
                          ? "text-sawaari-yellow/60"
                          : "text-white/40"
                      }`}
                    >
                      {formatMessageTime(message.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed">{message.message}</p>
                  {isOwnMessage && (
                    <div className="flex justify-end mt-1">
                      <span className="text-xs text-sawaari-yellow/60">✓</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        {partnerTyping && connected && (
          <div className="flex justify-start">
            <div className="bg-white/5 px-3 py-2 rounded-lg border border-white/10">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce"></div>
                  <div
                    className="w-2 h-2 bg-white/40 rounded-full animate-bounce"
                    style={{ animationDelay: "0.1s" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-white/40 rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  ></div>
                </div>
                <span className="text-xs text-white/60">
                  {partnerName} is typing...
                </span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Section / Contact Details */}
      <div className="p-4 border-t border-white/10 bg-black/60">
        {chatExpired || connectionPhase === "expired" ? (
          <div className="flex items-center justify-center gap-2 p-3 bg-red-500/5 border border-red-500/10 rounded-lg">
            <span className="text-red-400">⏰</span>
            <span className="text-xs text-red-400/90 text-center">
              Connection expired. Contact details no longer available.
            </span>
          </div>
        ) : connectionPhase === "contact" ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2 p-2 bg-blue-500/5 border border-blue-500/10 rounded-lg">
              <span className="text-blue-400">📞</span>
              <span className="text-xs text-blue-400/90 text-center">
                Chat time expired. Contact details available for{" "}
                {formatTime(contactTimeRemaining)}
              </span>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 space-y-3 border border-white/10">
              <div className="text-center">
                <h4 className="text-sm font-semibold text-white mb-2">
                  Contact Details
                </h4>
                <div className="text-xs text-white/80">
                  <p className="mb-1">👤 {partnerName}</p>
                  <p className="text-sawaari-yellow/90">
                    Use these details to coordinate your ride
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : !connected ? (
          <div className="flex items-center justify-center gap-2 p-4 bg-yellow-500/5 border border-yellow-500/10 rounded-xl">
            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-yellow-400"></div>
            <span className="text-xs text-yellow-400/90">Connecting...</span>
          </div>
        ) : (
          <form
            onSubmit={handleSendMessage}
            className="flex gap-2 w-full max-w-full"
          >
            <input
              type="text"
              value={newMessage}
              onChange={handleInputChange}
              placeholder="Type your message..."
              className="flex-1 min-w-2 px-2 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-white/40 focus:border-sawaari-yellow/50 focus:ring-1 focus:ring-sawaari-yellow/20 focus:outline-none transition-all duration-300"
              maxLength={500}
              disabled={chatExpired || !connected || connectionPhase !== "chat"}
            />
            <button
              type="submit"
              disabled={
                !newMessage.trim() ||
                chatExpired ||
                !connected ||
                connectionPhase !== "chat"
              }
              className="flex-shrink-0 px-2 sm:px-4 py-2 bg-sawaari-yellow text-black rounded-lg font-medium hover:bg-sawaari-yellow/90 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 sm:gap-2"
            >
              <span className="text-sm whitespace-nowrap">Send</span>
              <svg
                className="w-4 h-4 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </button>
          </form>
        )}
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
