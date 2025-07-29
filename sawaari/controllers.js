const {
  createUser,
  findUserByEmail,
  getHotspots,
  saveFeedback,
} = require("./Backend/database");

// Import legacy functions from old database for backward compatibility
const { saveRideRequest, getAllRideRequests } = require("./database");

const { generateToken, hashPassword, comparePassword } = require("./auth");
const { JWTService } = require("./Backend/jwtToken");

// Home endpoint
async function home(req, res) {
  res.json({
    message: "SAWAARI API is running",
    version: "3.0.0",
    timestamp: new Date().toISOString(),
  });
}

// User signup
async function signup(req, res) {
  try {
    const { name, email, phone, password } = req.body;

    // Basic validation
    if (!name || !email || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email, phone, and password are required",
      });
    }

    // Validate phone number format
    if (!/^[6-9]\d{9}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message:
          "Please provide a valid 10-digit Indian mobile number starting with 6-9",
      });
    }

    // Check if user already exists
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists",
      });
    }

    // Check if phone number already exists
    const { dbService } = require("./Backend/database");
    const collection = await dbService.getCollection("users");
    const existingPhone = await collection.findOne({
      phone: phone.trim(),
      isActive: true,
    });
    if (existingPhone) {
      return res.status(400).json({
        success: false,
        message: "User with this phone number already exists",
      });
    }

    // Hash password and create user
    const hashedPassword = await hashPassword(password);
    const result = await createUser({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      password: hashedPassword,
    });

    res.status(201).json({
      success: true,
      message: "User created successfully",
      userId: result.insertedId,
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during signup",
    });
  }
}

// User signin
async function signin(req, res) {
  try {
    const { email, password } = req.body;

    // Basic validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // Find user
    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Check password
    const isValidPassword = await comparePassword(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Generate token using new JWTService
    const tokenPair = JWTService.generateTokenPair(user);

    res.json({
      success: true,
      message: "Login successful",
      token: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Signin error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during signin",
    });
  }
}

// Submit ride buddy request
async function submitRideRequest(req, res) {
  try {
    const {
      name,
      source,
      destination,
      gender,
      maxPassengers,
      maxWaitTime,
      smokingAllowed,
    } = req.body;
    const user = req.user; // From auth middleware

    // Basic validation
    if (!source || !destination || !gender) {
      return res.status(400).json({
        success: false,
        message: "Source, destination, and gender preference are required",
      });
    }

    // Save ride request
    const result = await saveRideRequest({
      userId: user.userId,
      userEmail: user.email,
      userName: user.name,
      name: name || user.name,
      source,
      destination,
      gender,
      maxPassengers: maxPassengers || 3,
      maxWaitTime: maxWaitTime || 15,
      smokingAllowed: smokingAllowed || false,
    });

    res.json({
      success: true,
      message: "Ride request submitted successfully",
      requestId: result.insertedId,
    });
  } catch (error) {
    console.error("Ride request error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while submitting ride request",
    });
  }
}

// Get all ride requests for matching
async function getRideRequests(req, res) {
  try {
    const requests = await getAllRideRequests();

    res.json({
      success: true,
      data: requests,
      count: requests.length,
    });
  } catch (error) {
    console.error("Get ride requests error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching ride requests",
    });
  }
}

// Get hotspots
async function getHotspotsData(req, res) {
  try {
    const hotspots = await getHotspots();

    res.json({
      success: true,
      data: hotspots,
      count: hotspots.length,
    });
  } catch (error) {
    console.error("Get hotspots error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching hotspots",
    });
  }
}

// Submit feedback
async function submitFeedback(req, res) {
  try {
    const feedbackData = req.body;

    const result = await saveFeedback(feedbackData);

    res.json({
      success: true,
      message: "Feedback submitted successfully",
      feedbackId: result.insertedId,
    });
  } catch (error) {
    console.error("Feedback error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while submitting feedback",
    });
  }
}

module.exports = {
  home,
  signup,
  signin,
  submitRideRequest,
  getRideRequests,
  getHotspotsData,
  submitFeedback,
};
