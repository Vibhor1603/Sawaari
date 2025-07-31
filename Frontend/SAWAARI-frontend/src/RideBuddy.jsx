import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "./AuthContext";
import rideBuddyService from "./services/rideBuddyService";
import { useHotspotData } from "./useHotspotData";
import socketService from "./services/socketService";
import authService from "./services/authService";
import LiveChat from "./components/LiveChat";
import toast from "./utils/toast";

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
      const token = authService.getAccessToken();
      if (token) {
        socketService.connect(token).catch(async (error) => {
          console.error("Socket connection failed:", error);
          if (error.message && error.message.includes("Token expired")) {
            const refreshed = await authService.refreshAccessToken();
            if (refreshed) {
              const newToken = authService.getAccessToken();
              socketService.connect(newToken).catch(() => {
                toast.error("Session expired. Please sign in again.");
                authService.clearTokens();
                navigate("/signin");
              });
            } else {
              toast.error("Session expired. Please sign in again.");
              authService.clearTokens();
              navigate("/signin");
            }
          }
        });
      }

      loadRequests();
      loadConnections();

      // Set up real-time notification listeners
      socketService.on("ride_buddy_new_request", (data) => {
        toast.success(`New ride request from ${data.senderName}!`);
        loadRequests();
        if (activeTab === "search") {
          setActiveTab("connections");
        }
      });

      socketService.on("ride_buddy_request_response", (data) => {
        if (data.action === "accepted") {
          toast.success(`${data.responderName} accepted your request!`);
          loadConnections();
          setActiveTab("connections");
        } else {
          toast.info(`${data.responderName} declined your request`);
        }
        loadRequests();
      });
    }

    return () => {
      if (activeChatId) {
        socketService.leaveChatRoom(activeChatId);
      }
      socketService.off("ride_buddy_new_request");
      socketService.off("ride_buddy_request_response");
    };
  }, [activeChatId, isAuthenticated, user, navigate, activeTab]);

  const loadRequests = async () => {
    try {
      const result = await rideBuddyService.getRequests();
      if (result.success) {
        setIncomingRequests(result.data.requests || []);
        setOutgoingRequests(result.data.sentRequests || []);
        const sentIds = new Set(
          (result.data.sentRequests || [])
            .filter((req) => req.status === "pending")
            .map((req) => req.receiverId.toString())
        );
        setSentRequestIds(sentIds);
      }
    } catch (error) {
      console.error("Error loading requests:", error);
    }
  };

  const loadConnections = async () => {
    try {
      const result = await rideBuddyService.getConnections();
      if (result.success) {
        setActiveConnections(result.data || []);
      }
    } catch (error) {
      console.error("Error loading connections:", error);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchForm.source.name || !searchForm.destination.name) {
      toast.error("Please select both source and destination");
      return;
    }

    setSearchLoading(true);
    try {
      const result = await rideBuddyService.searchRideBuddies({
        source: searchForm.source,
        destination: searchForm.destination,
      });

      if (result.success) {
        setSearchResults(result.data || []);
        if (result.data.length === 0) {
          toast.info("No ride buddies found for this route");
        }
      } else {
        toast.error(result.message || "Search failed");
      }
    } catch (error) {
      console.error("Search error:", error);
      toast.error("Search failed. Please try again.");
    } finally {
      setSearchLoading(false);
    }
  };

  const sendRideRequest = async (receiverId) => {
    try {
      const result = await rideBuddyService.sendRequest({
        receiverId,
        source: searchForm.source,
        destination: searchForm.destination,
      });

      if (result.success) {
        toast.success("Ride request sent successfully!");
        setSentRequestIds((prev) => new Set([...prev, receiverId.toString()]));
      } else {
        toast.error(result.message || "Failed to send request");
      }
    } catch (error) {
      console.error("Error sending request:", error);
      toast.error("Failed to send request");
    }
  };

  const respondToRequest = async (requestId, action) => {
    try {
      const result = await rideBuddyService.respondToRequest(requestId, action);
      if (result.success) {
        toast.success(`Request ${action} successfully!`);
        loadRequests();
        if (action === "accepted") {
          loadConnections();
        }
      } else {
        toast.error(result.message || `Failed to ${action} request`);
      }
    } catch (error) {
      console.error(`Error ${action} request:`, error);
      toast.error(`Failed to ${action} request`);
    }
  };

  const startChat = (connection) => {
    const chatId = connection.chatId || `${user.id}_${connection.partnerId}`;
    setActiveChatId(chatId);
    setChatPartner({
      id: connection.partnerId,
      name: connection.partnerName,
      email: connection.partnerEmail,
    });
    socketService.joinChatRoom(chatId);
  };

  const closeChat = () => {
    if (activeChatId) {
      socketService.leaveChatRoom(activeChatId);
    }
    setActiveChatId(null);
    setChatPartner(null);
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black pt-16">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-black via-neutral-900 to-black"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-sawaari-yellow/5 rounded-full blur-3xl animate-pulse-slow"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-sawaari-green/5 rounded-full blur-3xl animate-pulse-slow delay-1000"></div>
      </div>

      {/* Compact Header */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 glass-strong border border-sawaari-yellow/30 rounded-full px-4 py-2 mb-4 hover:border-sawaari-yellow/50 transition-all duration-300">
            <span className="text-xl">🚗👥</span>
            <span className="text-lg font-bold text-sawaari-yellow">
              Ride Buddy
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white mb-3 leading-tight">
            Find Your{" "}
            <span className="bg-gradient-to-r from-sawaari-yellow to-sawaari-green bg-clip-text text-transparent">
              Travel Companion
            </span>
          </h1>
          <p className="text-base text-neutral-400 max-w-2xl mx-auto">
            Connect with travelers, share rides, and split costs
          </p>

          {/* Compact Stats */}
          <div className="flex justify-center gap-6 mt-4">
            <div className="text-center">
              <div className="text-lg font-bold text-sawaari-yellow">
                {activeConnections.length}
              </div>
              <div className="text-xs text-neutral-500">Connections</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-sawaari-yellow">
                {incomingRequests.length}
              </div>
              <div className="text-xs text-neutral-500">Requests</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-sawaari-yellow">
                {searchResults.length}
              </div>
              <div className="text-xs text-neutral-500">Matches</div>
            </div>
          </div>
        </div>

        {/* Compact Tab Navigation */}
        <div className="flex justify-center mb-6">
          <div className="glass-strong rounded-xl p-1 flex gap-1 border border-neutral-800">
            {[
              {
                id: "search",
                label: "Find Buddies",
                icon: "🔍",
                count: searchResults.length,
              },
              {
                id: "connections",
                label: "My Network",
                icon: "🤝",
                count: activeConnections.length + incomingRequests.length,
              },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-4 py-2 rounded-lg font-semibold transition-all duration-300 flex items-center gap-2 ${
                  activeTab === tab.id
                    ? "bg-gradient-to-r from-sawaari-yellow to-sawaari-green text-black shadow-lg"
                    : "text-neutral-400 hover:text-white hover:bg-neutral-800/50"
                }`}
              >
                <span className="text-lg">{tab.icon}</span>
                <span className="text-sm">{tab.label}</span>
                {tab.count > 0 && (
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                      activeTab === tab.id
                        ? "bg-black text-sawaari-yellow"
                        : "bg-sawaari-yellow text-black"
                    }`}
                  >
                    {tab.count}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Compact Search Tab */}
        {activeTab === "search" && (
          <div className="max-w-4xl mx-auto">
            {/* Compact Search Form */}
            <div className="glass-strong rounded-xl p-4 mb-4 border border-neutral-800 hover:border-sawaari-yellow/30 transition-all duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-sawaari-yellow/20 to-sawaari-green/20 rounded-lg flex items-center justify-center">
                  <span className="text-xl">🔍</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">
                    Search Ride Buddies
                  </h2>
                  <p className="text-sm text-neutral-400">
                    Find travelers on your route
                  </p>
                </div>
              </div>

              <form onSubmit={handleSearch} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Compact Source */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-1 text-sm font-semibold text-sawaari-yellow">
                      <span>📍</span>
                      From
                    </label>
                    <select
                      value={searchForm.source.name}
                      onChange={(e) => {
                        const selectedLocation = hotspotData.find(
                          (h) => h.name === e.target.value
                        );
                        setSearchForm((prev) => ({
                          ...prev,
                          source: {
                            name: e.target.value,
                            coordinates: selectedLocation
                              ? [
                                  selectedLocation.latitude,
                                  selectedLocation.longitude,
                                ]
                              : null,
                          },
                        }));
                      }}
                      className="w-full p-3 bg-neutral-900/80 border border-neutral-700 rounded-lg text-white focus:border-sawaari-yellow focus:ring-1 focus:ring-sawaari-yellow/20 focus:outline-none transition-all duration-300"
                      required
                    >
                      <option value="" className="bg-neutral-900">
                        Choose starting point...
                      </option>
                      {hotspotData.map((location, index) => (
                        <option
                          key={index}
                          value={location.name}
                          className="bg-neutral-900"
                        >
                          {location.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Compact Destination */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-1 text-sm font-semibold text-sawaari-yellow">
                      <span>🎯</span>
                      To
                    </label>
                    <select
                      value={searchForm.destination.name}
                      onChange={(e) => {
                        const selectedLocation = hotspotData.find(
                          (h) => h.name === e.target.value
                        );
                        setSearchForm((prev) => ({
                          ...prev,
                          destination: {
                            name: e.target.value,
                            coordinates: selectedLocation
                              ? [
                                  selectedLocation.latitude,
                                  selectedLocation.longitude,
                                ]
                              : null,
                          },
                        }));
                      }}
                      className="w-full p-3 bg-neutral-900/80 border border-neutral-700 rounded-lg text-white focus:border-sawaari-yellow focus:ring-1 focus:ring-sawaari-yellow/20 focus:outline-none transition-all duration-300"
                      required
                    >
                      <option value="" className="bg-neutral-900">
                        Choose destination...
                      </option>
                      {hotspotData.map((location, index) => (
                        <option
                          key={index}
                          value={location.name}
                          className="bg-neutral-900"
                        >
                          {location.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Compact Route Preview */}
                {searchForm.source.name && searchForm.destination.name && (
                  <div className="bg-neutral-900/50 rounded-lg p-3 border border-neutral-700">
                    <div className="flex items-center justify-center gap-3 text-sm text-neutral-300">
                      <span className="font-medium">
                        {searchForm.source.name}
                      </span>
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 bg-sawaari-yellow rounded-full"></div>
                        <div className="w-6 h-px bg-gradient-to-r from-sawaari-yellow to-sawaari-green"></div>
                        <div className="w-1.5 h-1.5 bg-sawaari-green rounded-full"></div>
                      </div>
                      <span className="font-medium">
                        {searchForm.destination.name}
                      </span>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={searchLoading}
                  className="w-full flex items-center justify-center gap-3 p-4 bg-gradient-to-r from-sawaari-yellow to-sawaari-green text-black font-bold rounded-xl shadow-lg hover:shadow-sawaari-yellow/25 hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {searchLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black"></div>
                      <span>Searching...</span>
                    </>
                  ) : (
                    <>
                      <span className="text-lg">🔍</span>
                      <span>Find Ride Buddies</span>
                      <span className="text-lg">👥</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Compact Search Results */}
            {searchResults.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span className="text-xl">🎯</span>
                  Found {searchResults.length} Matches
                </h3>

                <div className="grid gap-3">
                  {searchResults.map((buddy, index) => (
                    <div
                      key={buddy.id}
                      className="glass-strong rounded-lg p-4 border border-neutral-800 hover:border-sawaari-yellow/30 transition-all duration-300"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <div className="w-12 h-12 bg-gradient-to-br from-sawaari-yellow/20 to-sawaari-green/20 rounded-lg flex items-center justify-center">
                              <span className="text-xl">👤</span>
                            </div>
                            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-sawaari-green rounded-full flex items-center justify-center">
                              <span className="text-xs">✓</span>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <h4 className="text-lg font-bold text-white">
                              {buddy.name}
                            </h4>
                            <div className="flex items-center gap-2 text-sm text-neutral-300">
                              <span>{getLocationName(buddy.source)}</span>
                              <div className="flex items-center gap-1">
                                <div className="w-1.5 h-1.5 bg-sawaari-yellow rounded-full"></div>
                                <div className="w-4 h-px bg-gradient-to-r from-sawaari-yellow to-sawaari-green"></div>
                                <div className="w-1.5 h-1.5 bg-sawaari-green rounded-full"></div>
                              </div>
                              <span>{getLocationName(buddy.destination)}</span>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-neutral-400">
                              <span>
                                📅{" "}
                                {new Date(buddy.createdAt).toLocaleDateString()}
                              </span>
                              <span>⭐ {buddy.rating || "New"}</span>
                              <span>🚗 Available</span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => sendRideRequest(buddy.id)}
                          disabled={sentRequestIds.has(buddy.id.toString())}
                          className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-300 ${
                            sentRequestIds.has(buddy.id.toString())
                              ? "bg-neutral-700 text-neutral-400 cursor-not-allowed"
                              : "bg-gradient-to-r from-sawaari-yellow to-sawaari-green text-black hover:shadow-lg"
                          }`}
                        >
                          {sentRequestIds.has(buddy.id.toString()) ? (
                            <span>✓ Sent</span>
                          ) : (
                            <span>📤 Request</span>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Compact No Results State */}
            {searchResults.length === 0 &&
              searchForm.source.name &&
              searchForm.destination.name &&
              !searchLoading && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-neutral-800 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">🔍</span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">
                    No buddies found for this route
                  </h3>
                  <p className="text-sm text-neutral-400 mb-4 max-w-sm mx-auto">
                    Try nearby locations or check back later
                  </p>
                  <button
                    onClick={() => {
                      setSearchForm({
                        source: { name: "", coordinates: null },
                        destination: { name: "", coordinates: null },
                      });
                      setSearchResults([]);
                    }}
                    className="px-4 py-2 bg-sawaari-yellow text-black rounded-lg font-semibold hover:bg-sawaari-green transition-colors duration-300"
                  >
                    Try Different Route
                  </button>
                </div>
              )}
          </div>
        )}

        {/* Compact Connections Tab */}
        {activeTab === "connections" && (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Compact Incoming Requests */}
            {incomingRequests.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-sawaari-yellow/20 to-orange-500/20 rounded-lg flex items-center justify-center">
                    <span className="text-xl">📨</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">
                      Incoming Requests ({incomingRequests.length})
                    </h3>
                    <p className="text-sm text-neutral-400">
                      Travelers want to ride with you
                    </p>
                  </div>
                </div>

                <div className="grid gap-3">
                  {incomingRequests.map((request, index) => (
                    <div
                      key={request.id}
                      className="glass-strong rounded-lg p-4 border border-sawaari-yellow/30 hover:border-sawaari-yellow/50 transition-all duration-300"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <div className="w-12 h-12 bg-gradient-to-br from-sawaari-yellow/20 to-orange-500/20 rounded-lg flex items-center justify-center">
                              <span className="text-xl">👤</span>
                            </div>
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-sawaari-yellow rounded-full flex items-center justify-center">
                              <span className="text-xs font-bold text-black">
                                !
                              </span>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <h4 className="text-lg font-bold text-white">
                              {request.senderName}
                            </h4>
                            <div className="flex items-center gap-2 text-sm text-neutral-300">
                              <span>{getLocationName(request.source)}</span>
                              <div className="flex items-center gap-1">
                                <div className="w-1.5 h-1.5 bg-sawaari-yellow rounded-full"></div>
                                <div className="w-4 h-px bg-gradient-to-r from-sawaari-yellow to-orange-500"></div>
                                <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                              </div>
                              <span>
                                {getLocationName(request.destination)}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-neutral-400">
                              <span>📧 {request.senderEmail}</span>
                              <span>📱 {request.senderPhone}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              respondToRequest(request.id, "accepted")
                            }
                            className="px-4 py-2 bg-gradient-to-r from-sawaari-green to-green-600 text-white rounded-lg font-semibold text-sm hover:shadow-lg transition-all duration-300 flex items-center gap-1"
                          >
                            <span>✓</span>
                            <span>Accept</span>
                          </button>
                          <button
                            onClick={() =>
                              respondToRequest(request.id, "declined")
                            }
                            className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg font-semibold text-sm hover:shadow-lg transition-all duration-300 flex items-center gap-1"
                          >
                            <span>✗</span>
                            <span>Decline</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Compact Active Connections */}
            {activeConnections.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-sawaari-green/20 to-green-600/20 rounded-lg flex items-center justify-center">
                    <span className="text-xl">🤝</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">
                      Active Connections ({activeConnections.length})
                    </h3>
                    <p className="text-sm text-neutral-400">
                      Confirmed travel companions
                    </p>
                  </div>
                </div>

                <div className="grid gap-3">
                  {activeConnections.map((connection, index) => (
                    <div
                      key={connection.id}
                      className="glass-strong rounded-lg p-4 border border-sawaari-green/30 hover:border-sawaari-green/50 transition-all duration-300"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <div className="w-12 h-12 bg-gradient-to-br from-sawaari-green/20 to-green-600/20 rounded-lg flex items-center justify-center">
                              <span className="text-xl">👤</span>
                            </div>
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-sawaari-green rounded-full flex items-center justify-center">
                              <span className="text-xs font-bold text-white">
                                ✓
                              </span>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <h4 className="text-lg font-bold text-white">
                              {connection.partnerName}
                            </h4>
                            <div className="flex items-center gap-2 text-sm text-neutral-300">
                              <span>{getLocationName(connection.source)}</span>
                              <div className="flex items-center gap-1">
                                <div className="w-1.5 h-1.5 bg-sawaari-green rounded-full"></div>
                                <div className="w-4 h-px bg-gradient-to-r from-sawaari-green to-green-600"></div>
                                <div className="w-1.5 h-1.5 bg-green-600 rounded-full"></div>
                              </div>
                              <span>
                                {getLocationName(connection.destination)}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-neutral-400">
                              <span>📧 {connection.partnerEmail}</span>
                              <span>📱 {connection.partnerPhone}</span>
                              <span>🟢 Connected</span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => startChat(connection)}
                          className="px-4 py-2 bg-gradient-to-r from-sawaari-yellow to-orange-500 text-black rounded-lg font-semibold text-sm hover:shadow-lg transition-all duration-300 flex items-center gap-2"
                        >
                          <span>💬</span>
                          <span>Chat</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Compact Empty State */}
            {incomingRequests.length === 0 &&
              activeConnections.length === 0 && (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-gradient-to-br from-neutral-800 to-neutral-900 rounded-lg flex items-center justify-center mx-auto mb-6">
                    <span className="text-4xl">🤝</span>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">
                    Your Network Awaits
                  </h3>
                  <p className="text-sm text-neutral-400 mb-6 max-w-md mx-auto">
                    Start building your travel network by searching for ride
                    buddies
                  </p>
                  <button
                    onClick={() => setActiveTab("search")}
                    className="px-6 py-3 bg-gradient-to-r from-sawaari-yellow to-sawaari-green text-black rounded-lg font-semibold hover:shadow-lg transition-all duration-300 flex items-center gap-2 mx-auto"
                  >
                    <span>🔍</span>
                    <span>Find Your First Buddy</span>
                  </button>
                </div>
              )}
          </div>
        )}
      </div>

      {/* Compact Live Chat Modal */}
      {activeChatId && chatPartner && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-900 border border-neutral-700 rounded-xl w-full max-w-md h-[500px] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-neutral-700">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-sawaari-yellow/20 to-sawaari-green/20 rounded-lg flex items-center justify-center">
                  <span className="text-lg">👤</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {chatPartner.name}
                  </h3>
                  <p className="text-xs text-neutral-400">Travel companion</p>
                </div>
              </div>
              <button
                onClick={closeChat}
                className="w-8 h-8 bg-neutral-800 hover:bg-neutral-700 rounded-lg flex items-center justify-center text-neutral-400 hover:text-white transition-all duration-300"
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
            </div>
            <div className="flex-1 overflow-hidden">
              <LiveChat
                chatId={activeChatId}
                partnerName={chatPartner.name}
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
