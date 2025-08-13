const express = require("express");
const bcrypt = require("bcryptjs");
const {
  ridebuddy_db,
  rideInfo_db,
  createUser,
  findUserByEmail,
  updateUserLoginInfo,
  getHotspots,
  saveFeedback,
  saveRefreshToken,
  findRefreshToken,
  revokeRefreshToken,
} = require("../Backend/database");
const {
  JWTService,
  generateTokenPair,
  verifyRefreshToken,
} = require("../Backend/jwtToken");
const { routeService } = require("../Backend/routeService");
require("dotenv").config();

// Enhanced home endpoint with API info
const home = async (req, res) => {
  try {
    // Test database connection
    const { dbService } = require("../Backend/database");
    const testCollection = await dbService.getCollection("users");
    const userCount = await testCollection.countDocuments();

    res.status(200).json({
      message: "SAWAARI API is running",
      version: "2.0.0",
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        userCount: userCount,
        dbName: process.env.DB_NAME || "Sawaari",
      },
      endpoints: {
        auth: ["/signin", "/signup", "/refresh-token", "/logout"],
        data: ["/hotspots", "/feedbacks", "/ridebuddy", "/findmatch"],
      },
    });
  } catch (error) {
    res.status(500).json({
      error: "Server error",
      message: "Unable to process request",
      database: { connected: false, error: error.message },
    });
  }
};

