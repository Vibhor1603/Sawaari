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

      socketService.on("ride_buddy_connection_ended", () => {
        toast.info("A ride connection has ended");
        loadConnections();
      });

      return () => {
        socketService.off("ride_buddy_new_request");
        socketService.off("ride_buddy_request_response");
        socketService.off("ride_buddy_connection_ended");
      };
    }
  }, [isAuthenticated, user, activeTab]);

  const loadRequests = async () => {
    try {
      const [incoming, outgoing] = await Promise.all([
        rideBuddyService.getIncomingRequests(),
        rideBuddyService.getOutgoingRequests(),
      ]);
      setIncomingRequests(incoming);
      setOutgoingRequests(outgoing);
    } catch (error) {
      console.error("Failed to load requests:", error);
      toast.error("Failed to load ride requests");
    }
  };

  const loadConnections = async () => {
    try {
      const connections = await rideBuddyService.getActiveConnections();
      setActiveConnections(connections);
    } catch (error) {
      console.error("Failed to load connections:", error);
      toast.error("Failed to load active connections");
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
      const results = await rideBuddyService.searchRideBuddies(
        searchForm.source,
        searchForm.destination
      );
      setSearchResults(results);
    } catch (error) {
      console.error("Search failed:", error);
      toast.error("Failed to search for ride buddies");
    } finally {
      setSearchLoading(false);
    }
  };

  const sendRideRequest = async (receiverId) => {
    try {
      await rideBuddyService.sendRideRequest(
        receiverId,
        searchForm.source,
        searchForm.destination
      );
      setSentRequestIds((prev) => new Set([...prev, receiverId]));
      toast.success("Ride request sent successfully!");
      loadRequests();
    } catch (error) {
      console.error("Failed to send request:", error);
      toast.error("Failed to send ride request");
    }
  };

  const respondToRequest = async (requestId, action) => {
    try {
      await rideBuddyService.respondToRequest(requestId, action);
      toast.success(
        action === "accepted"
          ? "Request accepted! You can now chat with your ride buddy."
          : "Request declined"
      );
      loadRequests();
      if (action === "accepted") {
        loadConnections();
      }
    } catch (error) {
      console.error("Failed to respond to request:", error);
      toast.error("Failed to respond to request");
    }
  };

  const startChat = (connection) => {
    setActiveChatId(connection.id);
    setChatPartner(connection);
  };

  const closeChat = () => {
    setActiveChatId(null);
    setChatPartner(null);
  };

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
                        onChange={(e) =>
                          setSearchForm((prev) => ({
                            ...prev,
                            source: { name: e.target.value, coordinates: null },
                          }))
                        }
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
                        onChange={(e) =>
                          setSearchForm((prev) => ({
                            ...prev,
                            destination: {
                              name: e.target.value,
                              coordinates: null,
                            },
                          }))
                        }
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
                    {searchResults.map((buddy) => (
                      <div
                        key={buddy.id}
                        className="flex items-center justify-between p-4 bg-black/30 border border-white/10 rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-sawaari-yellow-muted border border-sawaari-yellow-border rounded-full flex items-center justify-center">
                            <span className="text-sawaari-yellow font-semibold">
                              {buddy.name?.charAt(0)?.toUpperCase() || "U"}
                            </span>
                          </div>
                          <div>
                            <h4 className="font-semibold text-white text-readable">
                              {buddy.name}
                            </h4>
                            <p className="text-sm text-gray-300 text-readable-secondary">
                              {getLocationName(buddy.source)} →{" "}
                              {getLocationName(buddy.destination)}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => sendRideRequest(buddy.id)}
                          disabled={sentRequestIds.has(buddy.id)}
                          className={`px-4 py-2 rounded-lg transition-all duration-300 ${
                            sentRequestIds.has(buddy.id)
                              ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                              : "bg-sawaari-yellow text-black hover:bg-sawaari-yellow/80"
                          }`}
                        >
                          {sentRequestIds.has(buddy.id)
                            ? "Request Sent"
                            : "Send Request"}
                        </button>
                      </div>
                    ))}
                  </div>
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
                    Incoming Requests ({incomingRequests.length})
                  </h3>
                  <div className="grid gap-4">
                    {incomingRequests.map((request) => (
                      <div
                        key={request.id}
                        className="flex items-center justify-between p-4 bg-black/30 border border-white/10 rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-sawaari-yellow-muted border border-sawaari-yellow-border rounded-full flex items-center justify-center">
                            <span className="text-sawaari-yellow font-semibold">
                              {request.senderName?.charAt(0)?.toUpperCase() ||
                                "U"}
                            </span>
                          </div>
                          <div>
                            <h4 className="font-semibold text-white text-readable">
                              {request.senderName}
                            </h4>
                            <p className="text-sm text-gray-300 text-readable-secondary">
                              {getLocationName(request.source)} →{" "}
                              {getLocationName(request.destination)}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              respondToRequest(request.id, "accepted")
                            }
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() =>
                              respondToRequest(request.id, "declined")
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
                    Active Connections ({activeConnections.length})
                  </h3>
                  <div className="grid gap-4">
                    {activeConnections.map((connection) => (
                      <div
                        key={connection.id}
                        className="flex items-center justify-between p-4 bg-black/30 border border-white/10 rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-sawaari-yellow-muted border border-sawaari-yellow-border rounded-full flex items-center justify-center">
                            <span className="text-sawaari-yellow font-semibold">
                              {connection.partnerName
                                ?.charAt(0)
                                ?.toUpperCase() || "U"}
                            </span>
                          </div>
                          <div>
                            <h4 className="font-semibold text-white text-readable">
                              {connection.partnerName}
                            </h4>
                            <p className="text-sm text-gray-300 text-readable-secondary">
                              {getLocationName(connection.source)} →{" "}
                              {getLocationName(connection.destination)}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => startChat(connection)}
                          className="px-4 py-2 bg-sawaari-yellow text-black rounded-lg hover:bg-sawaari-yellow/80 transition-colors"
                        >
                          Chat
                        </button>
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
                        key={request.id}
                        className="flex items-center justify-between p-4 bg-black/30 border border-white/10 rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-sawaari-yellow-muted border border-sawaari-yellow-border rounded-full flex items-center justify-center">
                            <span className="text-sawaari-yellow font-semibold">
                              {request.receiverName?.charAt(0)?.toUpperCase() ||
                                "U"}
                            </span>
                          </div>
                          <div>
                            <h4 className="font-semibold text-white text-readable">
                              {request.receiverName}
                            </h4>
                            <p className="text-sm text-gray-300 text-readable-secondary">
                              {getLocationName(request.source)} →{" "}
                              {getLocationName(request.destination)}
                            </p>
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
                  </div>
                )}
            </div>
          )}
        </div>
      </div>

      {/* Live Chat */}
      {activeChatId && chatPartner && (
        <LiveChat
          chatId={activeChatId}
          partner={chatPartner}
          onClose={closeChat}
        />
      )}
    </div>
  );
};

export default RideBuddy;
