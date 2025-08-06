const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const { JWTService } = require("./jwtToken");
const validator = require("validator");
require("dotenv").config();

// Rate limiting middleware
const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        error: "Too many requests",
        message,
        retryAfter: Math.ceil(windowMs / 1000),
      });
    },
  });
};

// Authentication rate limiter - more lenient for testing
const authLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  50, // 50 attempts (increased from 5 for testing)
  "Too many authentication attempts, please try again later"
);

// General API rate limiter - very lenient for testing
const apiLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  1000, // 1000 requests (increased for testing)
  "Too many API requests, please try again later"
);

// Hotspots specific rate limiter - very lenient for map interactions
const hotspotsLimiter = createRateLimiter(
  5 * 60 * 1000, // 5 minutes
  100, // 100 requests for hotspots
  "Too many hotspot requests, please slow down"
);

// Ride buddy specific rate limiter - more lenient for testing
const rideBuddyLimiter = createRateLimiter(
  5 * 60 * 1000, // 5 minutes
  100, // 100 requests (increased from 10 for testing)
  "Too many ride buddy requests, please slow down"
);

// Chat rate limiter - prevent message spam
const chatLimiter = createRateLimiter(
  1 * 60 * 1000, // 1 minute
  30, // 30 messages
  "Too many messages, please slow down"
);

// Report/Block rate limiter - prevent abuse
const securityActionLimiter = createRateLimiter(
  60 * 60 * 1000, // 1 hour
  5, // 5 actions
  "Too many security actions, please try again later"
);

// Security headers middleware
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: [
        "'self'",
        process.env.FRONTEND_URL || "http://localhost:3000",
      ],
    },
  },
  crossOriginEmbedderPolicy: false,
});

// Input validation middleware
const validateInput = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: "Validation failed",
        details: error.details.map((detail) => detail.message),
      });
    }
    next();
  };
};

// Sanitize input middleware
const sanitizeInput = (req, res, next) => {
  const sanitizeObject = (obj) => {
    for (let key in obj) {
      if (typeof obj[key] === "string") {
        obj[key] = validator.escape(obj[key].trim());
      } else if (typeof obj[key] === "object" && obj[key] !== null) {
        sanitizeObject(obj[key]);
      }
    }
  };

  if (req.body) sanitizeObject(req.body);
  if (req.query) sanitizeObject(req.query);
  if (req.params) sanitizeObject(req.params);

  next();
};

// JWT Authentication middleware
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = JWTService.extractTokenFromHeader(authHeader);

    if (!token) {
      return res.status(401).json({
        error: "Access denied",
        message: "No token provided",
      });
    }

    const verification = JWTService.verifyAccessToken(token);

    if (!verification.valid) {
      if (verification.expired) {
        return res.status(401).json({
          error: "Token expired",
          message: "Please refresh your token",
          code: "TOKEN_EXPIRED",
        });
      }
      return res.status(403).json({
        error: "Invalid token",
        message: verification.error,
      });
    }

    req.user = verification.decoded;
    next();
  } catch (error) {
    return res.status(500).json({
      error: "Authentication error",
      message: "Internal server error during authentication",
    });
  }
};

// Optional authentication (for routes that work with or without auth)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = JWTService.extractTokenFromHeader(authHeader);

    if (token) {
      const verification = JWTService.verifyAccessToken(token);
      if (verification.valid) {
        req.user = verification.decoded;
      }
    }

    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

// Error handling middleware
const errorHandler = (err, req, res, next) => {
  console.error("Error:", err);

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      error: "Invalid token",
      message: "The provided token is malformed",
    });
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      error: "Token expired",
      message: "Please refresh your token",
      code: "TOKEN_EXPIRED",
    });
  }

  // Validation errors
  if (err.name === "ValidationError") {
    return res.status(400).json({
      error: "Validation failed",
      message: err.message,
    });
  }

  // Database errors
  if (err.name === "MongoError" || err.name === "MongoServerError") {
    return res.status(500).json({
      error: "Database error",
      message: "An error occurred while processing your request",
    });
  }

  // Default error
  res.status(500).json({
    error: "Internal server error",
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Something went wrong",
  });
};

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      process.env.FRONTEND_URL || "http://localhost:3000",
      "http://localhost:5173", // Vite default
      "http://127.0.0.1:3000",
      "http://127.0.0.1:5173",
    ];

    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  exposedHeaders: ["X-Total-Count"],
};

module.exports = {
  authLimiter,
  apiLimiter,
  hotspotsLimiter,
  rideBuddyLimiter,
  chatLimiter,
  securityActionLimiter,
  securityHeaders,
  validateInput,
  sanitizeInput,
  authenticateToken,
  optionalAuth,
  errorHandler,
  corsOptions,
};
