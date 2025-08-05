const express = require("express");
const router = express.Router();
const {
  home,
  hotspots,
  feedbacks,
  findmatch,
  signUp,
  ridebuddy,
  signIn,
  refreshToken,
  logout,
  // New route calculation endpoints
  initializeRouteGraph,
  getRouteGraphStatus,
  calculateRoute,
  calculateFareEstimates,
  storeRouteForRideBuddy,
  findMatchingRoutesForRideBuddy,
  getAvailableLocations,
  getRouteSuggestions,
  // Debug endpoints
  debugUserDatabase,
} = require("../controller/controller");

// Import forgot password functions
const {
  sendPasswordResetOTP,
  verifyPasswordResetOTP,
  resetPassword,
} = require("../auth");

// Import security middleware
const {
  authLimiter,
  apiLimiter,
  hotspotsLimiter,
  rideBuddyLimiter,
  chatLimiter,
  securityActionLimiter,
  validateInput,
  sanitizeInput,
  authenticateToken,
  optionalAuth,
} = require("../Backend/middleware");

// Import validation schemas
const {
  signUpSchema,
  signInSchema,
  feedbackSchema,
  rideBuddySchema,
  refreshTokenSchema,
  routeSearchSchema,
  storeRouteSchema,
  findMatchingRoutesSchema,
  fareEstimationSchema,
  routeSuggestionsQuerySchema,
} = require("../Backend/validation");

// Apply general API rate limiting to all routes
router.use(apiLimiter);

// Apply input sanitization to all routes
router.use(sanitizeInput);

// Public routes
router.route("/").get(home);

// Hotspots - public but with optional auth for personalization
router.route("/hotspots").get(optionalAuth, hotspots);

// Authentication routes with stricter rate limiting
router.route("/signin").post(authLimiter, validateInput(signInSchema), signIn);

router.route("/signup").post(authLimiter, validateInput(signUpSchema), signUp);

router
  .route("/refresh-token")
  .post(authLimiter, validateInput(refreshTokenSchema), refreshToken);

router.route("/logout").post(logout);

// Debug routes
router.route("/debug/user").get(debugUserDatabase);