// Enhanced hotspots endpoint with caching and error handling
const hotspots = async (req, res) => {
  try {
    const result = await getHotspots();

    // Add cache headers for better performance
    res.set({
      "Cache-Control": "public, max-age=300", // 5 minutes cache
      ETag: `"hotspots-${Date.now()}"`,
    });

    res.status(200).json({
      success: true,
      data: result,
      count: result.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Hotspots fetch error:", error);
    res.status(500).json({
      error: "Database error",
      message: "Unable to fetch hotspots data",
    });
  }
};

// Enhanced feedback endpoint with validation
const feedbacks = async (req, res) => {
  try {
    const result = await saveFeedback(req.body);

    res.status(201).json({
      success: true,
      message: "Feedback submitted successfully",
      data: {
        id: result.insertedId,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Feedback save error:", error);
    res.status(500).json({
      error: "Database error",
      message: "Unable to save feedback",
    });
  }
};

// Enhanced ride buddy endpoint with authentication
const ridebuddy = async (req, res) => {
  try {
    // Add user info from JWT token
    const enrichedData = {
      ...req.body,
      userEmail: req.user?.email,
      userId: req.user?.userId,
    };

    console.log("💾 Saving ride buddy request:", enrichedData);
    const result = await ridebuddy_db(enrichedData);
    console.log("✅ Ride buddy saved:", result);

    res.status(201).json({
      success: true,
      message: "Ride buddy request submitted successfully",
      data: {
        id: result.insertedId,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Ride buddy save error:", error);
    res.status(500).json({
      error: "Database error",
      message: "Unable to save ride buddy request",
    });
  }
};

// Enhanced find match endpoint with filtering
const findmatch = async (req, res) => {
  try {
    // Return all requests - let frontend do the filtering for better matching logic
    const filters = {}; // Remove user filtering to return all requests

    const result = await rideInfo_db(filters);

    res.status(200).json({
      success: true,
      data: result,
      count: result.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Find match error:", error);
    res.status(500).json({
      error: "Database error",
      message: "Unable to fetch matching rides",
    });
  }
};

// Enhanced sign-in with security features
const signIn = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user with enhanced security checks
    const user = await findUserByEmail(email);

    if (!user) {
      // Consistent response time to prevent user enumeration
      await bcrypt.hash(
        "dummy-password",
        parseInt(process.env.BCRYPT_ROUNDS) || 12
      );
      return res.status(401).json({
        error: "Authentication failed",
        message: "Invalid email or password",
      });
    }

    // Check if account is locked (optional feature)
    if (user.loginAttempts >= 5) {
      const lockTime = 15 * 60 * 1000; // 15 minutes
      const timeSinceLastAttempt =
        Date.now() - new Date(user.lastFailedLogin || 0).getTime();

      if (timeSinceLastAttempt < lockTime) {
        return res.status(423).json({
          error: "Account locked",
          message: "Too many failed login attempts. Please try again later.",
          retryAfter: Math.ceil((lockTime - timeSinceLastAttempt) / 1000),
        });
      }
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      // Update failed login attempts
      await updateUserLoginInfo(email, {
        loginAttempts: (user.loginAttempts || 0) + 1,
        lastFailedLogin: new Date(),
      });

      return res.status(401).json({
        error: "Authentication failed",
        message: "Invalid email or password",
      });
    }

    // Generate token pair
    console.log("📞 User data for JWT generation in signIn:", {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      hasPhone: !!user.phone,
      phoneLength: user.phone ? user.phone.length : 0,
    });

    const tokens = generateTokenPair(user);

    // Save refresh token to database
    await saveRefreshToken(user._id.toString(), {
      tokenId: JWTService.decodeToken(tokens.refreshToken).payload.jti,
      token: tokens.refreshToken,
    });

    // Update successful login info
    await updateUserLoginInfo(email, {
      loginAttempts: 0,
      lastFailedLogin: null,
      lastLogin: new Date(),
    });

    // Set secure HTTP-only cookie for refresh token
    res.cookie("refreshToken", tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        accessToken: tokens.accessToken,
        expiresIn: tokens.expiresIn,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
        },
      },
    });
  } catch (error) {
    console.error("Sign-in error:", error);
    res.status(500).json({
      error: "Authentication error",
      message: "Unable to process login request",
    });
  }
};

// Enhanced sign-up with security features
const signUp = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    console.log("📞 SignUp received data:", {
      name: name,
      email: email,
      phone: phone,
      hasPhone: !!phone,
      phoneLength: phone ? phone.length : 0,
    });

    // Check if user already exists
    const existingUser = await findUserByEmail(email);

    if (existingUser) {
      return res.status(409).json({
        error: "User exists",
        message: "An account with this email already exists",
      });
    }

    // Hash password with enhanced security
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user with enhanced data
    const userData = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone ? phone.trim() : null,
      password: hashedPassword,
    };

    console.log("📞 Creating user with data:", {
      name: userData.name,
      email: userData.email,
      phone: userData.phone,
      hasPhone: !!userData.phone,
      phoneLength: userData.phone ? userData.phone.length : 0,
    });

    const result = await createUser(userData);

    res.status(201).json({
      success: true,
      message: "Account created successfully",
      data: {
        id: result.insertedId,
        email: userData.email,
        name: userData.name,
      },
    });
  } catch (error) {
    console.error("Sign-up error:", error);
    res.status(500).json({
      error: "Registration error",
      message: "Unable to create account",
    });
  }
};

// New refresh token endpoint
const refreshToken = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;
    const cookieToken = req.cookies?.refreshToken;

    const refreshTokenToUse = token || cookieToken;

    if (!refreshTokenToUse) {
      return res.status(401).json({
        error: "No refresh token",
        message: "Refresh token is required",
      });
    }

    // Verify refresh token
    const verification = verifyRefreshToken(refreshTokenToUse);

    if (!verification.valid) {
      return res.status(401).json({
        error: "Invalid refresh token",
        message: verification.error,
      });
    }

    // Check if token exists in database
    const tokenData = await findRefreshToken(verification.decoded.jti);

    if (!tokenData) {
      return res.status(401).json({
        error: "Token not found",
        message: "Refresh token has been revoked",
      });
    }

    // Get user data
    const user = await findUserByEmail(verification.decoded.email);

    if (!user) {
      return res.status(401).json({
        error: "User not found",
        message: "Associated user account not found",
      });
    }

    // Generate new token pair
    const tokens = generateTokenPair(user);

    // Revoke old refresh token and save new one
    await revokeRefreshToken(verification.decoded.jti);
    await saveRefreshToken(user._id.toString(), {
      tokenId: JWTService.decodeToken(tokens.refreshToken).payload.jti,
      token: tokens.refreshToken,
    });

    // Update cookie
    res.cookie("refreshToken", tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      success: true,
      message: "Token refreshed successfully",
      data: {
        accessToken: tokens.accessToken,
        expiresIn: tokens.expiresIn,
      },
    });
  } catch (error) {
    console.error("Token refresh error:", error);
    res.status(500).json({
      error: "Token refresh failed",
      message: "Unable to refresh token",
    });
  }
};

