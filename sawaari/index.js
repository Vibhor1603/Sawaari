const express = require("express");
const cors = require("cors");
const http = require("http");
const socketIo = require("socket.io");
const { dbService } = require("./Backend/database");
const routes = require("./router/route");
const chatService = require("./Backend/chatService");
const realTimeRideBuddyService = require("./Backend/realTimeRideBuddy");
const scheduledCleanupService = require("./Backend/scheduledCleanup");
const connectionCleanupService = require("./Backend/connectionCleanupService");
const performanceMonitor = require("./Backend/performanceMonitor");
const { rideBuddyCacheService } = require("./Backend/cacheService");
require("dotenv").config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: [
      "http://localhost:3000",
      "http://localhost:5173", // Vite default port
      "http://127.0.0.1:3000",
      "http://127.0.0.1:5173",
      "https://sawaari.vercel.app",
      "https://sawaari-vibhor-sharmas-projects.vercel.app",
      "https://sawaari-nums1xo72-vibhor-sharmas-projects.vercel.app",
    ],
    methods: ["GET", "POST", "PUT"],
    credentials: true,
  },
});

const port = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:5173", // Vite default port
      "http://127.0.0.1:3000",
      "http://127.0.0.1:5173",
      "https://sawaari.vercel.app",
      "https://sawaari-vibhor-sharmas-projects.vercel.app",
      "https://sawaari-nums1xo72-vibhor-sharmas-projects.vercel.app",
    ],
    credentials: true,
  })
);

// Performance monitoring middleware
app.use(performanceMonitor.middleware());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging (development only)
if (process.env.NODE_ENV === "development") {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
    next();
  });
}

// Performance monitoring endpoints
app.get("/api/performance/summary", (req, res) => {
  try {
    const summary = performanceMonitor.getSummary();
    res.json({
      success: true,
      data: summary,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to get performance summary",
    });
  }
});

app.get("/api/performance/cache", (req, res) => {
  try {
    const cacheStats = rideBuddyCacheService.getStats();
    res.json({
      success: true,
      data: cacheStats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to get cache statistics",
    });
  }
});

// Routes
app.use("/", routes);

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
});

// Start server
async function startServer() {
  try {
    // Connect to database first
    await dbService.connect();

    // Initialize optimized database indexes
    const { initializeRideBuddyIndexes } = require("./Backend/database");
    await initializeRideBuddyIndexes();

    // Initialize route service
    const { routeService } = require("./Backend/routeService");
    const graphResult = await routeService.initializeGraph();

    if (graphResult.success) {
      console.log("✅ Route service initialized successfully");
    } else {
      console.log(
        "⚠️ Route service initialized with fallback (some features may be limited)"
      );
      console.log(`   Reason: ${graphResult.message}`);
    }

    // Initialize performance monitoring
    performanceMonitor.start();

    // Initialize Socket.IO with chat service
    chatService.initializeSocket(io);

    // Initialize real-time ride buddy service
    realTimeRideBuddyService.initialize(io);
    realTimeRideBuddyService.startPeriodicCleanup();

    // Initialize scheduled cleanup service for security and data maintenance
    scheduledCleanupService.initialize();

    // Initialize connection cleanup service for expired ride buddy connections
    connectionCleanupService.start();

    // Start server with Socket.IO
    server.listen(port, () => {
      console.log(`🚀 SAWAARI API Server running on port ${port}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(
        `🔗 Frontend URL: ${
          process.env.FRONTEND_URL || "http://localhost:3000"
        }`
      );
      console.log(`🔌 Socket.IO server initialized for real-time features`);
      console.log(`🔔 Real-time ride buddy notifications enabled`);
      console.log(`📊 Performance monitoring active`);
      console.log(`🚀 Cache service initialized`);

      // Log initial performance summary
      setTimeout(() => {
        const summary = performanceMonitor.getSummary();
        console.log(
          `📈 Server ready - Memory: ${summary.memory.current.heapUsed}MB`
        );
      }, 1000);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Graceful shutdown with proper cleanup
const gracefulShutdown = async (signal) => {
  console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);

  try {
    // Stop accepting new connections
    server.close(() => {
      console.log("✅ HTTP server closed");
    });

    // Stop performance monitoring
    performanceMonitor.stop();
    console.log("✅ Performance monitoring stopped");

    // Shutdown cache service
    rideBuddyCacheService.shutdown();
    console.log("✅ Cache service shutdown");

    // Stop scheduled cleanup
    scheduledCleanupService.stop?.();
    console.log("✅ Scheduled cleanup stopped");

    // Stop real-time services
    realTimeRideBuddyService.stopPeriodicCleanup?.();
    console.log("✅ Real-time services stopped");

    // Close Socket.IO connections
    io.close(() => {
      console.log("✅ Socket.IO server closed");
    });

    console.log("🎯 Graceful shutdown completed");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error during shutdown:", error);
    process.exit(1);
  }
};

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

startServer();