// Forgot Password Routes
router.route("/forgot-password/send-otp").post(async (req, res) => {
  try {
    const { identifier } = req.body;

    if (!identifier) {
      return res.status(400).json({
        success: false,
        error: "Email address is required",
      });
    }

    const result = await sendPasswordResetOTP(identifier);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

router.route("/forgot-password/verify-otp").post(async (req, res) => {
  try {
    const { identifier, otp, token } = req.body;

    if (!identifier || !otp || !token) {
      return res.status(400).json({
        success: false,
        error: "Email address, OTP, and token are required",
      });
    }

    const result = await verifyPasswordResetOTP(identifier, otp, token);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

router.route("/forgot-password/reset").post(async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;

    if (!resetToken || !newPassword) {
      return res.status(400).json({
        success: false,
        error: "Reset token and new password are required",
      });
    }

    const result = await resetPassword(resetToken, newPassword);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

// Protected routes requiring authentication
router
  .route("/ridebuddy")
  .post(authenticateToken, validateInput(rideBuddySchema), ridebuddy);

// Semi-protected routes (optional auth for better filtering)
router.route("/findmatch").get(optionalAuth, findmatch);

// Feedback route with validation
router.route("/feedbacks").post(validateInput(feedbackSchema), feedbacks);

// Health check endpoint
router.route("/health").get((req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || "2.0.0",
  });
});

// ===== NEW ROUTE CALCULATION API ENDPOINTS =====

// Initialize route graph (admin/system endpoint)
router.route("/api/routes/initialize").post(initializeRouteGraph);

// Get route graph status
router.route("/api/routes/status").get(getRouteGraphStatus);

// Calculate route between two points (public)
router
  .route("/api/routes/calculate")
  .post(validateInput(routeSearchSchema), calculateRoute);

// Calculate fare estimates for different times (public)
router
  .route("/api/routes/fare-estimates")
  .post(validateInput(fareEstimationSchema), calculateFareEstimates);

// Store route for ride buddy (protected)
router
  .route("/api/routes/store")
  .post(
    authenticateToken,
    validateInput(storeRouteSchema),
    storeRouteForRideBuddy
  );

// Find matching routes for ride buddy (protected)
router
  .route("/api/routes/find-matches")
  .post(
    authenticateToken,
    validateInput(findMatchingRoutesSchema),
    findMatchingRoutesForRideBuddy
  );

// Get available locations (public)
router.route("/api/routes/locations").get(getAvailableLocations);

// Get route suggestions (public)
router.route("/api/routes/suggestions").get((req, res, next) => {
  // Validate query parameters
  const { error } = routeSuggestionsQuerySchema.validate(req.query);
  if (error) {
    return res.status(400).json({
      error: "Validation failed",
      details: error.details.map((detail) => detail.message),
    });
  }
  next();
}, getRouteSuggestions);

// ===== RIDE BUDDY API ENDPOINTS =====

// Import ride buddy controller functions
const {
  searchRideBuddies,
  sendRequest,
  handleRequest,
  getMatches,
  endMatch,
  getRequests,
  getActiveChats,
  debugUserData,
  cleanupExpiredRequestsAPI,
  cleanupDuplicateRequestsAPI,
} = require("../Backend/rideBuddyController");

// Import ride buddy validation schemas
const {
  rideBuddySearchSchema,
  rideBuddyRequestSchema,
  rideBuddyRequestResponseSchema,
  blockUserSchema,
  reportUserSchema,
  chatMessageSchema,
} = require("../Backend/validation");

// Ride buddy search endpoint (protected with rate limiting)
router
  .route("/api/ride-buddy/search")
  .post(
    authenticateToken,
    rideBuddyLimiter,
    validateInput(rideBuddySearchSchema),
    searchRideBuddies
  );

// Ride buddy request endpoints (protected with rate limiting)
router
  .route("/api/ride-buddy/request")
  .post(
    authenticateToken,
    rideBuddyLimiter,
    validateInput(rideBuddyRequestSchema),
    sendRequest
  );

router
  .route("/api/ride-buddy/request/:id")
  .put(
    authenticateToken,
    rideBuddyLimiter,
    validateInput(rideBuddyRequestResponseSchema),
    handleRequest
  );

// Ride buddy requests endpoint (protected)
router.route("/api/ride-buddy/requests").get(authenticateToken, getRequests);

// Ride buddy match endpoints (protected)
router.route("/api/ride-buddy/matches").get(authenticateToken, getMatches);

router.route("/api/ride-buddy/match/:id").delete(authenticateToken, endMatch);

// Debug endpoint (temporary)
router
  .route("/api/ride-buddy/debug/user")
  .get(authenticateToken, debugUserData);

// Ride buddy chat endpoints (protected)
router.route("/api/ride-buddy/chats").get(authenticateToken, getActiveChats);

// Cleanup expired requests endpoint (protected)
router
  .route("/api/ride-buddy/cleanup-expired")
  .post(authenticateToken, cleanupExpiredRequestsAPI);

// Cleanup duplicate requests endpoint (protected)
router
  .route("/api/ride-buddy/cleanup-duplicates")
  .post(authenticateToken, cleanupDuplicateRequestsAPI);

// ===== SECURITY API ENDPOINTS =====

// Import security controller functions
const {
  blockUser,
  unblockUser,
  getBlockedUsers,
  reportUser,
  getMyReports,
  triggerDataCleanup,
  checkUserBlocked,
  validateMessage,
} = require("../Backend/securityController");

// Import geolocation hotspot service
const geoHotspotService = require("../Backend/geoHotspotService");

// User blocking endpoints (protected with security action rate limiting)
router
  .route("/api/security/block-user")
  .post(
    authenticateToken,
    securityActionLimiter,
    validateInput(blockUserSchema),
    blockUser
  );

router
  .route("/api/security/block-user/:userId")
  .delete(authenticateToken, securityActionLimiter, unblockUser);

router
  .route("/api/security/blocked-users")
  .get(authenticateToken, getBlockedUsers);

router
  .route("/api/security/check-blocked/:userId")
  .get(authenticateToken, checkUserBlocked);

// User reporting endpoints (protected with security action rate limiting)
router
  .route("/api/security/report-user")
  .post(
    authenticateToken,
    securityActionLimiter,
    validateInput(reportUserSchema),
    reportUser
  );

router.route("/api/security/my-reports").get(authenticateToken, getMyReports);

// Message validation endpoint (protected with chat rate limiting)
router
  .route("/api/security/validate-message")
  .post(
    authenticateToken,
    chatLimiter,
    validateInput(chatMessageSchema),
    validateMessage
  );

// Data cleanup endpoint (admin only)
router
  .route("/api/security/cleanup")
  .post(authenticateToken, triggerDataCleanup);

// ===== GEOLOCATION-BASED HOTSPOT API ENDPOINTS =====

// Get hotspots within map bounds (for viewport-based loading)
router.route("/api/hotspots/bounds").post(hotspotsLimiter, async (req, res) => {
  try {
    const { bounds, zoom } = req.body;

    if (
      !bounds ||
      !bounds.north ||
      !bounds.south ||
      !bounds.east ||
      !bounds.west
    ) {
      return res.status(400).json({
        success: false,
        error: "Invalid bounds provided. Required: north, south, east, west",
      });
    }

    const result = await geoHotspotService.getHotspotsInBounds(bounds, zoom);
    res.json(result);
  } catch (error) {
    console.error("Hotspots bounds API error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch hotspots for bounds",
    });
  }
});

// Get hotspots near a specific location
router.route("/api/hotspots/nearby").post(hotspotsLimiter, async (req, res) => {
  try {
    const { latitude, longitude, radius } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: "Latitude and longitude are required",
      });
    }

    const result = await geoHotspotService.getHotspotsNearLocation(
      parseFloat(latitude),
      parseFloat(longitude),
      radius ? parseFloat(radius) : undefined
    );

    res.json(result);
  } catch (error) {
    console.error("Nearby hotspots API error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch nearby hotspots",
    });
  }
});

