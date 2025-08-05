import { useState } from "react";
import PropTypes from "prop-types";
import rideBuddyService from "../services/rideBuddyService";
import toast from "react-hot-toast";

const RequestManager = ({
  requests = [],
  onAccept,
  onDecline,
  onRefresh,
  loading = false,
}) => {
  const [processingRequests, setProcessingRequests] = useState(new Set());
  const [activeTab, setActiveTab] = useState("incoming"); // incoming, outgoing

  // Separate incoming and outgoing requests
  const incomingRequests = requests.filter((req) => req.type === "incoming");
  const outgoingRequests = requests.filter((req) => req.type === "outgoing");

  const handleAcceptRequest = async (request) => {
    if (processingRequests.has(request._id)) return;

    try {
      setProcessingRequests((prev) => new Set([...prev, request._id]));

      const result = await rideBuddyService.handleConnectionRequest(
        request._id,
        "accepted"
      );

      if (result.success) {
        toast.success(
          `Request from ${request.senderName || request.senderEmail} accepted!`
        );
        if (onAccept) {
          onAccept(request, result.data);
        }
      } else {
        toast.error(result.error || "Failed to accept request");
      }
    } catch (error) {
      console.error("Error accepting request:", error);
      toast.error("Failed to accept request. Please try again.");
    } finally {
      setProcessingRequests((prev) => {
        const newSet = new Set(prev);
        newSet.delete(request._id);
        return newSet;
      });
    }
  };

  const handleDeclineRequest = async (request) => {
    if (processingRequests.has(request._id)) return;

    try {
      setProcessingRequests((prev) => new Set([...prev, request._id]));

      const result = await rideBuddyService.handleConnectionRequest(
        request._id,
        "declined"
      );

      if (result.success) {
        toast.success(
          `Request from ${request.senderName || request.senderEmail} declined`
        );
        if (onDecline) {
          onDecline(request, result.data);
        }
      } else {
        toast.error(result.error || "Failed to decline request");
      }
    } catch (error) {
      console.error("Error declining request:", error);
      toast.error("Failed to decline request. Please try again.");
    } finally {
      setProcessingRequests((prev) => {
        const newSet = new Set(prev);
        newSet.delete(request._id);
        return newSet;
      });
    }
  };

  const isProcessing = (requestId) => {
    return processingRequests.has(requestId);
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));

    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return `${Math.floor(diffInHours / 24)}d ago`;
  };

  const getExpirationStatus = (expiresAt) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const hoursLeft = Math.floor((expiry - now) / (1000 * 60 * 60));

    if (hoursLeft <= 0)
      return { status: "expired", text: "Expired", color: "expired" };
    if (hoursLeft <= 2)
      return {
        status: "expiring",
        text: `${hoursLeft}h left`,
        color: "warning",
      };
    return { status: "active", text: `${hoursLeft}h left`, color: "active" };
  };

  const renderRequestCard = (request, isIncoming = true) => {
    const expiration = getExpirationStatus(request.expiresAt);
    const otherUser = isIncoming
      ? { name: request.senderName, email: request.senderEmail }
      : { name: request.receiverName, email: request.receiverEmail };

    return (
      <div key={request._id} className="request-card">
        <div className="request-header">
          <div className="user-info">
            <div className="user-avatar">
              <i className="fas fa-user"></i>
            </div>
            <div className="user-details">
              <h4 className="user-name">
                {otherUser.name ||
                  otherUser.email?.split("@")[0] ||
                  "Anonymous User"}
              </h4>
              <span className="user-email">{otherUser.email}</span>
            </div>
          </div>

          <div className="request-meta">
            <div className="request-time">
              <i className="fas fa-clock"></i>
              {formatTimeAgo(request.createdAt)}
            </div>
            <div className={`expiration-badge ${expiration.color}`}>
              <i className="fas fa-hourglass-half"></i>
              {expiration.text}
            </div>
          </div>
        </div>

        <div className="route-info">
          <div className="route-path">
            <div className="route-point source">
              <i className="fas fa-map-marker-alt"></i>
              <span>
                {request.routeDetails?.senderRoute?.source || "Unknown"}
              </span>
            </div>
            <div className="route-arrow">
              <i className="fas fa-arrow-right"></i>
            </div>
            <div className="route-point destination">
              <i className="fas fa-flag-checkered"></i>
              <span>
                {request.routeDetails?.senderRoute?.destination || "Unknown"}
              </span>
            </div>
          </div>
        </div>

        <div className="request-details">
          <div className="detail-item">
            <i className="fas fa-route"></i>
            <span className="detail-label">Route Overlap:</span>
            <span className="detail-value overlap">
              {Math.round(request.routeDetails?.overlapPercentage || 0)}%
            </span>
          </div>

          <div className="detail-item">
            <i className="fas fa-coins"></i>
            <span className="detail-label">Shared Fare:</span>
            <span className="detail-value fare">
              ₹{Math.round(request.routeDetails?.estimatedSharedFare || 0)}
            </span>
          </div>

          <div className="detail-item">
            <i className="fas fa-road"></i>
            <span className="detail-label">Shared Distance:</span>
            <span className="detail-value">
              {(request.routeDetails?.sharedDistance || 0).toFixed(1)} km
            </span>
          </div>
        </div>

        {request.message && (
          <div className="request-message">
            <i className="fas fa-comment"></i>
            <p>&quot;{request.message}&quot;</p>
          </div>
        )}

        {isIncoming &&
          request.status === "pending" &&
          expiration.status !== "expired" && (
            <div className="request-actions">
              <button
                className="btn btn-decline"
                onClick={() => handleDeclineRequest(request)}
                disabled={isProcessing(request._id)}
              >
                {isProcessing(request._id) ? (
                  <>
                    <div className="btn-spinner"></div>
                    Declining...
                  </>
                ) : (
                  <>
                    <i className="fas fa-times"></i>
                    Decline
                  </>
                )}
              </button>

              <button
                className="btn btn-accept"
                onClick={() => handleAcceptRequest(request)}
                disabled={isProcessing(request._id)}
              >
                {isProcessing(request._id) ? (
                  <>
                    <div className="btn-spinner"></div>
                    Accepting...
                  </>
                ) : (
                  <>
                    <i className="fas fa-check"></i>
                    Accept
                  </>
                )}
              </button>
            </div>
          )}

        {request.status !== "pending" && (
          <div className="request-status">
            <div className={`status-badge ${request.status}`}>
              <i
                className={`fas fa-${
                  request.status === "accepted"
                    ? "check-circle"
                    : request.status === "declined"
                    ? "times-circle"
                    : "clock"
                }`}
              ></i>
              {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="request-manager loading">
        <div className="loading-header">
          <div className="loading-spinner"></div>
          <span>Loading requests...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="request-manager">
      {/* Header */}
      <div className="manager-header">
        <div className="header-info">
          <h3 className="manager-title">
            <i className="fas fa-handshake"></i>
            Connection Requests
          </h3>
          {onRefresh && (
            <button
              className="btn btn-refresh"
              onClick={onRefresh}
              disabled={loading}
            >
              <i className="fas fa-sync-alt"></i>
              Refresh
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="request-tabs">
          <button
            className={`tab-btn ${activeTab === "incoming" ? "active" : ""}`}
            onClick={() => setActiveTab("incoming")}
          >
            <i className="fas fa-inbox"></i>
            Incoming ({incomingRequests.length})
          </button>
          <button
            className={`tab-btn ${activeTab === "outgoing" ? "active" : ""}`}
            onClick={() => setActiveTab("outgoing")}
          >
            <i className="fas fa-paper-plane"></i>
            Outgoing ({outgoingRequests.length})
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="manager-content">
        {activeTab === "incoming" && (
          <div className="requests-section">
            {incomingRequests.length === 0 ? (
              <div className="no-requests">
                <div className="no-requests-icon">
                  <i className="fas fa-inbox"></i>
                </div>
                <h4>No Incoming Requests</h4>
                <p>
                  You don&apos;t have any pending connection requests at the
                  moment.
                </p>
              </div>
            ) : (
              <div className="requests-list">
                {incomingRequests.map((request) =>
                  renderRequestCard(request, true)
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === "outgoing" && (
          <div className="requests-section">
            {outgoingRequests.length === 0 ? (
              <div className="no-requests">
                <div className="no-requests-icon">
                  <i className="fas fa-paper-plane"></i>
                </div>
                <h4>No Outgoing Requests</h4>
                <p>You haven&apos;t sent any connection requests yet.</p>
              </div>
            ) : (
              <div className="requests-list">
                {outgoingRequests.map((request) =>
                  renderRequestCard(request, false)
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

RequestManager.propTypes = {
  requests: PropTypes.arrayOf(
    PropTypes.shape({
      _id: PropTypes.string.isRequired,
      senderId: PropTypes.string.isRequired,
      senderName: PropTypes.string,
      senderEmail: PropTypes.string.isRequired,
      receiverId: PropTypes.string.isRequired,
      receiverName: PropTypes.string,
      receiverEmail: PropTypes.string.isRequired,
      routeDetails: PropTypes.shape({
        senderRoute: PropTypes.object,
        receiverRoute: PropTypes.object,
        overlapPercentage: PropTypes.number,
        sharedDistance: PropTypes.number,
        estimatedSharedFare: PropTypes.number,
      }),
      message: PropTypes.string,
      status: PropTypes.oneOf(["pending", "accepted", "declined", "expired"])
        .isRequired,
      type: PropTypes.oneOf(["incoming", "outgoing"]).isRequired,
      createdAt: PropTypes.string.isRequired,
      expiresAt: PropTypes.string.isRequired,
    })
  ),
  onAccept: PropTypes.func,
  onDecline: PropTypes.func,
  onRefresh: PropTypes.func,
  loading: PropTypes.bool,
};

export default RequestManager;
