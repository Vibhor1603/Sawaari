// Enhanced Authentication Service with Smart API Management - Functional Approach

// Configuration
const config = {
  baseURL: import.meta.env.VITE_API_BASE_URL,
  tokenKey: import.meta.env.VITE_TOKEN_STORAGE_KEY || "sawaari_auth_token",
  refreshTokenKey:
    import.meta.env.VITE_REFRESH_TOKEN_KEY || "sawaari_refresh_token",
  timeout: parseInt(import.meta.env.VITE_API_TIMEOUT) || 10000,
  minApiInterval: 50, // Minimum 50ms between API calls
};

// Internal state
let refreshPromise = null;
let lastApiCall = 0;
const cache = new Map();
const pendingRequests = new Map();

console.log(
  "🚀 AUTH SERVICE INITIALIZED - Real API calls with smart management"
);

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

// Secure token storage using sessionStorage
const setTokens = (accessToken, refreshToken = null) => {
  if (accessToken) {
    sessionStorage.setItem(config.tokenKey, accessToken);
  }
  if (refreshToken) {
    sessionStorage.setItem(config.refreshTokenKey, refreshToken);
  }
};

const getAccessToken = () => {
  return sessionStorage.getItem(config.tokenKey);
};

const getRefreshToken = () => {
  return sessionStorage.getItem(config.refreshTokenKey);
};

const clearTokens = () => {
  sessionStorage.removeItem(config.tokenKey);
  sessionStorage.removeItem(config.refreshTokenKey);
  localStorage.removeItem("token"); // Clear old token if exists
};

