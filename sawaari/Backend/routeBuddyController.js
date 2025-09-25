const express = require("express");
const router = express.Router();
const routeMatchingService = require("./RouteMatchingService-New");

// Handle new ride buddy search
router.post("/api/ride-buddy/search", async (req, res) => {
  try {
    const userId = req.user.id; // Get from auth middleware
    const { source, destination, preferences } = req.body;

    const result = await routeMatchingService.processNewSearch(userId, {
      source,
      destination,
      searchRadius: preferences?.searchRadius || 2,
    });

    res.json({
      success: true,
      message: "Ride buddy search created successfully",
      data: {
        searchId: result.searchId,
        matches: result.matches,
        matchCount: result.matchCount,
        searchRadius: result.searchRadius,
        expiresAt: result.expiresAt,
        isActive: true,
        timeRemaining: result.expiresAt - Date.now(),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error processing ride buddy search:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process ride buddy search",
      error: error.message,
    });
  }
});

module.exports = router;
