const { dbService } = require("./database");
const { ObjectId } = require("mongodb");

async function addTestRoutes() {
  try {
    const collection = await dbService.getCollection("rideBuddyRoutes");

    // Clear existing test routes
    await collection.deleteMany({ isTestData: true });

    // Add some test routes
    const testRoutes = [
      {
        userId: new ObjectId(),
        userName: "Test User 1",
        source: {
          name: "ABES Engineering College",
          coordinates: [28.6362, 77.4963],
        },
        destination: {
          name: "Sector 62 Noida",
          coordinates: [28.6266, 77.3666],
        },
        isTestData: true,
        createdAt: new Date(),
      },
      {
        userId: new ObjectId(),
        userName: "Test User 2",
        source: {
          name: "ABES Engineering College",
          coordinates: [28.6362, 77.4963],
        },
        destination: {
          name: "Sector 52 Noida",
          coordinates: [28.5891, 77.3595],
        },
        isTestData: true,
        createdAt: new Date(),
      },
      {
        userId: new ObjectId(),
        userName: "Test User 3",
        source: {
          name: "Sector 62 Noida",
          coordinates: [28.6266, 77.3666],
        },
        destination: {
          name: "Sector 52 Noida",
          coordinates: [28.5891, 77.3595],
        },
        isTestData: true,
        createdAt: new Date(),
      },
    ];

    const result = await collection.insertMany(testRoutes);
    console.log(`✅ Added ${result.insertedCount} test routes`);
    return result;
  } catch (error) {
    console.error("Failed to add test routes:", error);
    throw error;
  }
}

// Add debug logging to route matching
async function findActiveRoutes() {
  try {
    const collection = await dbService.getCollection("rideBuddyRoutes");
    const routes = await collection
      .find({
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Last 24 hours
      })
      .toArray();

    console.log(`🔍 Found ${routes.length} active routes`);
    routes.forEach((route, index) => {
      console.log(`Route ${index + 1}:`, {
        userId: route.userId,
        userName: route.userName,
        source: route.source?.name,
        destination: route.destination?.name,
      });
    });

    return routes;
  } catch (error) {
    console.error("Failed to find active routes:", error);
    throw error;
  }
}

module.exports = {
  addTestRoutes,
  findActiveRoutes,
};
