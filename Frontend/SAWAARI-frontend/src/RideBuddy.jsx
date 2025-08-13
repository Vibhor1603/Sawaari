/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
import {
  useState,
  useEffect,
  useContext,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "./AuthContext";
import { useAuthGuard } from "./hooks/useAuthGuard";
import rideBuddyService from "./services/rideBuddyService";

import socketService from "./services/socketService";
import authService from "./services/authService";
import LiveChat from "./components/LiveChat";
import DatabaseLocationSelect from "./components/DatabaseLocationSelect";
import SearchStatus from "./components/SearchStatus";
import toast from "react-hot-toast";

import React from "react"; // Added missing import for React

const RideBuddy = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuthGuard(
    "Please sign in to access Travel Buddy"
  );
  // Load more functionality is now handled by DatabaseLocationSelect

  // Enhanced toast debouncing to prevent rapid-fire duplicate toasts
  const lastToastRef = useRef({ message: "", timestamp: 0, type: "" });
  const connectionToastRef = useRef({ partnerId: "", timestamp: 0 });

  const showDebouncedToast = useCallback((type, message, delay = 2000) => {
    const now = Date.now();
    const lastToast = lastToastRef.current;

    // Enhanced deduplication for connection-related toasts
    if (
      message.includes("Connected with") ||
      message.includes("connected with")
    ) {
      const partnerMatch = message.match(
        /(?:Connected with|connected with)\s+([^!]+)/
      );
      const partnerId = partnerMatch ? partnerMatch[1].trim() : "";

      if (
        partnerId &&
        connectionToastRef.current.partnerId === partnerId &&
        now - connectionToastRef.current.timestamp < 5000
      ) {
        // 5 second window for connection toasts
        console.log("🚫 Skipping duplicate connection toast for:", partnerId);
        return;
      }

      if (partnerId) {
        connectionToastRef.current = { partnerId, timestamp: now };
      }
    }

    // Standard message deduplication
    if (lastToast.message === message && now - lastToast.timestamp < delay) {
      return;
    }

    lastToastRef.current = { message, timestamp: now, type };

    switch (type) {
      case "success":
        toast.success(message, { duration: 2000 });
        break;
      case "error":
        toast.error(message, { duration: 2000 });
        break;
      default:
        toast(message, { duration: 2000 });
    }
  }, []);

  // Request expiration checker
  const checkExpiredRequests = useCallback(() => {
    const now = Date.now();
    const EXPIRATION_TIME = 10 * 60 * 1000; // 10 minutes

    // Check incoming requests for expiration
    setIncomingRequests((prev) => {
      const expired = [];
      const valid = prev.filter((request) => {
        const requestTime = new Date(request.createdAt).getTime();
        const isExpired = now - requestTime > EXPIRATION_TIME;

        if (isExpired) {
          expired.push(request);
        }

        return !isExpired;
      });

      // Show toast for expired requests
      if (expired.length > 0) {
        toast(`${expired.length} request(s) expired and were removed`);
      }

      return valid;
    });

    // Check outgoing requests for expiration
    setOutgoingRequests((prev) => {
      const expired = [];
      const valid = prev.filter((request) => {
        const requestTime = new Date(request.createdAt).getTime();
        const isExpired = now - requestTime > EXPIRATION_TIME;

        if (isExpired) {
          expired.push(request);
        }

        return !isExpired;
      });

      // Show toast for expired outgoing requests
      if (expired.length > 0) {
        toast.error(`Your request has expired. Try making a new request.`);
      }

      return valid;
    });

    // Call backend cleanup periodically (every 5 minutes)
    const lastCleanup = localStorage.getItem("lastRequestCleanup");
    const now_timestamp = Date.now();
    const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

    if (
      !lastCleanup ||
      now_timestamp - parseInt(lastCleanup) > CLEANUP_INTERVAL
    ) {
      rideBuddyService
        .cleanupExpiredRequests()
        .then((result) => {
          if (result.success) {
            localStorage.setItem(
              "lastRequestCleanup",
              now_timestamp.toString()
            );
          }
        })
        .catch((error) => {
          // Don't prevent the app from working if cleanup fails
        });
    }
  }, []); // No dependencies - uses only current state

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
        }
      }
    } catch (error) {
      console.error(
        "Error clearing expired connections from localStorage:",
        error
      );
    }
  }, [isConnectionExpired]);

  // Location data is now handled by DatabaseLocationSelect component
  // Location search and pagination is now handled by DatabaseLocationSelect

  // Main state
  const [activeTab, setActiveTab] = useState("search");

  // Safe tab change handler that refreshes data when user switches tabs
  const handleTabChange = useCallback((newTab) => {
    setActiveTab(newTab);

    // Refresh data when user switches to connections tab (user-initiated, safe)
    if (newTab === "connections" && componentInitializedRef.current) {
      setTimeout(() => {
        if (isMountedRef.current) {
          loadRequestsRef.current();
          loadConnectionsRef.current(false);
        }
      }, 100);
    }
  }, []);

  // Search functionality
  const [searchForm, setSearchForm] = useState({
    source: { name: "", coordinates: null },
    destination: { name: "", coordinates: null },
    searchRadius: 2, // Default 2km radius
  });
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [sentRequestIds, setSentRequestIds] = useState(new Set());
  const [sentRequestTimes, setSentRequestTimes] = useState(new Map()); // Track when requests were sent

  // Enhanced search state for 5-minute active searches
  const [searchState, setSearchState] = useState({
    isActive: false,
    searchId: null,
    expiresAt: null,
    source: "",
    destination: "",
    matchCount: 0,
    timeRemaining: 0,
  });

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
  const [requestsLoaded, setRequestsLoaded] = useState(false); // Track if requests have been successfully loaded
  const [connectionsLoaded, setConnectionsLoaded] = useState(false); // Track if connections have been loaded

  // Live chat state
  const [activeChatId, setActiveChatId] = useState(null);
  const [chatPartner, setChatPartner] = useState(null);

  // How it works popup state
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  // Add ref to track if component is mounted to prevent memory leaks
  const isMountedRef = useRef(true);
  const lastLoadRequestsCallRef = useRef(0);
  const loadRequestsCallCountRef = useRef(0);
  const loadRequestsTimeoutRef = useRef(null);
  const componentInitializedRef = useRef(false);

  // Production safeguard: Track API call frequency to prevent infinite loops
  const apiCallTracker = useRef({
    loadRequests: { count: 0, lastReset: Date.now() },
    loadConnections: { count: 0, lastReset: Date.now() },
    checkSearchStatus: { count: 0, lastReset: Date.now() },
  });

  // Reset API call counters every minute
  useEffect(() => {
    const resetInterval = setInterval(() => {
      const now = Date.now();
      Object.keys(apiCallTracker.current).forEach((key) => {
        if (now - apiCallTracker.current[key].lastReset > 60000) {
          apiCallTracker.current[key].count = 0;
          apiCallTracker.current[key].lastReset = now;
        }
      });
    }, 60000);

    return () => clearInterval(resetInterval);
  }, []);

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
  }, [clearExpiredConnections]); // Run only once on mount - removed clearExpiredConnections dependency

  // Define handleSearchExpiry before it's used in useEffect
  const handleSearchExpiry = useCallback(() => {
    setSearchState({
      isActive: false,
      searchId: null,
      expiresAt: null,
      source: "",
      destination: "",
      matchCount: 0,
      timeRemaining: 0,
    });
    setSearchResults([]);
    showDebouncedToast(
      "info",
      "Your search has expired. You can start a new search now."
    );
  }, [showDebouncedToast]);

  // Timer for search state countdown
  useEffect(() => {
    if (searchState.isActive && searchState.expiresAt) {
      const interval = setInterval(() => {
        const remaining = new Date(searchState.expiresAt) - new Date();
        const remainingMs = Math.max(0, remaining);

        setSearchState((prev) => ({
          ...prev,
          timeRemaining: remainingMs,
        }));

        if (remainingMs <= 0) {
          clearInterval(interval);
          handleSearchExpiry();
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [searchState.isActive, searchState.expiresAt, handleSearchExpiry]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      // Clear any pending timeouts
      if (loadRequestsTimeoutRef.current) {
        clearTimeout(loadRequestsTimeoutRef.current);
      }
    };
  }, []);

  // Enhanced search status management
  const checkActiveSearchStatus = useCallback(async () => {
    try {
      // 🚨 DEBUG: Log who called this function

      console.log("  DEBUG: Call stack:", new Error().stack);

      console.log("🔍 Checking active search status...");
      const result = await rideBuddyService.getActiveSearchStatus();
      console.log("📡 Active search status result:", result);

      if (result.success && result.data.hasActiveSearch) {
        console.log("✅ Found active search, setting state:", result.data);
        setSearchState({
          isActive: true,
          searchId: result.data.searchId,
          expiresAt: result.data.expiresAt,
          source: result.data.source.name,
          destination: result.data.destination.name,
          timeRemaining: result.data.timeRemaining,
          matchCount: 0,
        });
      } else {
        console.log("❌ No active search found");
        setSearchState((prev) => ({ ...prev, isActive: false }));
      }
    } catch (error) {
      console.error("Error checking search status:", error);
    }
  }, []);

  // Create ref for checkActiveSearchStatus to prevent infinite loops
  const checkActiveSearchStatusRef = useRef();
  checkActiveSearchStatusRef.current = async () => {
    try {
      // Production safeguard: Prevent infinite loops
      const tracker = apiCallTracker.current.checkSearchStatus;
      if (tracker.count > 10) {
        // Max 10 calls per minute
        console.warn(
          "🚨 checkActiveSearchStatus rate limited - too many calls"
        );
        return;
      }
      tracker.count++;

      console.log("🔍 Checking active search status...");
      const result = await rideBuddyService.getActiveSearchStatus();
      console.log("📡 Active search status result:", result);

      if (result.success && result.data.hasActiveSearch) {
        console.log("✅ Found active search, setting state:", result.data);
        setSearchState({
          isActive: true,
          searchId: result.data.searchId,
          expiresAt: result.data.expiresAt,
          source: result.data.source.name,
          destination: result.data.destination.name,
          timeRemaining: result.data.timeRemaining,
          matchCount: 0,
        });
      } else {
        console.log("❌ No active search found");
        setSearchState((prev) => ({ ...prev, isActive: false }));
      }
    } catch (error) {
      console.error("Error checking search status:", error);
    }
  };

  const cancelActiveSearch = useCallback(async () => {
    try {
      console.log("🚀 Attempting to cancel active search...");
      const result = await rideBuddyService.cancelActiveSearch();
      console.log("📡 Cancel search result:", result);

      if (result.success) {
        setSearchState({
          isActive: false,
          searchId: null,
          expiresAt: null,
          source: "",
          destination: "",
          matchCount: 0,
          timeRemaining: 0,
        });
        setSearchResults([]);
        showDebouncedToast("success", "Search cancelled successfully");
      } else {
        console.error("❌ Cancel search failed:", result.error);
        // Handle specific error cases
        if (
          result.error?.includes("404") ||
          result.error?.includes("not found") ||
          result.error?.includes("No active search found")
        ) {
          showDebouncedToast("info", "Search already cancelled");
          // Reset search state to match backend
          setSearchState({
            isActive: false,
            searchId: null,
            expiresAt: null,
            source: "",
            destination: "",
            matchCount: 0,
            timeRemaining: 0,
          });
          setSearchResults([]);
        } else {
          showDebouncedToast(
            "error",
            result.error || "Failed to cancel search"
          );
        }
      }
    } catch (error) {
      console.error("Error cancelling search:", error);
      showDebouncedToast("error", "Failed to cancel search");
    }
  }, [showDebouncedToast]);

  // Define functions using refs to prevent infinite loops in production
  const loadRequestsRef = useRef();
  loadRequestsRef.current = async () => {
    const now = Date.now();
    const MIN_CALL_INTERVAL = 1000; // Minimum 1 second between calls

    // Production safeguard: Prevent infinite loops
    const tracker = apiCallTracker.current.loadRequests;
    if (tracker.count > 10) {
      // Max 10 calls per minute
      console.warn("🚨 loadRequests rate limited - too many calls");
      return;
    }
    tracker.count++;

    // Prevent multiple simultaneous calls and rate limiting
    if (requestsLoading || !isMountedRef.current) {
      return;
    }

    // Rate limiting - prevent calls too close together
    if (now - lastLoadRequestsCallRef.current < MIN_CALL_INTERVAL) {
      return;
    }

    lastLoadRequestsCallRef.current = now;

    try {
      setRequestsLoading(true);

      const result = await rideBuddyService.getRequests();

      if (!isMountedRef.current) {
        return;
      }

      if (result.success) {
        if (result.data && (result.data.requests || result.data.sentRequests)) {
          // Deduplicate incoming requests by _id
          const incomingData = result.data.requests || [];
          const uniqueIncoming = incomingData.filter(
            (request, index, self) =>
              index === self.findIndex((r) => r._id === request._id)
          );

          // Deduplicate outgoing requests by _id
          const outgoingData = result.data.sentRequests || [];
          const uniqueOutgoing = outgoingData.filter(
            (request, index, self) =>
              index === self.findIndex((r) => r._id === request._id)
          );

          setIncomingRequests(uniqueIncoming);
          setOutgoingRequests(uniqueOutgoing);

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
          setRequestsLoaded(true);
        }
      } else {
        setRequestsLoaded(true);
      }
    } catch (error) {
      console.error("Error loading requests:", error);
      if (isMountedRef.current) {
        toast.error("Failed to load ride requests");
      }
    } finally {
      if (isMountedRef.current) {
        setRequestsLoading(false);
      }
    }
  };

  const loadRequests = useCallback(() => {
    return loadRequestsRef.current();
  }, []);

  // Use ref for loadConnections to prevent infinite loops
  const loadConnectionsRef = useRef();
  loadConnectionsRef.current = async (forceRefresh = false) => {
    // Production safeguard: Prevent infinite loops
    const tracker = apiCallTracker.current.loadConnections;
    if (tracker.count > 10 && !forceRefresh) {
      // Max 10 calls per minute
      console.warn("🚨 loadConnections rate limited - too many calls");
      return;
    }
    tracker.count++;

    // Check if component is still mounted
    if (!isMountedRef.current) {
      return;
    }

    // Prevent multiple simultaneous calls
    if (connectionsLoading && !forceRefresh) {
      return;
    }

    try {
      setConnectionsLoading(true);

      // Clear cache if force refresh is requested
      if (forceRefresh) {
        rideBuddyService.clearCache && rideBuddyService.clearCache();
      }

      const result = await rideBuddyService.getMatches();
      if (result.success) {
        // Filter out expired connections and update time remaining
        const validConnections = (result.data || [])
          .filter((connection) => {
            if (!connection.createdAt) return true;
            const connectionTime = new Date(connection.createdAt).getTime();
            const now = Date.now();
            const totalConnectionDuration = 15 * 60 * 1000; // 15 minutes total
            return now - connectionTime <= totalConnectionDuration;
          })
          .map((connection) => {
            if (!connection.createdAt) return connection;
            const connectionTime = new Date(connection.createdAt).getTime();
            const now = Date.now();
            const chatDuration = 10 * 60 * 1000; // 10 minutes chat
            const elapsed = now - connectionTime;
            let chatTimeRemaining;
            if (elapsed > chatDuration) {
              chatTimeRemaining = -1; // Chat expired, but contact details still available
            } else {
              chatTimeRemaining = chatDuration - elapsed; // Chat time remaining
            }
            return {
              ...connection,
              chatTimeRemaining,
            };
          });

        setActiveConnections(validConnections);
        setConnectionsLoaded(true);

        // Show message if connections were filtered out
        if (result.data.length > validConnections.length) {
          const expiredCount = result.data.length - validConnections.length;
          toast(`${expiredCount} expired connection(s) removed`);
        }
      } else {
        setConnectionsLoaded(true);
      }
    } catch (error) {
      console.error("Error loading connections:", error);
      toast.error("Failed to load connections");
      setConnectionsLoaded(true);
    } finally {
      setConnectionsLoading(false);
    }
  };

  const loadConnections = useCallback((forceRefresh = false) => {
    return loadConnectionsRef.current(forceRefresh);
  }, []);

  // Clean up expired sent requests and connections
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = Date.now();

      // Clean up expired sent requests using current state
      setSentRequestTimes((currentSentTimes) => {
        const expiredIds = [];
        currentSentTimes.forEach((sentTime, userId) => {
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

          const newMap = new Map(currentSentTimes);
          expiredIds.forEach((id) => newMap.delete(id));
          return newMap;
        }

        return currentSentTimes;
      });

      // Clean up expired connections using current state
      setActiveConnections((prev) => {
        const validConnections = prev.filter((connection) => {
          if (!connection.createdAt) return true;

          const connectionTime = new Date(connection.createdAt).getTime();
          const totalConnectionDuration = 15 * 60 * 1000; // 15 minutes total
          const isExpired = now - connectionTime > totalConnectionDuration;

          if (isExpired) {
            console.log(
              `🧹 Removing expired connection: ${connection.matchId} (15 minutes elapsed)`
            );
            return false;
          }
          return true;
        });

        // Update remaining time for valid connections
        const updatedConnections = validConnections.map((connection) => {
          if (!connection.createdAt) return connection;

          const connectionTime = new Date(connection.createdAt).getTime();
          const chatDuration = 10 * 60 * 1000; // 10 minutes chat
          const elapsed = now - connectionTime;

          let chatTimeRemaining;
          if (elapsed > chatDuration) {
            chatTimeRemaining = -1; // Chat expired, but contact details still available
          } else {
            chatTimeRemaining = chatDuration - elapsed; // Chat time remaining
          }

          return {
            ...connection,
            chatTimeRemaining,
          };
        });

        // Only update if there were changes
        return updatedConnections.length !== prev.length ||
          JSON.stringify(updatedConnections) !== JSON.stringify(prev)
          ? updatedConnections
          : prev;
      });
    }, 60000); // Check every minute

    return () => clearInterval(cleanupInterval);
  }, []); // No dependencies - use current state in callbacks

  // Auth guard will handle authentication check

  // Initialize socket connection and load data - ONLY RUN ONCE
  useEffect(() => {
    console.log("🚨 DEBUG: Main useEffect running");
    console.log(
      "🚨 DEBUG: isAuthenticated:",
      isAuthenticated,
      "user?.id:",
      user?.id
    );
    console.log(
      "🚨 DEBUG: componentInitializedRef.current:",
      componentInitializedRef.current
    );

    if (!isAuthenticated || !user) {
      // Clear saved connections when user is not authenticated
      try {
        localStorage.removeItem("rideBuddy_activeConnections");
        setActiveConnections([]);
        setConnectionsLoaded(false);
        componentInitializedRef.current = false;
      } catch (error) {
        console.error("Error clearing saved connections:", error);
      }
      return;
    }

    // Prevent multiple initializations
    if (componentInitializedRef.current) {
      console.log("🔄 RideBuddy already initialized, skipping...");
      return;
    }

    console.log("🚨 DEBUG: Initializing RideBuddy for the first time");
    componentInitializedRef.current = true;

    // Connect to socket with proper token from authService
    const token = authService.getAccessToken();
    if (!token) {
      console.error("No authentication token found");
      toast.error("Authentication required. Please sign in again.");
      return;
    }

    console.log(
      "🚀 Initializing RideBuddy socket connection and data loading..."
    );
    console.log(
      "Connecting to socket with token:",
      token.substring(0, 20) + "..."
    );

    // Handle authentication errors with token refresh
    const handleAuthError = async (errorMessage) => {
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
            navigate("/");
          });
        } else {
          toast.error("Session expired. Please sign in again.");
          authService.clearTokens();
          navigate("/");
        }
      } else {
        toast.error("Authentication failed. Please sign in again.");
        authService.clearTokens();
      }
    };

    // Set up socket event handlers
    const handleNewRequest = (data) => {
      console.log("🔔 New ride request received:", data);
      console.log(
        "🔔 Current incoming requests count:",
        incomingRequests.length
      );
      console.log("🔔 Current active tab:", activeTab);

      showDebouncedToast(
        "success",
        `New ride request from ${data.senderName}!`
      );

      // Check if request already exists to prevent duplicates
      setIncomingRequests((prevRequests) => {
        console.log("🔔 Previous incoming requests:", prevRequests.length);
        const requestExists = prevRequests.some(
          (req) => req._id === data.requestId
        );
        if (!requestExists) {
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
          console.log(
            "✅ Adding new request to incoming requests:",
            newRequest
          );
          const updatedRequests = [newRequest, ...prevRequests];
          console.log(
            "✅ Updated incoming requests count:",
            updatedRequests.length
          );
          return updatedRequests;
        } else {
          console.log("🔄 Request already exists in UI, skipping duplicate");
          return prevRequests;
        }
      });

      // Switch to connections tab to show the new request
      setActiveTab((currentTab) =>
        currentTab === "search" ? "connections" : currentTab
      );

      // Refresh from server after a delay to ensure consistency
      // REMOVED: This was causing infinite loops on Render deployment
      // debouncedLoadRequests(1000);
    };

    const handleRequestResponse = (data) => {
      console.log("🔔 Request response received:", data);

      if (data.action === "accepted") {
        // Use consistent connection success message
        showDebouncedToast(
          "success",
          `🛺 Connected with ${data.responderName}! You can now chat.`
        );
        setActiveTab("connections");

        // Create the connection immediately for the sender
        if (data.matchId && data.chatId) {
          const connection = {
            matchId: data.matchId,
            chatId: data.chatId,
            partner: {
              id: data.responderId,
              name: data.responderName,
              phone: data.responderPhone,
            },
            routeDetails: data.routeDetails,
            estimatedSharedFare: data.routeDetails?.estimatedSharedFare,
            createdAt: new Date().toISOString(),
            chatTimeRemaining: 10 * 60 * 1000, // 10 minutes
          };

          console.log("✅ Creating connection for sender:", connection);
          setActiveConnections((prev) => [connection, ...prev]);
        }

        // Also load connections from server as backup
        setTimeout(() => {
          if (isMountedRef.current) {
            loadConnections(true);
          }
        }, 500);
      } else {
        toast(`${data.responderName} declined your request`);
      }

      // Remove from outgoing requests immediately
      setOutgoingRequests((prev) =>
        prev.filter((req) => req._id !== data.requestId)
      );

      // Clean up sent request tracking
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
      // REMOVED: This was causing infinite loops on Render deployment
      // debouncedLoadRequests(800);
    };

    const handleNewMatch = (data) => {
      console.log("🔔 New match created:", data);

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

        setActiveConnections((prev) => [connection, ...prev]);
        setActiveTab("connections");

        // Only show toast if this is the primary connection event (not a duplicate)
        showDebouncedToast(
          "success",
          `🛺 Connected with ${data.partnerName}! You can now chat.`
        );
      }
    };

    // Handle new potential match (real-time search updates)
    const handleNewPotentialMatch = (data) => {
      console.log("🔔 New potential match received:", data);

      if (data.newMatch) {
        const newMatch = data.newMatch;

        // Add to search results if not already present
        setSearchResults((prev) => {
          const exists = prev.some((match) => match.userId === newMatch.userId);
          if (!exists) {
            showDebouncedToast(
              "success",
              `New potential match found: ${newMatch.userName}!`
            );
            return [newMatch, ...prev];
          }
          return prev;
        });

        // Update search state match count
        setSearchState((prev) => ({
          ...prev,
          matchCount: prev.matchCount + 1,
        }));
      }
    };

    // Handle auto-connection (mutual requests)
    const handleAutoConnection = (data) => {
      console.log("🤝 Auto-connection received:", data);

      // Use consistent connection message
      showDebouncedToast(
        "success",
        `🛺 Connected with ${data.partnerName}! You can now chat.`
      );

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
          createdAt: new Date().toISOString(),
          chatTimeRemaining: 10 * 60 * 1000,
        };

        setActiveConnections((prev) => [connection, ...prev]);
        setActiveTab("connections");
      }
    };

    // Handle search expiration - disabled socket event, using only client timer
    const handleSearchExpired = (data) => {
      console.log("⏰ Search expired notification received (ignoring):", data);
      // Ignore socket events for search expiry - use only client-side timer
      // This prevents premature expiry notifications
    };

    const handleConnectionEnded = () => {
      toast("A ride connection has ended");
      if (isMountedRef.current) {
        loadConnections();
      }
    };

    const handleGeneralNotification = (data) => {
      console.log("🔔 General notification received:", data);
      if (data.type === "ride_request") {
        setActiveTab("connections");
      }
    };

    // Set up socket listeners
    socketService.on("auth_error", handleAuthError);
    socketService.on("ride_buddy_new_request", handleNewRequest);
    socketService.on("ride_buddy_request_response", handleRequestResponse);
    socketService.on("ride_buddy_new_match", handleNewMatch);
    socketService.on("ride_buddy_connection_ended", handleConnectionEnded);
    socketService.on("new_notification", handleGeneralNotification);

    // New enhanced search event listeners
    socketService.on("ride_buddy_new_potential_match", handleNewPotentialMatch);
    socketService.on("ride_buddy_auto_connection", handleAutoConnection);
    socketService.on("ride_buddy_search_expired", handleSearchExpired);

    // Connect to socket
    socketService.connect(token).catch(async (error) => {
      console.error("Socket connection failed:", error);

      if (error.message && error.message.includes("Token expired")) {
        console.log("Attempting to refresh token after connection failure...");
        const refreshed = await authService.refreshAccessToken();

        if (refreshed) {
          console.log("Token refreshed, retrying connection...");
          const newToken = authService.getAccessToken();
          socketService.connect(newToken).catch((retryError) => {
            console.error("Retry connection failed:", retryError);
            toast.error("Session expired. Please sign in again.");
            authService.clearTokens();
            navigate("/");
          });
        } else {
          toast.error("Session expired. Please sign in again.");
          authService.clearTokens();
          navigate("/");
        }
      } else {
        toast.error("Connection failed. Please try again.");
      }
    });

    // Load initial data ONLY ONCE - using refs to prevent infinite loops
    console.log("📥 Loading initial requests and connections...");
    loadRequestsRef.current();
    checkActiveSearchStatusRef.current(); // Check for active search on mount
    setTimeout(() => {
      if (isMountedRef.current) {
        loadConnectionsRef.current(true);
      }
    }, 100);

    // Cleanup function
    return () => {
      console.log("🧹 Cleaning up RideBuddy socket listeners...");
      socketService.off("auth_error", handleAuthError);
      socketService.off("ride_buddy_new_request", handleNewRequest);
      socketService.off("ride_buddy_request_response", handleRequestResponse);
      socketService.off("ride_buddy_new_match", handleNewMatch);
      socketService.off("ride_buddy_connection_ended", handleConnectionEnded);
      socketService.off("new_notification", handleGeneralNotification);

      // Clean up enhanced search listeners
      socketService.off(
        "ride_buddy_new_potential_match",
        handleNewPotentialMatch
      );
      socketService.off("ride_buddy_auto_connection", handleAutoConnection);
      socketService.off("ride_buddy_search_expired", handleSearchExpired);

      if (activeChatId) {
        socketService.leaveChatRoom(activeChatId);
      }

      // Reset initialization flag for next mount
      componentInitializedRef.current = false;
    };
  }, [
    activeChatId,
    activeTab,
    incomingRequests.length,
    isAuthenticated,
    loadConnections,
    navigate,
    showDebouncedToast,
    user,
    user?.id,
  ]); // Only depend on authentication state and user ID - removed problematic dependencies

  // Request expiration checker - runs every minute (DISABLED FOR PRODUCTION STABILITY)
  useEffect(() => {
    if (!isAuthenticated) return;

    // Run immediately
    checkExpiredRequests();

    // DISABLED: Periodic checks to prevent infinite loops in production
    // No interval - only run once on mount
  }, [checkExpiredRequests, isAuthenticated]); // Only depend on authentication state

  // Manual refresh function for user-triggered updates (production-safe)
  const refreshData = useCallback(() => {
    if (!isMountedRef.current || !componentInitializedRef.current) return;

    console.log("🔄 Manual data refresh triggered");

    // Use refs to avoid dependency issues
    if (!requestsLoading) {
      loadRequestsRef.current();
    }

    if (!connectionsLoading) {
      loadConnectionsRef.current(false);
    }

    // Check search status if needed
    if (searchState.isActive && checkActiveSearchStatusRef.current) {
      checkActiveSearchStatusRef.current();
    }
  }, [requestsLoading, connectionsLoading, searchState.isActive]);

  // Periodic data refresh - DISABLED FOR PRODUCTION STABILITY
  // This was causing infinite API calls in Vercel deployment
  // Data will be refreshed through socket events and user interactions only

  // Enhanced search monitoring - DISABLED FOR PRODUCTION STABILITY
  // This was causing infinite loops in Vercel deployment
  /*
  useEffect(() => {
    if (
      !isAuthenticated ||
      !searchState.isActive ||
      !componentInitializedRef.current
    )
      return;

    // DISABLED: Enhanced search monitoring to prevent infinite loops
    const searchMonitorInterval = setInterval(() => {
      if (isMountedRef.current && searchState.isActive) {
        checkActiveSearchStatusRef.current && checkActiveSearchStatusRef.current();
      }
    }, 10000);

    return () => {
      clearInterval(searchMonitorInterval);
    };
  }, [isAuthenticated]);
  */

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

    // Check if user already has an active search
    if (searchState.isActive) {
      toast.error(
        "You already have an active search. Cancel it to start a new one."
      );
      return;
    }

    setSearchLoading(true);
    try {
      const result = await rideBuddyService.searchRideBuddies({
        source: searchForm.source,
        destination: searchForm.destination,
        preferences: {
          searchRadius: searchForm.searchRadius,
        },
      });

      if (result.success) {
        const matches = result.data.matches || [];
        console.log(
          `🔍 Search API returned ${matches.length} matches:`,
          matches
        );
        console.log("🔍 Search result data:", result.data);

        // Filter out current user and users we've already sent requests to
        const filteredMatches = matches.filter((match) => {
          if (match.userId === user?.id) {
            console.log(`🚫 Filtering out current user: ${match.userId}`);
            return false;
          }

          if (sentRequestIds.has(match.userId)) {
            console.log(
              `🚫 Filtering out user with sent request: ${match.userId}`
            );
            return false;
          }

          console.log(
            `✅ Including match: ${match.userId} (${match.userName})`
          );
          return true;
        });

        console.log(
          `📊 After filtering: ${filteredMatches.length} matches remaining`
        );
        setSearchResults(filteredMatches);

        // Set active search state with 5-minute duration
        const newSearchState = {
          isActive: true,
          searchId: result.data.searchId,
          expiresAt: result.data.expiresAt,
          source: searchForm.source.name,
          destination: searchForm.destination.name,
          matchCount: filteredMatches.length,
          timeRemaining: result.data.timeRemaining || 5 * 60 * 1000,
        };
        console.log("🔍 Setting new search state:", newSearchState);
        setSearchState(newSearchState);

        if (filteredMatches.length === 0) {
          showDebouncedToast(
            "info",
            "No matches found yet, but your search is active for 5 minutes"
          );
        } else {
          showDebouncedToast(
            "success",
            `Found ${filteredMatches.length} potential travel buddies`
          );
        }
      } else {
        console.error("❌ Search failed:", result.error);

        // Handle specific error for existing active search
        if (result.error === "Active search exists") {
          await checkActiveSearchStatus(); // Refresh search status
          showDebouncedToast(
            "error",
            "You already have an active search. Cancel it to start a new one."
          );
        } else {
          showDebouncedToast(
            "error",
            result.error || "Failed to search for travel buddies"
          );
        }
        setSearchResults([]);
      }
    } catch (error) {
      console.error("Search failed:", error);
      showDebouncedToast("error", "Failed to search for travel buddies");
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

      // Double-check to prevent race conditions
      if (
        sentRequestIds.has(match.userId) ||
        processingRequests.has(match.userId)
      ) {
        console.log(`🚫 Race condition prevented for user ${match.userId}`);
        return;
      }

      setSentRequestIds((prev) => new Set([...prev, match.userId]));
      setSentRequestTimes((prev) => new Map([...prev, [match.userId, now]]));
      setProcessingRequests((prev) => new Set([...prev, match.userId]));

      console.log(
        `📤 Sending connection request to user ${match.userId} (${match.userName})`
      );

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
        console.log(`✅ Request sent successfully to ${match.userId}`);
        toast.success(
          `Connection request sent to ${match.userName || match.userPhone}!`
        );
        setSearchResults((prev) => {
          const filtered = prev.filter((m) => m.userId !== match.userId);
          // Update search state match count
          setSearchState((prevState) => ({
            ...prevState,
            matchCount: filtered.length,
          }));
          return filtered;
        });
        // REMOVED: This was causing infinite loops on Render deployment
        // debouncedLoadRequests(500);
      } else {
        console.error(`❌ Request failed to ${match.userId}:`, result.error);
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
        } else if (
          result.error === "Receiver not available" ||
          result.error === "Receiver not found"
        ) {
          toast.error("User is no longer available for connections");
          setSearchResults((prev) => {
            const filtered = prev.filter((m) => m.userId !== match.userId);
            // Update search state match count
            setSearchState((prevState) => ({
              ...prevState,
              matchCount: filtered.length,
            }));
            return filtered;
          });
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

    // Debug logging
    console.log(`🚀 Starting respondToRequest process...`);

    // Prevent multiple clicks on the same request
    if (processingRequests.has(requestId)) {
      console.log(`Request ${requestId} is already being processed`);
      toast("Request is already being processed...");
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
      const loadingToast = toast.loading(
        `${action === "accepted" ? "Accepting" : "Declining"} request...`
      );

      if (action === "accepted") {
        console.log(`✅ Calling acceptRequest for ${requestId}`);
        console.log(`🔧 About to call rideBuddyService.acceptRequest with:`, {
          requestId,
          message: "",
        });

        // Test if the function exists
        console.log(
          "🔍 rideBuddyService.acceptRequest exists:",
          typeof rideBuddyService.acceptRequest
        );

        const result = await rideBuddyService.acceptRequest(requestId, "");
        console.log(`📡 Accept result:`, result);
        console.log(`📡 Accept result type:`, typeof result);
        console.log(`📡 Accept result.success:`, result?.success);

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
          toast.dismiss(loadingToast);
          // Don't show toast here - let the socket event handle it to avoid duplicates

          // Clear cache and reload connections to get fresh data
          rideBuddyService.clearCache();
          setTimeout(() => loadConnections(true), 500);
        } else {
          console.error(`❌ Accept failed:`, result.error);
          toast.dismiss(loadingToast);
          toast.error(result.error || "Failed to accept request");
          // Keep the request in UI if failed
        }
      } else {
        console.log(`❌ Calling declineRequest for ${requestId}`);
        console.log(`🔧 About to call rideBuddyService.declineRequest with:`, {
          requestId,
          message: "",
        });
        const result = await rideBuddyService.declineRequest(requestId, "");
        console.log(`📡 Decline result:`, result);
        console.log(`📡 Decline result type:`, typeof result);
        console.log(`📡 Decline result.success:`, result?.success);

        if (result.success) {
          // Remove from UI after successful processing
          setIncomingRequests((prev) =>
            prev.filter((r) => r._id !== requestId)
          );
          toast.dismiss(loadingToast);
          toast.success("Request declined");
        } else {
          console.error(`❌ Decline failed:`, result.error);
          toast.dismiss(loadingToast);
          toast.error(result.error || "Failed to decline request");
          // Keep the request in UI if failed
        }
      }
    } catch (error) {
      console.error(`💥 Error responding to request ${requestId}:`, error);

      // Dismiss loading toast
      // toast.dismiss(loadingToast); // loadingToast might not be defined here. Safest to just check.
      if (typeof loadingToast !== "undefined") {
        toast.dismiss(loadingToast);
      }

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
  }, [activeChatId]);

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

  // Set document title
  useEffect(() => {
    document.title = "Find Travel Buddy - SAWAARI";
    return () => {
      document.title = "SAWAARI - Smart Rickshaw Navigation";
    };
  }, []);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black pt-20 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-sawaari-yellow border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-200">Loading Travel Buddy...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated or user not loaded (auth guard will handle modal)
  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black overflow-x-hidden">
      {/* Compact Header Section */}
      <div className="pt-24 pb-6">
        <div className="container-sawaari px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-2xl lg:text-3xl font-bold text-white mb-3 text-readable">
              Find Your Travel Companion
            </h1>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto text-readable-secondary mb-4">
              Connect with fellow travelers, share rides, and make your journey
              more affordable.
            </p>

            {/* How It Works Button - Smaller and inline */}
            <button
              onClick={() => setShowHowItWorks(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-black/30 backdrop-blur-sm border border-white/20 rounded-lg text-white hover:bg-white/10 transition-all duration-300 text-sm"
            >
              <svg
                className="w-3.5 h-3.5"
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
              <span>How It Works</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="container-sawaari px-4 sm:px-6 lg:px-8 pb-8">
        {/* Tab Navigation - More prominent and centered */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex bg-black/50 backdrop-blur-md border border-white/20 rounded-2xl p-1.5 shadow-2xl h-16">
            {[
              { id: "search", label: "Search", icon: "🔍" },
              { id: "connections", label: "Connections", icon: "👥" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-2 px-8 py-3 rounded-xl transition-all duration-300 font-medium ${
                  activeTab === tab.id
                    ? "bg-gradient-to-r from-sawaari-yellow to-sawaari-green text-black shadow-lg transform scale-105"
                    : "text-gray-300 hover:text-white hover:bg-white/10"
                }`}
              >
                <span className="text-lg">{tab.icon}</span>
                <span className="text-readable">{tab.label}</span>
                {tab.id === "connections" &&
                  (incomingRequests.length > 0 ||
                    activeConnections.length > 0) && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                      {incomingRequests.length + activeConnections.length}
                    </span>
                  )}
              </button>
            ))}
          </div>
        </div>

        {/* Content Container - Centered and properly spaced */}
        <div className="max-w-5xl mx-auto">
          {activeTab === "search" && (
            <div className="space-y-6">
              {/* Search Form - Centered and Modern */}
              <div className="max-w-3xl mx-auto">
                <div className="glass-strong rounded-3xl p-8 border border-white/10 shadow-2xl">
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-white mb-2 text-readable">
                      Search for Travel Buddies
                    </h2>
                    <p className="text-gray-400 text-sm">
                      Find people traveling on similar routes
                    </p>
                  </div>

                  <SearchStatus
                    searchState={searchState}
                    onCancel={cancelActiveSearch}
                  />

                  {/* Custom styles and menu list components are no longer needed with DatabaseLocationSelect */}

                  <form onSubmit={handleSearch} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-4">
                      {/* Source Location */}
                      <div>
                        <label className="block text-xs font-semibold text-sawaari-yellow mb-1 text-readable">
                          <span className="mr-1">📍</span>
                          Source Location
                          <span className="text-red-400 ml-1">*</span>
                        </label>
                        <DatabaseLocationSelect
                          value={
                            searchForm.source.name
                              ? { name: searchForm.source.name }
                              : null
                          }
                          onChange={(selectedLocation) => {
                            setSearchForm((prev) => ({
                              ...prev,
                              source: {
                                name: selectedLocation
                                  ? selectedLocation.name
                                  : "",
                                coordinates: selectedLocation
                                  ? [
                                      selectedLocation.latitude,
                                      selectedLocation.longitude,
                                    ]
                                  : null,
                              },
                            }));
                          }}
                          placeholder="Type to search source location..."
                          className="w-full"
                        />
                      </div>

                      {/* Destination Location */}
                      <div>
                        <label className="block text-xs font-semibold text-sawaari-yellow mb-1 text-readable">
                          <span className="mr-1">🎯</span>
                          Destination Location
                          <span className="text-red-400 ml-1">*</span>
                        </label>
                        <DatabaseLocationSelect
                          value={
                            searchForm.destination.name
                              ? { name: searchForm.destination.name }
                              : null
                          }
                          onChange={(selectedLocation) => {
                            setSearchForm((prev) => ({
                              ...prev,
                              destination: {
                                name: selectedLocation
                                  ? selectedLocation.name
                                  : "",
                                coordinates: selectedLocation
                                  ? [
                                      selectedLocation.latitude,
                                      selectedLocation.longitude,
                                    ]
                                  : null,
                              },
                            }));
                          }}
                          placeholder="Type to search destination location..."
                          className="w-full"
                        />
                      </div>

                      {/* Search Radius Selector */}
                      <div className="md:col-span-2">
                        <label className="block text-xs font-semibold text-sawaari-yellow mb-1 text-readable">
                          📏 Search Radius
                        </label>
                        <select
                          value={searchForm.searchRadius}
                          onChange={(e) =>
                            setSearchForm((prev) => ({
                              ...prev,
                              searchRadius: parseInt(e.target.value),
                            }))
                          }
                          className="w-full p-2 bg-black/30 border border-white/20 rounded-lg text-white focus:border-sawaari-yellow focus:ring-2 focus:ring-sawaari-yellow/20 focus:outline-none transition-all duration-300 text-sm"
                        >
                          <option value={1}>1 km</option>
                          <option value={2}>2 km (Default)</option>
                          <option value={3}>3 km</option>
                          <option value={4}>4 km</option>
                          <option value={5}>5 km</option>
                        </select>
                        <p className="text-xs text-gray-400 mt-1">
                          Find ride buddies within this distance from your route
                        </p>
                      </div>
                    </div>

                    {/* Disclaimer */}
                    <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                      <p className="text-xs text-gray-200">
                        <span className="text-blue-400 font-semibold">
                          👥 Important:
                        </span>{" "}
                        To test this feature, ensure at least one other user is
                        searching for a similar or same route from a different
                        account. Matches occur when users have compatible routes
                        and timing.
                      </p>
                    </div>
                    <div className="flex justify-center pt-2">
                      <button
                        type="submit"
                        disabled={
                          searchLoading ||
                          searchState.isActive ||
                          !searchForm.source.name ||
                          !searchForm.destination.name
                        }
                        className={`px-8 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105 ${
                          searchState.isActive
                            ? "bg-green-500 text-white cursor-not-allowed"
                            : searchLoading
                            ? "bg-gray-400 text-white cursor-not-allowed"
                            : "btn-primary"
                        } disabled:opacity-50 disabled:transform-none disabled:hover:scale-100`}
                        title={
                          searchState.isActive
                            ? "You have an active search running"
                            : searchLoading
                            ? "Search in progress..."
                            : "Start searching for ride buddies"
                        }
                      >
                        {searchLoading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-5 border-b-2 border-white"></div>
                            Searching...
                          </>
                        ) : searchState.isActive ? (
                          <>
                            <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                            Search Active
                          </>
                        ) : (
                          <>
                            <span>🔍</span>
                            Search Ride Buddies
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Search Results */}
              {(searchResults.length > 0 || searchState.isActive) && (
                <div className="max-w-4xl mx-auto">
                  <div className="glass-strong rounded-3xl p-6 border border-white/10 shadow-2xl">
                    <div className="text-center mb-6">
                      <h3 className="text-xl font-bold text-white mb-2 text-readable">
                        {searchResults.length > 0
                          ? `Available Travel Buddies (${searchResults.length})`
                          : searchState.isActive
                          ? "Searching for Travel Buddies..."
                          : "No Results"}
                      </h3>
                      {searchResults.length > 0 && (
                        <p className="text-gray-400 text-sm">
                          Connect with these potential travel companions
                        </p>
                      )}
                    </div>
                    <div className="grid gap-4">
                      {searchResults.length === 0 && searchState.isActive && (
                        <div className="text-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sawaari-yellow mx-auto mb-4"></div>
                          <p className="text-gray-300 mb-2">
                            Your search is active! We&apos;ll notify you when
                            potential matches are found.
                          </p>
                          <p className="text-sm text-gray-400">
                            Search expires in{" "}
                            {Math.floor(searchState.timeRemaining / 60000)}:
                            {String(
                              Math.floor(
                                (searchState.timeRemaining % 60000) / 1000
                              )
                            ).padStart(2, "0")}
                          </p>
                        </div>
                      )}
                      {searchResults.map((match) => (
                        <div
                          key={match.userId}
                          className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-black/30 border border-white/10 rounded-lg gap-4"
                        >
                          <div className="flex items-center gap-4 min-w-0 flex-1">
                            <div className="w-12 h-12 bg-sawaari-yellow-muted border border-sawaari-yellow-border rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-sawaari-yellow font-semibold">
                                {(
                                  match.userName ||
                                  `User ${match.userId?.slice(-4)}`
                                )
                                  ?.charAt(0)
                                  ?.toUpperCase() || "U"}
                              </span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="font-semibold text-white text-readable truncate">
                                {match.userName ||
                                  `User ${match.userId?.slice(-4)}`}
                              </h4>
                              <p className="text-sm text-gray-300 text-readable-secondary truncate">
                                {getLocationName(
                                  match.route?.source || match.source
                                )}{" "}
                                →{" "}
                                {getLocationName(
                                  match.route?.destination || match.destination
                                )}
                              </p>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {match.overlapPercentage && (
                                  <p className="text-xs text-sawaari-yellow">
                                    {Math.round(match.overlapPercentage)}% route
                                    match
                                  </p>
                                )}
                                {match.estimatedSharedFare && (
                                  <p className="text-xs text-green-400">
                                    ₹{Math.round(match.estimatedSharedFare)}{" "}
                                    shared fare
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => sendRideRequest(match)}
                            disabled={sentRequestIds.has(match.userId)}
                            className={`px-4 py-2 rounded-lg transition-all duration-300 text-sm font-medium whitespace-nowrap flex-shrink-0 ${
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
                      We couldn&apos;t find any travel buddies for your route
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
            <div className="space-y-6">
              {/* Incoming Requests */}
              {(incomingRequests.length > 0 ||
                requestsLoading ||
                activeConnections.length > 0) && (
                <div className="max-w-4xl mx-auto">
                  <div className="glass-strong rounded-3xl p-6 border border-white/10 shadow-2xl">
                    <div className="text-center mb-6">
                      <h3 className="text-xl font-bold text-white mb-2 text-readable">
                        Connection Requests ({incomingRequests.length})
                      </h3>
                      <p className="text-gray-400 text-sm">
                        Manage your incoming travel buddy requests
                      </p>
                    </div>
                    <div className="grid gap-4">
                      {requestsLoading &&
                        incomingRequests.length === 0 &&
                        !requestsLoaded && (
                          <div className="flex items-center justify-center p-6">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-sawaari-yellow"></div>
                            <span className="ml-2 text-gray-400 text-sm">
                              Loading...
                            </span>
                          </div>
                        )}
                      {((!requestsLoading && requestsLoaded) ||
                        (!requestsLoading && incomingRequests.length === 0)) &&
                        incomingRequests.length === 0 && (
                          <div className="text-center p-8 text-gray-400">
                            <div className="text-4xl mb-2">📭</div>
                            <p>No incoming requests at the moment</p>
                          </div>
                        )}
                      {incomingRequests.map((request) => (
                        <div
                          key={request._id}
                          className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-black/30 border border-white/10 rounded-lg gap-4"
                        >
                          <div className="flex items-center gap-4 min-w-0 flex-1">
                            <div className="w-12 h-12 bg-sawaari-yellow-muted border border-sawaari-yellow-border rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-sawaari-yellow font-semibold">
                                {(
                                  request.senderName ||
                                  `User ${request.senderId?.slice(-4)}`
                                )
                                  ?.charAt(0)
                                  ?.toUpperCase() || "U"}
                              </span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="font-semibold text-white text-readable truncate">
                                {request.senderName ||
                                  `User ${request.senderId?.slice(-4)}`}
                              </h4>
                              <p className="text-sm text-gray-300 text-readable-secondary truncate">
                                {request.routeDetails?.senderRoute?.source ||
                                  "Unknown"}{" "}
                                →{" "}
                                {request.routeDetails?.senderRoute
                                  ?.destination || "Unknown"}
                              </p>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {request.routeDetails?.estimatedSharedFare && (
                                  <p className="text-xs text-green-400">
                                    Shared Fare: ₹
                                    {Math.round(
                                      request.routeDetails.estimatedSharedFare
                                    )}
                                  </p>
                                )}
                              </div>
                              {request.message && (
                                <p className="text-xs text-gray-400 italic mt-1 line-clamp-2">
                                  &quot;{request.message}&quot;
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2 flex-shrink-0">
                            <button
                              onClick={() =>
                                respondToRequest(request._id, "accepted")
                              }
                              disabled={processingRequests.has(request._id)}
                              className={`px-3 py-2 rounded-lg transition-colors text-sm font-medium whitespace-nowrap ${
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
                              className={`px-3 py-2 rounded-lg transition-colors text-sm font-medium whitespace-nowrap ${
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
                </div>
              )}

              {/* Active Connections */}
              {(activeConnections.length > 0 || connectionsLoading) && (
                <div className="max-w-4xl mx-auto">
                  <div className="glass-strong rounded-3xl p-6 border border-white/10 shadow-2xl">
                    <div className="text-center mb-6">
                      <div className="flex items-center justify-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-white text-readable">
                          Your Connections ({activeConnections.length})
                        </h3>
                        {connectionsLoading && (
                          <div className="flex items-center text-sm text-gray-400">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-sawaari-yellow"></div>
                          </div>
                        )}
                      </div>
                      <p className="text-gray-400 text-sm">
                        Your active travel buddy connections
                      </p>
                    </div>
                    <div className="grid gap-4">
                      {activeConnections.map((connection) => (
                        <div
                          key={connection.matchId}
                          className="p-4 bg-black/30 border border-white/10 rounded-lg"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-4">
                            <div className="flex items-center gap-4 min-w-0 flex-1">
                              <div className="w-12 h-12 bg-green-600 border border-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-white font-semibold">
                                  {(
                                    connection.partner?.name ||
                                    connection.partner?.phone
                                  )
                                    ?.charAt(0)
                                    ?.toUpperCase() || "U"}
                                </span>
                              </div>
                              <div className="min-w-0 flex-1">
                                <h4 className="font-semibold text-white text-readable truncate">
                                  {connection.partner?.name || "Anonymous"}
                                </h4>
                                <p className="text-sm text-gray-300 text-readable-secondary truncate">
                                  📱{" "}
                                  {connection.partner?.phone ||
                                    "Phone number available"}
                                </p>
                                <p className="text-sm text-gray-300 text-readable-secondary truncate">
                                  {connection.routeDetails?.senderRoute
                                    ?.source || "Unknown"}{" "}
                                  →{" "}
                                  {connection.routeDetails?.senderRoute
                                    ?.destination || "Unknown"}
                                </p>
                                {connection.routeDetails
                                  ?.estimatedSharedFare && (
                                  <p className="text-xs text-green-400">
                                    Shared Fare: ₹
                                    {Math.round(
                                      connection.routeDetails
                                        .estimatedSharedFare
                                    )}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Chat Button */}
                            <div className="flex-shrink-0 w-full sm:w-auto">
                              {connection.chatTimeRemaining > 0 ? (
                                <button
                                  onClick={() => startChat(connection)}
                                  className="w-full sm:w-auto px-4 py-2 bg-sawaari-yellow text-black rounded-lg hover:bg-sawaari-yellow/80 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                                >
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
                                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.959 8.959 0 01-4.906-1.524A11.956 11.956 0 012.69 18.186c.423-.95.893-1.902 1.405-2.852A8.002 8.002 0 0121 12z"
                                    />
                                  </svg>
                                  <span className="truncate">
                                    Open Chat (
                                    {Math.ceil(
                                      connection.chatTimeRemaining / 60000
                                    )}{" "}
                                    min left)
                                  </span>
                                </button>
                              ) : connection.chatTimeRemaining === -1 ? (
                                <div className="w-full sm:w-auto px-4 py-2 bg-orange-600 text-white rounded-lg text-center">
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
                                  className="w-full sm:w-auto px-4 py-2 bg-gray-600 text-gray-400 rounded-lg cursor-not-allowed text-sm"
                                  title="Connection has completely expired"
                                >
                                  Connection Expired
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Contact Actions */}
                          {connection.partner?.phone && (
                            <div className="flex flex-col sm:flex-row gap-2 mt-4 pt-4 border-t border-white/10">
                              <a
                                href={`tel:${connection.partner.phone}`}
                                className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                              >
                                <span>📞</span>
                                Call Direct
                              </a>
                              <a
                                href={`https://wa.me/${connection.partner.phone.replace(
                                  /[^0-9]/g,
                                  ""
                                )}?text=Hi! I'm your travel buddy from SAWAARI. Let's coordinate our trip!`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
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
                                className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
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
                                {Math.ceil(
                                  connection.chatTimeRemaining / 60000
                                )}{" "}
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
                </div>
              )}

              {/* Loading State - Only show for initial load */}
              {(requestsLoading || connectionsLoading) &&
                incomingRequests.length === 0 &&
                activeConnections.length === 0 &&
                (!requestsLoaded || !connectionsLoaded) && (
                  <div className="card text-center">
                    <div className="flex items-center justify-center p-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sawaari-yellow"></div>
                      <span className="ml-3 text-gray-400">
                        Loading connections...
                      </span>
                    </div>
                  </div>
                )}

              {/* Empty State - Show when no data and either loaded or not loading */}
              {incomingRequests.length === 0 &&
                activeConnections.length === 0 &&
                ((!requestsLoading && !connectionsLoading) ||
                  (requestsLoaded && connectionsLoaded)) && (
                  <div className="max-w-2xl mx-auto">
                    <div className="glass-strong rounded-3xl p-8 border border-white/10 shadow-2xl text-center">
                      <div className="text-6xl mb-4">👥</div>
                      <h3 className="text-xl font-bold text-white mb-2 text-readable">
                        No Connections Yet
                      </h3>
                      <p className="text-gray-300 text-readable-secondary mb-6">
                        Start by searching for travel buddies or wait for
                        incoming requests.
                      </p>
                      <div className="space-y-4 flex flex-col items-center">
                        <button
                          onClick={() => setActiveTab("search")}
                          className="px-8 py-3 bg-gradient-to-r from-sawaari-yellow to-sawaari-green text-black rounded-xl hover:shadow-lg transition-all duration-300 font-semibold transform hover:scale-105"
                        >
                          🔍 Search for Travel Buddies
                        </button>
                        <button
                          onClick={() => {
                            console.log("🔄 Manual refresh triggered");
                            setRequestsLoaded(false);
                            setConnectionsLoaded(false);
                            loadRequests();
                            loadConnections(true);
                            toast("Refreshing connections...");
                          }}
                          className="inline-flex items-center justify-center gap-2 px-6 py-2 bg-black/30 border border-white/20 text-white rounded-xl hover:bg-white/10 transition-all duration-300 font-medium"
                          disabled={requestsLoading || connectionsLoading}
                        >
                          {requestsLoading || connectionsLoading ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              <span>Refreshing...</span>
                            </>
                          ) : (
                            <>
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
                                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                />
                              </svg>
                              <span>Refresh</span>
                            </>
                          )}
                        </button>
                      </div>
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
                    How Travel Buddy Works
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
                  🚗 What is Travel Buddy?
                </h3>
                <p className="text-gray-300 text-sm">
                  Travel Buddy helps you find fellow travelers going on similar
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
                        Search for Travel Buddies
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
                  <p className="text-xs text-neutral-400">Travel Buddy Chat</p>
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
