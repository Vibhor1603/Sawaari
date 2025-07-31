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
    <div className="min-h-screen bg-gradient-to-br from-black via-neutral-900 to-black pt-16 relative overflow-hidden">
      {/* Enhanced Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-black via-neutral-900 to-black"></div>

        {/* Floating Auto-Rickshaw Elements */}
        <div className="absolute top-20 left-10 text-6xl opacity-10 animate-drift text-sawaari-yellow">
          🛺
        </div>
        <div className="absolute top-40 right-20 text-4xl opacity-15 animate-drift delay-1000 text-sawaari-green">
          🚗
        </div>
        <div className="absolute bottom-40 left-20 text-5xl opacity-10 animate-drift delay-2000 text-orange-400">
          🛺
        </div>
        <div className="absolute bottom-20 right-10 text-3xl opacity-20 animate-drift delay-3000 text-sawaari-yellow">
          👥
        </div>

        {/* Glowing Orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-sawaari-yellow/10 to-orange-500/10 rounded-full blur-3xl animate-pulse-slow"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-sawaari-green/10 to-emerald-500/10 rounded-full blur-3xl animate-pulse-slow delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-full blur-2xl animate-pulse-slow delay-2000"></div>

        {/* Moving Road Lines */}
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-1/3 left-0 w-full h-px bg-gradient-to-r from-transparent via-sawaari-yellow/20 to-transparent animate-move-bg"></div>
          <div className="absolute top-2/3 left-0 w-full h-px bg-gradient-to-r from-transparent via-sawaari-green/20 to-transparent animate-move-bg delay-1000"></div>
        </div>
      </div>

      {/* Compact Header */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 glass-strong border-2 border-sawaari-yellow/30 rounded-full px-4 py-2 mb-4 hover:border-sawaari-yellow hover:neon-yellow hover:scale-105 transition-all duration-300 hover-lift group">
            <span className="text-xl group-hover:rickshaw-bounce">🚗👥</span>
            <span className="text-lg font-bold text-sawaari-yellow group-hover:text-white">
              Ride Buddy
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white mb-3 leading-tight">
            Find Your{" "}
            <span className="bg-gradient-to-r from-sawaari-yellow via-orange-500 to-sawaari-green bg-clip-text text-transparent animate-pulse">
              Travel Companion
            </span>
          </h1>
          <p className="text-base text-neutral-400 max-w-2xl mx-auto">
            Connect with travelers, share rides, and split costs
          </p>

          {/* Enhanced Stats */}
          <div className="flex justify-center gap-6 mt-4">
            <div className="text-center group hover-lift cursor-pointer">
              <div className="text-lg font-bold text-sawaari-yellow group-hover:text-emerald-400 transition-colors duration-300">
                {activeConnections.length}
              </div>
              <div className="text-xs text-neutral-500 group-hover:text-neutral-400">
                Connections
              </div>
            </div>
            <div className="text-center group hover-lift cursor-pointer">
              <div className="text-lg font-bold text-sawaari-yellow group-hover:text-orange-400 transition-colors duration-300">
                {incomingRequests.length}
              </div>
              <div className="text-xs text-neutral-500 group-hover:text-neutral-400">
                Requests
              </div>
            </div>
            <div className="text-center group hover-lift cursor-pointer">
              <div className="text-lg font-bold text-sawaari-yellow group-hover:text-blue-400 transition-colors duration-300">
                {searchResults.length}
              </div>
              <div className="text-xs text-neutral-500 group-hover:text-neutral-400">
                Matches
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Tab Navigation */}
        <div className="flex justify-center mb-6">
          <div className="glass-strong rounded-xl p-1 flex gap-1 border-2 border-neutral-800 hover:border-sawaari-yellow/30 transition-all duration-300">
            {[
              {
                id: "search",
                label: "Find Buddies",
                icon: "🔍",
                count: searchResults.length,
                color: "from-sawaari-yellow to-orange-500",
                hoverColor:
                  "hover:bg-gradient-to-r hover:from-sawaari-yellow/20 hover:to-orange-500/20",
              },
              {
                id: "connections",
                label: "My Network",
                icon: "🤝",
                count: activeConnections.length + incomingRequests.length,
                color: "from-sawaari-green to-emerald-500",
                hoverColor:
                  "hover:bg-gradient-to-r hover:from-sawaari-green/20 hover:to-emerald-500/20",
              },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-4 py-2 rounded-lg font-semibold transition-all duration-300 flex items-center gap-2 group hover-lift ${
                  activeTab === tab.id
                    ? `bg-gradient-to-r ${tab.color} text-black shadow-lg neon-yellow`
                    : `text-neutral-400 hover:text-white ${tab.hoverColor} hover:shadow-lg`
                }`}
              >
                <span
                  className={`text-lg transition-transform duration-300 ${
                    activeTab === tab.id
                      ? "rickshaw-bounce"
                      : "group-hover:scale-110"
                  }`}
                >
                  {tab.icon}
                </span>
                <span className="text-sm">{tab.label}</span>
                {tab.count > 0 && (
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                      activeTab === tab.id
                        ? "bg-black text-sawaari-yellow animate-pulse"
                        : "bg-sawaari-yellow text-black group-hover:scale-110"
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
            {/* Enhanced Search Form */}
            <div className="glass-strong rounded-xl p-4 mb-4 border-2 border-neutral-800 hover:border-sawaari-yellow/50 hover:shadow-lg hover:shadow-sawaari-yellow/20 transition-all duration-300 hover-lift">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-sawaari-yellow/30 to-orange-500/30 rounded-lg flex items-center justify-center hover:scale-110 transition-transform duration-300 cursor-pointer group">
                  <span className="text-xl group-hover:rickshaw-bounce">
                    🔍
                  </span>
                </div>
                <div>
                  <h2 className="text-xl font-bold bg-gradient-to-r from-white to-sawaari-yellow bg-clip-text text-transparent">
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
                      className="w-full p-3 bg-neutral-900/80 border-2 border-neutral-700 rounded-lg text-white focus:border-sawaari-yellow focus:ring-2 focus:ring-sawaari-yellow/30 focus:outline-none transition-all duration-300 hover:border-neutral-600 hover:shadow-lg"
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
                      className="w-full p-3 bg-neutral-900/80 border-2 border-neutral-700 rounded-lg text-white focus:border-sawaari-green focus:ring-2 focus:ring-sawaari-green/30 focus:outline-none transition-all duration-300 hover:border-neutral-600 hover:shadow-lg"
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
                  className="w-full flex items-center justify-center gap-3 p-4 bg-gradient-to-r from-sawaari-yellow via-orange-500 to-sawaari-green text-black font-bold rounded-xl shadow-lg hover:shadow-sawaari-yellow/40 hover:-translate-y-1 hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-sawaari-green via-emerald-500 to-sawaari-yellow opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative z-10 flex items-center gap-3">
                    {searchLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black"></div>
                        <span>Searching...</span>
                      </>
                    ) : (
                      <>
                        <span className="text-lg group-hover:rickshaw-bounce">
                          🔍
                        </span>
                        <span>Find Ride Buddies</span>
                        <span className="text-lg group-hover:animate-pulse">
                          👥
                        </span>
                      </>
                    )}
                  </div>
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
                      className="glass-strong rounded-lg p-4 border-2 border-neutral-800 hover:border-sawaari-yellow/50 hover:shadow-lg hover:shadow-sawaari-yellow/20 transition-all duration-300 hover-lift group"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <div className="w-12 h-12 bg-gradient-to-br from-sawaari-yellow/30 to-sawaari-green/30 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300 border border-sawaari-yellow/20">
                              <span className="text-xl group-hover:rickshaw-wiggle">
                                👤
                              </span>
                            </div>
                            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-gradient-to-r from-sawaari-green to-emerald-500 rounded-full flex items-center justify-center animate-pulse">
                              <span className="text-xs text-white">✓</span>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <h4 className="text-lg font-bold bg-gradient-to-r from-white to-sawaari-yellow bg-clip-text text-transparent group-hover:from-sawaari-yellow group-hover:to-orange-500 transition-all duration-300">
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
                          className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-300 hover:scale-105 ${
                            sentRequestIds.has(buddy.id.toString())
                              ? "bg-gradient-to-r from-gray-600 to-gray-700 text-gray-300 cursor-not-allowed"
                              : "bg-gradient-to-r from-sawaari-yellow via-orange-500 to-sawaari-green text-black hover:shadow-lg hover:shadow-sawaari-yellow/30 hover-lift"
                          }`}
                        >
                          {sentRequestIds.has(buddy.id.toString()) ? (
                            <span className="flex items-center gap-1">
                              <span className="animate-pulse">✓</span>
                              <span>Sent</span>
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <span>📤</span>
                              <span>Request</span>
                            </span>
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
                  <div className="w-10 h-10 bg-gradient-to-br from-sawaari-yellow/30 to-orange-500/30 rounded-lg flex items-center justify-center hover:scale-110 transition-transform duration-300 cursor-pointer border border-orange-500/20">
                    <span className="text-xl animate-pulse">📨</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold bg-gradient-to-r from-white to-orange-500 bg-clip-text text-transparent">
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
                  <div className="w-10 h-10 bg-gradient-to-br from-sawaari-green/30 to-emerald-500/30 rounded-lg flex items-center justify-center hover:scale-110 transition-transform duration-300 cursor-pointer border border-emerald-500/20">
                    <span className="text-xl animate-pulse">🤝</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold bg-gradient-to-r from-white to-emerald-500 bg-clip-text text-transparent">
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
          <div className="bg-neutral-900 border-2 border-sawaari-yellow/30 rounded-xl w-full max-w-md h-[500px] flex flex-col shadow-2xl hover:border-sawaari-yellow/50 transition-all duration-300">
            <div className="flex items-center justify-between p-4 border-b border-neutral-700 bg-gradient-to-r from-neutral-900 to-neutral-800">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-sawaari-yellow/30 to-sawaari-green/30 rounded-lg flex items-center justify-center border border-sawaari-yellow/20 animate-pulse">
                  <span className="text-lg">👤</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold bg-gradient-to-r from-white to-sawaari-yellow bg-clip-text text-transparent">
                    {chatPartner.name}
                  </h3>
                  <p className="text-xs text-neutral-400">Travel companion</p>
                </div>
              </div>
              <button
                onClick={closeChat}
                className="w-8 h-8 bg-gradient-to-r from-red-500/20 to-red-600/20 hover:from-red-500 hover:to-red-600 rounded-lg flex items-center justify-center text-neutral-400 hover:text-white transition-all duration-300 hover:scale-110"
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
