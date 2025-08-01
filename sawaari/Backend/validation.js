const Joi = require("joi");

// User registration validation
const signUpSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(50)
    .pattern(/^[a-zA-Z\s]+$/)
    .required()
    .messages({
      "string.pattern.base": "Name should only contain letters and spaces",
      "string.min": "Name must be at least 2 characters long",
      "string.max": "Name cannot exceed 50 characters",
    }),

  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      "string.email": "Please provide a valid email address",
    }),

  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .messages({
      "string.pattern.base":
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
      "string.min": "Password must be at least 8 characters long",
      "string.max": "Password cannot exceed 128 characters",
    }),

  confirmPassword: Joi.string().valid(Joi.ref("password")).required().messages({
    "any.only": "Passwords do not match",
  }),

  phone: Joi.string()
    .pattern(/^[6-9]\d{9}$/)
    .optional()
    .messages({
      "string.pattern.base":
        "Please provide a valid 10-digit Indian phone number",
    }),
});

// User login validation
const signInSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      "string.email": "Please provide a valid email address",
    }),

  password: Joi.string().min(1).required().messages({
    "string.empty": "Password is required",
  }),
});

// Feedback validation
const feedbackSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(50)
    .pattern(/^[a-zA-Z\s]+$/)
    .required()
    .messages({
      "string.pattern.base": "Name should only contain letters and spaces",
    }),

  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      "string.email": "Please provide a valid email address",
    }),

  message: Joi.string().min(10).max(1000).required().messages({
    "string.min": "Message must be at least 10 characters long",
    "string.max": "Message cannot exceed 1000 characters",
  }),

  rating: Joi.number().integer().min(1).max(5).optional(),
});

// Ride buddy validation
const rideBuddySchema = Joi.object({
  id: Joi.string().uuid().optional(),
  userId: Joi.string().min(2).max(50).required(),
  source: Joi.string().min(2).max(100).required(),
  destination: Joi.string().min(2).max(100).required(),
  waypoints: Joi.array().items(Joi.string()).optional(),
  pathCoordinates: Joi.array()
    .items(
      Joi.object({
        name: Joi.string().required(),
        latitude: Joi.number().required(),
        longitude: Joi.number().required(),
      })
    )
    .optional(),
  totalFare: Joi.number().min(0).optional(),
  fareBreakdown: Joi.object({
    baseFare: Joi.number().min(0).optional(),
    distanceFare: Joi.number().min(0).optional(),
    waitingFare: Joi.number().min(0).optional(),
    subtotal: Joi.number().min(0).optional(),
    timeMultiplier: Joi.number().min(1).optional(),
    timeType: Joi.string().valid("regular", "peak", "night").optional(),
  }).optional(),
  distance: Joi.number().min(0).optional(),
  estimatedTime: Joi.object({
    minutes: Joi.number().min(0).optional(),
    formatted: Joi.string().optional(),
  }).optional(),
  timestamp: Joi.string().isoDate().optional(),
  userEmail: Joi.string().email().optional(),
  preferences: Joi.object({
    maxPassengers: Joi.number().integer().min(1).max(10).optional(),
    gender: Joi.string().valid("any", "male", "female").optional(),
    smokingAllowed: Joi.boolean().optional(),
    maxWaitTime: Joi.number().integer().min(1).max(60).optional(),
  }).optional(),
  dbId: Joi.string().optional(),
}).unknown(true); // Allow unknown fields for flexibility

// Token refresh validation
const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required().messages({
    "string.empty": "Refresh token is required",
  }),
});

// Route search validation
const routeSearchSchema = Joi.object({
  source: Joi.string().min(2).max(100).required(),
  destination: Joi.string().min(2).max(100).required(),
});

// Store route validation
const storeRouteSchema = Joi.object({
  userId: Joi.string().min(2).max(50).optional(), // Optional as it can come from auth
  source: Joi.string().min(2).max(100).required(),
  destination: Joi.string().min(2).max(100).required(),
});

// Find matching routes validation
const findMatchingRoutesSchema = Joi.object({
  routeData: Joi.object({
    id: Joi.string().uuid().optional(),
    userId: Joi.string().required(),
    source: Joi.string().required(),
    destination: Joi.string().required(),
    waypoints: Joi.array().items(Joi.string()).optional(),
    pathCoordinates: Joi.array()
      .items(
        Joi.object({
          name: Joi.string().required(),
          latitude: Joi.number().required(),
          longitude: Joi.number().required(),
        })
      )
      .optional(),
    totalFare: Joi.number().min(0).optional(),
    fareBreakdown: Joi.object({
      baseFare: Joi.number().min(0).optional(),
      distanceFare: Joi.number().min(0).optional(),
      waitingFare: Joi.number().min(0).optional(),
      subtotal: Joi.number().min(0).optional(),
      timeMultiplier: Joi.number().min(1).optional(),
      timeType: Joi.string().valid("regular", "peak", "night").optional(),
    }).optional(),
    distance: Joi.number().min(0).optional(),
    estimatedTime: Joi.object({
      minutes: Joi.number().min(0).optional(),
      formatted: Joi.string().optional(),
    }).optional(),
    timestamp: Joi.string().isoDate().optional(),
    userEmail: Joi.string().email().optional(),
    preferences: Joi.object({
      maxPassengers: Joi.number().integer().min(1).max(10).optional(),
      gender: Joi.string().valid("any", "male", "female").optional(),
      smokingAllowed: Joi.boolean().optional(),
      maxWaitTime: Joi.number().integer().min(1).max(60).optional(),
    }).optional(),
  })
    .unknown(true)
    .required(), // Allow unknown fields for flexibility
});

