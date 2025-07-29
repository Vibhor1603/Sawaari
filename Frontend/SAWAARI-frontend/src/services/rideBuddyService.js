import authService from "./authService";

// RideBuddy Service - Functional approach for API communication
// Handles search, request management, and chat operations for ride buddy feature

// Configuration
const config = {
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000",
  timeout: parseInt(import.meta.env.VITE_API_TIMEOUT) || 10000,
  retryAttempts: 3,
  retryDelay: 1000, // 1 second
  minApiInterval: 100, // Minimum 100ms between API calls
};

// Internal state
let lastApiCall = 0;
let cache = new Map();
let pendingRequests = new Map();

// Rate limiting wrapper
const rateLimitedCall = async (apiCall) => {
  const now = Date.now();
  const timeSinceLastCall = now - lastApiCall;

  if (timeSinceLastCall < config.minApiInterval) {
    await new Promise((resolve) =>
      setTimeout(resolve, config.minApiInterval - timeSinceLastCall)
    );
  }

  lastApiCall = Date.now();
  return apiCall();
};

// Generic API request with retry logic and error handling
const apiRequest = async (endpoint, options = {}, retryCount = 0) => {
  const requestKey = `${options.method || "GET"}-${endpoint}-${JSON.stringify(
    options.body || {}
  )}`;

  // Prevent duplicate simultaneous requests
  if (pendingRequests.has(requestKey)) {
    return pendingRequests.get(requestKey);
  }

  const requestPromise = rateLimitedCall(async () => {
    try {
      const response = await authService.apiRequest(endpoint, options);
      const data = await response.json();
      return data;
    } catch (error) {
      // Retry logic for network failures
      if (retryCount < config.retryAttempts && isRetryableError(error)) {
        console.warn(
          `Retrying request to ${endpoint}, attempt ${retryCount + 1}`
        );
        await new Promise((resolve) =>
          setTimeout(resolve, config.retryDelay * (retryCount + 1))
        );
        return apiRequest(endpoint, options, retryCount + 1);
      }
      throw error;
    }
  });

  // Store pending request
  pendingRequests.set(requestKey, requestPromise);

  try {
    const result = await requestPromise;
    return result;
  } finally {
    // Clean up pending request
    pendingRequests.delete(requestKey);
  }
};

// Check if error is retryable
const isRetryableError = (error) => {
  return (
    error.message.includes("timeout") ||
    error.message.includes("network") ||
    error.message.includes("fetch")
  );
};

// Cache management
const getCachedData = (key, maxAge = 300000) => {
  // 5 minutes default
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < maxAge) {
    return cached.data;
  }
  return null;
};

const setCachedData = (key, data) => {
  cache.set(key, {
    data,
    timestamp: Date.now(),
  });
};

// Search for ride buddies
const searchRideBuddies = async (searchData) => {
  try {
    const { source, destination, searchRadius = 5 } = searchData;

    if (!source || !destination) {
      throw new Error("Source and destination are required");
    }

    const response = await apiRequest("/api/ride-buddy/search", {
      method: "POST",
      body: JSON.stringify({
        source,
        destination,
        preferences: {
          searchRadius,
        },
      }),
    });

    if (response.success) {
      return {
        success: true,
        data: response.data,
        message: response.message || "Search completed successfully",
      };
    } else {
      throw new Error(response.message || "Search failed");
    }
  } catch (error) {
    console.error("Failed to search ride buddies:", error);
    return {
      success: false,
      error: error.message || "Network error during search",
    };
  }
};

// Get user's active matches
const getMatches = async () => {
  try {
    const cacheKey = "user_matches";
    const cached = getCachedData(cacheKey, 10000); // 10 seconds cache for real-time updates

    if (cached) {
      return { success: true, data: cached, cached: true };
    }

    const response = await apiRequest("/api/ride-buddy/matches");

    if (response.success) {
      setCachedData(cacheKey, response.data);
      return {
        success: true,
        data: response.data,
        message: response.message || "Matches retrieved successfully",
      };
    } else {
      throw new Error(response.message || "Failed to get matches");
    }
  } catch (error) {
    console.error("Failed to get matches:", error);
    return {
      success: false,
      error: error.message || "Network error while getting matches",
    };
  }
};

// Send connection request to another user
const sendConnectionRequest = async (requestData) => {
  try {
    const { receiverId, routeDetails, message } = requestData;

    if (!receiverId) {
      throw new Error("Receiver ID is required");
    }

    const response = await apiRequest("/api/ride-buddy/request", {
      method: "POST",
      body: JSON.stringify({
        receiverId,
        routeDetails,
        message,
      }),
    });

    if (response.success) {
      // Clear matches cache to reflect updated state
      cache.delete("user_matches");
      cache.delete("user_requests");

      return {
        success: true,
        data: response.data,
        message: response.message || "Connection request sent successfully",
      };
    } else {
      throw new Error(response.message || "Failed to send request");
    }
  } catch (error) {
    console.error("Failed to send connection request:", error);
    return {
      success: false,
      error: error.message || "Network error while sending request",
    };
  }
};

