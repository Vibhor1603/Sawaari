const Graph = require("graphology");
const { dijkstra } = require("graphology-shortest-path");
const { v4: uuidv4 } = require("uuid");
const { getHotspots } = require("./database");

// Haversine distance calculation
function haversineDistance(lat1, lon1, lat2, lon2) {
  const toRadians = (degrees) => degrees * (Math.PI / 180);

  const R = 6371; // Radius of the Earth in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in kilometers

  return distance;
}

// Create graph from hotspots data
function createGraph(hotspots) {
  const graph = new Graph();

  // First, add all nodes to the graph
  hotspots.forEach((hotspot) => {
    graph.addNode(hotspot.name, {
      latitude: hotspot.latitude,
      longitude: hotspot.longitude,
    });
  });

  // Then, add edges
  hotspots.forEach((hotspot) => {
    if (hotspot.destinations && Array.isArray(hotspot.destinations)) {
      hotspot.destinations.forEach((destination) => {
        if (graph.hasNode(hotspot.name) && graph.hasNode(destination.name)) {
          const distance = haversineDistance(
            hotspot.latitude,
            hotspot.longitude,
            destination.latitude,
            destination.longitude
          );
          graph.addEdge(hotspot.name, destination.name, {
            weight: distance,
            fare: destination.estimated_fare || 0,
          });
        }
      });
    }
  });

  return graph;
}

// Fare calculation configuration
const FARE_CONFIG = {
  baseFare: 25, // Rs. 25 base fare
  perKmFare: 10, // Rs. 10 per km
  waitingTimeFare: 5, // Rs. 5 per minute waiting time
  nightMultiplier: 1.5, // 1.5x for night time (10 PM to 6 AM)
  peakMultiplier: 1.2, // 1.2x for peak hours (8-10 AM, 5-8 PM)
};

// Calculate fare based on distance and time
function calculateFare(distance, waitingTime = 0, travelTime = new Date()) {
  // Base calculations
  const baseFare = FARE_CONFIG.baseFare;
  const distanceFare = distance * FARE_CONFIG.perKmFare;
  const waitingFare = waitingTime * FARE_CONFIG.waitingTimeFare;

  // Calculate base total
  let subtotal = baseFare + distanceFare + waitingFare;

  // Time-based multipliers
  const hour = travelTime.getHours();
  let multiplier = 1.0;
  let timeType = "regular";

  // Night time: 10 PM to 6 AM (22:00 to 06:00)
  if (hour >= 22 || hour < 6) {
    multiplier = FARE_CONFIG.nightMultiplier;
    timeType = "night";
  }
  // Peak hours: 8-10 AM and 5-8 PM
  else if ((hour >= 8 && hour < 10) || (hour >= 17 && hour < 20)) {
    multiplier = FARE_CONFIG.peakMultiplier;
    timeType = "peak";
  }

  const finalFare = subtotal * multiplier;

  return {
    breakdown: {
      baseFare,
      distanceFare: Math.round(distanceFare),
      waitingFare: Math.round(waitingFare),
      subtotal: Math.round(subtotal),
      timeMultiplier: multiplier,
      timeType,
    },
    totalFare: Math.round(finalFare),
    distance,
    waitingTime,
  };
}

// Find shortest path between two points
function findShortestPath(
  graph,
  start,
  end,
  waitingTime = 0,
  travelTime = new Date()
) {
  try {
    const path = dijkstra.bidirectional(graph, start, end);

    let totalDistance = 0;
    if (path && path.length > 1) {
      for (let i = 0; i < path.length - 1; i++) {
        try {
          const edge = graph.edge(path[i], path[i + 1]);
          const distance = graph.getEdgeAttribute(edge, "weight") || 0;
          totalDistance += distance;
        } catch (edgeError) {
          console.warn(`Edge not found between ${path[i]} and ${path[i + 1]}`);
        }
      }
    }

    // Calculate fare using new fare calculation logic
    const fareResult = calculateFare(totalDistance, waitingTime, travelTime);

    return {
      path: path || [],
      totalDistance: Math.round(totalDistance * 100) / 100,
      fareBreakdown: fareResult.breakdown,
      totalFare: fareResult.totalFare,
    };
  } catch (error) {
    console.error("Error finding shortest path:", error);
    return { path: [], totalDistance: 0, totalFare: 0 };
  }
}

