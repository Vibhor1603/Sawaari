const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { JWTService } = require("./Backend/jwtToken");
const otpService = require("./Backend/otpService");
const { findUserByEmail } = require("./Backend/database");

// Simple JWT secret - in production, use a strong secret from environment
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-here";

// Generate JWT token for user
function generateToken(user) {
  const payload = {
    userId: user._id,
    email: user.email,
    name: user.name,
  };

  // Token expires in 24 hours
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" });
}

// Verify JWT token using new JWTService
function verifyToken(token) {
  try {
    const result = JWTService.verifyAccessToken(token);
    if (result.valid) {
      return result.decoded;
    } else {
      return null;
    }
  } catch (error) {
    return null;
  }
}

// Hash password
async function hashPassword(password) {
  return await bcrypt.hash(password, 10);
}

// Compare password
async function comparePassword(password, hashedPassword) {
  return await bcrypt.compare(password, hashedPassword);
}

// Middleware to check if user is authenticated
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "No token provided",
    });
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }

  req.user = decoded; // Add user info to request
  next();
}

// This export will be replaced by the final one at the end of the file

// Forgot Password - Send OTP (Email Only)
async function sendPasswordResetOTP(identifier) {
  try {
    // Check if identifier is email
    const isEmail = identifier.includes("@");

    if (!isEmail) {
      throw new Error("Please provide a valid email address");
    }

    // Find user by email
    const user = await findUserByEmail(identifier);

    if (!user) {
      throw new Error("No account found with this email address");
    }

    // Send OTP via email only
    const result = await otpService.sendOTP(null, identifier);

    return {
      success: true,
      token: result.token,
      message: result.message,
      expiresIn: result.expiresIn,
    };
  } catch (error) {
    console.error("Send password reset OTP error:", error);
    throw error;
  }
}

// Verify OTP for password reset
async function verifyPasswordResetOTP(identifier, otp, token) {
  try {
    const result = await otpService.verifyOTP(identifier, otp, token);

    if (result.success) {
      // Generate a temporary reset token valid for 15 minutes
      const resetToken = otpService.generateToken();
      const resetExpiry = Date.now() + 15 * 60 * 1000; // 15 minutes

      // Store reset token (in production, use database)
      global.passwordResetTokens = global.passwordResetTokens || new Map();
      global.passwordResetTokens.set(resetToken, {
        identifier,
        expiresAt: resetExpiry,
        verified: true,
      });

      return {
        success: true,
        resetToken,
        message: "OTP verified. You can now reset your password.",
        expiresIn: 15 * 60, // 15 minutes in seconds
      };
    }

    return result;
  } catch (error) {
    console.error("Verify password reset OTP error:", error);
    throw error;
  }
}

// Reset password with verified token
async function resetPassword(resetToken, newPassword) {
  try {
    // Validate reset token
    global.passwordResetTokens = global.passwordResetTokens || new Map();
    const tokenData = global.passwordResetTokens.get(resetToken);

    if (!tokenData) {
      throw new Error("Invalid or expired reset token");
    }

    if (Date.now() > tokenData.expiresAt) {
      global.passwordResetTokens.delete(resetToken);
      throw new Error(
        "Reset token has expired. Please start the process again."
      );
    }

    if (!tokenData.verified) {
      throw new Error("Reset token not verified");
    }

    // Validate new password
    if (!newPassword || newPassword.length < 6) {
      throw new Error("Password must be at least 6 characters long");
    }

    // Find user
    const identifier = tokenData.identifier;
    const isEmail = identifier.includes("@");

    let user;
    if (isEmail) {
      user = await findUserByEmail(identifier);
    } else {
      const { dbService } = require("./Backend/database");
      const collection = await dbService.getCollection("users");
      user = await collection.findOne({ phone: identifier, isActive: true });
    }

    if (!user) {
      throw new Error("User not found");
    }

    // Hash new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password in database
    const { dbService } = require("./Backend/database");
    const collection = await dbService.getCollection("users");
    await collection.updateOne(
      { _id: user._id },
      {
        $set: {
          password: hashedPassword,
          updatedAt: new Date(),
          passwordResetAt: new Date(),
        },
      }
    );

    // Clean up reset token
    global.passwordResetTokens.delete(resetToken);

    return {
      success: true,
      message:
        "Password reset successfully. You can now sign in with your new password.",
    };
  } catch (error) {
    console.error("Reset password error:", error);
    throw error;
  }
}

module.exports = {
  generateToken,
  verifyToken,
  hashPassword,
  comparePassword,
  requireAuth,
  sendPasswordResetOTP,
  verifyPasswordResetOTP,
  resetPassword,
};