// Token refresh with singleton pattern
const performTokenRefresh = async () => {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return false;
  }

  try {
    const response = await fetch(`${config.baseURL}/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.accessToken) {
        setTokens(data.accessToken, data.refreshToken);
        return true;
      }
    }

    // Refresh failed, clear tokens
    clearTokens();
    return false;
  } catch (error) {
    console.error("Token refresh failed:", error);
    clearTokens();
    return false;
  }
};

const refreshAccessToken = async () => {
  // If refresh is already in progress, wait for it
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = performTokenRefresh();

  try {
    const result = await refreshPromise;
    return result;
  } finally {
    refreshPromise = null;
  }
};

// Enhanced API request with automatic token refresh and deduplication
const apiRequest = async (endpoint, options = {}) => {
  const requestKey = `${options.method || "GET"}-${endpoint}-${JSON.stringify(
    options.body || {}
  )}`;

  // Prevent duplicate simultaneous requests
  if (pendingRequests.has(requestKey)) {
    return pendingRequests.get(requestKey);
  }

  const requestPromise = rateLimitedCall(async () => {
    const url = `${config.baseURL}${endpoint}`;
    const token = getAccessToken();

    const requestConfig = {
      timeout: config.timeout,
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.timeout);

      const response = await fetch(url, {
        ...requestConfig,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle token expiration
      if (response.status === 401 && token) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          // Retry with new token
          const newToken = getAccessToken();
          const retryResponse = await fetch(url, {
            ...requestConfig,
            headers: {
              ...requestConfig.headers,
              Authorization: `Bearer ${newToken}`,
            },
            signal: controller.signal,
          });
          return retryResponse;
        } else {
          throw new Error("Authentication failed");
        }
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response;
    } catch (error) {
      if (error.name === "AbortError") {
        throw new Error("Request timeout");
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

// Simple login function
const login = async (credentials) => {
  try {
    const response = await fetch(`${config.baseURL}/signin`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(credentials),
    });

    const data = await response.json();

    if (data.success && data.data?.accessToken) {
      setTokens(data.data.accessToken, data.data.refreshToken);
      return {
        success: true,
        user: data.data.user,
        message: data.message || "Login successful",
      };
    } else {
      return {
        success: false,
        error: data.message || "Login failed",
      };
    }
  } catch (error) {
    console.error("Login error:", error);
    return {
      success: false,
      error: "Network error. Please check your connection.",
    };
  }
};

// Enhanced registration
const register = async (userData) => {
  try {
    const response = await apiRequest("/signup", {
      method: "POST",
      body: JSON.stringify(userData),
    });

    const data = await response.json();

    return {
      success: data.success || false,
      message:
        data.message ||
        (data.success ? "Registration successful" : "Registration failed"),
      user: data.user,
    };
  } catch (error) {
    console.error("Registration error:", error);
    return {
      success: false,
      error: "Network error. Please check your connection.",
    };
  }
};

// Enhanced logout
const logout = async () => {
  try {
    const token = getAccessToken();
    if (token) {
      await apiRequest("/logout", {
        method: "POST",
      });
    }
  } catch (error) {
    console.error("Logout error:", error);
  } finally {
    clearTokens();
  }
};

// Check if user is authenticated
const isAuthenticated = () => {
  const token = getAccessToken();
  if (!token) return false;

  try {
    // Basic JWT structure check
    const parts = token.split(".");
    if (parts.length !== 3) return false;

    // Decode payload to check expiration and format
    const payload = JSON.parse(atob(parts[1]));
    const now = Math.floor(Date.now() / 1000);

    // Check if token is in old format (missing type, iss, aud)
    if (!payload.type || !payload.iss || !payload.aud) {
      console.log("🔄 Old format token detected, clearing...");
      clearTokens();
      return false;
    }

    // Check if token is expired (with 5 minute buffer)
    return payload.exp > now + 300;
  } catch (error) {
    return false;
  }
};

// Check if token is close to expiring (for proactive refresh)
const isTokenExpiringSoon = () => {
  const token = getAccessToken();
  if (!token) return true;

  try {
    const parts = token.split(".");
    if (parts.length !== 3) return true;

    const payload = JSON.parse(atob(parts[1]));
    const now = Math.floor(Date.now() / 1000);

    // Consider token expiring soon if less than 1 hour remaining
    return payload.exp <= now + 3600;
  } catch (error) {
    return true;
  }
};

// Get current user info from token
const getCurrentUser = () => {
  const token = getAccessToken();
  if (!token) return null;

  try {
    const parts = token.split(".");
    const payload = JSON.parse(atob(parts[1]));

    return {
      email: payload.email,
      userId: payload.userId,
      name: payload.name,
      phone: payload.phone,
      exp: payload.exp,
    };
  } catch (error) {
    return null;
  }
};

// Set current user info (for profile updates)
const setCurrentUser = (userData) => {
  const userKey = `${config.tokenKey}_user`;
  sessionStorage.setItem(userKey, JSON.stringify(userData));
};

// Enhanced getCurrentUser that checks both token and stored user data
const getCurrentUserEnhanced = () => {
  const tokenUser = getCurrentUser();
  const userKey = `${config.tokenKey}_user`;
  const storedUser = sessionStorage.getItem(userKey);

  if (storedUser) {
    try {
      const parsedStoredUser = JSON.parse(storedUser);
      // Merge token data with stored updates
      return { ...tokenUser, ...parsedStoredUser };
    } catch (error) {
      console.error("Error parsing stored user data:", error);
    }
  }

  return tokenUser;
};

// API methods for different endpoints with caching
const getHotspots = async () => {
  const cacheKey = "hotspots";
  const cached = cache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < 600000) {
    // 10 minutes cache
    return { success: true, data: cached.data, cached: true };
  }

  try {
    const response = await apiRequest("/hotspots");
    const data = await response.json();

    // Cache the result
    cache.set(cacheKey, {
      data: data,
      timestamp: Date.now(),
    });

    return { success: true, data: data };
  } catch (error) {
    console.error("Failed to get hotspots:", error);
    return { success: false, error: error.message };
  }
};

const submitFeedback = async (feedbackData) => {
  try {
    const response = await apiRequest("/feedbacks", {
      method: "POST",
      body: JSON.stringify(feedbackData),
    });
    const data = await response.json();
    return {
      success: true,
      message: data.message || "Feedback submitted successfully",
    };
  } catch (error) {
    console.error("Failed to submit feedback:", error);
    return { success: false, error: error.message };
  }
};

const submitRideBuddy = async (rideData) => {
  try {
    const response = await apiRequest("/ridebuddy", {
      method: "POST",
      body: JSON.stringify(rideData),
    });
    const data = await response.json();
    return {
      success: true,
      data: data,
      message: data.message || "Ride buddy request submitted successfully",
    };
  } catch (error) {
    console.error("Failed to submit ride buddy request:", error);
    return { success: false, error: error.message };
  }
};

const findMatches = async () => {
  try {
    const response = await apiRequest("/findmatch");
    const data = await response.json();
    return {
      success: true,
      data: data,
      message: "Matches found successfully",
    };
  } catch (error) {
    console.error("Failed to find matches:", error);
    return { success: false, error: error.message };
  }
};

// Change password for authenticated users
const changePassword = async (currentPassword, newPassword) => {
  try {
    const response = await apiRequest("/api/user/change-password", {
      method: "POST",
      body: JSON.stringify({
        currentPassword,
        newPassword,
      }),
    });

    const data = await response.json();

    if (response.ok && data.success) {
      return {
        success: true,
        message: data.message || "Password changed successfully",
      };
    } else {
      throw new Error(data.message || "Failed to change password");
    }
  } catch (error) {
    console.error("Password change error:", error);
    return {
      success: false,
      error: error.message || "Failed to change password",
    };
  }
};

// Export all functions as a single object
const authService = {
  // Core authentication
  login,
  register,
  logout,
  isAuthenticated,
  isTokenExpiringSoon,

  // Token management
  setTokens,
  getAccessToken,
  getRefreshToken,
  clearTokens,
  refreshAccessToken,

  // User management
  getCurrentUser,
  getCurrentUserEnhanced,
  setCurrentUser,

  // API requests
  apiRequest,

  // Specific API methods
  getHotspots,
  submitFeedback,
  submitRideBuddy,
  findMatches,
  changePassword,
};

export default authService;
