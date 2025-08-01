const jwt = require("jsonwebtoken");
const crypto = require("crypto");
require("dotenv").config();

// Enhanced JWT Token System with Refresh Tokens
class JWTService {
  constructor() {
    this.accessSecret = process.env.JWT_ACCESS_SECRET;
    this.refreshSecret = process.env.JWT_REFRESH_SECRET;
    this.accessExpiresIn = process.env.JWT_ACCESS_EXPIRES_IN || "1d"; // 1 day instead of 15 minutes
    this.refreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || "30d"; // 30 days instead of 7

    if (!this.accessSecret || !this.refreshSecret) {
      throw new Error("JWT secrets must be defined in environment variables");
    }
  }

  // Generate Access Token
  generateAccessToken(user) {
    const payload = {
      email: user.email || user.Email,
      userId: user._id || user.id,
      name: user.name || user.Name,
      phone: user.phone || user.Phone,
      type: "access",
      iat: Math.floor(Date.now() / 1000),
      jti: crypto.randomUUID(), // Unique token ID for revocation
    };

    return jwt.sign(payload, this.accessSecret, {
      expiresIn: this.accessExpiresIn,
      issuer: "sawaari-app",
      audience: "sawaari-users",
    });
  }

  // Generate Refresh Token
  generateRefreshToken(user) {
    const payload = {
      email: user.email || user.Email,
      userId: user._id || user.id,
      name: user.name || user.Name,
      phone: user.phone || user.Phone,
      type: "refresh",
      iat: Math.floor(Date.now() / 1000),
      jti: crypto.randomUUID(),
    };

    return jwt.sign(payload, this.refreshSecret, {
      expiresIn: this.refreshExpiresIn,
      issuer: "sawaari-app",
      audience: "sawaari-users",
    });
  }

  // Generate Token Pair
  generateTokenPair(user) {
    return {
      accessToken: this.generateAccessToken(user),
      refreshToken: this.generateRefreshToken(user),
      expiresIn: this.accessExpiresIn,
    };
  }

  // Verify Access Token
  verifyAccessToken(token) {
    try {
      const decoded = jwt.verify(token, this.accessSecret, {
        issuer: "sawaari-app",
        audience: "sawaari-users",
      });

      if (decoded.type !== "access") {
        throw new Error("Invalid token type");
      }

      return {
        valid: true,
        decoded,
        expired: false,
      };
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        return {
          valid: false,
          decoded: null,
          expired: true,
          error: "Token expired",
        };
      }
      return {
        valid: false,
        decoded: null,
        expired: false,
        error: error.message,
      };
    }
  }

  // Verify Refresh Token
  verifyRefreshToken(token) {
    try {
      const decoded = jwt.verify(token, this.refreshSecret, {
        issuer: "sawaari-app",
        audience: "sawaari-users",
      });

      if (decoded.type !== "refresh") {
        throw new Error("Invalid token type");
      }

      return {
        valid: true,
        decoded,
        expired: false,
      };
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        return {
          valid: false,
          decoded: null,
          expired: true,
          error: "Refresh token expired",
        };
      }
      return {
        valid: false,
        decoded: null,
        expired: false,
        error: error.message,
      };
    }
  }

  // Extract token from Authorization header
  extractTokenFromHeader(authHeader) {
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }
    return authHeader.substring(7);
  }

  // Decode token without verification (for debugging)
  decodeToken(token) {
    try {
      return jwt.decode(token, { complete: true });
    } catch (error) {
      return null;
    }
  }
}

// Create singleton instance
const jwtService = new JWTService();

// Legacy function wrappers for backward compatibility
const generateAccessToken = (user) => {
  return jwtService.generateAccessToken(user);
};

const verifyAccessToken = (token) => {
  const result = jwtService.verifyAccessToken(token);
  return result.valid;
};

module.exports = {
  JWTService: jwtService,
  generateAccessToken,
  verifyAccessToken,
  // New enhanced functions
  generateTokenPair: (user) => jwtService.generateTokenPair(user),
  verifyRefreshToken: (token) => jwtService.verifyRefreshToken(token),
  extractTokenFromHeader: (header) => jwtService.extractTokenFromHeader(header),
};
