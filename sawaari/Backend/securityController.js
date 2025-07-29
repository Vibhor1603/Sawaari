const { ObjectId } = require("mongodb");
const securityService = require("./securityService");

/**
 * Security Controller for Ride Buddy System
 * Handles blocking, reporting, and privacy API endpoints
 */

/**
 * POST /api/security/block-user
 * Block a user from interacting with the current user
 */
const blockUser = async (req, res) => {
  try {
    const { blockedUserId, reason = "" } = req.body;
    const blockerId = req.user.userId;

    // Validate that user is not trying to block themselves
    if (blockerId === blockedUserId) {
      return res.status(400).json({
        success: false,
        error: "Invalid request",
        message: "Cannot block yourself",
      });
    }

    const result = await securityService.blockUser(
      blockerId,
      blockedUserId,
      reason
    );

    if (!result.success) {
      return res.status(409).json({
        success: false,
        error: "Block failed",
        message: result.message,
      });
    }

    res.status(201).json({
      success: true,
      message: "User blocked successfully",
      data: {
        blockId: result.blockId,
        blockedAt: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Block user error:", error);
    res.status(500).json({
      success: false,
      error: "Block failed",
      message: "Unable to block user",
    });
  }
};

/**
 * DELETE /api/security/block-user/:userId
 * Unblock a previously blocked user
 */
const unblockUser = async (req, res) => {
  try {
    const { userId: blockedUserId } = req.params;
    const blockerId = req.user.userId;

    const result = await securityService.unblockUser(blockerId, blockedUserId);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        error: "Unblock failed",
        message: result.message,
      });
    }

    res.status(200).json({
      success: true,
      message: "User unblocked successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Unblock user error:", error);
    res.status(500).json({
      success: false,
      error: "Unblock failed",
      message: "Unable to unblock user",
    });
  }
};

/**
 * GET /api/security/blocked-users
 * Get list of blocked users for the current user
 */
const getBlockedUsers = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await securityService.getBlockedUsers(userId);

    res.status(200).json({
      success: true,
      message: "Blocked users retrieved successfully",
      data: result.blockedUsers,
      count: result.count,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Get blocked users error:", error);
    res.status(500).json({
      success: false,
      error: "Retrieval failed",
      message: "Unable to retrieve blocked users",
    });
  }
};

/**
 * POST /api/security/report-user
 * Report a user for inappropriate behavior
 */
const reportUser = async (req, res) => {
  try {
    const {
      reportedUserId,
      reason,
      description = "",
      category = "other",
    } = req.body;
    const reporterId = req.user.userId;

    // Validate that user is not trying to report themselves
    if (reporterId === reportedUserId) {
      return res.status(400).json({
        success: false,
        error: "Invalid request",
        message: "Cannot report yourself",
      });
    }

    const result = await securityService.reportUser(
      reporterId,
      reportedUserId,
      reason,
      description,
      category
    );

    res.status(201).json({
      success: true,
      message: "Report submitted successfully",
      data: {
        reportId: result.reportId,
        reportedAt: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Report user error:", error);
    res.status(500).json({
      success: false,
      error: "Report failed",
      message: "Unable to submit report",
    });
  }
};

/**
 * GET /api/security/my-reports
 * Get reports made by the current user
 */
const getMyReports = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await securityService.getUserReports(userId);

    res.status(200).json({
      success: true,
      message: "Reports retrieved successfully",
      data: result.reports,
      count: result.count,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Get user reports error:", error);
    res.status(500).json({
      success: false,
      error: "Retrieval failed",
      message: "Unable to retrieve reports",
    });
  }
};

/**
 * POST /api/security/cleanup
 * Trigger manual data cleanup (admin only)
 */
const triggerDataCleanup = async (req, res) => {
  try {
    // Check if user has admin privileges (you may want to implement proper admin check)
    const userEmail = req.user.email;
    const adminEmails = (process.env.ADMIN_EMAILS || "").split(",");

    if (!adminEmails.includes(userEmail)) {
      return res.status(403).json({
        success: false,
        error: "Access denied",
        message: "Admin privileges required",
      });
    }

    const result = await securityService.performDataCleanup();

    res.status(200).json({
      success: true,
      message: "Data cleanup completed successfully",
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Data cleanup error:", error);
    res.status(500).json({
      success: false,
      error: "Cleanup failed",
      message: "Unable to perform data cleanup",
    });
  }
};

/**
 * GET /api/security/check-blocked/:userId
 * Check if a specific user is blocked
 */
const checkUserBlocked = async (req, res) => {
  try {
    const { userId: targetUserId } = req.params;
    const currentUserId = req.user.userId;

    const isBlocked = await securityService.isUserBlocked(
      currentUserId,
      targetUserId
    );

    res.status(200).json({
      success: true,
      data: {
        isBlocked,
        userId: targetUserId,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Check user blocked error:", error);
    res.status(500).json({
      success: false,
      error: "Check failed",
      message: "Unable to check block status",
    });
  }
};

/**
 * POST /api/security/validate-message
 * Validate and sanitize a message before sending
 */
const validateMessage = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        message: "Message is required",
      });
    }

    const sanitizedMessage = securityService.validateMessage(message);

    res.status(200).json({
      success: true,
      data: {
        originalMessage: message,
        sanitizedMessage,
        isValid: true,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: "Validation failed",
      message: error.message,
      data: {
        originalMessage: req.body.message,
        isValid: false,
      },
      timestamp: new Date().toISOString(),
    });
  }
};

module.exports = {
  blockUser,
  unblockUser,
  getBlockedUsers,
  reportUser,
  getMyReports,
  triggerDataCleanup,
  checkUserBlocked,
  validateMessage,
};
