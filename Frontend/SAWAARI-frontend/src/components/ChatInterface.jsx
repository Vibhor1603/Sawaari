import { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import socketService from "../services/socketService";
import rideBuddyService from "../services/rideBuddyService";
import toast from "react-hot-toast";

const ChatInterface = ({
  matchId,
  otherUser,
  currentUser,
  onEndMatch,
  onClose,
}) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [showEndMatchConfirm, setShowEndMatchConfirm] = useState(false);
  const messagesEndRef = useRef(null);
  const chatInputRef = useRef(null);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Load chat history
  useEffect(() => {
    const loadChatHistory = async () => {
      try {
        setLoading(true);
        const result = await rideBuddyService.getChatHistory(matchId);

        if (result.success) {
          setMessages(result.data.messages || []);
        } else {
          console.error("Failed to load chat history:", result.error);
          toast.error("Failed to load chat history");
        }
      } catch (error) {
        console.error("Error loading chat history:", error);
        toast.error("Failed to load chat history");
      } finally {
        setLoading(false);
      }
    };

    if (matchId) {
      loadChatHistory();
    }
  }, [matchId]);

  // Socket connection and message handling
  useEffect(() => {
    if (!matchId) return;

    // Join chat room
    socketService.joinChatRoom(matchId);
    setIsConnected(true);

    // Listen for new messages
    const handleNewMessage = (message) => {
      setMessages((prev) => [...prev, message]);
    };

    // Listen for connection status
    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    socketService.onChatMessage(handleNewMessage);
    socketService.onConnect(handleConnect);
    socketService.onDisconnect(handleDisconnect);

    // Cleanup
    return () => {
      socketService.leaveChatRoom(matchId);
      socketService.offChatMessage(handleNewMessage);
      socketService.offConnect(handleConnect);
      socketService.offDisconnect(handleDisconnect);
    };
  }, [matchId]);

  // Auto-scroll when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focus input when component mounts
  useEffect(() => {
    chatInputRef.current?.focus();
  }, []);

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!newMessage.trim() || sending) return;

    const messageText = newMessage.trim();
    setNewMessage("");
    setSending(true);

    try {
      const messageData = {
        matchId,
        message: messageText,
        messageType: "text",
      };

      const result = await rideBuddyService.sendChatMessage(messageData);

      if (result.success) {
        // Message will be received via socket, no need to add manually
      } else {
        toast.error(result.error || "Failed to send message");
        setNewMessage(messageText); // Restore message on failure
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
      setNewMessage(messageText); // Restore message on failure
    } finally {
      setSending(false);
      chatInputRef.current?.focus();
    }
  };

  const handleEndMatch = async () => {
    try {
      const result = await rideBuddyService.endMatch(matchId);

      if (result.success) {
        toast.success("Match ended successfully");
        if (onEndMatch) {
          onEndMatch(matchId);
        }
      } else {
        toast.error(result.error || "Failed to end match");
      }
    } catch (error) {
      console.error("Error ending match:", error);
      toast.error("Failed to end match");
    } finally {
      setShowEndMatchConfirm(false);
    }
  };

  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    }
  };

  const isOwnMessage = (message) => {
    return (
      message.senderId === currentUser?.id ||
      message.senderId === currentUser?._id
    );
  };

  if (loading) {
    return (
      <div className="chat-interface loading">
        <div className="loading-header">
          <div className="loading-spinner"></div>
          <span>Loading chat...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-interface">
      {/* Chat Header */}
      <div className="chat-header">
        <div className="chat-user-info">
          <div className="user-avatar">
            <i className="fas fa-user"></i>
          </div>
          <div className="user-details">
            <h4 className="user-name">
              {otherUser?.name ||
                otherUser?.email?.split("@")[0] ||
                "Chat Partner"}
            </h4>
            <div className="connection-status">
              <div
                className={`status-dot ${
                  isConnected ? "connected" : "disconnected"
                }`}
              ></div>
              <span>{isConnected ? "Online" : "Connecting..."}</span>
            </div>
          </div>
        </div>

        <div className="chat-actions">
          <button
            className="btn btn-danger btn-sm"
            onClick={() => setShowEndMatchConfirm(true)}
            title="End Match"
          >
            <i className="fas fa-times"></i>
            End Match
          </button>

          {onClose && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={onClose}
              title="Close Chat"
            >
              <i className="fas fa-compress"></i>
            </button>
          )}
        </div>
      </div>

      {/* Messages Container */}
      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="no-messages">
            <div className="no-messages-icon">
              <i className="fas fa-comments"></i>
            </div>
            <h4>Start the conversation!</h4>
            <p>Send a message to begin chatting with your ride buddy.</p>
          </div>
        ) : (
          <div className="messages-list">
            {messages.map((message, index) => (
              <div
                key={message._id || index}
                className={`message ${isOwnMessage(message) ? "own" : "other"}`}
              >
                <div className="message-content">
                  <div className="message-bubble">
                    {message.messageType === "system" ? (
                      <div className="system-message">
                        <i className="fas fa-info-circle"></i>
                        {message.message}
                      </div>
                    ) : (
                      <p>{message.message}</p>
                    )}
                  </div>

                  <div className="message-meta">
                    <span className="message-time">
                      {formatMessageTime(message.timestamp)}
                    </span>
                    {isOwnMessage(message) && message.readBy && (
                      <div className="read-status">
                        <i
                          className={`fas fa-check${
                            message.readBy.length > 1 ? "-double" : ""
                          }`}
                        ></i>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Message Input */}
      <form className="message-input-form" onSubmit={handleSendMessage}>
        <div className="input-container">
          <input
            ref={chatInputRef}
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="message-input"
            disabled={sending || !isConnected}
            maxLength={500}
          />

          <button
            type="submit"
            className="send-button"
            disabled={!newMessage.trim() || sending || !isConnected}
          >
            {sending ? (
              <div className="btn-spinner"></div>
            ) : (
              <i className="fas fa-paper-plane"></i>
            )}
          </button>
        </div>

        <div className="input-footer">
          <span className="char-count">{newMessage.length}/500</span>
          {!isConnected && (
            <span className="connection-warning">
              <i className="fas fa-exclamation-triangle"></i>
              Connection lost. Trying to reconnect...
            </span>
          )}
        </div>
      </form>

      {/* End Match Confirmation Modal */}
      {showEndMatchConfirm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h4>End Match?</h4>
              <button
                className="modal-close"
                onClick={() => setShowEndMatchConfirm(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="modal-body">
              <p>
                Are you sure you want to end this match? This will close the
                chat and you won&apos;t be able to communicate with this ride
                buddy anymore.
              </p>
            </div>

            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setShowEndMatchConfirm(false)}
              >
                Cancel
              </button>
              <button className="btn btn-danger" onClick={handleEndMatch}>
                <i className="fas fa-times"></i>
                End Match
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

ChatInterface.propTypes = {
  matchId: PropTypes.string.isRequired,
  otherUser: PropTypes.shape({
    id: PropTypes.string,
    name: PropTypes.string,
    email: PropTypes.string.isRequired,
  }).isRequired,
  currentUser: PropTypes.shape({
    id: PropTypes.string,
    _id: PropTypes.string,
    name: PropTypes.string,
    email: PropTypes.string,
  }).isRequired,
  onEndMatch: PropTypes.func,
  onClose: PropTypes.func,
};

export default ChatInterface;