// Initialize geospatial indexes (admin only)
router
  .route("/api/hotspots/init-geo")
  .post(authenticateToken, async (req, res) => {
    try {
      const initResult = await geoHotspotService.initializeGeoIndexes();
      const migrateResult =
        await geoHotspotService.migrateHotspotsToGeoFormat();

      res.json({
        success: true,
        message: "Geospatial initialization completed",
        indexesInitialized: initResult,
        dataMigrated: migrateResult,
      });
    } catch (error) {
      console.error("Geo initialization error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to initialize geospatial features",
      });
    }
  });

// Get hotspot statistics (admin only)
router.route("/api/hotspots/stats").get(authenticateToken, async (req, res) => {
  try {
    const result = await geoHotspotService.getHotspotStats();
    res.json(result);
  } catch (error) {
    console.error("Hotspot stats API error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch hotspot statistics",
    });
  }
});

// ===== CHAT API ENDPOINTS =====

// Get user conversations (protected)
router
  .route("/api/chat/conversations")
  .get(authenticateToken, async (req, res) => {
    try {
      const chatService = require("../Backend/chatService");
      const result = await chatService.getUserConversations(req.user.userId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

// Get conversation messages (protected)
router
  .route("/api/chat/conversations/:conversationId/messages")
  .get(authenticateToken, async (req, res) => {
    try {
      const chatService = require("../Backend/chatService");
      const { conversationId } = req.params;
      const { limit = 50, offset = 0 } = req.query;

      const result = await chatService.getConversationMessages(
        conversationId,
        req.user.userId,
        parseInt(limit),
        parseInt(offset)
      );
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

// Mark messages as read (protected)
router
  .route("/api/chat/conversations/:conversationId/read")
  .post(authenticateToken, async (req, res) => {
    try {
      const chatService = require("../Backend/chatService");
      const { conversationId } = req.params;

      const result = await chatService.markMessagesAsRead(
        conversationId,
        req.user.userId
      );
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

// Get chat statistics (admin)
router.route("/api/chat/stats").get(authenticateToken, (req, res) => {
  try {
    const chatService = require("../Backend/chatService");
    const stats = chatService.getStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== DIRECT PHONE NUMBER SHARING =====
// Proxy system removed - users see actual phone numbers after connection

// API documentation endpoint
router.route("/docs").get((req, res) => {
  res.status(200).json({
    title: "SAWAARI API Documentation",
    version: "2.0.0",
    description: "Smart transportation API for auto rickshaw services",
    endpoints: {
      public: {
        "GET /": "API information",
        "GET /health": "Health check",
        "GET /docs": "API documentation",
        "GET /hotspots": "Get all hotspots (optional auth)",
        "POST /api/routes/calculate": "Calculate route between two points",
        "GET /api/routes/locations": "Get available locations",
        "GET /api/routes/suggestions": "Get route suggestions",
        "GET /api/routes/status": "Get route graph status",
      },
      authentication: {
        "POST /signin": "User login",
        "POST /signup": "User registration",
        "POST /refresh-token": "Refresh access token",
        "POST /logout": "User logout",
      },
      protected: {
        "POST /ridebuddy": "Submit ride buddy request (requires auth)",
        "GET /findmatch": "Find matching rides (optional auth)",
        "POST /feedbacks": "Submit feedback",
        "POST /api/routes/store": "Store route for ride buddy (requires auth)",
        "POST /api/routes/find-matches": "Find matching routes (requires auth)",
      },
      admin: {
        "POST /api/routes/initialize": "Initialize route graph",
      },
    },
    security: {
      authentication: "Bearer JWT tokens",
      rateLimit: "Applied to all endpoints",
      validation: "Input validation and sanitization",
      cors: "Configured for frontend domains",
    },
  });
});

// User Profile Routes (Protected)
const {
  getUserProfile,
  updateUserProfile,
  changeUserPassword,
} = require("../controller/controller");

// Get user profile
router.route("/api/user/profile").get(authenticateToken, getUserProfile);

// Update user profile
router.route("/api/user/profile").put(authenticateToken, updateUserProfile);

// Change password
router
  .route("/api/user/change-password")
  .post(authenticateToken, changeUserPassword);

module.exports = router;
