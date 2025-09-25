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
import { AuthContext } from "../../AuthContext";
import { useAuthGuard } from "../../hooks/useAuthGuard";
import rideBuddyService from "../../services/rideBuddyService";
import locationService from "../../services/locationService";
import socketService from "../../services/socketService";
import authService from "../../services/authService";
import LiveChat from "../../components/common/LiveChat";
import DatabaseLocationSelect from "../../components/common/DatabaseLocationSelect";
import SearchEngagement from "../../components/common/SearchEngagement";
import toast from "react-hot-toast";
import React from "react";

const RideBuddy = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuthGuard(
    "Please sign in to access Travel Buddy"
  );

  const lastToastRef = useRef({ message: "", timestamp: 0, type: "" });
  const connectionToastRef = useRef({ partnerId: "", timestamp: 0 });

  const showDebouncedToast = useCallback((type, message, delay = 2000) => {
    const now = Date.now();
    const lastToast = lastToastRef.current;

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
        console.log("🚫 Skipping duplicate connection toast for:", partnerId);
        return;
      }

      if (partnerId) {
        connectionToastRef.current = { partnerId, timestamp: now };
      }
    }

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

  const checkExpiredRequests = useCallback(() => {
    const now = Date.now();
    const EXPIRATION_TIME = 10 * 60 * 1000;

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

      if (expired.length > 0) {
        toast(`${expired.length} request(s) expired and were removed`);
      }

      return valid;
    });

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

      if (expired.length > 0) {
        toast.error(`Your request has expired. Try making a new request.`);
      }

      return valid;
    });

    const lastCleanup = localStorage.getItem("lastRequestCleanup");
    const now_timestamp = Date.now();
    const CLEANUP_INTERVAL = 5 * 60 * 1000;

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
        .catch((error) => {});
    }
  }, []);

  const getLocationName = (location) => {
    if (!location) return "Unknown";
    if (typeof location === "string") return location;
    if (location.name) return location.name;
    return "Unknown";
  };

  const isConnectionExpired = useCallback((connection) => {
    if (!connection.createdAt) return true;

    const connectionTime = new Date(connection.createdAt).getTime();
    const now = Date.now();
    const totalConnectionDuration = 15 * 60 * 1000;

    return now - connectionTime > totalConnectionDuration;
  }, []);

  const getConnectionTimeRemaining = useCallback((connection) => {
    if (!connection.createdAt) return 0;

    const connectionTime = new Date(connection.createdAt).getTime();
    const now = Date.now();
    const totalConnectionDuration = 15 * 60 * 1000;
    const chatDuration = 10 * 60 * 1000;

    const elapsed = now - connectionTime;

    if (elapsed > totalConnectionDuration) {
      return 0;
    } else if (elapsed > chatDuration) {
      return -1;
    } else {
      return chatDuration - elapsed;
    }
  }, []);

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
          // Update the state to remove expired connections
          setActiveConnections(validConnections);
        }
      }
    } catch (error) {
      console.error(
        "Error clearing expired connections from localStorage:",
        error
      );
    }
  }, [isConnectionExpired]);

  const [activeTab, setActiveTab] = useState("search");

  const handleTabChange = useCallback((newTab) => {
    setActiveTab(newTab);

    if (newTab === "connections" && componentInitializedRef.current) {
      setTimeout(() => {
        if (isMountedRef.current) {
          loadRequestsRef.current();
          loadConnectionsRef.current(false);
        }
      }, 100);
    }
  }, []);

  const [searchForm, setSearchForm] = useState({
    source: { name: "", coordinates: null },
    destination: { name: "", coordinates: null },
    searchRadius: 2,
  });
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [sentRequestIds, setSentRequestIds] = useState(new Set());
  const [sentRequestTimes, setSentRequestTimes] = useState(new Map());
  const [searchState, setSearchState] = useState({
    isActive: false,
    searchId: null,
    expiresAt: null,
    source: "",
    destination: "",
    matchCount: 0,
    timeRemaining: 0,
  });
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [activeConnections, setActiveConnections] = useState(() => {
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
  const [processingRequests, setProcessingRequests] = useState(new Set());
  const [requestsLoaded, setRequestsLoaded] = useState(false);
  const [connectionsLoaded, setConnectionsLoaded] = useState(false);
  const [activeChatId, setActiveChatId] = useState(null);
  const [chatPartner, setChatPartner] = useState(null);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const isMountedRef = useRef(true);
  const lastLoadRequestsCallRef = useRef(0);
  const loadRequestsCallCountRef = useRef(0);
  const loadRequestsTimeoutRef = useRef(null);
  const componentInitializedRef = useRef(false);

  const apiCallTracker = useRef({
    loadRequests: { count: 0, lastReset: Date.now() },
    loadConnections: { count: 0, lastReset: Date.now() },
    checkSearchStatus: { count: 0, lastReset: Date.now() },
  });

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

  useEffect(() => {
    clearExpiredConnections();
  }, [clearExpiredConnections]);

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

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (loadRequestsTimeoutRef.current) {
        clearTimeout(loadRequestsTimeoutRef.current);
      }
    };
  }, []);

  const checkActiveSearchStatus = useCallback(async () => {
    try {
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

  const checkActiveSearchStatusRef = useRef();
  checkActiveSearchStatusRef.current = async () => {
    try {
      const tracker = apiCallTracker.current.checkSearchStatus;
      if (tracker.count > 10) {
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
        if (
          result.error?.includes("404") ||
          result.error?.includes("not found") ||
          result.error?.includes("No active search found")
        ) {
          showDebouncedToast("info", "Search cancelled");
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

  const loadRequestsRef = useRef();
  loadRequestsRef.current = async () => {
    const now = Date.now();
    const MIN_CALL_INTERVAL = 1000;

    const tracker = apiCallTracker.current.loadRequests;
    if (tracker.count > 10) {
      console.warn("🚨 loadRequests rate limited - too many calls");
      return;
    }
    tracker.count++;

    if (requestsLoading || !isMountedRef.current) {
      return;
    }

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
          const incomingData = result.data.requests || [];
          const uniqueIncoming = incomingData.filter(
            (request, index, self) =>
              index === self.findIndex((r) => r._id === request._id)
          );

          const outgoingData = result.data.sentRequests || [];
          const uniqueOutgoing = outgoingData.filter(
            (request, index, self) =>
              index === self.findIndex((r) => r._id === request._id)
          );

          setIncomingRequests(uniqueIncoming);
          setOutgoingRequests(uniqueOutgoing);

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

  const loadConnectionsRef = useRef();
  loadConnectionsRef.current = async (forceRefresh = false) => {
    const tracker = apiCallTracker.current.loadConnections;
    if (tracker.count > 10 && !forceRefresh) {
      console.warn("🚨 loadConnections rate limited - too many calls");
      return;
    }
    tracker.count++;

    if (!isMountedRef.current) {
      return;
    }

    if (connectionsLoading && !forceRefresh) {
      return;
    }

    try {
      setConnectionsLoading(true);

      if (forceRefresh) {
        rideBuddyService.clearCache && rideBuddyService.clearCache();
      }

      const result = await rideBuddyService.getMatches();
      if (result.success) {
        const validConnections = (result.data || [])
          .filter((connection) => {
            if (!connection.createdAt) return true;
            const connectionTime = new Date(connection.createdAt).getTime();
            const now = Date.now();
            const totalConnectionDuration = 15 * 60 * 1000;
            return now - connectionTime <= totalConnectionDuration;
          })
          .map((connection) => {
            if (!connection.createdAt) return connection;
            const connectionTime = new Date(connection.createdAt).getTime();
            const now = Date.now();
            const chatDuration = 10 * 60 * 1000;
            const elapsed = now - connectionTime;
            let chatTimeRemaining;
            if (elapsed > chatDuration) {
              chatTimeRemaining = -1;
            } else {
              chatTimeRemaining = chatDuration - elapsed;
            }
            return {
              ...connection,
              chatTimeRemaining,
            };
          });

        setActiveConnections(validConnections);
        setConnectionsLoaded(true);

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

  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = Date.now();

      setSentRequestTimes((currentSentTimes) => {
        const expiredIds = [];
        currentSentTimes.forEach((sentTime, userId) => {
          if (now - sentTime > 10 * 60 * 1000) {
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

      setActiveConnections((prev) => {
        const validConnections = prev.filter((connection) => {
          if (!connection.createdAt) return true;

          const connectionTime = new Date(connection.createdAt).getTime();
          const totalConnectionDuration = 15 * 60 * 1000;
          const isExpired = now - connectionTime > totalConnectionDuration;

          if (isExpired) {
            console.log(
              `🧹 Removing expired connection: ${connection.matchId} (15 minutes elapsed)`
            );
            return false;
          }
          return true;
        });

        const updatedConnections = validConnections.map((connection) => {
          if (!connection.createdAt) return connection;

          const connectionTime = new Date(connection.createdAt).getTime();
          const chatDuration = 10 * 60 * 1000;
          const elapsed = now - connectionTime;

          let chatTimeRemaining;
          if (elapsed > chatDuration) {
            chatTimeRemaining = -1;
          } else {
            chatTimeRemaining = chatDuration - elapsed;
          }

          return {
            ...connection,
            chatTimeRemaining,
          };
        });

        return updatedConnections.length !== prev.length ||
          JSON.stringify(updatedConnections) !== JSON.stringify(prev)
          ? updatedConnections
          : prev;
      });
    }, 60000);

    return () => clearInterval(cleanupInterval);
  }, []);

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

    if (componentInitializedRef.current) {
      console.log("🔄 RideBuddy already initialized, skipping...");
      return;
    }

    console.log("🚨 DEBUG: Initializing RideBuddy for the first time");
    componentInitializedRef.current = true;

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

    const handleAuthError = async (errorMessage) => {
      console.error("Socket authentication failed:", errorMessage);

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

      setActiveTab((currentTab) =>
        currentTab === "search" ? "connections" : currentTab
      );
    };

    const handleRequestResponse = (data) => {
      console.log("🔔 Request response received:", data);

      if (data.action === "accepted") {
        showDebouncedToast(
          "success",
          `🛺 Connected with ${data.responderName}! You can now chat.`
        );
        setActiveTab("connections");

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
            chatTimeRemaining: 10 * 60 * 1000,
          };

          console.log("✅ Creating connection for sender:", connection);
          setActiveConnections((prev) => [connection, ...prev]);
        }

        setTimeout(() => {
          if (isMountedRef.current) {
            loadConnections(true);
          }
        }, 500);
      } else {
        toast(`${data.responderName} declined your request`);
      }

      setOutgoingRequests((prev) =>
        prev.filter((req) => req._id !== data.requestId)
      );

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
          chatTimeRemaining: 10 * 60 * 1000,
        };

        setActiveConnections((prev) => [connection, ...prev]);
        setActiveTab("connections");

        showDebouncedToast(
          "success",
          `🛺 Connected with ${data.partnerName}! You can now chat.`
        );
      }
    };

    const handleNewPotentialMatch = (data) => {
      console.log("🔔 New potential match received:", data);

      if (data.newMatch) {
        // Normalize/validate incoming match data
        const raw = data.newMatch;
        const newMatch = {
          userId: raw.userId || raw._id || "unknown",
          userName: raw.userName || raw.name || "Anonymous",
          userEmail: raw.userEmail || raw.email || "",
          source: raw.source || (raw.route ? raw.route.source : "Unknown"),
          destination:
            raw.destination || (raw.route ? raw.route.destination : "Unknown"),
          overlapPercentage:
            typeof raw.overlapPercentage === "number"
              ? raw.overlapPercentage
              : 0,
          estimatedSharedFare:
            typeof raw.estimatedSharedFare === "number"
              ? raw.estimatedSharedFare
              : null,
          sharedDistance:
            typeof raw.sharedDistance === "number" ? raw.sharedDistance : null,
          createdAt: raw.createdAt || new Date().toISOString(),
          // Add any other fields needed by UI here
        };

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

        setSearchState((prev) => ({
          ...prev,
          matchCount: prev.matchCount + 1,
        }));
      }
    };

    const handleAutoConnection = (data) => {
      console.log("🤝 Auto-connection received:", data);

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

    const handleSearchExpired = (data) => {
      console.log("⏰ Search expired notification received (ignoring):", data);
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

    socketService.on("auth_error", handleAuthError);
    socketService.on("ride_buddy_new_request", handleNewRequest);
    socketService.on("ride_buddy_request_response", handleRequestResponse);
    socketService.on("ride_buddy_new_match", handleNewMatch);
    socketService.on("ride_buddy_connection_ended", handleConnectionEnded);
    socketService.on("new_notification", handleGeneralNotification);
    socketService.on("ride_buddy_new_potential_match", handleNewPotentialMatch);
    socketService.on("ride_buddy_auto_connection", handleAutoConnection);
    socketService.on("ride_buddy_search_expired", handleSearchExpired);

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

    console.log("📥 Loading initial requests and connections...");
    loadRequestsRef.current();
    checkActiveSearchStatusRef.current();
    setTimeout(() => {
      if (isMountedRef.current) {
        loadConnectionsRef.current(true);
      }
    }, 100);

    return () => {
      console.log("🧹 Cleaning up RideBuddy socket listeners...");
      socketService.off("auth_error", handleAuthError);
      socketService.off("ride_buddy_new_request", handleNewRequest);
      socketService.off("ride_buddy_request_response", handleRequestResponse);
      socketService.off("ride_buddy_new_match", handleNewMatch);
      socketService.off("ride_buddy_connection_ended", handleConnectionEnded);
      socketService.off("new_notification", handleGeneralNotification);
      socketService.off(
        "ride_buddy_new_potential_match",
        handleNewPotentialMatch
      );
      socketService.off("ride_buddy_auto_connection", handleAutoConnection);
      socketService.off("ride_buddy_search_expired", handleSearchExpired);

      if (activeChatId) {
        socketService.leaveChatRoom(activeChatId);
      }

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
  ]);

  useEffect(() => {
    if (!isAuthenticated) return;

    checkExpiredRequests();
  }, [checkExpiredRequests, isAuthenticated]);

  const refreshData = useCallback(() => {
    if (!isMountedRef.current || !componentInitializedRef.current) return;

    console.log("🔄 Manual data refresh triggered");

    if (!requestsLoading) {
      loadRequestsRef.current();
    }

    if (!connectionsLoading) {
      loadConnectionsRef.current(false);
    }

    if (searchState.isActive && checkActiveSearchStatusRef.current) {
      checkActiveSearchStatusRef.current();
    }
  }, [requestsLoading, connectionsLoading, searchState.isActive]);

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
        console.log("🔍 Search state before update:", {
          isActive: searchState.isActive,
          searchLoading,
          matchCount: searchResults.length,
        });
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

        // Set search state to active only if no matches were found
        const newSearchState = {
          isActive: filteredMatches.length === 0, // Only keep searching if no matches found
          searchId: result.data.searchId,
          expiresAt: result.data.expiresAt,
          source: searchForm.source.name,
          destination: searchForm.destination.name,
          matchCount: filteredMatches.length,
          timeRemaining: result.data.timeRemaining || 5 * 60 * 1000,
        };
        console.log("🔍 Setting new search state:", newSearchState);
        setSearchState(newSearchState);

        console.log("🔍 Search state after filtering:", {
          isActive: searchState.isActive,
          filteredMatchCount: filteredMatches.length,
          newSearchState,
        });

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

        if (result.error === "Active search exists") {
          await checkActiveSearchStatus();
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

    if (processingRequests.has(match.userId)) {
      toast.error("Request is already being processed for this user");
      return;
    }

    try {
      const now = Date.now();

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
          setSearchState((prevState) => ({
            ...prevState,
            matchCount: filtered.length,
          }));
          return filtered;
        });
      } else {
        console.error(`❌ Request failed to ${match.userId}:`, result.error);
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
      setProcessingRequests((prev) => {
        const newSet = new Set(prev);
        newSet.delete(match.userId);
        return newSet;
      });
    }
  };

  const respondToRequest = async (requestId, action) => {
    console.log(`🔧 Responding to request ${requestId} with action: ${action}`);

    if (processingRequests.has(requestId)) {
      console.log(`Request ${requestId} is already being processed`);
      toast("Request is already being processed...");
      return;
    }

    try {
      setProcessingRequests((prev) => new Set([...prev, requestId]));
      console.log(`✅ Marked request ${requestId} as processing`);

      const requestToProcess = incomingRequests.find(
        (r) => r._id === requestId
      );
      if (!requestToProcess) {
        console.error(`Request ${requestId} not found in incoming requests`);
        toast.error("Request not found. It may have already been processed.");
        return;
      }

      console.log(`📋 Processing request:`, requestToProcess);

      const loadingToast = toast.loading(
        `${action === "accepted" ? "Accepting" : "Declining"} request...`
      );

      if (action === "accepted") {
        console.log(`✅ Calling acceptRequest for ${requestId}`);
        console.log(`🔧 About to call rideBuddyService.acceptRequest with:`, {
          requestId,
          message: "",
        });

        const result = await rideBuddyService.acceptRequest(requestId, "");
        console.log(`📡 Accept result:`, result);

        if (result.success) {
          setIncomingRequests((prev) =>
            prev.filter((r) => r._id !== requestId)
          );

          const connection = {
            matchId: result.data.matchId,
            chatId: result.data.chatId,
            partner: result.data.partner,
            routeDetails: result.data.routeDetails,
            estimatedSharedFare: result.data.estimatedSharedFare,
            createdAt: new Date().toISOString(),
            chatTimeRemaining: 10 * 60 * 1000,
          };

          console.log(`🔗 Adding connection to UI:`, connection);
          setActiveConnections((prev) => [connection, ...prev]);
          toast.dismiss(loadingToast);

          rideBuddyService.clearCache();
          setTimeout(() => loadConnections(true), 500);
        } else {
          console.error(`❌ Accept failed:`, result.error);
          toast.dismiss(loadingToast);
          toast.error(result.error || "Failed to accept request");
        }
      } else {
        console.log(`❌ Calling declineRequest for ${requestId}`);
        console.log(`🔧 About to call rideBuddyService.declineRequest with:`, {
          requestId,
          message: "",
        });
        const result = await rideBuddyService.declineRequest(requestId, "");
        console.log(`📡 Decline result:`, result);

        if (result.success) {
          setIncomingRequests((prev) =>
            prev.filter((r) => r._id !== requestId)
          );
          toast.dismiss(loadingToast);
          toast.success("Request declined");
        } else {
          console.error(`❌ Decline failed:`, result.error);
          toast.dismiss(loadingToast);
          toast.error(result.error || "Failed to decline request");
        }
      }
    } catch (error) {
      console.error(`💥 Error responding to request ${requestId}:`, error);

      if (typeof loadingToast !== "undefined") {
        toast.dismiss(loadingToast);
      }

      if (error.message.includes("Network")) {
        toast.error(
          "Network error. Please check your connection and try again."
        );
      } else if (error.message.includes("Token")) {
        toast.error("Session expired. Please sign in again.");
      } else if (error.message.includes("404")) {
        toast.error("Request not found. It may have already been processed.");
        setIncomingRequests((prev) => prev.filter((r) => r._id !== requestId));
      } else {
        toast.error("Failed to respond to request. Please try again.");
      }
    } finally {
      setProcessingRequests((prev) => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
      console.log(`✅ Removed request ${requestId} from processing set`);
    }
  };

  const startChat = (connection) => {
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

  useEffect(() => {
    document.title = "Find Travel Buddy - SAWAARI";
    return () => {
      document.title = "SAWAARI - Smart Rickshaw Navigation";
    };
  }, []);

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

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black overflow-x-hidden">
      <div className="pt-20 pb-3 sm:pt-24 sm:pb-6">
        <div className="container-sawaari px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-2 sm:mb-3 text-readable">
              Find Your Travel Companion
            </h1>
            <p className="text-sm sm:text-lg text-gray-300 max-w-2xl mx-auto text-readable-secondary mb-3 sm:mb-4 hidden sm:block">
              Connect with fellow travelers, share rides, and make your journey
              more affordable.
            </p>
            <button
              onClick={() => setShowHowItWorks(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-black/30 backdrop-blur-sm border border-white/20 rounded-lg text-white hover:bg-white/10 transition-all duration-300 text-xs sm:text-sm"
            >
              <svg
                className="w-3 h-3 sm:w-3.5 sm:h-3.5"
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
      <div className="container-sawaari px-4 sm:px-6 lg:px-8 pb-8">
        <div className="flex justify-center mb-4 sm:mb-6">
          <div className="inline-flex bg-black/50 backdrop-blur-md border border-white/20 rounded-xl sm:rounded-2xl p-1 sm:p-1.5 shadow-2xl h-12 sm:h-16">
            {[
              { id: "search", label: "Search", icon: "🔍" },
              { id: "connections", label: "Connections", icon: "👥" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`relative flex items-center gap-1 sm:gap-2 px-4 sm:px-8 py-2 sm:py-3 rounded-lg sm:rounded-xl transition-all duration-300 font-medium text-sm sm:text-base ${
                  activeTab === tab.id
                    ? "bg-gradient-to-r from-sawaari-yellow to-sawaari-green text-black shadow-lg transform scale-105"
                    : "text-gray-300 hover:text-white hover:bg-white/10"
                }`}
              >
                <span className="text-base sm:text-lg">{tab.icon}</span>
                <span className="text-readable hidden sm:inline">
                  {tab.label}
                </span>
                <span className="text-readable sm:hidden text-xs">
                  {tab.id === "search" ? "Search" : "Connect"}
                </span>
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

        {/* Tab Content */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6 lg:gap-8 lg:items-start">
          {activeTab === "search" ? (
            <>
              <div className="lg:col-span-2 order-1 lg:order-1">
                <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg sm:rounded-xl p-6 sm:p-8 flex flex-col gap-6 sm:gap-8">
                  <div className="text-center">
                    <h2 className="text-base sm:text-2xl font-bold text-white mb-1 sm:mb-2 text-readable">
                      Search for Travel Buddies
                    </h2>
                    <p className="text-gray-400 text-xs sm:text-sm hidden sm:block">
                      Find people traveling on similar routes
                    </p>
                  </div>
                  <SearchEngagement searchState={searchState} />
                  {searchState.isActive ? (
                    <div className="text-center">
                      <button
                        onClick={cancelActiveSearch}
                        className="bg-red-500/80 hover:bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 flex items-center gap-2 hover:scale-105 shadow-lg mx-auto"
                        title="Cancel search"
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
                        <span>Cancel Search</span>
                      </button>
                    </div>
                  ) : (
                    <form
                      onSubmit={handleSearch}
                      className="space-y-6 sm:space-y-8"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                        <div>
                          <label className="block text-xs font-semibold text-sawaari-yellow mb-1 text-readable">
                            <span className="mr-1">📍</span>
                            Source Location
                            <span className="text-red-400 ml-1">*</span>
                          </label>
                          <DatabaseLocationSelect
                            value={searchForm.source.name || ""}
                            onChange={async (selectedLocationName) => {
                              if (selectedLocationName) {
                                try {
                                  const result =
                                    await locationService.searchLocations(
                                      selectedLocationName,
                                      1
                                    );
                                  const locationData = result.data.find(
                                    (loc) => loc.name === selectedLocationName
                                  );

                                  setSearchForm((prev) => ({
                                    ...prev,
                                    source: {
                                      name: selectedLocationName,
                                      coordinates: locationData
                                        ? [
                                            locationData.latitude,
                                            locationData.longitude,
                                          ]
                                        : null,
                                    },
                                  }));
                                } catch (error) {
                                  console.error(
                                    "Error fetching location coordinates:",
                                    error
                                  );
                                  setSearchForm((prev) => ({
                                    ...prev,
                                    source: {
                                      name: selectedLocationName,
                                      coordinates: null,
                                    },
                                  }));
                                }
                              } else {
                                setSearchForm((prev) => ({
                                  ...prev,
                                  source: {
                                    name: "",
                                    coordinates: null,
                                  },
                                }));
                              }
                            }}
                            placeholder="Search source"
                            className="w-full"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-sawaari-yellow mb-1 text-readable">
                            <span className="mr-1">🎯</span>
                            Destination Location
                            <span className="text-red-400 ml-1">*</span>
                          </label>
                          <DatabaseLocationSelect
                            value={searchForm.destination.name || ""}
                            onChange={async (selectedLocationName) => {
                              if (selectedLocationName) {
                                try {
                                  const result =
                                    await locationService.searchLocations(
                                      selectedLocationName,
                                      1
                                    );
                                  const locationData = result.data.find(
                                    (loc) => loc.name === selectedLocationName
                                  );

                                  setSearchForm((prev) => ({
                                    ...prev,
                                    destination: {
                                      name: selectedLocationName,
                                      coordinates: locationData
                                        ? [
                                            locationData.latitude,
                                            locationData.longitude,
                                          ]
                                        : null,
                                    },
                                  }));
                                } catch (error) {
                                  console.error(
                                    "Error fetching location coordinates:",
                                    error
                                  );
                                  setSearchForm((prev) => ({
                                    ...prev,
                                    destination: {
                                      name: selectedLocationName,
                                      coordinates: null,
                                    },
                                  }));
                                }
                              } else {
                                setSearchForm((prev) => ({
                                  ...prev,
                                  destination: {
                                    name: "",
                                    coordinates: null,
                                  },
                                }));
                              }
                            }}
                            placeholder="Search destination"
                            className="w-full"
                          />
                        </div>
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
                            Find ride buddies within this distance from your
                            route
                          </p>
                        </div>
                      </div>
                      <div className="p-2 sm:p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                        <p className="text-xs text-gray-200">
                          <span className="text-blue-400 font-semibold">
                            Note:
                          </span>{" "}
                          Need another user searching similar routes to find
                          matches.
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
                          className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg font-medium transition-all duration-300 flex items-center justify-center gap-2 text-sm hover:shadow-lg transform hover:scale-[1.02] ${
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
                            <>Search Buddies</>
                          )}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>

              {/* Right Column - Results Panel */}
              <div className="lg:col-span-3 order-2 lg:order-2">
                <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg sm:rounded-xl p-6 sm:p-8">
                  <h2 className="text-lg sm:text-xl font-bold text-white text-readable">
                    Travel Buddy Matches
                  </h2>

                  <div className="mt-4 sm:mt-6">
                    {searchResults.length > 0 ? (
                      <div className="space-y-4">
                        <div className="text-center mb-4">
                          <p className="text-gray-400 text-sm">
                            Found {searchResults.length} potential travel
                            companion{searchResults.length !== 1 ? "s" : ""}
                            {searchState.isActive && " • Search still active"}
                          </p>
                          {searchState.isActive && (
                            <p className="text-xs text-gray-400 mt-1">
                              Search expires in{" "}
                              {Math.floor(searchState.timeRemaining / 60000)}:
                              {String(
                                Math.floor(
                                  (searchState.timeRemaining % 60000) / 1000
                                )
                              ).padStart(2, "0")}
                            </p>
                          )}
                        </div>
                        <div className="space-y-4 max-h-96 overflow-y-auto">
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
                                      match.route?.destination ||
                                        match.destination
                                    )}
                                  </p>
                                  <div className="flex flex-wrap gap-2 mt-1">
                                    {match.overlapPercentage && (
                                      <p className="text-xs text-sawaari-yellow">
                                        {Math.round(match.overlapPercentage)}%
                                        route match
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
                                  ? "Request Sent"
                                  : "Send Request"}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : searchState.isActive ? (
                      <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-sawaari-yellow mx-auto mb-2"></div>
                        <h3 className="text-base font-bold text-white mb-1">
                          Searching for Buddies...
                        </h3>
                        <p className="text-gray-300 text-sm mb-1">
                          Your search is active! We&apos;ll notify you when
                          potential matches are found.
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-6 text-center">
                        <div className="text-4xl mb-3">🚀</div>
                        <h3 className="text-lg font-bold text-white mb-2 text-readable">
                          Ready to Find Travel Buddies?
                        </h3>
                        <p className="text-gray-300 text-readable-secondary mb-3 max-w-sm text-sm">
                          Select your locations and start searching for fellow
                          travelers.
                        </p>
                        <div className="bg-sawaari-yellow/10 border border-sawaari-yellow/20 rounded-lg p-3 max-w-sm">
                          <h4 className="text-sawaari-yellow font-semibold mb-2 text-sm">
                            Quick Tips:
                          </h4>
                          <ul className="text-xs text-gray-300 space-y-1 text-left">
                            <li>• 2km search radius</li>
                            <li>• 5-minute active search</li>
                            <li>• Chat with matches</li>
                            <li>• Share ride costs</li>
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : null}

          {activeTab === "connections" && (
            <div className="lg:col-span-5 space-y-4 sm:space-y-6">
              {(incomingRequests.length > 0 ||
                requestsLoading ||
                activeConnections.length > 0) && (
                <div className="max-w-4xl mx-auto">
                  <div className="glass-strong rounded-none sm:rounded-3xl p-4 sm:p-6 border-0 sm:border sm:border-white/10 shadow-2xl">
                    <div className="text-center mb-4 sm:mb-6">
                      <h3 className="text-lg sm:text-xl font-bold text-white mb-2 text-readable">
                        Connection Requests ({incomingRequests.length})
                      </h3>
                      <p className="text-gray-400 text-xs sm:text-sm">
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
                            <div className="flex-shrink-0 w-full sm:w-auto">
                              <div className="flex flex-col sm:flex-row gap-2">
                                {connection.chatTimeRemaining > 0 && (
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
                                )}
                                {connection.chatTimeRemaining === 0 && (
                                  <button
                                    disabled
                                    className="w-full sm:w-auto px-4 py-2 bg-gray-600 text-gray-400 rounded-lg cursor-not-allowed text-sm font-medium"
                                  >
                                    Chat Unavailable
                                  </button>
                                )}
                                <a
                                  href={`tel:${connection.partner?.phone}`}
                                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2"
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
                                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                                    />
                                  </svg>
                                  <span>Call</span>
                                </a>
                                <a
                                  href={`https://wa.me/${connection.partner?.phone?.replace(
                                    /\D/g,
                                    ""
                                  )}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-4 py-2 bg-[#25D366] hover:bg-[#128C7E] text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                                >
                                  <svg
                                    className="w-4 h-4"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                  >
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                  </svg>
                                  <span>WhatsApp</span>
                                </a>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {outgoingRequests.length > 0 && (
                <div className="max-w-4xl mx-auto">
                  <div className="glass-strong rounded-3xl p-6 border border-white/10 shadow-2xl">
                    <div className="text-center mb-6">
                      <h3 className="text-xl font-bold text-white text-readable">
                        Your Sent Requests ({outgoingRequests.length})
                      </h3>
                      <p className="text-gray-400 text-sm">
                        Track your pending ride requests
                      </p>
                    </div>
                    <div className="grid gap-4">
                      {outgoingRequests.map((request) => (
                        <div
                          key={request._id}
                          className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-black/30 border border-white/10 rounded-lg gap-4"
                        >
                          <div className="flex items-center gap-4 min-w-0 flex-1">
                            <div className="w-12 h-12 bg-sawaari-yellow-muted border border-sawaari-yellow-border rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-sawaari-yellow font-semibold">
                                {(
                                  request.receiverName ||
                                  `User ${request.receiverId?.slice(-4)}`
                                )
                                  ?.charAt(0)
                                  ?.toUpperCase() || "U"}
                              </span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="font-semibold text-white text-readable truncate">
                                {request.receiverName ||
                                  `User ${request.receiverId?.slice(-4)}`}
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
                          <div className="flex-shrink-0">
                            <span className="px-3 py-2 bg-gray-600 text-gray-300 rounded-lg text-sm font-medium">
                              Pending
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {!requestsLoading &&
                !connectionsLoading &&
                incomingRequests.length === 0 &&
                outgoingRequests.length === 0 &&
                activeConnections.length === 0 && (
                  <div className="max-w-4xl mx-auto">
                    <div className="glass-strong rounded-3xl p-8 text-center text-gray-400">
                      <div className="text-4xl mb-4">📬</div>
                      <p className="text-readable">
                        No connections or requests at the moment
                      </p>
                      <p className="text-sm mt-2">
                        Start a new search to find travel buddies!
                      </p>
                    </div>
                  </div>
                )}
            </div>
          )}
        </div>
      </div>

      {activeChatId && chatPartner && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-black/70 border border-white/10 rounded-xl p-6 w-full max-w-2xl">
            <LiveChat
              chatId={activeChatId}
              partner={chatPartner}
              onClose={closeChat}
            />
          </div>
        </div>
      )}

      {showHowItWorks && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-black/70 border border-white/10 rounded-xl p-6 w-full max-w-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white text-readable">
                How Travel Buddy Works
              </h2>
              <button
                onClick={() => setShowHowItWorks(false)}
                className="text-gray-400 hover:text-white"
              >
                <svg
                  className="w-6 h-6"
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
            <div className="space-y-4 text-gray-300 text-sm">
              <p>
                Travel Buddy helps you find and connect with people traveling on
                similar routes to share rides and reduce costs.
              </p>
              <ul className="list-disc list-inside space-y-2">
                <li>
                  <strong>Search:</strong> Enter your source and destination to
                  find potential matches within a selected radius.
                </li>
                <li>
                  <strong>Match:</strong> View potential travel buddies with
                  similar routes and send connection requests.
                </li>
                <li>
                  <strong>Connect:</strong> Accept incoming requests to start
                  chatting and coordinate your ride.
                </li>
                <li>
                  <strong>Chat:</strong> Communicate with your matched buddy for
                  up to 10 minutes to plan your trip.
                </li>
                <li>
                  <strong>Share:</strong> Share the ride and split the fare for
                  a more affordable journey.
                </li>
              </ul>
              <p>
                <strong>Note:</strong> Searches expire after 5 minutes, and chat
                sessions last for 10 minutes. Connections remain active for 15
                minutes total.
              </p>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowHowItWorks(false)}
                className="px-4 py-2 bg-sawaari-yellow text-black rounded-lg hover:bg-sawaari-yellow/80 transition-colors"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RideBuddy;
