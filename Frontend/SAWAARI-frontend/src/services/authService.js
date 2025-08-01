// Enhanced Authentication Service with Smart API Management
class AuthService {
  constructor() {
    this.baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
    this.tokenKey =
      import.meta.env.VITE_TOKEN_STORAGE_KEY || "sawaari_auth_token";
    this.refreshTokenKey =
      import.meta.env.VITE_REFRESH_TOKEN_KEY || "sawaari_refresh_token";
    this.timeout = parseInt(import.meta.env.VITE_API_TIMEOUT) || 10000;

    // Token refresh promise to prevent multiple simultaneous refresh attempts
    this.refreshPromise = null;

    // Rate limiting and caching
    this.lastApiCall = 0;
    this.minApiInterval = 50; // Minimum 50ms between API calls
    this.cache = new Map();
    this.pendingRequests = new Map(); // Prevent duplicate simultaneous requests

    console.log(
      "🚀 AUTH SERVICE INITIALIZED - Real API calls with smart management"
    );
  }

  // Rate limiting wrapper
  async _rateLimitedCall(apiCall) {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastApiCall;

    if (timeSinceLastCall < this.minApiInterval) {
      await new Promise((resolve) =>
        setTimeout(resolve, this.minApiInterval - timeSinceLastCall)
      );
    }

    this.lastApiCall = Date.now();
    return apiCall();
  }

  // Secure token storage using sessionStorage instead of localStorage
  setTokens(accessToken, refreshToken = null) {
    if (accessToken) {
      sessionStorage.setItem(this.tokenKey, accessToken);
    }
    if (refreshToken) {
      sessionStorage.setItem(this.refreshTokenKey, refreshToken);
    }
  }

  getAccessToken() {
    return sessionStorage.getItem(this.tokenKey);
  }

  getRefreshToken() {
    return sessionStorage.getItem(this.refreshTokenKey);
  }

  clearTokens() {
    sessionStorage.removeItem(this.tokenKey);
    sessionStorage.removeItem(this.refreshTokenKey);
    localStorage.removeItem("token"); // Clear old token if exists
  }

  // Enhanced API request with automatic token refresh and deduplication
  async apiRequest(endpoint, options = {}) {
    const requestKey = `${options.method || "GET"}-${endpoint}-${JSON.stringify(
      options.body || {}
    )}`;

    // Prevent duplicate simultaneous requests
    if (this.pendingRequests.has(requestKey)) {
      return this.pendingRequests.get(requestKey);
    }

    const requestPromise = this._rateLimitedCall(async () => {
      const url = `${this.baseURL}${endpoint}`;
      const token = this.getAccessToken();

      const config = {
        timeout: this.timeout,
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
          ...options.headers,
        },
        ...options,
      };

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(url, {
          ...config,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Handle token expiration
        if (response.status === 401 && token) {
          const refreshed = await this.refreshAccessToken();
          if (refreshed) {
            // Retry with new token
            const newToken = this.getAccessToken();
            const retryResponse = await fetch(url, {
              ...config,
              headers: {
                ...config.headers,
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
    this.pendingRequests.set(requestKey, requestPromise);

    try {
      const result = await requestPromise;
      return result;
    } finally {
      // Clean up pending request
      this.pendingRequests.delete(requestKey);
    }
  }

  // Refresh access token with singleton pattern
  async refreshAccessToken() {
    // If refresh is already in progress, wait for it
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this._performTokenRefresh();

    try {
      const result = await this.refreshPromise;
      return result;
    } finally {
      this.refreshPromise = null;
    }
  }

  async _performTokenRefresh() {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return false;
    }

    try {
      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.accessToken) {
          this.setTokens(data.accessToken, data.refreshToken);
          return true;
        }
      }

      // Refresh failed, clear tokens
      this.clearTokens();
      return false;
    } catch (error) {
      console.error("Token refresh failed:", error);
      this.clearTokens();
      return false;
    }
  }

  // Simple login function
  async login(credentials) {
    try {
      const response = await fetch(`${this.baseURL}/signin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (data.success && data.data?.accessToken) {
        this.setTokens(data.data.accessToken, data.data.refreshToken);
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
  }

  // Enhanced registration
  async register(userData) {
    try {
      const response = await this.apiRequest("/signup", {
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
  }

  // Enhanced logout
  async logout() {
    try {
      const token = this.getAccessToken();
      if (token) {
        await this.apiRequest("/logout", {
          method: "POST",
        });
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      this.clearTokens();
    }
  }

  // Check if user is authenticated
  isAuthenticated() {
    const token = this.getAccessToken();
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
        this.clearTokens();
        return false;
      }

      // Check if token is expired (with 5 minute buffer)
      return payload.exp > now + 300;
    } catch (error) {
      return false;
    }
  }

  // Check if token is close to expiring (for proactive refresh)
  isTokenExpiringSoon() {
    const token = this.getAccessToken();
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
  }

  // Get current user info from token
  getCurrentUser() {
    const token = this.getAccessToken();
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
  }

  // Set current user info (for profile updates)
  setCurrentUser(userData) {
    // Note: This is a temporary storage solution
    // In a real app, you'd want to update the JWT token or use a separate user storage
    const userKey = `${this.tokenKey}_user`;
    sessionStorage.setItem(userKey, JSON.stringify(userData));
  }

  // Enhanced getCurrentUser that checks both token and stored user data
  getCurrentUserEnhanced() {
    const tokenUser = this.getCurrentUser();
    const userKey = `${this.tokenKey}_user`;
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
  }

  // API methods for different endpoints with caching
  async getHotspots() {
    const cacheKey = "hotspots";
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < 600000) {
      // 10 minutes cache
      return { success: true, data: cached.data, cached: true };
    }

    try {
      const response = await this.apiRequest("/hotspots");
      const data = await response.json();

      // Cache the result
      this.cache.set(cacheKey, {
        data: data,
        timestamp: Date.now(),
      });

      return { success: true, data: data };
    } catch (error) {
      console.error("Failed to get hotspots:", error);
      return { success: false, error: error.message };
    }
  }

  async submitFeedback(feedbackData) {
    try {
      const response = await this.apiRequest("/feedbacks", {
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
  }

  async submitRideBuddy(rideData) {
    try {
      const response = await this.apiRequest("/ridebuddy", {
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
  }

  async findMatches() {
    try {
      const response = await this.apiRequest("/findmatch");
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
  }
}

// Create singleton instance
const authService = new AuthService();

export default authService;