// Compare waypoints for route matching
function compareWaypoints(waypoints1, waypoints2) {
  if (!waypoints1 || !waypoints2) return 0;
  const minLength = Math.min(waypoints1.length, waypoints2.length);
  return waypoints1.slice(0, minLength).filter((wp, i) => wp === waypoints2[i])
    .length;
}

// Route Service Class
class RouteService {
  constructor() {
    this.graph = null;
    this.hotspots = null;
    this.lastUpdated = null;
  }

  // Initialize or refresh the graph
  async initializeGraph() {
    try {
      this.hotspots = await getHotspots();
      this.graph = createGraph(this.hotspots);
      this.lastUpdated = new Date();
      return {
        success: true,
        message: "Graph initialized successfully",
        nodeCount: this.graph.order,
        edgeCount: this.graph.size,
      };
    } catch (error) {
      console.error("Error initializing graph:", error);
      throw new Error("Failed to initialize route graph");
    }
  }

  // Get graph status
  getGraphStatus() {
    return {
      initialized: !!this.graph,
      nodeCount: this.graph ? this.graph.order : 0,
      edgeCount: this.graph ? this.graph.size : 0,
      lastUpdated: this.lastUpdated,
      hotspotsCount: this.hotspots ? this.hotspots.length : 0,
    };
  }

  // Calculate route between two points
  async calculateRoute(
    source,
    destination,
    waitingTime = 0,
    travelTime = new Date()
  ) {
    if (!this.graph) {
      await this.initializeGraph();
    }

    // Validate input
    if (!source || !destination) {
      throw new Error("Source and destination are required");
    }

    if (!this.graph.hasNode(source)) {
      throw new Error(`Source location '${source}' not found`);
    }

    if (!this.graph.hasNode(destination)) {
      throw new Error(`Destination location '${destination}' not found`);
    }

    if (source === destination) {
      throw new Error("Source and destination cannot be the same");
    }

    const result = findShortestPath(
      this.graph,
      source,
      destination,
      waitingTime,
      travelTime
    );

    if (!result.path || result.path.length === 0) {
      throw new Error(`No route found between ${source} and ${destination}`);
    }

    // Get coordinates for the path
    const pathCoordinates = result.path.map((nodeName) => {
      const nodeAttributes = this.graph.getNodeAttributes(nodeName);
      return {
        name: nodeName,
        latitude: nodeAttributes.latitude,
        longitude: nodeAttributes.longitude,
      };
    });

    return {
      success: true,
      data: {
        source,
        destination,
        path: result.path,
        pathCoordinates,
        totalFare: result.totalFare,
        fareBreakdown: result.fareBreakdown,
        distance: result.totalDistance,
        estimatedTime: this.estimateTime(result.path),
      },
    };
  }

  // Calculate fare estimates for different times
  async calculateFareEstimates(source, destination, waitingTime = 0) {
    if (!this.graph) {
      await this.initializeGraph();
    }

    // Get the route distance first
    const routeResult = await this.calculateRoute(
      source,
      destination,
      waitingTime
    );
    const distance = routeResult.data.distance;

    // Calculate fares for different time scenarios
    const now = new Date();
    const currentFare = calculateFare(distance, waitingTime, now);

    // Peak morning (9 AM)
    const peakMorning = new Date();
    peakMorning.setHours(9, 0, 0, 0);
    const peakMorningFare = calculateFare(distance, waitingTime, peakMorning);

    // Peak evening (6 PM)
    const peakEvening = new Date();
    peakEvening.setHours(18, 0, 0, 0);
    const peakEveningFare = calculateFare(distance, waitingTime, peakEvening);

    // Night time (11 PM)
    const nightTime = new Date();
    nightTime.setHours(23, 0, 0, 0);
    const nightFare = calculateFare(distance, waitingTime, nightTime);

    // Regular time (2 PM)
    const regularTime = new Date();
    regularTime.setHours(14, 0, 0, 0);
    const regularFare = calculateFare(distance, waitingTime, regularTime);

    return {
      success: true,
      data: {
        current: currentFare,
        estimates: {
          regular: regularFare,
          peakMorning: peakMorningFare,
          peakEvening: peakEveningFare,
          night: nightFare,
        },
        distance,
        waitingTime,
        route: routeResult.data,
      },
    };
  }

