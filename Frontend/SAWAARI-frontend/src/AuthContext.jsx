/* eslint-disable no-unused-vars */
/* eslint-disable react/prop-types */
import { createContext, useState, useEffect, useCallback } from "react";
import authService from "./services/authService";

export const AuthContext = createContext("");

function Authstate(props) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hotspot, setHotspots] = useState([]);
  const [error, setError] = useState(null);

  // Initialize authentication state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setIsLoading(true);

        // Check if user is authenticated
        if (authService.isAuthenticated()) {
          const currentUser = authService.getCurrentUserEnhanced();
          const currentToken = authService.getAccessToken();

          setUser(currentUser);
          setToken(currentToken);
          setIsAuthenticated(true);
        } else {
          // Try to refresh token if available
          const refreshed = await authService.refreshAccessToken();
          if (refreshed) {
            const currentUser = authService.getCurrentUserEnhanced();
            const currentToken = authService.getAccessToken();

            setUser(currentUser);
            setToken(currentToken);
            setIsAuthenticated(true);
          } else {
            // Clear any stale authentication state
            setUser(null);
            setToken(null);
            setIsAuthenticated(false);
          }
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
        setError("Failed to initialize authentication");
        // Clear authentication state on error
        setUser(null);
        setToken(null);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // DISABLED: Periodic token check (was causing infinite API calls)
  // TODO: Implement proper token refresh logic without infinite loops
  /*
  useEffect(() => {
    // Token check disabled to prevent infinite API calls
  }, []);
  */

  // Fetch hotspots data
  useEffect(() => {
    const fetchHotspots = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/hotspots`
        );
        const data = await response.json();

        // Ensure we always set an array
        if (Array.isArray(data)) {
          setHotspots(data);
        } else if (data && Array.isArray(data.data)) {
          setHotspots(data.data);
        } else {
          console.error("Hotspot data is not an array:", data);
          setHotspots([]); // Set empty array as fallback
          setError("Invalid hotspot data format");
        }
      } catch (error) {
        console.error("Error fetching hotspots:", error);
        setHotspots([]); // Set empty array as fallback
        setError("Failed to fetch hotspots data");
      }
    };

    fetchHotspots();
  }, []);

  // Enhanced login function
  const login = useCallback(async (credentials) => {
    console.log("🔐 AuthContext: Starting login process");
    try {
      setIsLoading(true);
      setError(null);

      console.log("🔐 AuthContext: Calling authService.login");
      const result = await authService.login(credentials);
      console.log("🔐 AuthContext: Login result:", result);

      if (result.success) {
        console.log("✅ AuthContext: Login successful, updating state");
        const currentUser = authService.getCurrentUserEnhanced();
        const currentToken = authService.getAccessToken();

        console.log("👤 Current user:", currentUser);
        console.log(
          "🔑 Current token:",
          currentToken ? "Token exists" : "No token"
        );

        setUser(currentUser);
        setToken(currentToken);
        setIsAuthenticated(true);

        return { success: true, message: result.message };
      } else {
        console.log("❌ AuthContext: Login failed:", result.error);
        setError(result.error);
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error("🚨 AuthContext: Login error:", error);
      const errorMessage = "Login failed. Please try again.";
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Enhanced registration function
  const register = useCallback(async (userData) => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await authService.register(userData);

      if (result.success) {
        return { success: true, message: result.message };
      } else {
        setError(result.error);
        return { success: false, error: result.error };
      }
    } catch (error) {
      const errorMessage = "Registration failed. Please try again.";
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Enhanced logout function
  const logout = useCallback(async () => {
    try {
      setIsLoading(true);
      await authService.logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setUser(null);
      setToken(null);
      setIsAuthenticated(false);
      setError(null);
      setIsLoading(false);
    }
  }, []);

  // Legacy function for backward compatibility
  const saveToken = useCallback((newToken) => {
    setToken(newToken);
    authService.setTokens(newToken);

    // Update user info from token
    const currentUser = authService.getCurrentUserEnhanced();
    setUser(currentUser);
    setIsAuthenticated(true);
  }, []);

  // Legacy function for backward compatibility
  const deleteToken = useCallback(() => {
    logout();
  }, [logout]);

  // Refresh token function
  const refreshToken = useCallback(async () => {
    try {
      const refreshed = await authService.refreshAccessToken();
      if (refreshed) {
        const currentUser = authService.getCurrentUserEnhanced();
        const currentToken = authService.getAccessToken();

        setUser(currentUser);
        setToken(currentToken);
        setIsAuthenticated(true);
        return true;
      } else {
        logout();
        return false;
      }
    } catch (error) {
      console.error("Token refresh error:", error);
      logout();
      return false;
    }
  }, [logout]);

  // Clear error function
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Update user information
  const updateUser = useCallback((updatedUserData) => {
    const currentUser = authService.getCurrentUserEnhanced();
    const newUserData = {
      ...currentUser,
      ...updatedUserData,
    };

    setUser(newUserData);

    // Also update in authService storage
    authService.setCurrentUser(newUserData);
  }, []);

  // Enhanced API request wrapper
  const apiRequest = useCallback(
    async (endpoint, options = {}) => {
      try {
        return await authService.apiRequest(endpoint, options);
      } catch (error) {
        if (error.message === "Authentication failed") {
          logout();
        }
        throw error;
      }
    },
    [logout]
  );

  const contextValue = {
    // Authentication state
    user,
    token,
    isAuthenticated,
    isLoading,
    error,

    // Data
    hotspot,

    // Authentication functions
    login,
    register,
    logout,
    refreshToken,
    clearError,
    updateUser,

    // Legacy functions (for backward compatibility)
    saveToken,
    deleteToken,

    // API functions
    apiRequest,
    authService,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {props.children}
    </AuthContext.Provider>
  );
}

export default Authstate;
