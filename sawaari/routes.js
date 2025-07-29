const express = require("express");
const router = express.Router();
const {
  requireAuth,
  sendPasswordResetOTP,
  verifyPasswordResetOTP,
  resetPassword,
} = require("./auth");
const {
  home,
  signup,
  signin,
  submitRideRequest,
  getRideRequests,
  getHotspotsData,
  submitFeedback,
} = require("./controllers");

// Import route calculation functions
const {
  initializeRouteGraph,
  getRouteGraphStatus,
  calculateRoute,
  calculateFareEstimates,
  storeRouteForRideBuddy,
} = require("./controller/controller");

// Import ride buddy controller functions
const {
  searchRideBuddies,
  sendRequest,
  handleRequest,
  getMatches,
  endMatch,
  getRequests,
  getActiveChats,
} = require("./Backend/rideBuddyController");

// Public routes (no authentication required)
router.get("/", home);
router.post("/signup", signup);
router.post("/signin", signin);

// Forgot Password Routes
router.post("/forgot-password/send-otp", async (req, res) => {
  try {
    const { identifier } = req.body;

    if (!identifier) {
      return res.status(400).json({
        success: false,
        error: "Email or phone number is required",
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

router.post("/forgot-password/verify-otp", async (req, res) => {
  try {
    const { identifier, otp, token } = req.body;

    if (!identifier || !otp || !token) {
      return res.status(400).json({
        success: false,
        error: "Identifier, OTP, and token are required",
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

router.post("/forgot-password/reset", async (req, res) => {
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
router.get("/hotspots", getHotspotsData);
router.post("/feedback", submitFeedback);

// Route calculation endpoints (public)
router.get("/api/routes/status", getRouteGraphStatus);
router.post("/api/routes/calculate", calculateRoute);
router.post("/api/routes/fare-estimates", calculateFareEstimates);

// Ride buddy API endpoints (protected)
router.post("/api/ride-buddy/search", requireAuth, searchRideBuddies);
router.post("/api/ride-buddy/request", requireAuth, sendRequest);
router.put("/api/ride-buddy/request/:id", requireAuth, handleRequest);
router.get("/api/ride-buddy/requests", requireAuth, getRequests);
router.get("/api/ride-buddy/matches", requireAuth, getMatches);
router.delete("/api/ride-buddy/match/:id", requireAuth, endMatch);
router.get("/api/ride-buddy/chats", requireAuth, getActiveChats);

// Protected routes (authentication required)
router.post("/ridebuddy", requireAuth, submitRideRequest);
router.get("/findmatch", requireAuth, getRideRequests);
router.post("/api/routes/store", requireAuth, storeRouteForRideBuddy);

module.exports = router;