  // Calculate total distance of a path
  calculateTotalDistance(path) {
    if (!path || path.length < 2) return 0;

    let totalDistance = 0;
    for (let i = 0; i < path.length - 1; i++) {
      try {
        const edge = this.graph.edge(path[i], path[i + 1]);
        totalDistance += this.graph.getEdgeAttribute(edge, "weight") || 0;
      } catch (error) {
        console.warn(`Edge not found between ${path[i]} and ${path[i + 1]}`);
      }
    }
    return Math.round(totalDistance * 100) / 100; // Round to 2 decimal places
  }

  // Estimate travel time (assuming average speed of 25 km/h for auto rickshaw)
  estimateTime(path) {
    const distance = this.calculateTotalDistance(path);
    const averageSpeed = 25; // km/h
    const timeInHours = distance / averageSpeed;
    const timeInMinutes = Math.round(timeInHours * 60);
    return {
      minutes: timeInMinutes,
      formatted: `${Math.floor(timeInMinutes / 60)}h ${timeInMinutes % 60}m`,
    };
  }

  // Store route for ride buddy matching
  async storeRoute(userId, source, destination) {
    if (!this.graph) {
      await this.initializeGraph();
    }

    const routeResult = await this.calculateRoute(source, destination);

    const route = {
      id: uuidv4(),
      userId,
      source,
      destination,
      waypoints: routeResult.data.path,
      pathCoordinates: routeResult.data.pathCoordinates,
      totalFare: routeResult.data.totalFare,
      distance: routeResult.data.distance,
      estimatedTime: routeResult.data.estimatedTime,
      timestamp: new Date().toISOString(),
    };

    return route;
  }

  // Find matching routes for ride buddy
  async findMatchingRoutes(routeData, allRoutes) {
    if (!routeData || !allRoutes) {
      throw new Error("Route data and all routes are required");
    }

    const currentRoute = allRoutes.find((route) => route.id === routeData.id);

    if (!currentRoute) {
      throw new Error("Route not found");
    }

    const matches = allRoutes
      .filter((route) => route.id !== routeData.id)
      .map((route) => {
        const matchCount = compareWaypoints(
          currentRoute.waypoints,
          route.waypoints
        );
        const maxLength = Math.max(
          currentRoute.waypoints ? currentRoute.waypoints.length : 0,
          route.waypoints ? route.waypoints.length : 0
        );
        const matchPercentage =
          maxLength > 0 ? (matchCount / maxLength) * 100 : 0;

        return {
          userId: route.userId,
          matchPercentage: Number(matchPercentage.toFixed(2)),
          source: route.source,
          destination: route.destination,
          commonWaypoints: matchCount,
          totalWaypoints: maxLength,
          estimatedFare: route.totalFare,
          distance: route.distance,
        };
      })
      .filter((match) => match.matchPercentage > 40) // 40% match threshold
      .sort((a, b) => b.matchPercentage - a.matchPercentage); // Sort by match percentage

    return matches;
  }

  // Get available locations
  getAvailableLocations() {
    if (!this.graph) {
      return [];
    }

    return this.graph
      .nodes()
      .map((nodeName) => {
        const attributes = this.graph.getNodeAttributes(nodeName);
        return {
          name: nodeName,
          latitude: attributes.latitude,
          longitude: attributes.longitude,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  // Get route suggestions based on popularity or distance
  getRouteSuggestions(from, limit = 5) {
    if (!this.graph || !from || !this.graph.hasNode(from)) {
      return [];
    }

    const neighbors = this.graph.neighbors(from);
    return neighbors
      .map((neighbor) => {
        const edge = this.graph.edge(from, neighbor);
        const attributes = this.graph.getNodeAttributes(neighbor);
        return {
          name: neighbor,
          latitude: attributes.latitude,
          longitude: attributes.longitude,
          distance: this.graph.getEdgeAttribute(edge, "weight"),
          fare: this.graph.getEdgeAttribute(edge, "fare"),
        };
      })
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit);
  }
}

// Create singleton instance
const routeService = new RouteService();

module.exports = {
  routeService,
  haversineDistance,
  createGraph,
  findShortestPath,
  compareWaypoints,
  calculateFare,
  FARE_CONFIG,
};
