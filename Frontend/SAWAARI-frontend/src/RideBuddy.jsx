import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "./AuthContext";
import rideBuddyService from "./services/rideBuddyService";
import { useHotspotData } from "./useHotspotData";
import socketService from "./services/socketService";
import authService from "./services/authService";
import LiveChat from "./components/LiveChat";
import toast from "./utils/toast";
// Direct phone number display - no masking needed after connection

const RideBuddy = () => {
  const { user, isAuthenticated } = useContext(AuthContext);
  const navigate = useNavigate();

  // Helper function to safely extract location name
  const getLocationName = (location) => {
    if (!location) return "Unknown";
    if (typeof location === "string") return location;
    if (location.name) return location.name;
    return "Unknown";
  };

  // Get hotspot data for dropdowns
  const [hotspotData] = useHotspotData();

  // Main state
  const [activeTab, setActiveTab] = useState("search");

  // Search functionality
  const [searchForm, setSearchForm] = useState({
    source: { name: "", coordinates: null },
    destination: { name: "", coordinates: null },
  });
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [sentRequestIds, setSentRequestIds] = useState(new Set());

  // Requests and connections
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [activeConnections, setActiveConnections] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);

  // Live chat state
  const [activeChatId, setActiveChatId] = useState(null);
  const [chatPartner, setChatPartner] = useState(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      toast.error("Please sign in to access Ride Buddy");
      navigate("/signin");
      return;
    }
  }, [isAuthenticated, navigate]);

  // Initialize socket connection and load data
  useEffect(() => {
    if (isAuthenticated && user) {
      // Connect to socket with proper token from authService
      const token = authService.getAccessToken();
      if (token) {
        console.log(
          "Connecting to socket with token:",
          token.substring(0, 20) + "..."
        );

        // Handle authentication errors with token refresh
        socketService.on("auth_error", async (errorMessage) => {
          console.error("Socket authentication failed:", errorMessage);

          // Try to refresh token if it's expired
          if (errorMessage.includes("Token expired")) {
            console.log("Attempting to refresh token...");
            const refreshed = await authService.refreshAccessToken();

            if (refreshed) {
              console.log("Token refreshed successfully, reconnecting...");
              const newToken = authService.getAccessToken();
              socketService.connect(newToken).catch((retryError) => {
                console.error("Retry connection failed:", retryError);
                toast.error("Session expired. Please sign in again.");
                authService.clearTokens();
                navigate("/signin");
              });
            } else {
              toast.error("Session expired. Please sign in again.");
              authService.clearTokens();
              navigate("/signin");
            }
          } else {
            toast.error("Authentication failed. Please sign in again.");
            authService.clearTokens();
            navigate("/signin");
          }
        });

        socketService.connect(token).catch(async (error) => {
          console.error("Socket connection failed:", error);

          // Try to refresh token if authentication failed
          if (error.message && error.message.includes("Token expired")) {
            console.log(
              "Attempting to refresh token after connection failure..."
            );
            const refreshed = await authService.refreshAccessToken();

            if (refreshed) {
              console.log("Token refreshed, retrying connection...");
              const newToken = authService.getAccessToken();
              socketService.connect(newToken).catch((retryError) => {
                console.error("Retry connection failed:", retryError);
                toast.error("Session expired. Please sign in again.");
                authService.clearTokens();
                navigate("/signin");
              });
            } else {
              toast.error("Session expired. Please sign in again.");
              authService.clearTokens();
              navigate("/signin");
            }
          } else {
            toast.error("Connection failed. Please try again.");
          }
        });
      } else {
        console.error("No authentication token found");
        toast.error("Authentication required. Please sign in again.");
        navigate("/signin");
        return;
      }

      // Load initial data with force refresh
      loadRequests();
      loadConnections(true); // Force refresh to bypass cache

      // Set up real-time notification listeners
      socketService.on("ride_buddy_new_request", (data) => {
        console.log("🔔 New ride request received:", data);
        toast.success(`New ride request from ${data.senderName}!`);
        // Immediately refresh requests to show the new one
        loadRequests();
        // Switch to connections tab to show the new request
        if (activeTab === "search") {
          setActiveTab("connections");
        }
      });

      socketService.on("ride_buddy_request_response", (data) => {
        console.log("🔔 Request response received:", data);
        if (data.action === "accepted") {
          toast.success(`${data.responderName} accepted your request!`);
          // Immediately reload connections to show the new match
          loadConnections(true); // Force refresh
          // Switch to connections tab to show the match
          setActiveTab("connections");
        } else {
          toast.info(`${data.responderName} declined your request`);
        }
        // Reload requests to update status
        loadRequests();
      });

      socketService.on("new_notification", (data) => {
        console.log("🔔 General notification received:", data);
        if (data.type === "ride_request") {
          // Auto-switch to connections tab to show new request
          setActiveTab("connections");
        }
      });
    }

    return () => {
      // Clean up socket connection and event listeners
      if (activeChatId) {
        socketService.leaveChatRoom(activeChatId);
      }
      socketService.off("auth_error");
      socketService.off("ride_buddy_new_request");
      socketService.off("ride_buddy_request_response");
      socketService.off("new_notification");
    };
  }, [activeChatId, isAuthenticated, user, navigate, activeTab]);

  const loadRequests = async () => {
    try {
      setRequestsLoading(true);
      const result = await rideBuddyService.getRequests();
      if (result.success) {
        setIncomingRequests(result.data.requests || []);
        setOutgoingRequests(result.data.sentRequests || []);

        // Update sent request IDs to prevent duplicate sends
        const sentIds = new Set(
          (result.data.sentRequests || [])
            .filter((req) => req.status === "pending")
            .map((req) => req.receiverId.toString())
        );
        setSentRequestIds(sentIds);
      }
    } catch (error) {
      console.error("Error loading requests:", error);
    } finally {
      setRequestsLoading(false);
    }
  };

  const loadConnections = async (forceRefresh = false) => {
    try {
      // Clear cache if force refresh is requested
      if (forceRefresh) {
        rideBuddyService.clearCache();
      }

      const result = await rideBuddyService.getMatches();
      if (result.success) {
        console.log("Loaded connections:", result.data);

        // Filter out expired connections on the frontend as well
        const validConnections = (result.data || []).filter((connection) => {
          if (
            connection.chatTimeRemaining &&
            connection.chatTimeRemaining <= 0
          ) {
            console.log(
              `Filtering out expired connection: ${connection.matchId}`
            );
            return false;
          }
          return true;
        });

        setActiveConnections(validConnections);

        // Show message if connections were filtered out
        if (result.data.length > validConnections.length) {
          const expiredCount = result.data.length - validConnections.length;
          toast.info(`${expiredCount} expired connection(s) removed`);
        }
      }
    } catch (error) {
      console.error("Error loading connections:", error);
      toast.error("Failed to load connections");
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();

    if (!searchForm.source.name || !searchForm.destination.name) {
      toast.error("Please select both source and destination");
      return;
    }

    if (searchForm.source.name === searchForm.destination.name) {
      toast.error("Source and destination cannot be the same");
      return;
    }

    try {
      setSearchLoading(true);
      const result = await rideBuddyService.searchRideBuddies({
        source: searchForm.source,
        destination: searchForm.destination,
      });

      if (result.success) {
        const matches = result.data.matches || [];
        // Filter out current user and users we've already sent requests to
        const filteredMatches = matches.filter(
          (match) =>
            match.userId !== user?.id && !sentRequestIds.has(match.userId)
        );

        setSearchResults(filteredMatches);

        if (filteredMatches.length === 0) {
          toast.info(
            "No ride buddies found for your route. Your search is active!"
          );
        } else {
          toast.success(
            `Found ${filteredMatches.length} potential ride buddies`
          );
        }
      } else {
        toast.error(result.error || "Failed to search for ride buddies");
        setSearchResults([]);
      }
    } catch (error) {
      console.error("Error searching:", error);
      toast.error("Failed to search for ride buddies");
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSendRequest = async (match) => {
    if (sentRequestIds.has(match.userId)) {
      toast.error("Request already sent to this user");
      return;
    }

    try {
      setSentRequestIds((prev) => new Set([...prev, match.userId]));

      const result = await rideBuddyService.sendConnectionRequest({
        receiverId: match.userId,
        routeDetails: {
          senderRoute: {
            source: searchForm.source.name,
            destination: searchForm.destination.name,
          },
          receiverRoute: {
            source:
              match.route?.source ||
              match.source?.name ||
              (typeof match.source === "string"
                ? match.source
                : match.source?.name) ||
              "Unknown",
            destination:
              match.route?.destination ||
              match.destination?.name ||
              (typeof match.destination === "string"
                ? match.destination
                : match.destination?.name) ||
              "Unknown",
          },
          overlapPercentage: match.overlapPercentage || 100,
          sharedDistance: match.sharedDistance || 0,
          estimatedSharedFare: match.estimatedSharedFare || 0,
        },
        message: `Hi! I'd like to share a ride from ${searchForm.source.name} to ${searchForm.destination.name}. Let's coordinate!`,
      });

      if (result.success) {
        toast.success(
          `Connection request sent to ${match.userName || match.userPhone}!`
        );
        setSearchResults((prev) =>
          prev.filter((m) => m.userId !== match.userId)
        );
        loadRequests();
      } else {
        setSentRequestIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(match.userId);
          return newSet;
        });

        // Handle specific error cases
        if (
          result.error === "Duplicate request" ||
          result.error === "Request blocked"
        ) {
          toast.error("You have already sent a request to this user");
        } else if (result.error === "Already connected") {
          toast.error("You are already connected with this user");
        } else if (result.error === "Request too soon") {
          toast.error(
            "Please wait before sending another request to this user"
          );
        } else if (result.error === "Validation failed") {
          toast.error("Invalid request data. Please try again.");
        } else if (result.error === "Receiver not found") {
          toast.error("User is no longer available for connections");
          // Remove from search results
          setSearchResults((prev) =>
            prev.filter((m) => m.userId !== match.userId)
          );
        } else {
          toast.error(result.error || "Failed to send request");
          console.error("Request error details:", result);
        }
      }
    } catch (error) {
      setSentRequestIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(match.userId);
        return newSet;
      });
      console.error("Error sending request:", error);
      toast.error("Failed to send request");
    }
  };

  const handleAcceptRequest = async (request) => {
    try {
      const result = await rideBuddyService.acceptRequest(request._id);

      if (result.success) {
        setIncomingRequests((prev) =>
          prev.filter((r) => r._id !== request._id)
        );

        // Add to active connections
        const connection = {
          matchId: result.data.matchId,
          chatId: result.data.chatId,
          partner: result.data.partner,
          routeDetails: result.data.routeDetails,
          estimatedSharedFare: result.data.estimatedSharedFare,
          createdAt: new Date().toISOString(),
        };

        setActiveConnections((prev) => [connection, ...prev]);
        toast.success(
          `🎉 Connected with ${
            request.senderName || request.senderPhone
          }! You can now chat for 10 minutes.`
        );
        setActiveTab("connections");
      } else {
        toast.error(result.error || "Failed to accept request");
      }
    } catch (error) {
      console.error("Error accepting request:", error);
      toast.error("Failed to accept request");
    }
  };

  const handleDeclineRequest = async (request) => {
    try {
      const result = await rideBuddyService.declineRequest(request._id);

      if (result.success) {
        setIncomingRequests((prev) =>
          prev.filter((r) => r._id !== request._id)
        );
        toast.info("Request declined");
      } else {
        toast.error(result.error || "Failed to decline request");
      }
    } catch (error) {
      console.error("Error declining request:", error);
      toast.error("Failed to decline request");
    }
  };

  const handleStartChat = async (connection) => {
    // Validate connection data
    if (!connection.chatId) {
      toast.error("Invalid chat - no chat ID found");
      console.error("No chat ID in connection:", connection);
      return;
    }

    if (!connection.partner) {
      toast.error("Invalid chat - no partner information found");
      console.error("No partner info in connection:", connection);
      return;
    }

    // Check if chat ID is valid format (24 character hex string)
    const chatIdRegex = /^[0-9a-fA-F]{24}$/;
    if (!chatIdRegex.test(connection.chatId)) {
      toast.error("Invalid chat ID format");
      console.error("Invalid chat ID format:", connection.chatId);
      return;
    }

    console.log("Starting chat with valid connection:", {
      chatId: connection.chatId,
      partnerId: connection.partner?.id,
      partnerName: connection.partner?.name || connection.partner?.phone,
    });

    setActiveChatId(connection.chatId);
    setChatPartner({
      id: connection.partner?.id,
      name: connection.partner?.name || connection.partner?.phone,
      phone: connection.partner?.phone,
    });
  };

  const handleCloseChat = () => {
    if (activeChatId) {
      socketService.leaveChatRoom(activeChatId);
    }
    setActiveChatId(null);
    setChatPartner(null);
  };

  // Don't render if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="ride-buddy-container">
      <div className="container">
        {/* Header */}
        <div className="ride-buddy-header">
          <h1 className="ride-buddy-title kalam-bold">🚗 Ride Buddy</h1>
          <p className="ride-buddy-subtitle kalam-regular">
            Connect with fellow travelers and share your journey safely
          </p>
        </div>

        {/* Navigation */}
        <div className="tab-navigation">
          <button
            className={`tab-btn ${activeTab === "search" ? "active" : ""}`}
            onClick={() => setActiveTab("search")}
          >
            <i className="fas fa-search"></i>
            <span>Search</span>
          </button>
          <button
            className={`tab-btn ${activeTab === "connections" ? "active" : ""}`}
            onClick={() => setActiveTab("connections")}
          >
            <i className="fas fa-users"></i>
            <span>Connections</span>
            {(incomingRequests.length > 0 || activeConnections.length > 0) && (
              <span className="notification-badge">
                {incomingRequests.length + activeConnections.length}
              </span>
            )}
          </button>
          <button
            className="tab-btn"
            onClick={() => {
              console.log("🔄 Manual refresh triggered");
              loadRequests();
              loadConnections(true);
              toast.info("Data refreshed!");
            }}
            title="Refresh data"
          >
            <i className="fas fa-sync-alt"></i>
            <span>Refresh</span>
          </button>
        </div>

        {/* Content */}
        <div className="tab-content">
          {activeTab === "search" && (
            <div className="search-tab">
              {/* Search Form */}
              <div className="search-section">
                <form onSubmit={handleSearch} className="search-form">
                  <h3 className="search-form-title">Find Your Ride Buddy</h3>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">
                        <i className="fas fa-map-marker-alt"></i>
                        From
                      </label>
                      <select
                        value={searchForm.source.name}
                        onChange={(e) => {
                          const selectedHotspot = hotspotData.find(
                            (h) => h.name === e.target.value
                          );
                          setSearchForm((prev) => ({
                            ...prev,
                            source: {
                              name: e.target.value,
                              coordinates: selectedHotspot
                                ? [
                                    selectedHotspot.latitude,
                                    selectedHotspot.longitude,
                                  ]
                                : null,
                            },
                          }));
                        }}
                        required
                        className="form-control"
                      >
                        <option value="">Select source location</option>
                        {hotspotData.map((hotspot) => (
                          <option key={hotspot._id} value={hotspot.name}>
                            {hotspot.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        <i className="fas fa-flag-checkered"></i>
                        To
                      </label>
                      <select
                        value={searchForm.destination.name}
                        onChange={(e) => {
                          const selectedHotspot = hotspotData.find(
                            (h) => h.name === e.target.value
                          );
                          setSearchForm((prev) => ({
                            ...prev,
                            destination: {
                              name: e.target.value,
                              coordinates: selectedHotspot
                                ? [
                                    selectedHotspot.latitude,
                                    selectedHotspot.longitude,
                                  ]
                                : null,
                            },
                          }));
                        }}
                        required
                        className="form-control"
                      >
                        <option value="">Select destination location</option>
                        {hotspotData.map((hotspot) => (
                          <option key={hotspot._id} value={hotspot.name}>
                            {hotspot.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={searchLoading}
                    className="btn btn-yellow w-full"
                  >
                    {searchLoading ? (
                      <>
                        <i className="fas fa-spinner fa-spin"></i>
                        Searching...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-search"></i>
                        Find Ride Buddies
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="results-section">
                  <h3 className="section-title">
                    Available Ride Buddies ({searchResults.length})
                  </h3>
                  <div className="matches-grid">
                    {searchResults.map((match) => (
                      <div key={match.userId} className="match-card">
                        <div className="match-header">
                          <div className="user-avatar">
                            <i className="fas fa-user"></i>
                          </div>
                          <div className="user-info">
                            <h4 className="user-name kalam-regular">
                              {match.userName ||
                                `User ${match.userId?.slice(-4)}`}
                            </h4>
                            <p className="user-phone">
                              📱 Contact available after connection
                            </p>
                          </div>
                        </div>

                        <div className="route-display">
                          <div className="route-item">
                            <i className="fas fa-circle route-start"></i>
                            <span>
                              {getLocationName(
                                match.route?.source || match.source
                              )}
                            </span>
                          </div>
                          <div className="route-line"></div>
                          <div className="route-item">
                            <i className="fas fa-map-marker-alt route-end"></i>
                            <span>
                              {getLocationName(
                                match.route?.destination || match.destination
                              )}
                            </span>
                          </div>
                        </div>

                        <div className="match-stats">
                          {match.overlapPercentage && (
                            <div className="stat-item">
                              <i className="fas fa-route"></i>
                              <span>
                                {Math.round(match.overlapPercentage)}% match
                              </span>
                            </div>
                          )}
                          {match.estimatedSharedFare && (
                            <div className="stat-item">
                              <i className="fas fa-rupee-sign"></i>
                              <span>
                                ₹{Math.round(match.estimatedSharedFare)} shared
                              </span>
                            </div>
                          )}
                          {match.savings && (
                            <div className="stat-item">
                              <i className="fas fa-piggy-bank"></i>
                              <span>₹{Math.round(match.savings)} saved</span>
                            </div>
                          )}
                        </div>

                        <button
                          className={`btn ${
                            sentRequestIds.has(match.userId)
                              ? "btn-outline-green"
                              : "btn-green"
                          } w-full`}
                          onClick={() => handleSendRequest(match)}
                          disabled={sentRequestIds.has(match.userId)}
                        >
                          {sentRequestIds.has(match.userId) ? (
                            <>
                              <i className="fas fa-check"></i>
                              Request Sent
                            </>
                          ) : (
                            <>
                              <i className="fas fa-paper-plane"></i>
                              Send Request
                            </>
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No Results */}
              {searchResults.length === 0 &&
                !searchLoading &&
                searchForm.source.name &&
                searchForm.destination.name && (
                  <div className="no-results">
                    <div className="no-results-content">
                      <div className="no-results-icon">
                        <i className="fas fa-search"></i>
                      </div>
                      <h3>No matches found</h3>
                      <p>
                        We couldn&apos;t find any ride buddies for your route
                        right now.
                      </p>
                      <p>
                        Your search is active - you&apos;ll be notified when
                        someone matches!
                      </p>
                    </div>
                  </div>
                )}
            </div>
          )}

          {activeTab === "connections" && (
            <div className="connections-tab">
              {/* Incoming Requests */}
              {incomingRequests.length > 0 && (
                <div className="requests-section">
                  <h3 className="section-title">
                    Connection Requests ({incomingRequests.length})
                  </h3>
                  <div className="requests-grid">
                    {incomingRequests.map((request) => (
                      <div key={request._id} className="request-card">
                        <div className="request-header">
                          <div className="user-avatar">
                            <i className="fas fa-user"></i>
                          </div>
                          <div className="user-info">
                            <h4 className="user-name kalam-regular">
                              {request.senderName ||
                                `User ${request.senderId?.slice(-4)}`}
                            </h4>
                            <p className="user-contact">
                              📱 Contact available after connection
                            </p>
                            <p className="request-route">
                              {request.routeDetails?.senderRoute?.source
                                ?.name ||
                                (typeof request.routeDetails?.senderRoute
                                  ?.source === "string"
                                  ? request.routeDetails?.senderRoute?.source
                                  : request.routeDetails?.senderRoute?.source
                                      ?.name) ||
                                "Unknown"}{" "}
                              →{" "}
                              {request.routeDetails?.senderRoute?.destination
                                ?.name ||
                                (typeof request.routeDetails?.senderRoute
                                  ?.destination === "string"
                                  ? request.routeDetails?.senderRoute
                                      ?.destination
                                  : request.routeDetails?.senderRoute
                                      ?.destination?.name) ||
                                "Unknown"}
                            </p>
                            <p className="connection-fare">
                              Shared Fare: ₹
                              {Math.round(
                                request.routeDetails?.estimatedSharedFare || 0
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="request-message">
                          <p>&quot;{request.message}&quot;</p>
                        </div>

                        <div className="request-actions">
                          <button
                            className="btn btn-outline flex-1"
                            onClick={() => handleDeclineRequest(request)}
                          >
                            <i className="fas fa-times"></i>
                            Decline
                          </button>
                          <button
                            className="btn btn-green flex-1"
                            onClick={() => handleAcceptRequest(request)}
                          >
                            <i className="fas fa-check"></i>
                            Accept
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Active Connections */}
              <div className="connections-section">
                <h3 className="section-title">
                  Your Connections ({activeConnections.length})
                </h3>

                {activeConnections.length === 0 &&
                incomingRequests.length === 0 ? (
                  <div className="no-connections">
                    <div className="no-connections-content">
                      <div className="no-connections-icon">
                        <i className="fas fa-users"></i>
                      </div>
                      <h3>No connections yet</h3>
                      <p>
                        Search for ride buddies and accept connection requests
                        to start connecting!
                      </p>
                    </div>
                  </div>
                ) : activeConnections.length === 0 ? (
                  <div className="no-connections">
                    <div className="no-connections-content">
                      <p>
                        Accept a connection request above to start connecting!
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="connections-grid">
                    {activeConnections.map((connection) => (
                      <div
                        key={connection.matchId}
                        className="connection-card modern-card"
                      >
                        <div className="connection-header">
                          <div className="user-avatar connected">
                            <i className="fas fa-user-check"></i>
                          </div>
                          <div className="user-info">
                            <h4 className="user-name kalam-regular">
                              {connection.partner?.name || "Anonymous"}
                            </h4>
                            <p className="user-contact">
                              📱{" "}
                              {connection.partner?.phone ||
                                "Phone number available"}
                            </p>
                            <p className="connection-route">
                              {connection.routeDetails?.senderRoute?.source
                                ?.name ||
                                (typeof connection.routeDetails?.senderRoute
                                  ?.source === "string"
                                  ? connection.routeDetails?.senderRoute?.source
                                  : connection.routeDetails?.senderRoute?.source
                                      ?.name) ||
                                "Unknown"}{" "}
                              →{" "}
                              {connection.routeDetails?.senderRoute?.destination
                                ?.name ||
                                (typeof connection.routeDetails?.senderRoute
                                  ?.destination === "string"
                                  ? connection.routeDetails?.senderRoute
                                      ?.destination
                                  : connection.routeDetails?.senderRoute
                                      ?.destination?.name) ||
                                "Unknown"}
                            </p>
                            <p className="connection-fare">
                              Shared Fare: ₹
                              {Math.round(
                                connection.routeDetails?.estimatedSharedFare ||
                                  0
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="connection-actions">
                          {connection.chatTimeRemaining > 0 ? (
                            <button
                              className="chat-btn"
                              onClick={() => handleStartChat(connection)}
                            >
                              <i className="fas fa-comments"></i>
                              Start Chat (
                              {Math.ceil(
                                connection.chatTimeRemaining / 60000
                              )}{" "}
                              min left)
                            </button>
                          ) : (
                            <button
                              className="chat-btn expired"
                              disabled
                              title="Chat session has expired"
                            >
                              <i className="fas fa-clock"></i>
                              Chat Expired
                            </button>
                          )}
                        </div>

                        <div className="contact-info">
                          <div className="contact-item direct-contact">
                            <i className="fas fa-phone"></i>
                            <div className="contact-details">
                              <span className="contact-label kalam-regular">
                                Direct Contact:
                              </span>
                              <span className="phone-number-display">
                                {connection.partner?.phone || "Loading..."}
                              </span>
                              <span className="contact-hint">
                                You can now contact your ride buddy directly
                              </span>
                            </div>
                            <button
                              className="copy-btn"
                              onClick={() => {
                                const phoneNum = connection.partner?.phone;
                                if (phoneNum) {
                                  navigator.clipboard.writeText(phoneNum);
                                  toast.success("Phone number copied!");
                                }
                              }}
                            >
                              <i className="fas fa-copy"></i>
                            </button>
                          </div>
                        </div>

                        <div className="contact-actions">
                          {connection.partner?.phone && (
                            <>
                              <a
                                href={`tel:${connection.partner.phone}`}
                                className="contact-btn call-btn"
                              >
                                <i className="fas fa-phone"></i>
                                Call Direct
                              </a>

                              <a
                                href={`https://wa.me/${connection.partner.phone.replace(
                                  /[^0-9]/g,
                                  ""
                                )}?text=Hi! I'm your ride buddy from SAWAARI. Let's coordinate our trip!`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="contact-btn whatsapp-btn"
                              >
                                <i className="fab fa-whatsapp"></i>
                                WhatsApp
                              </a>
                            </>
                          )}
                        </div>

                        <div className="connection-footer">
                          <small>
                            Connected:{" "}
                            {new Date(
                              connection.createdAt
                            ).toLocaleDateString()}
                          </small>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Live Chat Modal */}
      {activeChatId && chatPartner && (
        <LiveChat
          chatId={activeChatId}
          partnerName={chatPartner.name}
          onClose={handleCloseChat}
        />
      )}
    </div>
  );
};

export default RideBuddy;