// Fare estimation validation
const fareEstimationSchema = Joi.object({
  source: Joi.string().min(2).max(100).required(),
  destination: Joi.string().min(2).max(100).required(),
  waitingTime: Joi.number().integer().min(0).max(120).optional().default(0),
});

// Route suggestions validation (query parameters)
const routeSuggestionsQuerySchema = Joi.object({
  from: Joi.string().min(2).max(100).required(),
  limit: Joi.number().integer().min(1).max(20).optional(),
});

// Ride buddy search validation
const rideBuddySearchSchema = Joi.object({
  source: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    coordinates: Joi.array().items(Joi.number()).length(2).optional(),
    distance: Joi.number().min(0).optional(),
    estimatedFare: Joi.number().min(0).optional(),
    waypoints: Joi.array().items(Joi.string()).optional(),
  }).required(),

  destination: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    coordinates: Joi.array().items(Joi.number()).length(2).optional(),
  }).required(),

  preferences: Joi.object({
    searchRadius: Joi.number().min(1).max(50).optional(),
    maxPassengers: Joi.number().integer().min(1).max(10).optional(),
    gender: Joi.string().valid("any", "male", "female").optional(),
    smokingAllowed: Joi.boolean().optional(),
    maxWaitTime: Joi.number().integer().min(1).max(60).optional(),
  }).optional(),
});

// Ride buddy request validation
const rideBuddyRequestSchema = Joi.object({
  receiverId: Joi.string().required(),
  routeDetails: Joi.object({
    senderRoute: Joi.object().required(),
    receiverRoute: Joi.object().required(),
    overlapPercentage: Joi.number().min(0).max(100).required(),
    sharedDistance: Joi.number().min(0).required(),
    estimatedSharedFare: Joi.number().min(0).required(),
  }).required(),
  message: Joi.string().max(500).allow("").optional(),
});

// Ride buddy request response validation
const rideBuddyRequestResponseSchema = Joi.object({
  action: Joi.string().valid("accept", "decline").required(),
  message: Joi.string().max(500).allow("").optional(),
});

// User blocking validation
const blockUserSchema = Joi.object({
  blockedUserId: Joi.string().required().messages({
    "string.empty": "User ID to block is required",
  }),
  reason: Joi.string().max(200).optional().messages({
    "string.max": "Reason cannot exceed 200 characters",
  }),
});

// User reporting validation
const reportUserSchema = Joi.object({
  reportedUserId: Joi.string().required().messages({
    "string.empty": "User ID to report is required",
  }),
  reason: Joi.string().min(5).max(100).required().messages({
    "string.min": "Reason must be at least 5 characters",
    "string.max": "Reason cannot exceed 100 characters",
  }),
  description: Joi.string().max(500).optional().messages({
    "string.max": "Description cannot exceed 500 characters",
  }),
  category: Joi.string()
    .valid(
      "harassment",
      "spam",
      "inappropriate",
      "fake_profile",
      "safety",
      "other"
    )
    .default("other")
    .messages({
      "any.only": "Invalid report category",
    }),
});

// Chat message validation
const chatMessageSchema = Joi.object({
  message: Joi.string()
    .min(1)
    .max(500)
    .required()
    .custom((value, helpers) => {
      // Check for spam patterns
      const spamPatterns = [
        /(.)\1{10,}/i, // Repeated characters
        /(https?:\/\/[^\s]+){3,}/i, // Multiple URLs
        /\b(call|text|whatsapp)\s*\+?\d{10,}/i, // Phone numbers
      ];

      if (spamPatterns.some((pattern) => pattern.test(value))) {
        return helpers.error("custom.spam");
      }

      return value;
    })
    .messages({
      "string.min": "Message cannot be empty",
      "string.max": "Message cannot exceed 500 characters",
      "custom.spam": "Message appears to be spam",
    }),
  chatId: Joi.string().required().messages({
    "string.empty": "Chat ID is required",
  }),
});

// Enhanced user profile validation for security
const updateProfileSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(50)
    .pattern(/^[a-zA-Z\s]+$/)
    .optional()
    .messages({
      "string.pattern.base": "Name should only contain letters and spaces",
    }),
  phone: Joi.string()
    .pattern(/^[6-9]\d{9}$/)
    .optional()
    .messages({
      "string.pattern.base":
        "Please provide a valid 10-digit Indian phone number",
    }),
  preferences: Joi.object({
    maxPassengers: Joi.number().integer().min(1).max(10).optional(),
    gender: Joi.string().valid("any", "male", "female").optional(),
    smokingAllowed: Joi.boolean().optional(),
    maxWaitTime: Joi.number().integer().min(1).max(60).optional(),
  }).optional(),
});

module.exports = {
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
  rideBuddySearchSchema,
  rideBuddyRequestSchema,
  rideBuddyRequestResponseSchema,
  blockUserSchema,
  reportUserSchema,
  chatMessageSchema,
  updateProfileSchema,
};