// New logout endpoint
const logout = async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (refreshToken) {
      const verification = verifyRefreshToken(refreshToken);
      if (verification.valid) {
        await revokeRefreshToken(verification.decoded.jti);
      }
    }

    // Clear cookies
    res.clearCookie("refreshToken");

    res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({
      error: "Logout failed",
      message: "Unable to process logout",
    });
  }
};

// ===== PASSWORD RESET ENDPOINTS =====

// Forgot password - send OTP
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        message: "Email is required",
      });
    }

    // Import the function from auth.js
    const { sendPasswordResetOTP } = require("../auth");
    const result = await sendPasswordResetOTP(email);

    res.status(200).json({
      success: true,
      message: "Password reset OTP sent successfully",
      data: {
        token: result.token,
        expiresIn: result.expiresIn,
      },
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({
      success: false,
      error: "Password reset failed",
      message: error.message || "Unable to send password reset OTP",
    });
  }
};

// Verify reset OTP
const verifyResetOTP = async (req, res) => {
  try {
    const { email, otp, token } = req.body;

    if (!email || !otp || !token) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        message: "Email, OTP, and token are required",
      });
    }

    // Import the function from auth.js
    const { verifyPasswordResetOTP } = require("../auth");
    const result = await verifyPasswordResetOTP(email, otp, token);

    res.status(200).json({
      success: true,
      message: "OTP verified successfully",
      data: {
        resetToken: result.resetToken,
        expiresIn: result.expiresIn,
      },
    });
  } catch (error) {
    console.error("Verify OTP error:", error);
    res.status(500).json({
      success: false,
      error: "OTP verification failed",
      message: error.message || "Unable to verify OTP",
    });
  }
};

// Reset password
const resetPassword = async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;

    if (!resetToken || !newPassword) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        message: "Reset token and new password are required",
      });
    }

    // Import the function from auth.js
    const { resetPassword: resetPasswordFunction } = require("../auth");
    const result = await resetPasswordFunction(resetToken, newPassword);

    res.status(200).json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({
      success: false,
      error: "Password reset failed",
      message: error.message || "Unable to reset password",
    });
  }
};

// ===== NEW ROUTE CALCULATION API ENDPOINTS =====