// Handle connection request (accept/decline)
const handleConnectionRequest = async (
  requestId,
  action,
  responseMessage = ""
) => {
  try {
    if (!requestId || !["accept", "decline"].includes(action)) {
      throw new Error(
        "Valid request ID and action (accept/decline) are required"
      );
    }

    console.log("🔧 Sending request response:", {
      requestId,
      action,
      responseMessage,
    });

    const response = await apiRequest(`/api/ride-buddy/request/${requestId}`, {
      method: "PUT",
      body: JSON.stringify({
        action,
        message: responseMessage,
      }),
    });

    if (response.success) {
      // Clear relevant caches
      cache.delete("user_requests");
      cache.delete("user_matches");
      if (action === "accept") {
        cache.delete("user_chats");
      }

      return {
        success: true,
        data: response.data,
        message: response.message || `Request ${action}ed successfully`,
      };
    } else {
      throw new Error(response.message || `Failed to ${action} request`);
    }
  } catch (error) {
    console.error(`Failed to ${action} connection request:`, error);
    return {
      success: false,
      error: error.message || `Network error while ${action}ing request`,
    };
  }
};

// Get user's pending requests (sent and received)
const getRequests = async () => {
  try {
    const cacheKey = "user_requests";
    const cached = getCachedData(cacheKey, 5000); // 5 seconds cache for real-time updates

    if (cached) {
      return { success: true, data: cached, cached: true };
    }

    const response = await apiRequest("/api/ride-buddy/requests");

    if (response.success) {
      setCachedData(cacheKey, response.data);
      return {
        success: true,
        data: response.data,
        message: response.message || "Requests retrieved successfully",
      };
    } else {
      throw new Error(response.message || "Failed to get requests");
    }
  } catch (error) {
    console.error("Failed to get requests:", error);
    return {
      success: false,
      error: error.message || "Network error while getting requests",
    };
  }
};

// Get user's active chats (alias for getActiveChats)
const getActiveChats = async () => {
  return getChats();
};

// Get user's active chats
const getChats = async () => {
  try {
    const cacheKey = "user_chats";
    const cached = getCachedData(cacheKey, 60000); // 1 minute cache

    if (cached) {
      return { success: true, data: cached, cached: true };
    }

    const response = await apiRequest("/api/ride-buddy/chats");

    if (response.success) {
      setCachedData(cacheKey, response.data);
      return {
        success: true,
        data: response.data,
        message: response.message || "Chats retrieved successfully",
      };
    } else {
      throw new Error(response.message || "Failed to get chats");
    }
  } catch (error) {
    console.error("Failed to get chats:", error);
    return {
      success: false,
      error: error.message || "Network error while getting chats",
    };
  }
};

// End a match/chat
const endMatch = async (matchId, reason = "") => {
  try {
    if (!matchId) {
      throw new Error("Match ID is required");
    }

    const response = await apiRequest(`/api/ride-buddy/match/${matchId}`, {
      method: "DELETE",
      body: JSON.stringify({ reason }),
    });

    if (response.success) {
      // Clear relevant caches
      cache.delete("user_matches");
      cache.delete("user_chats");

      return {
        success: true,
        data: response.data,
        message: response.message || "Match ended successfully",
      };
    } else {
      throw new Error(response.message || "Failed to end match");
    }
  } catch (error) {
    console.error("Failed to end match:", error);
    return {
      success: false,
      error: error.message || "Network error while ending match",
    };
  }
};

// Cancel user's active search
const cancelSearch = async (searchId) => {
  try {
    if (!searchId) {
      throw new Error("Search ID is required");
    }

    const response = await apiRequest(`/api/ride-buddy/search/${searchId}`, {
      method: "DELETE",
    });

    if (response.success) {
      // Clear search-related caches
      cache.delete("user_matches");

      return {
        success: true,
        data: response.data,
        message: response.message || "Search cancelled successfully",
      };
    } else {
      throw new Error(response.message || "Failed to cancel search");
    }
  } catch (error) {
    console.error("Failed to cancel search:", error);
    return {
      success: false,
      error: error.message || "Network error while cancelling search",
    };
  }
};

