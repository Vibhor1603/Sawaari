const { initializeRideBuddyIndexes } = require("./database");

// Script to initialize ride buddy database collections and indexes
async function initializeDatabase() {
  console.log("Initializing Ride Buddy database collections and indexes...");

  try {
    await initializeRideBuddyIndexes();
    console.log("✅ Ride Buddy database initialization completed successfully");
    process.exit(0);
  } catch (error) {
    console.error("❌ Failed to initialize Ride Buddy database:", error);
    process.exit(1);
  }
}

// Run initialization if this script is executed directly
if (require.main === module) {
  initializeDatabase();
}

module.exports = { initializeDatabase };