// Initialize route graph
const initializeRouteGraph = async (req, res) => {
  try {
    const result = await routeService.initializeGraph();

    res.status(200).json({
      success: true,
      message: result.message,
      data: {
        nodeCount: result.nodeCount,
        edgeCount: result.edgeCount,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Graph initialization error:", error);
    res.status(500).json({
      error: "Initialization failed",
      message: "Unable to initialize route graph",
    });
  }
};

// Get graph status
const getRouteGraphStatus = async (req, res) => {
  try {
    const status = routeService.getGraphStatus();

    res.status(200).json({
      success: true,
      data: status,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Graph status error:", error);
    res.status(500).json({
      error: "Status check failed",
      message: "Unable to get graph status",
    });
  }
};

// Calculate route between two points (enhanced with multiple routes)
const calculateRoute = async (req, res) => {
  try {
    const { source, destination } = req.body;

    if (!source || !destination) {
      return res.status(400).json({
        error: "Validation failed",
        message: "Source and destination are required",
      });
    }

    console.log(`🔍 Calculating route from "${source}" to "${destination}"`);

    // First, try the original single route calculation to ensure it works
    const result = await routeService.calculateRoute(source, destination);

    if (!result.success) {
      throw new Error(result.message || "Route calculation failed");
    }

    console.log(`✅ Single route found: ${result.data.path.join(" → ")}`);

    // Now try to find multiple routes
    let allRoutes = [];
    let recommendations = {};

    try {
      const multipleResult = await routeService.calculateMultipleRoutes(
        source,
        destination
      );

      if (
        multipleResult.success &&
        multipleResult.data.routes &&
        multipleResult.data.routes.length > 0
      ) {
        allRoutes = multipleResult.data.routes;
        recommendations = multipleResult.data.recommendations;
        console.log(`🛣️ Found ${allRoutes.length} total routes`);
      } else {
        throw new Error("Multiple routes calculation failed");
      }
    } catch (multipleError) {
      console.log(
        "Multiple routes failed, using single route:",
        multipleError.message
      );

      // Convert single route to multiple routes format
      allRoutes = [
        {
          id: "main",
          type: "shortest",
          name: "Main Route",
          path: result.data.path,
          pathCoordinates: result.data.pathCoordinates,
          distance: result.data.distance,
          totalFare: result.data.totalFare,
          fareBreakdown: result.data.fareBreakdown,
          estimatedTime: result.data.estimatedTime,
          color: "#f4b942",
          description: "Available route",
        },
      ];

      recommendations = {
        fastest: { id: "main", estimatedTime: result.data.estimatedTime },
        cheapest: { id: "main", totalFare: result.data.totalFare },
        shortest: { id: "main", distance: result.data.distance },
      };
    }

    const responseData = {
      source,
      destination,
      routes: allRoutes,
      recommendations,
      totalOptions: allRoutes.length,
    };

    res.status(200).json({
      success: true,
      message: `${
        allRoutes.length > 1 ? "Multiple routes" : "Route"
      } calculated successfully`,
      data: responseData,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Route calculation error:", error);

    // Handle specific error types
    if (
      error.message.includes("not found") ||
      error.message.includes("No route found")
    ) {
      return res.status(404).json({
        error: "Route not found",
        message: error.message,
        suggestions: [
          "Check if the location names are spelled correctly",
          "Try using nearby locations",
          "Contact support if the issue persists",
        ],
      });
    }

    res.status(500).json({
      error: "Calculation failed",
      message: "Unable to calculate route",
    });
  }
};

// Store route for ride buddy (enhanced version)
const storeRouteForRideBuddy = async (req, res) => {
  try {
    const { userId, source, destination } = req.body;

    // Use authenticated user ID if available
    const actualUserId = req.user?.userId || userId;

    if (!actualUserId || !source || !destination) {
      return res.status(400).json({
        error: "Validation failed",
        message: "User ID, source, and destination are required",
      });
    }

    const route = await routeService.storeRoute(
      actualUserId,
      source,
      destination
    );

    // Save to database
    const dbResult = await ridebuddy_db({
      ...route,
      userEmail: req.user?.email,
    });

    res.status(201).json({
      success: true,
      message: "Route stored successfully",
      data: {
        ...route,
        dbId: dbResult.insertedId,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Store route error:", error);
    res.status(500).json({
      error: "Storage failed",
      message: "Unable to store route",
    });
  }
};

// Find matching routes for ride buddy
const findMatchingRoutesForRideBuddy = async (req, res) => {
  try {
    const { routeData } = req.body;

    if (!routeData) {
      return res.status(400).json({
        error: "Validation failed",
        message: "Route data is required",
      });
    }

    // Get all routes from database
    const filters = req.user
      ? {
          userId: { $ne: req.user.userId },
        }
      : {};

    const allRoutes = await rideInfo_db(filters);

    // Find matches using route service
    const matches = await routeService.findMatchingRoutes(routeData, allRoutes);

    res.status(200).json({
      success: true,
      message: "Matching routes found",
      data: matches,
      count: matches.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Find matching routes error:", error);
    res.status(500).json({
      error: "Matching failed",
      message: "Unable to find matching routes",
    });
  }
};

// Get available locations
const getAvailableLocations = async (req, res) => {
  try {
    const locations = routeService.getAvailableLocations();

    res.status(200).json({
      success: true,
      data: locations,
      count: locations.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Get locations error:", error);
    res.status(500).json({
      error: "Fetch failed",
      message: "Unable to fetch available locations",
    });
  }
};

// Get route suggestions
const getRouteSuggestions = async (req, res) => {
  try {
    const { from, limit } = req.query;

    if (!from) {
      return res.status(400).json({
        error: "Validation failed",
        message: "From location is required",
      });
    }

    const suggestions = routeService.getRouteSuggestions(
      from,
      parseInt(limit) || 5
    );

    res.status(200).json({
      success: true,
      data: suggestions,
      count: suggestions.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Get suggestions error:", error);
    res.status(500).json({
      error: "Suggestions failed",
      message: "Unable to get route suggestions",
    });
  }
};

// Calculate fare estimates for different times
const calculateFareEstimates = async (req, res) => {
  try {
    const { source, destination, waitingTime } = req.body;

    if (!source || !destination) {
      return res.status(400).json({
        error: "Validation failed",
        message: "Source and destination are required",
      });
    }

    const result = await routeService.calculateFareEstimates(
      source,
      destination,
      parseInt(waitingTime) || 0
    );

    res.status(200).json({
      success: true,
      message: "Fare estimates calculated successfully",
      data: result.data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Fare estimation error:", error);

    // Handle specific error types
    if (
      error.message.includes("not found") ||
      error.message.includes("No route found")
    ) {
      return res.status(404).json({
        error: "Route not found",
        message: error.message,
      });
    }

    res.status(500).json({
      error: "Estimation failed",
      message: "Unable to calculate fare estimates",
    });
  }
};

// ===== NEW PAGINATED HOTSPOT ENDPOINTS =====

// Get paginated hotspots
const getHotspotsPaginated = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || "";

    const skip = (page - 1) * limit;

    const { dbService } = require("../Backend/database");
    const hotspotsCollection = await dbService.getCollection("hotspots");

    // Build search query
    let query = {};
    if (search.trim()) {
      query = {
        name: { $regex: search.trim(), $options: "i" },
      };
    }

    // Get total count for pagination info
    const totalCount = await hotspotsCollection.countDocuments(query);

    // Get paginated results
    const hotspots = await hotspotsCollection
      .find(query)
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    const totalPages = Math.ceil(totalCount / limit);
    const hasMore = page < totalPages;

    res.status(200).json({
      success: true,
      data: hotspots,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        hasMore,
        limit,
        count: hotspots.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Paginated hotspots fetch error:", error);
    res.status(500).json({
      error: "Database error",
      message: "Unable to fetch hotspots data",
    });
  }
};

// Search hotspots with real-time results
const searchHotspots = async (req, res) => {
  try {
    const query = req.query.q || "";
    const limit = parseInt(req.query.limit) || 20;

    if (!query.trim()) {
      return res.status(400).json({
        error: "Validation failed",
        message: "Search query is required",
      });
    }

    const { dbService } = require("../Backend/database");
    const hotspotsCollection = await dbService.getCollection("hotspots");

    // Search with regex for partial matches
    const searchQuery = {
      name: { $regex: query.trim(), $options: "i" },
    };

    const hotspots = await hotspotsCollection
      .find(searchQuery)
      .sort({ name: 1 })
      .limit(limit)
      .toArray();

    res.status(200).json({
      success: true,
      data: hotspots,
      query: query.trim(),
      count: hotspots.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Hotspots search error:", error);
    res.status(500).json({
      error: "Search error",
      message: "Unable to search hotspots",
    });
  }
};

// Module exports moved to the end of the file after all function definitions
// User Profile Management Endpoints

/**
 * GET /api/user/profile
 * Get user profile information
 */
const getUserProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const userEmail = req.user.email;

    // Find user by email to get complete profile
    const user = await findUserByEmail(userEmail);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
        message: "User profile not found",
      });
    }

    // Return user profile (excluding sensitive data)
    const userProfile = {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      isVerified: user.isVerified || false,
    };

    res.status(200).json({
      success: true,
      message: "Profile retrieved successfully",
      data: userProfile,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Get user profile error:", error);
    res.status(500).json({
      success: false,
      error: "Server error",
      message: "Unable to retrieve user profile",
    });
  }
};

/**
 * PUT /api/user/profile
 * Update user profile information
 */
const updateUserProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const userEmail = req.user.email;
    const { name, phone } = req.body;

    // Validate name
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        message: "Name is required and cannot be empty",
      });
    }

    if (name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        message: "Name must be at least 2 characters long",
      });
    }

    if (name.trim().length > 50) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        message: "Name cannot exceed 50 characters",
      });
    }

    // Validate phone number if provided
    if (phone && phone.trim()) {
      const phoneRegex = /^[+]?[\d\s\-\(\)]{10,15}$/;
      if (!phoneRegex.test(phone.trim())) {
        return res.status(400).json({
          success: false,
          error: "Validation failed",
          message: "Please enter a valid phone number",
        });
      }

      // Check if phone number is already taken by another user
      const { dbService } = require("../Backend/database");
      const usersCollection = await dbService.getCollection("users");
      const existingUser = await usersCollection.findOne({
        phone: phone.trim(),
        email: { $ne: userEmail }, // Exclude current user
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: "Validation failed",
          message:
            "This phone number is already registered with another account",
        });
      }
    }

    // Find user
    const user = await findUserByEmail(userEmail);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
        message: "User profile not found",
      });
    }

    // Update user profile
    const { dbService } = require("../Backend/database");
    const usersCollection = await dbService.getCollection("users");

    // Prepare update data
    const updateData = {
      name: name.trim(),
      updatedAt: new Date(),
    };

    // Add phone number to update if provided
    if (phone !== undefined) {
      updateData.phone = phone.trim();
    }

    const updateResult = await usersCollection.updateOne(
      { email: userEmail },
      { $set: updateData }
    );

    if (updateResult.modifiedCount === 0) {
      return res.status(400).json({
        success: false,
        error: "Update failed",
        message: "No changes were made to the profile",
      });
    }

    // Get updated user data
    const updatedUser = await findUserByEmail(userEmail);

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        updatedAt: updatedUser.updatedAt,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Update user profile error:", error);
    res.status(500).json({
      success: false,
      error: "Server error",
      message: "Unable to update user profile",
    });
  }
};

/**
 * POST /api/user/change-password
 * Change user password (requires current password)
 */
const changeUserPassword = async (req, res) => {
  try {
    const userEmail = req.user.email;
    const { currentPassword, newPassword } = req.body;

    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        message: "Current password and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        message: "New password must be at least 6 characters long",
      });
    }

    // Find user
    const user = await findUserByEmail(userEmail);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
        message: "User not found",
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password
    );
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        error: "Invalid password",
        message: "Current password is incorrect",
      });
    }

    // Hash new password
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    const { dbService } = require("../Backend/database");
    const usersCollection = await dbService.getCollection("users");

    await usersCollection.updateOne(
      { email: userEmail },
      {
        $set: {
          password: hashedNewPassword,
          updatedAt: new Date(),
        },
      }
    );

    res.status(200).json({
      success: true,
      message: "Password changed successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({
      success: false,
      error: "Server error",
      message: "Unable to change password",
    });
  }
};

// Debug endpoint to check user data in database
const debugUserDatabase = async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email parameter is required",
      });
    }

    const user = await findUserByEmail(email);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        hasPhone: !!user.phone,
        phoneLength: user.phone ? user.phone.length : 0,
        createdAt: user.createdAt,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    console.error("Debug user database error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during debug",
    });
  }
};

module.exports = {
  home,
  signIn,
  signUp,
  refreshToken,
  logout,
  hotspots,
  feedbacks,
  ridebuddy,
  findmatch,
  forgotPassword,
  verifyResetOTP,
  resetPassword,
  // User Profile endpoints
  getUserProfile,
  updateUserProfile,
  changeUserPassword,
  // Route calculation endpoints
  initializeRouteGraph,
  getRouteGraphStatus,
  calculateRoute,
  calculateFareEstimates,
  storeRouteForRideBuddy,
  findMatchingRoutesForRideBuddy,
  getAvailableLocations,
  getRouteSuggestions,
  // Paginated hotspot endpoints
  getHotspotsPaginated,
  searchHotspots,
  // Debug endpoints
  debugUserDatabase,
};