// Get user's search history
const getSearchHistory = async (limit = 10) => {
  try {
    const response = await apiRequest(
      `/api/ride-buddy/search-history?limit=${limit}`
    );

    if (response.success) {
      return {
        success: true,
        data: response.data,
        message: response.message || "Search history retrieved successfully",
      };
    } else {
      throw new Error(response.message || "Failed to get search history");
    }
  } catch (error) {
    console.error("Failed to get search history:", error);
    return {
      success: false,
      error: error.message || "Network error while getting search history",
    };
  }
};

// Block a user
const blockUser = async (userId, reason = "") => {
  try {
    if (!userId) {
      throw new Error("User ID is required");
    }

    const response = await apiRequest("/api/ride-buddy/block-user", {
      method: "POST",
      body: JSON.stringify({ userId, reason }),
    });

    if (response.success) {
      // Clear relevant caches
      cache.delete("user_matches");
      cache.delete("user_chats");
      cache.delete("user_requests");

      return {
        success: true,
        data: response.data,
        message: response.message || "User blocked successfully",
      };
    } else {
      throw new Error(response.message || "Failed to block user");
    }
  } catch (error) {
    console.error("Failed to block user:", error);
    return {
      success: false,
      error: error.message || "Network error while blocking user",
    };
  }
};

// Report a user
const reportUser = async (userId, reason, description = "") => {
  try {
    if (!userId || !reason) {
      throw new Error("User ID and reason are required");
    }

    const response = await apiRequest("/api/ride-buddy/report-user", {
      method: "POST",
      body: JSON.stringify({ userId, reason, description }),
    });

    if (response.success) {
      return {
        success: true,
        data: response.data,
        message: response.message || "User reported successfully",
      };
    } else {
      throw new Error(response.message || "Failed to report user");
    }
  } catch (error) {
    console.error("Failed to report user:", error);
    return {
      success: false,
      error: error.message || "Network error while reporting user",
    };
  }
};

// Clear all caches
const clearCache = () => {
  cache.clear();
  console.log("RideBuddy service cache cleared");
};

// Get cache status
const getCacheStatus = () => {
  return {
    size: cache.size,
    keys: Array.from(cache.keys()),
  };
};

// Check if user is authenticated (helper function)
const checkAuthentication = () => {
  if (!authService.isAuthenticated()) {
    throw new Error("User must be authenticated to use ride buddy features");
  }
};

// Validate search data
const validateSearchData = (searchData) => {
  const { source, destination } = searchData;

  if (!source || typeof source !== "object" || !source.name) {
    throw new Error("Valid source location is required");
  }

  if (!destination || typeof destination !== "object" || !destination.name) {
    throw new Error("Valid destination location is required");
  }

  if (source.name === destination.name) {
    throw new Error("Source and destination cannot be the same");
  }
};

// Export all functions
const rideBuddyService = {
  // Core functionality
  searchRideBuddies,
  getMatches,
  sendConnectionRequest,
  handleConnectionRequest,
  getRequests,
  getChats,
  getActiveChats,
  endMatch,
  cancelSearch,
  getSearchHistory,

  // Safety features
  blockUser,
  reportUser,

  // Utility functions
  clearCache,
  getCacheStatus,
  checkAuthentication,
  validateSearchData,

  // Chat functionality
  getChatHistory: async (chatId) => {
    try {
      if (!chatId) {
        throw new Error("Chat ID is required");
      }

      const response = await apiRequest(
        `/api/ride-buddy/chat/${chatId}/messages`
      );

      if (response.success) {
        return {
          success: true,
          data: response.data,
          message: response.message || "Chat history retrieved successfully",
        };
      } else {
        throw new Error(response.message || "Failed to get chat history");
      }
    } catch (error) {
      console.error("Failed to get chat history:", error);
      return {
        success: false,
        error: error.message || "Network error while getting chat history",
      };
    }
  },

  sendChatMessage: async (messageData) => {
    try {
      const { chatId, message, messageType = "text" } = messageData;

      if (!chatId || !message) {
        throw new Error("Chat ID and message are required");
      }

      const response = await apiRequest(
        `/api/ride-buddy/chat/${chatId}/message`,
        {
          method: "POST",
          body: JSON.stringify({
            message,
            messageType,
          }),
        }
      );

      if (response.success) {
        return {
          success: true,
          data: response.data,
          message: response.message || "Message sent successfully",
        };
      } else {
        throw new Error(response.message || "Failed to send message");
      }
    } catch (error) {
      console.error("Failed to send chat message:", error);
      return {
        success: false,
        error: error.message || "Network error while sending message",
      };
    }
  },

  // Helper functions for components
  acceptRequest: (requestId, message) =>
    handleConnectionRequest(requestId, "accept", message),
  declineRequest: (requestId, message) =>
    handleConnectionRequest(requestId, "decline", message),
};

export default rideBuddyService;
