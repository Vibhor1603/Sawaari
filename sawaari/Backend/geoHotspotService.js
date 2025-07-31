// Geolocation-based Hotspot Service for efficient map loading
const { dbService } = require("./database");

class GeoHotspotService {
  constructor() {
    this.EARTH_RADIUS_KM = 6371;
    this.DEFAULT_RADIUS_KM = 5; // Default search radius in kilometers
    this.MAX_HOTSPOTS_PER_REQUEST = 50; // Limit hotspots per request
  }

  // Convert degrees to radians
  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  // Calculate distance between two points using Haversine formula
  calculateDistance(lat1, lon1, lat2, lon2) {
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return this.EARTH_RADIUS_KM * c;
  }

  // Get hotspots within a bounding box (for map viewport)
  async getHotspotsInBounds(bounds, zoom = 10) {
    try {
      const { north, south, east, west } = bounds;

      // Validate bounds
      if (!north || !south || !east || !west) {
        throw new Error("Invalid bounds provided");
      }

      console.log(
        `🗺️ Fetching hotspots for bounds: N:${north}, S:${south}, E:${east}, W:${west}, Zoom:${zoom}`
      );

      // Adjust limit based on zoom level (more hotspots for higher zoom)
      const limit = Math.min(
        this.MAX_HOTSPOTS_PER_REQUEST,
        Math.floor(zoom * 5)
      );

      // Query hotspots within bounding box
      const collection = await dbService.getCollection("hotspots");
      const hotspots = await collection
        .find({
          latitude: { $gte: south, $lte: north },
          longitude: { $gte: west, $lte: east },
          isActive: { $ne: false }, // Only active hotspots
        })
        .limit(limit)
        .toArray();

      console.log(`✅ Found ${hotspots.length} hotspots in bounds`);

      // Transform data for frontend
      const transformedHotspots = hotspots.map((hotspot) => ({
        _id: hotspot._id,
        name: hotspot.name,
        latitude: hotspot.latitude,
        longitude: hotspot.longitude,
        color_code: hotspot.color_code || "#00ff88",
        destinations: hotspot.destinations || [],
        metadata: {
          lastUpdated: hotspot.lastUpdated,
          popularity: hotspot.popularity || 0,
          averageWaitTime: hotspot.averageWaitTime || 5,
        },
      }));

      return {
        success: true,
        data: transformedHotspots,
        count: transformedHotspots.length,
        bounds: bounds,
        zoom: zoom,
      };
    } catch (error) {
      console.error("❌ Error fetching hotspots by bounds:", error);
      return {
        success: false,
        error: error.message,
        data: [],
      };
    }
  }

  // Get hotspots near a specific location (for user location-based loading)
  async getHotspotsNearLocation(latitude, longitude, radiusKm = null) {
    try {
      const radius = radiusKm || this.DEFAULT_RADIUS_KM;

      console.log(
        `📍 Fetching hotspots near location: ${latitude}, ${longitude} within ${radius}km`
      );

      // Calculate bounding box for efficient querying
      const latDelta = radius / 111; // Approximate km per degree latitude
      const lonDelta = radius / (111 * Math.cos(this.toRadians(latitude)));

      const bounds = {
        north: latitude + latDelta,
        south: latitude - latDelta,
        east: longitude + lonDelta,
        west: longitude - lonDelta,
      };

      // Get hotspots in bounding box first
      const collection = await dbService.getCollection("hotspots");
      const candidateHotspots = await collection
        .find({
          latitude: { $gte: bounds.south, $lte: bounds.north },
          longitude: { $gte: bounds.west, $lte: bounds.east },
          isActive: { $ne: false },
        })
        .toArray();

      // Filter by exact distance and sort by proximity
      const nearbyHotspots = candidateHotspots
        .map((hotspot) => ({
          ...hotspot,
          distance: this.calculateDistance(
            latitude,
            longitude,
            hotspot.latitude,
            hotspot.longitude
          ),
        }))
        .filter((hotspot) => hotspot.distance <= radius)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, this.MAX_HOTSPOTS_PER_REQUEST);

      console.log(`✅ Found ${nearbyHotspots.length} hotspots near location`);

      // Transform data for frontend
      const transformedHotspots = nearbyHotspots.map((hotspot) => ({
        _id: hotspot._id,
        name: hotspot.name,
        latitude: hotspot.latitude,
        longitude: hotspot.longitude,
        color_code: hotspot.color_code || "#00ff88",
        destinations: hotspot.destinations || [],
        distance: hotspot.distance,
        metadata: {
          lastUpdated: hotspot.lastUpdated,
          popularity: hotspot.popularity || 0,
          averageWaitTime: hotspot.averageWaitTime || 5,
        },
      }));

      return {
        success: true,
        data: transformedHotspots,
        count: transformedHotspots.length,
        center: { latitude, longitude },
        radius: radius,
      };
    } catch (error) {
      console.error("❌ Error fetching nearby hotspots:", error);
      return {
        success: false,
        error: error.message,
        data: [],
      };
    }
  }

  // Initialize geospatial indexes for better performance
  async initializeGeoIndexes() {
    try {
      const collection = await dbService.getCollection("hotspots");

      // Create 2dsphere index for geospatial queries
      await collection.createIndex({
        location: "2dsphere",
      });

      // Create compound index for latitude/longitude queries
      await collection.createIndex({
        latitude: 1,
        longitude: 1,
      });

      // Create index for active hotspots
      await collection.createIndex({
        isActive: 1,
      });

      console.log("✅ Geospatial indexes initialized successfully");
      return true;
    } catch (error) {
      console.error("❌ Error initializing geo indexes:", error);
      return false;
    }
  }

  // Update hotspot data structure to support geolocation
  async migrateHotspotsToGeoFormat() {
    try {
      const collection = await dbService.getCollection("hotspots");

      // Find hotspots without geolocation format
      const hotspots = await collection
        .find({
          location: { $exists: false },
        })
        .toArray();

      console.log(`🔄 Migrating ${hotspots.length} hotspots to geo format`);

      for (const hotspot of hotspots) {
        if (hotspot.latitude && hotspot.longitude) {
          await collection.updateOne(
            { _id: hotspot._id },
            {
              $set: {
                location: {
                  type: "Point",
                  coordinates: [hotspot.longitude, hotspot.latitude],
                },
                isActive: hotspot.isActive !== false,
                lastUpdated: new Date(),
                popularity: hotspot.popularity || 0,
                averageWaitTime: hotspot.averageWaitTime || 5,
              },
            }
          );
        }
      }

      console.log("✅ Hotspot migration completed");
      return true;
    } catch (error) {
      console.error("❌ Error migrating hotspots:", error);
      return false;
    }
  }

  // Get hotspot statistics for admin/monitoring
  async getHotspotStats() {
    try {
      const collection = await dbService.getCollection("hotspots");

      const stats = await collection
        .aggregate([
          {
            $group: {
              _id: null,
              totalHotspots: { $sum: 1 },
              activeHotspots: {
                $sum: { $cond: [{ $ne: ["$isActive", false] }, 1, 0] },
              },
              averageDestinations: { $avg: { $size: "$destinations" } },
              totalDestinations: { $sum: { $size: "$destinations" } },
            },
          },
        ])
        .toArray();

      return {
        success: true,
        data: stats[0] || {
          totalHotspots: 0,
          activeHotspots: 0,
          averageDestinations: 0,
          totalDestinations: 0,
        },
      };
    } catch (error) {
      console.error("❌ Error getting hotspot stats:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

// Create singleton instance
const geoHotspotService = new GeoHotspotService();

module.exports = geoHotspotService;
