const { MongoClient } = require("mongodb");

// Database connection
let db = null;
let client = null;

// Connect to MongoDB
async function connectDB() {
  try {
    const mongoUrl = process.env.MONGO_URL;
    const dbName = process.env.DB_NAME || "Sawaari";

    client = new MongoClient(mongoUrl);
    await client.connect();
    db = client.db(dbName);

    console.log("✅ Connected to MongoDB:", dbName);
    return db;
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);
    process.exit(1);
  }
}

// Get database instance
function getDB() {
  if (!db) {
    throw new Error("Database not connected. Call connectDB() first.");
  }
  return db;
}

// Close database connection
async function closeDB() {
  if (client) {
    await client.close();
    console.log("📴 Database connection closed");
  }
}

// User operations
async function createUser(userData) {
  const users = getDB().collection("users");
  const result = await users.insertOne({
    ...userData,
    createdAt: new Date(),
  });
  return result;
}

async function findUserByEmail(email) {
  const users = getDB().collection("users");
  return await users.findOne({ email: email.toLowerCase() });
}

// Ride buddy operations
async function saveRideRequest(requestData) {
  const rideBuddy = getDB().collection("rideBuddy");
  const result = await rideBuddy.insertOne({
    ...requestData,
    createdAt: new Date(),
    status: "active",
  });
  return result;
}

async function getAllRideRequests() {
  const rideBuddy = getDB().collection("rideBuddy");
  return await rideBuddy.find({ status: "active" }).toArray();
}

// Hotspots operations
async function getHotspots() {
  const hotspots = getDB().collection("hotspots");
  return await hotspots.find({}).toArray();
}

// Feedback operations
async function saveFeedback(feedbackData) {
  const feedbacks = getDB().collection("feedbacks");
  const result = await feedbacks.insertOne({
    ...feedbackData,
    createdAt: new Date(),
  });
  return result;
}

module.exports = {
  connectDB,
  getDB,
  closeDB,
  createUser,
  findUserByEmail,
  saveRideRequest,
  getAllRideRequests,
  getHotspots,
  saveFeedback,
};
