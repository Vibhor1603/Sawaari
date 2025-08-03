import { useState, useEffect, useContext, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "./AuthContext";
import { useAuthGuard } from "./hooks/useAuthGuard";
import rideBuddyService from "./services/rideBuddyService";
import { useHotspotData } from "./useHotspotData";
import socketService from "./services/socketService";
import authService from "./services/authService";
import LiveChat from "./components/LiveChat";
import toast from "./utils/toast";
import React from "react"; // Added missing import for React

const RideBuddy = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuthGuard(
    "Please sign in to access Ride Buddy"
  );
  // Helper function to safely extract location name
  const getLocationName = (location) => {
    if (!location) return "Unknown";
    if (typeof location === "string") return location;
    if (location.name) return location.name;
    return "Unknown";
  };

  // Helper function to calculate connection expiry
  const isConnectionExpired = useCallback((connection) => {
    if (!connection.createdAt) return true;

    const connectionTime = new Date(connection.createdAt).getTime();
    const now = Date.now();
    const totalConnectionDuration = 15 * 60 * 1000; // 15 minutes total (10 chat + 5 contact)

    return now - connectionTime > totalConnectionDuration;
  }, []);

  // Helper function to calculate remaining time for connection
  const getConnectionTimeRemaining = useCallback((connection) => {
    if (!connection.createdAt) return 0;

    const connectionTime = new Date(connection.createdAt).getTime();
    const now = Date.now();
    const totalConnectionDuration = 15 * 60 * 1000; // 15 minutes total
    const chatDuration = 10 * 60 * 1000; // 10 minutes chat

    const elapsed = now - connectionTime;

    if (elapsed > totalConnectionDuration) {
      return 0; // Completely expired
    } else if (elapsed > chatDuration) {
      return -1; // Chat expired, but contact details still available
    } else {
      return chatDuration - elapsed; // Chat time remaining
    }
  }, []);

  // Helper function to clear expired connections from localStorage
  const clearExpiredConnections = useCallback(() => {
    try {
      const saved = localStorage.getItem("rideBuddy_activeConnections");
      if (saved) {
        const connections = JSON.parse(saved);
        const validConnections = connections.filter((connection) => {
          return !isConnectionExpired(connection);
        });

        if (validConnections.length !== connections.length) {
          localStorage.setItem(
            "rideBuddy_activeConnections",
            JSON.stringify(validConnections)
          );
          console.log(
            `🧹 Cleared ${
              connections.length - validConnections.length
            } expired connections from localStorage`
          );
        }
      }
    } catch (error) {
      console.error(
        "Error clearing expired connections from localStorage:",
        error
      );
    }
  }, [isConnectionExpired]);

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
  const [sentRequestTimes, setSentRequestTimes] = useState(new Map()); // Track when requests were sent

  // Requests and connections
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [activeConnections, setActiveConnections] = useState(() => {
    // Load connections from localStorage on component mount
    try {
      const saved = localStorage.getItem("rideBuddy_activeConnections");
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error("Error loading saved connections:", error);
      return [];
    }
  });
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [connectionsLoading, setConnectionsLoading] = useState(false);
  const [processingRequests, setProcessingRequests] = useState(new Set()); // Track requests being processed
  const [loadRequestsTimeout, setLoadRequestsTimeout] = useState(null); // Track loadRequests timeout
  const [requestsLoaded, setRequestsLoaded] = useState(false); // Track if requests have been successfully loaded
  const [connectionsLoaded, setConnectionsLoaded] = useState(false); // Track if connections have been loaded

  // Live chat state
  const [activeChatId, setActiveChatId] = useState(null);
  const [chatPartner, setChatPartner] = useState(null);

  // How it works popup state
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  // Add ref to track if component is mounted to prevent memory leaks
  const isMountedRef = useRef(true);

  // Save connections to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(
        "rideBuddy_activeConnections",
        JSON.stringify(activeConnections)
      );
    } catch (error) {
      console.error("Error saving connections to localStorage:", error);
    }
  }, [activeConnections]);

  // Clear expired connections on component mount
  useEffect(() => {
    clearExpiredConnections();
  }, [clearExpiredConnections]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Define functions using useCallback to avoid hoisting issues
  const loadRequests = useCallback(async () => {
    // Prevent multiple simultaneous calls
    if (requestsLoading || !isMountedRef.current) {
      console.log(
        "🔄 loadRequests already in progress or component unmounted, skipping..."
      );
      return;
    }

    try {
      setRequestsLoading(true);
      window.lastRequestLoadTime = Date.now();
      // Use the correct method name from the old version
      const result = await rideBuddyService.getRequests();
      if (result.success) {
        // Only update if we have valid data to prevent flickering
        if (result.data && (result.data.requests || result.data.sentRequests)) {
          setIncomingRequests(result.data.requests || []);
          setOutgoingRequests(result.data.sentRequests || []);

          // Update sent request IDs to prevent duplicate sends
          const sentIds = new Set();
          const sentTimes = new Map();

          (result.data.sentRequests || [])
            .filter((req) => req.status === "pending")
            .forEach((req) => {
              const receiverId = req.receiverId.toString();
              sentIds.add(receiverId);
              sentTimes.set(receiverId, new Date(req.createdAt).getTime());
            });

          setSentRequestIds(sentIds);
          setSentRequestTimes(sentTimes);
          setRequestsLoaded(true);
        } else {
          // If no data returned, don't clear existing requests immediately
          // This prevents flickering when cache is being updated
          console.log("⚠️ No request data returned, keeping existing requests");
          // Only clear if we've been trying for a while (more than 5 seconds)
          const now = Date.now();
          if (
            !window.lastRequestLoadTime ||
            now - window.lastRequestLoadTime > 5000
          ) {
            console.log("🔄 Clearing requests after timeout");
            setIncomingRequests([]);
            setOutgoingRequests([]);
            setRequestsLoaded(true);
          }
        }
      } else {
        // On error, don't clear existing requests immediately
        console.log("⚠️ Request load failed, keeping existing requests");
      }
    } catch (error) {
      console.error("Error loading requests:", error);
      toast.error("Failed to load ride requests");
    } finally {
      setRequestsLoading(false);
    }
  }, [requestsLoading]);

  const loadConnections = useCallback(
    async (forceRefresh = false) => {
      // Check if component is still mounted
      if (!isMountedRef.current) {
        console.log("🔄 Component unmounted, skipping loadConnections");
        return;
      }

      // Prevent multiple simultaneous calls
      if (connectionsLoading && !forceRefresh) {
        console.log("🔄 loadConnections already in progress, skipping...");
        return;
      }

      try {
        setConnectionsLoading(true);

        // Clear cache if force refresh is requested
        if (forceRefresh) {
          rideBuddyService.clearCache && rideBuddyService.clearCache();
        }

        // Use the correct method name from the old version
        const result = await rideBuddyService.getMatches();
        if (result.success) {
          console.log("Loaded connections:", result.data);
          console.log(
            "Connection details:",
            result.data.map((conn) => ({
              matchId: conn.matchId,
              partnerName: conn.partner?.name,
              partnerPhone: conn.partner?.phone,
              hasPhone: !!conn.partner?.phone,
            }))
          );

          // Filter out expired connections and update time remaining
          const validConnections = (result.data || [])
            .filter((connection) => {
              if (isConnectionExpired(connection)) {
                console.log(
                  `Filtering out expired connection: ${connection.matchId} (15 minutes elapsed)`
                );
                return false;
              }
              return true;
            })
            .map((connection) => ({
              ...connection,
              chatTimeRemaining: getConnectionTimeRemaining(connection),
            }));

          console.log(
            `📊 Server returned ${result.data?.length || 0} connections, ${
              validConnections.length
            } are still valid`
          );

          setActiveConnections(validConnections);
          setConnectionsLoaded(true);

          // Show message if connections were filtered out
          if (result.data.length > validConnections.length) {
            const expiredCount = result.data.length - validConnections.length;
            toast.info(`${expiredCount} expired connection(s) removed`);
          }
        } else {
          console.log("⚠️ Failed to load connections:", result.error);
          // Don't clear existing connections on error, just mark as loaded
          setConnectionsLoaded(true);
        }
      } catch (error) {
        console.error("Error loading connections:", error);
        toast.error("Failed to load connections");
        setConnectionsLoaded(true);
      } finally {
        setConnectionsLoading(false);
      }
    },
    [connectionsLoading, isConnectionExpired, getConnectionTimeRemaining]
  );

  // Clean up expired sent requests and connections
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = Date.now();

      // Clean up expired sent requests
      const expiredIds = [];
      sentRequestTimes.forEach((sentTime, userId) => {
        if (now - sentTime > 10 * 60 * 1000) {
          // 10 minutes
          expiredIds.push(userId);
        }
      });

      if (expiredIds.length > 0) {
        setSentRequestIds((prev) => {
          const newSet = new Set(prev);
          expiredIds.forEach((id) => newSet.delete(id));
          return newSet;
        });
        setSentRequestTimes((prev) => {
          const newMap = new Map(prev);
          expiredIds.forEach((id) => newMap.delete(id));
          return newMap;
        });
      }

      // Clean up expired connections
      setActiveConnections((prev) => {
        const validConnections = prev.filter((connection) => {
          if (isConnectionExpired(connection)) {
            console.log(
              `🧹 Removing expired connection: ${connection.matchId} (15 minutes elapsed)`
            );
            return false;
          }
          return true;
        });

        // Update remaining time for valid connections
        const updatedConnections = validConnections.map((connection) => ({
          ...connection,
          chatTimeRemaining: getConnectionTimeRemaining(connection),
        }));

        // Only update if there were changes
        return updatedConnections.length !== prev.length ||
          JSON.stringify(updatedConnections) !== JSON.stringify(prev)
          ? updatedConnections
          : prev;
      });
    }, 60000); // Check every minute

    return () => clearInterval(cleanupInterval);
  }, [sentRequestTimes, isConnectionExpired, getConnectionTimeRemaining]);

  // Auth guard will handle authentication check

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
            // Auth guard will handle modal opening
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
        // Auth guard will handle modal opening
        return;
      }

      // Load initial data with force refresh - ONLY ONCE on mount
      loadRequests();

      // Load connections with a slight delay to allow saved connections to render first
      setTimeout(() => {
        loadConnections(true); // Force refresh to get latest data from server
      }, 100);

      // Remove the retry logic that was causing repeated calls
      // The socket listeners will handle real-time updates

      // Set up real-time notification listeners
      socketService.on("ride_buddy_new_request", (data) => {
        console.log("🔔 New ride request received:", data);
        toast.success(`New ride request from ${data.senderName}!`);

        // Check if request already exists to prevent duplicates
        const requestExists = incomingRequests.some(
          (req) => req._id === data.requestId
        );
        if (!requestExists) {
          // Immediately add to incoming requests for instant UI update
          const newRequest = {
            _id: data.requestId,
            senderId: data.senderId,
            senderName: data.senderName,
            senderEmail: data.senderEmail,
            routeDetails: data.routeDetails,
            message: data.message,
            status: "pending",
            type: "incoming",
            createdAt: new Date().toISOString(),
          };

          setIncomingRequests((prev) => [newRequest, ...prev]);
        } else {
          console.log("🔄 Request already exists in UI, skipping duplicate");
        }

        // Switch to connections tab to show the new request
        if (activeTab === "search") {
          setActiveTab("connections");
        }

        // Refresh from server after a short delay to ensure consistency
        // Use a longer delay to avoid race conditions with backend cache
        if (loadRequestsTimeout) {
          clearTimeout(loadRequestsTimeout);
        }
        const timeout = setTimeout(() => loadRequests(), 1000);
        setLoadRequestsTimeout(timeout);
      });

      socketService.on("ride_buddy_request_response", (data) => {
        console.log("🔔 Request response received:", data);
        console.log("📞 Request response phone data:", {
          responderId: data.responderId,
          responderName: data.responderName,
          responderPhone: data.responderPhone,
          hasPhone: !!data.responderPhone,
        });

        if (data.action === "accepted") {
          toast.success(`${data.responderName} accepted your request!`);
          // Switch to connections tab to show the match
          setActiveTab("connections");

          // Don't add connection here - let ride_buddy_new_match handle it
          // This prevents duplicate connections for the sender
          console.log(
            "✅ Request accepted, waiting for new_match event to add connection"
          );

          // Reload connections with delay to ensure backend processing is complete
          setTimeout(() => loadConnections(true), 500);
        } else {
          toast.info(`${data.responderName} declined your request`);
        }

        // Remove from outgoing requests immediately
        setOutgoingRequests((prev) =>
          prev.filter((req) => req._id !== data.requestId)
        );

        // Also clean up sent request tracking
        if (data.receiverId) {
          setSentRequestIds((prev) => {
            const newSet = new Set(prev);
            newSet.delete(data.receiverId);
            return newSet;
          });
          setSentRequestTimes((prev) => {
            const newMap = new Map(prev);
            newMap.delete(data.receiverId);
            return newMap;
          });
        }

        // Reload requests to update status with delay
        // Use longer delay to avoid race conditions
        if (loadRequestsTimeout) {
          clearTimeout(loadRequestsTimeout);
        }
        const timeout = setTimeout(() => loadRequests(), 800);
        setLoadRequestsTimeout(timeout);
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

      socketService.on("ride_buddy_new_match", (data) => {
        console.log("🔔 New match created:", data);
        console.log("📞 New match phone data:", {
          partnerId: data.partnerId,
          partnerName: data.partnerName,
          partnerPhone: data.partnerPhone,
          hasPhone: !!data.partnerPhone,
        });

        // Add to active connections immediately for both users
        if (data.matchId && data.chatId) {
          const connection = {
            matchId: data.matchId,
            chatId: data.chatId,
            partner: {
              id: data.partnerId,
              name: data.partnerName,
              phone: data.partnerPhone,
            },
            routeDetails: data.routeDetails,
            estimatedSharedFare: data.estimatedSharedFare,
            createdAt: new Date().toISOString(),
            chatTimeRemaining: 10 * 60 * 1000, // 10 minutes
          };

          console.log(
            "📞 Created connection with partner data:",
            connection.partner
          );
          setActiveConnections((prev) => [connection, ...prev]);

          // Switch to connections tab to show the new match
          setActiveTab("connections");

          toast.success("New ride connection established!");
        }
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
        socketService.off("ride_buddy_new_match");

        // Clean up timeout
        if (loadRequestsTimeout) {
          clearTimeout(loadRequestsTimeout);
        }
      };
    } else {
      // Clear saved connections when user is not authenticated
      try {
        localStorage.removeItem("rideBuddy_activeConnections");
        setActiveConnections([]);
        setConnectionsLoaded(false);
      } catch (error) {
        console.error("Error clearing saved connections:", error);
      }
    }
  }, [
    activeChatId,
    activeTab,
    incomingRequests,
    isAuthenticated,
    loadConnections,
    loadRequests,
    loadRequestsTimeout,
    navigate,
    user,
  ]);

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
    // Check if request was already sent
    if (sentRequestIds.has(match.userId)) {
      const sentTime = sentRequestTimes.get(match.userId);
      const timeSince = sentTime ? Date.now() - sentTime : 0;
      const minutesAgo = Math.floor(timeSince / 60000);

      if (minutesAgo < 10) {
        toast.error(
          `Request already sent ${minutesAgo} minutes ago. Please wait.`
        );
      } else {
        toast.error("Request already sent to this user");
      }
      return;
    }

    // Check if we're already processing a request for this user
    if (processingRequests.has(match.userId)) {
      toast.error("Request is already being processed for this user");
      return;
    }

    try {
      const now = Date.now();
      setSentRequestIds((prev) => new Set([...prev, match.userId]));
      setSentRequestTimes((prev) => new Map([...prev, [match.userId, now]]));
      setProcessingRequests((prev) => new Set([...prev, match.userId]));

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
        message: `Hi! I&apos;d like to share a ride from ${searchForm.source.name} to ${searchForm.destination.name}. Let&apos;s coordinate!`,
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
        // Remove from tracking on failure
        setSentRequestIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(match.userId);
          return newSet;
        });
        setSentRequestTimes((prev) => {
          const newMap = new Map(prev);
          newMap.delete(match.userId);
          return newMap;
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
      // Remove from tracking on error
      setSentRequestIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(match.userId);
        return newSet;
      });
      setSentRequestTimes((prev) => {
        const newMap = new Map(prev);
        newMap.delete(match.userId);
        return newMap;
      });
      console.error("Failed to send request:", error);
      toast.error("Failed to send ride request");
    } finally {
      // Always remove from processing set
      setProcessingRequests((prev) => {
        const newSet = new Set(prev);
        newSet.delete(match.userId);
        return newSet;
      });
    }
  };

  const respondToRequest = async (requestId, action) => {
    console.log(`🔧 Responding to request ${requestId} with action: ${action}`);

    // Prevent multiple clicks on the same request
    if (processingRequests.has(requestId)) {
      console.log(`Request ${requestId} is already being processed`);
      toast.info("Request is already being processed...");
      return;
    }

    try {
      // Mark request as being processed
      setProcessingRequests((prev) => new Set([...prev, requestId]));
      console.log(`✅ Marked request ${requestId} as processing`);

      // Store the request data before removing from UI
      const requestToProcess = incomingRequests.find(
        (r) => r._id === requestId
      );
      if (!requestToProcess) {
        console.error(`Request ${requestId} not found in incoming requests`);
        toast.error("Request not found. It may have already been processed.");
        return;
      }

      console.log(`📋 Processing request:`, requestToProcess);

      // Show loading state
      toast.info(
        `${action === "accepted" ? "Accepting" : "Declining"} request...`
      );

      if (action === "accepted") {
        console.log(`✅ Calling acceptRequest for ${requestId}`);
        const result = await rideBuddyService.acceptRequest(requestId);
        console.log(`📡 Accept result:`, result);

        if (result.success) {
          // Remove from UI after successful processing
          setIncomingRequests((prev) =>
            prev.filter((r) => r._id !== requestId)
          );

          // Add to active connections immediately for better UX
          const connection = {
            matchId: result.data.matchId,
            chatId: result.data.chatId,
            partner: result.data.partner,
            routeDetails: result.data.routeDetails,
            estimatedSharedFare: result.data.estimatedSharedFare,
            createdAt: new Date().toISOString(),
            chatTimeRemaining: 10 * 60 * 1000, // 10 minutes
          };

          console.log(`🔗 Adding connection to UI:`, connection);
          setActiveConnections((prev) => [connection, ...prev]);
          toast.success(
            "Request accepted! You can now chat with your ride buddy."
          );

          // Clear cache and reload connections to get fresh data
          rideBuddyService.clearCache();
          setTimeout(() => loadConnections(true), 500);
        } else {
          console.error(`❌ Accept failed:`, result.error);
          toast.error(result.error || "Failed to accept request");
          // Keep the request in UI if failed
        }
      } else {
        console.log(`❌ Calling declineRequest for ${requestId}`);
        const result = await rideBuddyService.declineRequest(requestId);
        console.log(`📡 Decline result:`, result);

        if (result.success) {
          // Remove from UI after successful processing
          setIncomingRequests((prev) =>
            prev.filter((r) => r._id !== requestId)
          );
          toast.success("Request declined");
        } else {
          console.error(`❌ Decline failed:`, result.error);
          toast.error(result.error || "Failed to decline request");
          // Keep the request in UI if failed
        }
      }
    } catch (error) {
      console.error(`💥 Error responding to request ${requestId}:`, error);

      // Show specific error messages
      if (error.message.includes("Network")) {
        toast.error(
          "Network error. Please check your connection and try again."
        );
      } else if (error.message.includes("Token")) {
        toast.error("Session expired. Please sign in again.");
      } else if (error.message.includes("404")) {
        toast.error("Request not found. It may have already been processed.");
        // Remove from UI if request doesn't exist
        setIncomingRequests((prev) => prev.filter((r) => r._id !== requestId));
      } else {
        toast.error("Failed to respond to request. Please try again.");
      }
    } finally {
      // Remove from processing set
      setProcessingRequests((prev) => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
      console.log(`✅ Removed request ${requestId} from processing set`);
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

  const closeChat = useCallback(() => {
    if (activeChatId) {
      socketService.leaveChatRoom(activeChatId);
    }
    setActiveChatId(null);
    setChatPartner(null);
  });

  // Handle keyboard shortcuts for chat and popups
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        if (showHowItWorks) {
          setShowHowItWorks(false);
        } else if (activeChatId) {
          closeChat();
        }
      }
    };

    if (activeChatId || showHowItWorks) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [activeChatId, closeChat, showHowItWorks]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black pt-20 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-sawaari-yellow border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-200">Loading Ride Buddy...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated (auth guard will handle modal)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black pt-20">
      <div className="container-sawaari">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-sawaari-yellow/20 to-sawaari-green/20 border border-sawaari-yellow/30 rounded-lg px-4 py-2 mb-6">
            <span className="text-xl">👥</span>
            <span className="text-sm font-semibold text-sawaari-yellow">
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

          {/* How It Works Button */}
          <div className="mt-6">
            <button
              onClick={() => setShowHowItWorks(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-black/40 backdrop-blur-sm border border-white/20 rounded-lg text-white hover:bg-white/10 transition-all duration-300"
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
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-sm">How It Works</span>
            </button>
          </div>
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
                            ? (() => {
                                const sentTime = sentRequestTimes.get(
                                  match.userId
                                );
                                const timeSince = sentTime
                                  ? Date.now() - sentTime
                                  : 0;
                                const minutesAgo = Math.floor(
                                  timeSince / 60000
                                );
                                return minutesAgo < 1
                                  ? "Request Sent"
                                  : `Sent ${minutesAgo}m ago`;
                              })()
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
                      We couldn&apos;t find any ride buddies for your route
                      right now.
                    </p>
                    <p className="text-gray-300 text-readable-secondary">
                      Your search is active - you&apos;ll be notified when
                      someone matches!
                    </p>
                  </div>
                )}
            </div>
          )}

          {activeTab === "connections" && (
            <div className="space-y-8">
              {/* Incoming Requests */}
              {(incomingRequests.length > 0 ||
                requestsLoading ||
                activeConnections.length > 0) && (
                <div className="card">
                  <h3 className="text-xl font-bold text-white mb-6 text-readable">
                    Connection Requests ({incomingRequests.length})
                  </h3>
                  <div className="grid gap-4">
                    {requestsLoading && incomingRequests.length === 0 && (
                      <div className="flex items-center justify-center p-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sawaari-yellow"></div>
                        <span className="ml-3 text-gray-400">
                          Loading requests...
                        </span>
                      </div>
                    )}
                    {!requestsLoading &&
                      requestsLoaded &&
                      incomingRequests.length === 0 && (
                        <div className="text-center p-8 text-gray-400">
                          <div className="text-4xl mb-2">📭</div>
                          <p>No incoming requests at the moment</p>
                        </div>
                      )}
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
                                &quot;{request.message}&quot;
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              respondToRequest(request._id, "accepted")
                            }
                            disabled={processingRequests.has(request._id)}
                            className={`px-4 py-2 rounded-lg transition-colors ${
                              processingRequests.has(request._id)
                                ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                                : "bg-green-600 text-white hover:bg-green-700"
                            }`}
                          >
                            {processingRequests.has(request._id)
                              ? "Processing..."
                              : "Accept"}
                          </button>
                          <button
                            onClick={() =>
                              respondToRequest(request._id, "declined")
                            }
                            disabled={processingRequests.has(request._id)}
                            className={`px-4 py-2 rounded-lg transition-colors ${
                              processingRequests.has(request._id)
                                ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                                : "bg-red-600 text-white hover:bg-red-700"
                            }`}
                          >
                            {processingRequests.has(request._id)
                              ? "Processing..."
                              : "Decline"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Active Connections */}
              {(activeConnections.length > 0 || connectionsLoading) && (
                <div className="card">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-white text-readable">
                      Your Connections ({activeConnections.length})
                    </h3>
                    {connectionsLoading && (
                      <div className="flex items-center text-sm text-gray-400">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-sawaari-yellow mr-2"></div>
                        Updating...
                      </div>
                    )}
                  </div>
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
                          ) : connection.chatTimeRemaining === -1 ? (
                            <div className="px-4 py-2 bg-orange-600 text-white rounded-lg text-center">
                              <div className="text-sm font-medium">
                                Chat Expired
                              </div>
                              <div className="text-xs">
                                Contact details available
                              </div>
                            </div>
                          ) : (
                            <button
                              disabled
                              className="px-4 py-2 bg-gray-600 text-gray-400 rounded-lg cursor-not-allowed"
                              title="Connection has completely expired"
                            >
                              Connection Expired
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
                              )}?text=Hi! I&apos;m your ride buddy from SAWAARI. Let&apos;s coordinate our trip!`}
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

                        <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
                          <span>
                            Connected:{" "}
                            {new Date(
                              connection.createdAt
                            ).toLocaleDateString()}
                          </span>
                          {connection.chatTimeRemaining > 0 ? (
                            <span className="text-green-400 font-medium">
                              💬 Chat:{" "}
                              {Math.ceil(connection.chatTimeRemaining / 60000)}{" "}
                              min left
                            </span>
                          ) : connection.chatTimeRemaining === -1 ? (
                            <span className="text-orange-400 font-medium">
                              📞 Contact details available
                            </span>
                          ) : (
                            <span className="text-red-400 font-medium">
                              ⏰ Connection expired
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Loading State */}
              {(requestsLoading || connectionsLoading) &&
                incomingRequests.length === 0 &&
                activeConnections.length === 0 && (
                  <div className="card text-center">
                    <div className="flex items-center justify-center p-8">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sawaari-yellow"></div>
                      <span className="ml-4 text-gray-400 text-lg">
                        Loading your connections...
                      </span>
                    </div>
                  </div>
                )}

              {/* Empty State - Only show when not loading and data is loaded */}
              {incomingRequests.length === 0 &&
                activeConnections.length === 0 &&
                !requestsLoading &&
                !connectionsLoading &&
                requestsLoaded &&
                connectionsLoaded && (
                  <div className="card text-center">
                    <div className="text-6xl mb-4">👥</div>
                    <h3 className="text-xl font-bold text-white mb-2 text-readable">
                      No Connections Yet
                    </h3>
                    <p className="text-gray-300 text-readable-secondary mb-4">
                      Start by searching for ride buddies or wait for incoming
                      requests.
                    </p>
                    <div className="space-y-3">
                      <button
                        onClick={() => setActiveTab("search")}
                        className="w-full px-6 py-3 bg-gradient-to-r from-sawaari-yellow to-sawaari-green text-black rounded-lg hover:shadow-lg transition-all duration-300 font-semibold"
                      >
                        🔍 Search for Ride Buddies
                      </button>
                      <button
                        onClick={() => {
                          console.log("🔄 Manual refresh triggered");
                          loadRequests();
                          loadConnections(true);
                          toast.info("Refreshing your data...");
                        }}
                        className="w-full px-6 py-2 bg-neutral-700 text-white rounded-lg hover:bg-neutral-600 transition-colors"
                        disabled={requestsLoading || connectionsLoading}
                      >
                        {requestsLoading || connectionsLoading ? (
                          <>
                            <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Refreshing...
                          </>
                        ) : (
                          "🔄 Refresh Data"
                        )}
                      </button>
                    </div>
                  </div>
                )}
            </div>
          )}
        </div>
      </div>

      {/* How It Works Popup */}
      {showHowItWorks && (
        <div
          className="fixed inset-0 bg-black/50 chat-popup-overlay flex items-center justify-center p-4 z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowHowItWorks(false);
            }
          }}
        >
          <div
            className="bg-neutral-900 rounded-xl chat-popup-container w-full max-w-2xl max-h-[80vh] overflow-y-auto relative border border-neutral-700"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setShowHowItWorks(false)}
              className="absolute top-4 right-4 z-10 w-8 h-8 bg-neutral-800 hover:bg-neutral-700 rounded-full flex items-center justify-center text-white transition-colors duration-200 border border-neutral-600"
              aria-label="Close"
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

            {/* Header */}
            <div className="px-6 py-4 border-b border-neutral-700 bg-gradient-to-r from-neutral-800 to-neutral-700 rounded-t-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-sawaari-yellow-muted border border-sawaari-yellow-border rounded-full flex items-center justify-center">
                  <span className="text-sawaari-yellow text-lg">👥</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">
                    How Ride Buddy Works
                  </h2>
                  <p className="text-sm text-neutral-400">
                    Connect with nearby travelers in 3 simple steps
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* What is Ride Buddy */}
              <div className="bg-gradient-to-r from-sawaari-yellow/10 to-sawaari-green/10 border border-sawaari-yellow/20 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-sawaari-yellow mb-2">
                  🚗 What is Ride Buddy?
                </h3>
                <p className="text-gray-300 text-sm">
                  Ride Buddy helps you find fellow travelers going on similar
                  routes within a 2km radius. Share rides, split costs, and make
                  your journey more enjoyable and affordable.
                </p>
              </div>

              {/* How to Use */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">
                  📋 How to Use:
                </h3>
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="w-8 h-8 bg-sawaari-yellow rounded-full flex items-center justify-center text-black font-bold text-sm flex-shrink-0">
                      1
                    </div>
                    <div>
                      <h4 className="font-semibold text-white">
                        Search for Ride Buddies
                      </h4>
                      <p className="text-gray-300 text-sm">
                        Select your source and destination locations, then click
                        &quot;Search Ride Buddies&quot; to find nearby
                        travelers.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="w-8 h-8 bg-sawaari-yellow rounded-full flex items-center justify-center text-black font-bold text-sm flex-shrink-0">
                      2
                    </div>
                    <div>
                      <h4 className="font-semibold text-white">
                        Send Connection Requests
                      </h4>
                      <p className="text-gray-300 text-sm">
                        Browse available ride buddies and send connection
                        requests to those with matching routes.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="w-8 h-8 bg-sawaari-yellow rounded-full flex items-center justify-center text-black font-bold text-sm flex-shrink-0">
                      3
                    </div>
                    <div>
                      <h4 className="font-semibold text-white">
                        Connect & Chat
                      </h4>
                      <p className="text-gray-300 text-sm">
                        Once accepted, you get 10 minutes to chat + 5 minutes of
                        contact details access (15 minutes total) to coordinate
                        your ride.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Key Features */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">
                  ✨ Key Features:
                </h3>
                <div className="grid md:grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <span className="text-green-400">📍</span>
                    <span>2km radius matching</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <span className="text-green-400">💬</span>
                    <span>10-min chat + 5-min contact</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <span className="text-green-400">💰</span>
                    <span>Cost sharing estimates</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <span className="text-green-400">🔒</span>
                    <span>Secure connections</span>
                  </div>
                </div>
              </div>

              {/* Important Notes */}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-blue-400 mb-2">
                  💡 Important Notes:
                </h3>
                <ul className="space-y-1 text-sm text-gray-300">
                  <li>
                    • Total connection time: 15 minutes (10-min chat + 5-min
                    contact details)
                  </li>
                  <li>• Only users within 2km radius will appear in search</li>
                  <li>• You can only send one request per user at a time</li>
                  <li>
                    • Chat messages are temporary and not stored permanently
                  </li>
                  <li>
                    • Contact details remain available for 5 minutes after chat
                    expires
                  </li>
                </ul>
              </div>

              {/* Get Started Button */}
              <div className="text-center pt-4">
                <button
                  onClick={() => setShowHowItWorks(false)}
                  className="px-6 py-3 bg-gradient-to-r from-sawaari-yellow to-sawaari-green text-black rounded-lg font-semibold hover:shadow-lg transition-all duration-300"
                >
                  Got It! Let&apos;s Start
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
