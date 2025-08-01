import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "./AuthContext";
import rideBuddyService from "./services/rideBuddyService";
import { useHotspotData } from "./useHotspotData";
import socketService from "./services/socketService";
import authService from "./services/authService";
import LiveChat from "./components/LiveChat";
import toast from "./utils/toast";
import React from "react"; // Added missing import for React

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

  // Extract location names from hotspot data with debugging
  const locationNames = React.useMemo(() => {
    console.log("Hotspot data in RideBuddy:", hotspotData);
    if (hotspotData && Array.isArray(hotspotData)) {
      const names = hotspotData
        .map((spot) => spot.name)
        .filter(Boolean)
        .sort();
      console.log("Extracted location names:", names);
      return names;
    }
    console.log("No hotspot data available");
    return [];
  }, [hotspotData]);

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

      socketService.on("ride_buddy_connection_ended", () => {
        toast.info("A ride connection has ended");
        loadConnections();
      });

      return () => {
        // Clean up socket connection and event listeners
        if (activeChatId) {
          socketService.leaveChatRoom(activeChatId);
        }
        socketService.off("auth_error");
        socketService.off("ride_buddy_new_request");
        socketService.off("ride_buddy_request_response");
        socketService.off("new_notification");
        socketService.off("ride_buddy_connection_ended");
      };
    }
  }, [activeChatId, isAuthenticated, user, navigate, activeTab]);

  const loadRequests = async () => {
    try {
      setRequestsLoading(true);
      // Use the correct method name from the old version
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
      toast.error("Failed to load ride requests");
    } finally {
      setRequestsLoading(false);
    }
  };

  const loadConnections = async (forceRefresh = false) => {
    try {
      // Clear cache if force refresh is requested
      if (forceRefresh) {
        rideBuddyService.clearCache && rideBuddyService.clearCache();
      }

      // Use the correct method name from the old version
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
      toast.error("Failed to load active connections");
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

    setSearchLoading(true);
    try {
      // Use the correct method signature from the old version
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
      console.error("Search failed:", error);
      toast.error("Failed to search for ride buddies");
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const sendRideRequest = async (match) => {
    if (sentRequestIds.has(match.userId)) {
      toast.error("Request already sent to this user");
      return;
    }

    try {
      setSentRequestIds((prev) => new Set([...prev, match.userId]));

      // Use the correct method signature from the old version
      const result = await rideBuddyService.sendConnectionRequest({
        receiverId: match.userId,
        routeDetails: {
          senderRoute: {
            source: searchForm.source.name,
            destination: searchForm.destination.name,
          },
          receiverRoute: {
            source: getLocationName(match.route?.source || match.source),
            destination: getLocationName(
              match.route?.destination || match.destination
            ),
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
      console.error("Failed to send request:", error);
      toast.error("Failed to send ride request");
    }
  };

  const respondToRequest = async (requestId, action) => {
    try {
      if (action === "accepted") {
        const result = await rideBuddyService.acceptRequest(requestId);
        if (result.success) {
          setIncomingRequests((prev) =>
            prev.filter((r) => r._id !== requestId)
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
            "Request accepted! You can now chat with your ride buddy."
          );
          loadConnections();
        } else {
          toast.error(result.error || "Failed to accept request");
        }
      } else {
        const result = await rideBuddyService.declineRequest(requestId);
        if (result.success) {
          setIncomingRequests((prev) =>
            prev.filter((r) => r._id !== requestId)
          );
          toast.success("Request declined");
        } else {
          toast.error(result.error || "Failed to decline request");
        }
      }
      loadRequests();
    } catch (error) {
      console.error("Failed to respond to request:", error);
      toast.error("Failed to respond to request");
    }
  };

  const startChat = (connection) => {
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

  const closeChat = () => {
    if (activeChatId) {
      socketService.leaveChatRoom(activeChatId);
    }
    setActiveChatId(null);
    setChatPartner(null);
  };

  // Handle keyboard shortcuts for chat
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && activeChatId) {
        closeChat();
      }
    };

    if (activeChatId) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [activeChatId, closeChat]);

  // Don't render if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black pt-20">
      <div className="container-sawaari">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 bg-sawaari-yellow-muted border border-sawaari-yellow-border rounded-full px-6 py-3 mb-6">
            <span className="text-2xl">👥</span>
            <span className="text-sm font-medium text-sawaari-yellow text-readable">
              Ride Buddy
            </span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4 text-readable">
            Find Your Travel Companion
          </h1>
          <p className="text-xl text-gray-200 max-w-3xl mx-auto text-readable-secondary">
            Connect with fellow travelers, share rides, and make your journey
            more affordable and enjoyable.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-8">
          <div className="flex bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl p-1">
            {[
              { id: "search", label: "Search", icon: "🔍" },
              { id: "connections", label: "Connections", icon: "👥" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-all duration-300 ${
                  activeTab === tab.id
                    ? "bg-sawaari-yellow text-black font-semibold"
                    : "text-gray-300 hover:text-white hover:bg-white/10"
                }`}
              >
                <span className="text-lg">{tab.icon}</span>
                <span className="text-readable">{tab.label}</span>
                {tab.id === "connections" &&
                  (incomingRequests.length > 0 ||
                    activeConnections.length > 0) && (
                    <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 ml-1">
                      {incomingRequests.length + activeConnections.length}
                    </span>
                  )}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="max-w-6xl mx-auto">
          {activeTab === "search" && (
            <div className="space-y-8">
              {/* Search Form */}
              <div className="card">
                <h2 className="text-2xl font-bold text-white mb-6 text-readable">
                  Search for Ride Buddies
                </h2>
                <form onSubmit={handleSearch} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-sawaari-yellow mb-2 text-readable">
                        📍 Source Location
                      </label>
                      <select
                        className="w-full p-3 bg-black/30 border border-white/20 rounded-lg text-white focus:border-sawaari-yellow focus:ring-2 focus:ring-sawaari-yellow/20 focus:outline-none transition-all duration-300 text-sm"
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
                      >
                        <option value="">Select Source</option>
                        {locationNames.map((name, index) => (
                          <option
                            key={index}
                            value={name}
                            className="text-white bg-black"
                          >
                            {name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-sawaari-yellow mb-2 text-readable">
                        🎯 Destination Location
                      </label>
                      <select
                        className="w-full p-3 bg-black/30 border border-white/20 rounded-lg text-white focus:border-sawaari-yellow focus:ring-2 focus:ring-sawaari-yellow/20 focus:outline-none transition-all duration-300 text-sm"
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
                      >
                        <option value="">Select Destination</option>
                        {locationNames.map((name, index) => (
                          <option
                            key={index}
                            value={name}
                            className="text-white bg-black"
                          >
                            {name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={searchLoading}
                    className="btn-primary w-full md:w-auto"
                  >
                    {searchLoading ? "Searching..." : "Search Ride Buddies"}
                  </button>
                </form>
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="card">
                  <h3 className="text-xl font-bold text-white mb-6 text-readable">
                    Available Ride Buddies ({searchResults.length})
                  </h3>
                  <div className="grid gap-4">
                    {searchResults.map((match) => (
                      <div
                        key={match.userId}
                        className="flex items-center justify-between p-4 bg-black/30 border border-white/10 rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-sawaari-yellow-muted border border-sawaari-yellow-border rounded-full flex items-center justify-center">
                            <span className="text-sawaari-yellow font-semibold">
                              {(
                                match.userName ||
                                `User ${match.userId?.slice(-4)}`
                              )
                                ?.charAt(0)
                                ?.toUpperCase() || "U"}
                            </span>
                          </div>
                          <div>
                            <h4 className="font-semibold text-white text-readable">
                              {match.userName ||
                                `User ${match.userId?.slice(-4)}`}
                            </h4>
                            <p className="text-sm text-gray-300 text-readable-secondary">
                              {getLocationName(
                                match.route?.source || match.source
                              )}{" "}
                              →{" "}
                              {getLocationName(
                                match.route?.destination || match.destination
                              )}
                            </p>
                            {match.overlapPercentage && (
                              <p className="text-xs text-sawaari-yellow">
                                {Math.round(match.overlapPercentage)}% route
                                match
                              </p>
                            )}
                            {match.estimatedSharedFare && (
                              <p className="text-xs text-green-400">
                                ₹{Math.round(match.estimatedSharedFare)} shared
                                fare
                              </p>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => sendRideRequest(match)}
                          disabled={sentRequestIds.has(match.userId)}
                          className={`px-4 py-2 rounded-lg transition-all duration-300 ${
                            sentRequestIds.has(match.userId)
                              ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                              : "bg-sawaari-yellow text-black hover:bg-sawaari-yellow/80"
                          }`}
                        >
                          {sentRequestIds.has(match.userId)
                            ? "Request Sent"
                            : "Send Request"}
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
                  <div className="card text-center">
                    <div className="text-6xl mb-4">🔍</div>
                    <h3 className="text-xl font-bold text-white mb-2 text-readable">
                      No matches found
                    </h3>
                    <p className="text-gray-300 text-readable-secondary">
                      We couldn't find any ride buddies for your route right
                      now.
                    </p>
                    <p className="text-gray-300 text-readable-secondary">
                      Your search is active - you'll be notified when someone
                      matches!
                    </p>
                  </div>
                )}
            </div>
          )}

          {activeTab === "connections" && (
            <div className="space-y-8">
              {/* Incoming Requests */}
              {incomingRequests.length > 0 && (
                <div className="card">
                  <h3 className="text-xl font-bold text-white mb-6 text-readable">
                    Connection Requests ({incomingRequests.length})
                  </h3>
                  <div className="grid gap-4">
                    {incomingRequests.map((request) => (
                      <div
                        key={request._id}
                        className="flex items-center justify-between p-4 bg-black/30 border border-white/10 rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-sawaari-yellow-muted border border-sawaari-yellow-border rounded-full flex items-center justify-center">
                            <span className="text-sawaari-yellow font-semibold">
                              {(
                                request.senderName ||
                                `User ${request.senderId?.slice(-4)}`
                              )
                                ?.charAt(0)
                                ?.toUpperCase() || "U"}
                            </span>
                          </div>
                          <div>
                            <h4 className="font-semibold text-white text-readable">
                              {request.senderName ||
                                `User ${request.senderId?.slice(-4)}`}
                            </h4>
                            <p className="text-sm text-gray-300 text-readable-secondary">
                              {request.routeDetails?.senderRoute?.source ||
                                "Unknown"}{" "}
                              →{" "}
                              {request.routeDetails?.senderRoute?.destination ||
                                "Unknown"}
                            </p>
                            {request.routeDetails?.estimatedSharedFare && (
                              <p className="text-xs text-green-400">
                                Shared Fare: ₹
                                {Math.round(
                                  request.routeDetails.estimatedSharedFare
                                )}
                              </p>
                            )}
                            {request.message && (
                              <p className="text-xs text-gray-400 italic mt-1">
                                "{request.message}"
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              respondToRequest(request._id, "accepted")
                            }
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() =>
                              respondToRequest(request._id, "declined")
                            }
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Active Connections */}
              {activeConnections.length > 0 && (
                <div className="card">
                  <h3 className="text-xl font-bold text-white mb-6 text-readable">
                    Your Connections ({activeConnections.length})
                  </h3>
                  <div className="grid gap-4">
                    {activeConnections.map((connection) => (
                      <div
                        key={connection.matchId}
                        className="p-4 bg-black/30 border border-white/10 rounded-lg"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-green-600 border border-green-500 rounded-full flex items-center justify-center">
                              <span className="text-white font-semibold">
                                {(
                                  connection.partner?.name ||
                                  connection.partner?.phone
                                )
                                  ?.charAt(0)
                                  ?.toUpperCase() || "U"}
                              </span>
                            </div>
                            <div>
                              <h4 className="font-semibold text-white text-readable">
                                {connection.partner?.name || "Anonymous"}
                              </h4>
                              <p className="text-sm text-gray-300 text-readable-secondary">
                                📱{" "}
                                {connection.partner?.phone ||
                                  "Phone number available"}
                              </p>
                              <p className="text-sm text-gray-300 text-readable-secondary">
                                {connection.routeDetails?.senderRoute?.source ||
                                  "Unknown"}{" "}
                                →{" "}
                                {connection.routeDetails?.senderRoute
                                  ?.destination || "Unknown"}
                              </p>
                              {connection.routeDetails?.estimatedSharedFare && (
                                <p className="text-xs text-green-400">
                                  Shared Fare: ₹
                                  {Math.round(
                                    connection.routeDetails.estimatedSharedFare
                                  )}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Chat Button */}
                          {connection.chatTimeRemaining > 0 ? (
                            <button
                              onClick={() => startChat(connection)}
                              className="px-4 py-2 bg-sawaari-yellow text-black rounded-lg hover:bg-sawaari-yellow/80 transition-colors flex items-center gap-2"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.959 8.959 0 01-4.906-1.524A11.956 11.956 0 012.69 18.186c.423-.95.893-1.902 1.405-2.852A8.002 8.002 0 0121 12z"
                                />
                              </svg>
                              Open Chat (
                              {Math.ceil(connection.chatTimeRemaining / 60000)}{" "}
                              min left)
                            </button>
                          ) : (
                            <button
                              disabled
                              className="px-4 py-2 bg-gray-600 text-gray-400 rounded-lg cursor-not-allowed"
                              title="Chat session has expired"
                            >
                              Chat Expired
                            </button>
                          )}
                        </div>

                        {/* Contact Actions */}
                        {connection.partner?.phone && (
                          <div className="flex gap-2 mt-4 pt-4 border-t border-white/10">
                            <a
                              href={`tel:${connection.partner.phone}`}
                              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              <span>📞</span>
                              Call Direct
                            </a>
                            <a
                              href={`https://wa.me/${connection.partner.phone.replace(
                                /[^0-9]/g,
                                ""
                              )}?text=Hi! I'm your ride buddy from SAWAARI. Let's coordinate our trip!`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                            >
                              <span>💬</span>
                              WhatsApp
                            </a>
                            <button
                              onClick={() => {
                                const phoneNum = connection.partner?.phone;
                                if (phoneNum) {
                                  navigator.clipboard.writeText(phoneNum);
                                  toast.success("Phone number copied!");
                                }
                              }}
                              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                            >
                              <span>📋</span>
                              Copy Number
                            </button>
                          </div>
                        )}

                        <div className="mt-2 text-xs text-gray-400">
                          Connected:{" "}
                          {new Date(connection.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Outgoing Requests */}
              {outgoingRequests.length > 0 && (
                <div className="card">
                  <h3 className="text-xl font-bold text-white mb-6 text-readable">
                    Pending Requests ({outgoingRequests.length})
                  </h3>
                  <div className="grid gap-4">
                    {outgoingRequests.map((request) => (
                      <div
                        key={request._id}
                        className="flex items-center justify-between p-4 bg-black/30 border border-white/10 rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-sawaari-yellow-muted border border-sawaari-yellow-border rounded-full flex items-center justify-center">
                            <span className="text-sawaari-yellow font-semibold">
                              {(
                                request.receiverName ||
                                `User ${request.receiverId?.slice(-4)}`
                              )
                                ?.charAt(0)
                                ?.toUpperCase() || "U"}
                            </span>
                          </div>
                          <div>
                            <h4 className="font-semibold text-white text-readable">
                              {request.receiverName ||
                                `User ${request.receiverId?.slice(-4)}`}
                            </h4>
                            <p className="text-sm text-gray-300 text-readable-secondary">
                              {request.routeDetails?.senderRoute?.source ||
                                "Unknown"}{" "}
                              →{" "}
                              {request.routeDetails?.senderRoute?.destination ||
                                "Unknown"}
                            </p>
                            {request.routeDetails?.estimatedSharedFare && (
                              <p className="text-xs text-green-400">
                                Shared Fare: ₹
                                {Math.round(
                                  request.routeDetails.estimatedSharedFare
                                )}
                              </p>
                            )}
                          </div>
                        </div>
                        <span className="px-4 py-2 bg-yellow-600 text-white rounded-lg">
                          Pending
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {incomingRequests.length === 0 &&
                activeConnections.length === 0 &&
                outgoingRequests.length === 0 && (
                  <div className="card text-center">
                    <div className="text-6xl mb-4">👥</div>
                    <h3 className="text-xl font-bold text-white mb-2 text-readable">
                      No Connections Yet
                    </h3>
                    <p className="text-gray-300 text-readable-secondary">
                      Start by searching for ride buddies or wait for incoming
                      requests.
                    </p>
                    <button
                      onClick={() => {
                        console.log("🔄 Manual refresh triggered");
                        loadRequests();
                        loadConnections(true);
                        toast.info("Data refreshed!");
                      }}
                      className="mt-4 px-6 py-2 bg-sawaari-yellow text-black rounded-lg hover:bg-sawaari-yellow/80 transition-colors"
                    >
                      Refresh Data
                    </button>
                  </div>
                )}
            </div>
          )}
        </div>
      </div>

      {/* Live Chat Popup */}
      {activeChatId && chatPartner && (
        <div
          className="fixed inset-0 bg-black/50 chat-popup-overlay flex items-center justify-center p-4"
          onClick={(e) => {
            // Close chat when clicking outside the chat container
            if (e.target === e.currentTarget) {
              closeChat();
            }
          }}
        >
          <div
            className="bg-neutral-900 rounded-xl chat-popup-container w-full max-w-md h-[600px] max-h-[80vh] relative border border-neutral-700"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={closeChat}
              className="absolute top-4 right-4 z-10 w-8 h-8 bg-neutral-800 hover:bg-neutral-700 rounded-full flex items-center justify-center text-white transition-colors duration-200 border border-neutral-600"
              aria-label="Close chat"
              title="Close chat (Esc)"
            >
              <svg
                className="w-4 h-4"
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

            {/* Chat Header */}
            <div className="px-4 py-3 border-b border-neutral-700 bg-gradient-to-r from-neutral-800 to-neutral-700 rounded-t-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-sawaari-yellow-muted border border-sawaari-yellow-border rounded-full flex items-center justify-center">
                  <span className="text-sawaari-yellow font-semibold text-sm">
                    {chatPartner.name?.charAt(0)?.toUpperCase() || "U"}
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold text-white text-sm">
                    {chatPartner.name || chatPartner.phone}
                  </h3>
                  <p className="text-xs text-neutral-400">Ride Buddy Chat</p>
                </div>
              </div>
            </div>

            {/* LiveChat Component */}
            <div className="h-[calc(100%-80px)]">
              <LiveChat
                chatId={activeChatId}
                partnerName={chatPartner.name || chatPartner.phone}
                onClose={closeChat}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RideBuddy;
