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

// Clean and deduplicate hotspots data - keep the one with most destinations
function cleanHotspotsData(hotspots) {
  const hotspotsMap = new Map();

  let invalidCount = 0;
  hotspots.forEach((hotspot) => {
    if (!hotspot.name || !hotspot.latitude || !hotspot.longitude) {
      console.log(`⚠️ Skipping invalid hotspot:`, hotspot);
      invalidCount++;
      return;
    }

    const key = hotspot.name.trim();
    const destinationCount = (hotspot.destinations || []).length;

    if (!hotspotsMap.has(key)) {
      // First occurrence of this hotspot
      hotspotsMap.set(key, {
        ...hotspot,
        name: key,
        destinations: hotspot.destinations || [],
        destinationCount,
      });
    } else {
      // Duplicate found - keep the one with more destinations
      const existing = hotspotsMap.get(key);
      const existingDestCount = existing.destinationCount;

      if (destinationCount > existingDestCount) {
        // Current hotspot has more destinations, replace the existing one
        hotspotsMap.set(key, {
          ...hotspot,
          name: key,
          destinations: hotspot.destinations || [],
          destinationCount,
        });
        console.log(
          `🔄 Replaced duplicate hotspot "${key}": ${existingDestCount} -> ${destinationCount} destinations`
        );
      } else {
        console.log(
          `⚠️ Skipping duplicate hotspot "${key}": keeping existing with ${existingDestCount} destinations (current has ${destinationCount})`
        );
      }
    }
  });

  // Convert map back to array and remove the helper property
  const cleaned = Array.from(hotspotsMap.values()).map((hotspot) => {
    const { destinationCount, ...cleanHotspot } = hotspot;
    return cleanHotspot;
  });

  const removedCount = hotspots.length - cleaned.length;
  console.log(
    `🧹 Cleaned hotspots: ${hotspots.length} -> ${
      cleaned.length
    } (removed ${removedCount} total: ${invalidCount} invalid + ${
      removedCount - invalidCount
    } duplicates)`
  );

  if (removedCount > 0) {
    console.log(
      "📋 Some hotspots were removed due to invalid data or duplicate names"
    );
  }

  return cleaned;
}

// Create graph from hotspots data
function createGraph(hotspots) {
  const graph = new Graph();

  // Clean and deduplicate hotspots data first
  const cleanedHotspots = cleanHotspotsData(hotspots);

  // Add all hotspot nodes to the graph
  console.log("📍 Adding hotspot nodes to graph:");
  cleanedHotspots.forEach((hotspot, index) => {
    try {
      graph.addNode(hotspot.name, {
        latitude: hotspot.latitude,
        longitude: hotspot.longitude,
      });
      if (index < 10) {
        // Log first 10 nodes
        console.log(`  ${index + 1}. "${hotspot.name}"`);
      }
    } catch (error) {
      console.log(
        `⚠️ Failed to add hotspot node ${hotspot.name}:`,
        error.message
      );
    }
  });

  // Add all destination nodes to the graph
  console.log("📍 Adding destination nodes to graph:");
  let destinationCount = 0;
  cleanedHotspots.forEach((hotspot) => {
    if (hotspot.destinations && Array.isArray(hotspot.destinations)) {
      hotspot.destinations.forEach((destination) => {
        if (!graph.hasNode(destination.name)) {
          try {
            graph.addNode(destination.name, {
              latitude: destination.latitude,
              longitude: destination.longitude,
            });
            destinationCount++;
            if (destinationCount <= 10) {
              console.log(`  ${destinationCount}. "${destination.name}"`);
            }
          } catch (error) {
            console.log(
              `⚠️ Failed to add destination node ${destination.name}:`,
              error.message
            );
          }
        }
      });
    }
  });

  console.log(
    `✅ Added ${cleanedHotspots.length} hotspot nodes and ${destinationCount} destination nodes`
  );

  // Then, add edges (with duplicate prevention)
  console.log("🔗 Creating edges between nodes:");
  const addedEdges = new Set();
  let successfulEdges = 0;
  let failedEdges = 0;

  cleanedHotspots.forEach((hotspot) => {
    if (hotspot.destinations && Array.isArray(hotspot.destinations)) {
      hotspot.destinations.forEach((destination) => {
        if (graph.hasNode(hotspot.name) && graph.hasNode(destination.name)) {
          const edgeKey = `${hotspot.name}->${destination.name}`;
          if (
            !addedEdges.has(edgeKey) &&
            !graph.hasEdge(hotspot.name, destination.name)
          ) {
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
            addedEdges.add(edgeKey);
            successfulEdges++;
          } else {
            // Don't log duplicate edges as they're expected
            failedEdges++;
          }
        } else {
          console.log(
            `⚠️ Missing nodes for edge: ${hotspot.name} -> ${destination.name}`
          );
          failedEdges++;
        }
      });
    }
  });

  console.log(
    `✅ Created ${successfulEdges} edges, ${failedEdges} failed/duplicates`
  );

  return graph;
}

// Note: Fare calculation is now done by adding up estimated_fare values from database edges
// Each edge in the graph contains the actual fare for that segment from the hotspots data

// Find shortest path between two points
function findShortestPath(graph, start, end) {
  try {
    const path = dijkstra.bidirectional(graph, start, end);

    let totalDistance = 0;
    let totalFare = 0;
    const fareBreakdown = {
      segments: [],
      totalSegments: 0,
    };

    if (path && path.length > 1) {
      for (let i = 0; i < path.length - 1; i++) {
        try {
          const edge = graph.edge(path[i], path[i + 1]);
          const distance = graph.getEdgeAttribute(edge, "weight") || 0;
          const fare = graph.getEdgeAttribute(edge, "fare") || 0;

          totalDistance += distance;
          totalFare += fare;

          // Add segment to breakdown
          fareBreakdown.segments.push({
            from: path[i],
            to: path[i + 1],
            distance: Math.round(distance * 100) / 100,
            fare: fare,
          });
        } catch (edgeError) {
          console.warn(`Edge not found between ${path[i]} and ${path[i + 1]}`);
        }
      }
    }

    fareBreakdown.totalSegments = fareBreakdown.segments.length;

    return {
      path: path || [],
      totalDistance: Math.round(totalDistance * 100) / 100,
      totalFare: Math.round(totalFare),
      fareBreakdown: fareBreakdown,
    };
  } catch (error) {
    console.error("Error finding shortest path:", error);
    return {
      path: [],
      totalDistance: 0,
      totalFare: 0,
      fareBreakdown: { segments: [], totalSegments: 0 },
    };
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
      console.log("🚀 Initializing route graph...");

      // Get hotspots data
      this.hotspots = await getHotspots();
      console.log(`📍 Loaded ${this.hotspots.length} hotspots`);

      // Validate hotspots data
      if (!this.hotspots || this.hotspots.length === 0) {
        throw new Error("No hotspots data available");
      }

      // Create graph with duplicate prevention
      this.graph = createGraph(this.hotspots);
      this.lastUpdated = new Date();

      console.log(
        `✅ Graph initialized successfully: ${this.graph.order} nodes, ${this.graph.size} edges`
      );

      return {
        success: true,
        message: "Graph initialized successfully",
        nodeCount: this.graph.order,
        edgeCount: this.graph.size,
      };
    } catch (error) {
      console.error("❌ Error initializing graph:", error);

      // Don't throw error - create empty graph as fallback
      console.log("🔄 Creating fallback empty graph...");
      this.graph = new Graph();
      this.hotspots = [];
      this.lastUpdated = new Date();

      return {
        success: false,
        message: `Graph initialization failed: ${error.message}`,
        nodeCount: 0,
        edgeCount: 0,
        fallback: true,
      };
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
  async calculateRoute(source, destination) {
    if (!this.graph) {
      console.log("🔄 Graph not initialized, initializing...");
      await this.initializeGraph();
    }

    console.log(
      `🔍 Graph status: ${this.graph.order} nodes, ${this.graph.size} edges`
    );

    // Validate input
    if (!source || !destination) {
      throw new Error("Source and destination are required");
    }

    // Check if nodes exist and log available nodes for debugging
    const allNodes = this.graph.nodes();
    console.log(`📍 Looking for source: "${source}"`);
    console.log(`📍 Looking for destination: "${destination}"`);

    // Find similar node names for better error messages
    const sourceMatches = allNodes.filter(
      (node) =>
        node.toLowerCase().includes(source.toLowerCase()) ||
        source.toLowerCase().includes(node.toLowerCase())
    );
    const destMatches = allNodes.filter(
      (node) =>
        node.toLowerCase().includes(destination.toLowerCase()) ||
        destination.toLowerCase().includes(node.toLowerCase())
    );

    console.log(`🔍 Source matches found: ${sourceMatches.join(", ")}`);
    console.log(`🔍 Destination matches found: ${destMatches.join(", ")}`);

    if (!this.graph.hasNode(source)) {
      const suggestion =
        sourceMatches.length > 0
          ? ` Did you mean: ${sourceMatches.slice(0, 3).join(", ")}?`
          : "";
      const allNodesPreview = allNodes.slice(0, 5).join(", ");
      throw new Error(
        `Source location '${source}' not found.${suggestion} Available nodes: ${allNodesPreview}...`
      );
    }

    if (!this.graph.hasNode(destination)) {
      const suggestion =
        destMatches.length > 0
          ? ` Did you mean: ${destMatches.slice(0, 3).join(", ")}?`
          : "";
      const allNodesPreview = allNodes.slice(0, 5).join(", ");
      throw new Error(
        `Destination location '${destination}' not found.${suggestion} Available nodes: ${allNodesPreview}...`
      );
    }

    if (source === destination) {
      throw new Error("Source and destination cannot be the same");
    }

    console.log(`🛣️ Finding path from "${source}" to "${destination}"`);
    const result = findShortestPath(this.graph, source, destination);

    if (!result.path || result.path.length === 0) {
      throw new Error(`No route found between ${source} and ${destination}`);
    }

    console.log(`✅ Path found: ${result.path.join(" → ")}`);
    console.log(
      `💰 Distance: ${result.totalDistance} km, Fare: ₹${result.totalFare}`
    );
    console.log(
      `📊 Fare breakdown: ${result.fareBreakdown.segments
        .map((s) => `${s.from}→${s.to}: ₹${s.fare}`)
        .join(", ")}`
    );

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

  // Calculate multiple route options between two points
  async calculateMultipleRoutes(source, destination) {
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

    // Find multiple routes using different algorithms
    const routes = [];

    try {
      // Route 1: Shortest distance (Dijkstra)
      const shortestRoute = findShortestPath(this.graph, source, destination);
      if (shortestRoute.path && shortestRoute.path.length > 0) {
        const pathCoordinates = shortestRoute.path.map((nodeName) => {
          const nodeAttributes = this.graph.getNodeAttributes(nodeName);
          return {
            name: nodeName,
            latitude: nodeAttributes.latitude,
            longitude: nodeAttributes.longitude,
          };
        });

        const estimatedTime = this.estimateTime(shortestRoute.path);

        routes.push({
          id: "shortest",
          type: "shortest",
          name: "Shortest Route",
          path: shortestRoute.path,
          pathCoordinates,
          distance: shortestRoute.totalDistance,
          totalFare: shortestRoute.totalFare,
          fareBreakdown: shortestRoute.fareBreakdown,
          estimatedTime,
          color: "#f4b942", // Yellow
          description: "Minimum distance route",
        });
      }

      // Route 2-N: Find multiple alternative routes
      const alternativeRoutes = this.findAlternativeRoutes(
        source,
        destination,
        shortestRoute.path
      );
      routes.push(...alternativeRoutes);

      // Additional routes: Try different intermediate nodes
      const additionalRoutes = this.findRoutesViaIntermediateNodes(
        source,
        destination,
        routes.map((r) => r.path)
      );
      routes.push(...additionalRoutes);

      // If no routes found
      if (routes.length === 0) {
        throw new Error(`No route found between ${source} and ${destination}`);
      }

      // Sort routes by different criteria
      const sortedByDistance = [...routes].sort(
        (a, b) => a.distance - b.distance
      );
      const sortedByTime = [...routes].sort(
        (a, b) => a.estimatedTime.minutes - b.estimatedTime.minutes
      );
      const sortedByFare = [...routes].sort(
        (a, b) => a.totalFare - b.totalFare
      );

      return {
        success: true,
        data: {
          source,
          destination,
          routes,
          recommendations: {
            fastest: sortedByTime[0],
            cheapest: sortedByFare[0],
            shortest: sortedByDistance[0],
          },
          totalOptions: routes.length,
        },
      };
    } catch (error) {
      throw new Error(
        `No route found between ${source} and ${destination}: ${error.message}`
      );
    }
  }

  // Find alternative routes by temporarily removing edges
  findAlternativeRoutes(source, destination, mainPath) {
    const alternatives = [];
    const colors = ["#e74c3c", "#3498db", "#9b59b6", "#e67e22"]; // Red, Blue, Purple, Orange

    // Try to find alternatives by avoiding different segments of the main path
    if (mainPath && mainPath.length > 2) {
      for (let i = 0; i < Math.min(3, mainPath.length - 1); i++) {
        try {
          // Create a temporary graph without this edge
          const tempGraph = this.graph.copy();
          const nodeToAvoid = mainPath[Math.floor(mainPath.length / 2) + i];

          // Remove the node temporarily to force alternative path
          if (
            nodeToAvoid !== source &&
            nodeToAvoid !== destination &&
            tempGraph.hasNode(nodeToAvoid)
          ) {
            tempGraph.dropNode(nodeToAvoid);

            // Try to find path in modified graph
            const altResult = findShortestPath(tempGraph, source, destination);

            if (
              altResult.path &&
              altResult.path.length > 0 &&
              JSON.stringify(altResult.path) !== JSON.stringify(mainPath)
            ) {
              const pathCoordinates = altResult.path.map((nodeName) => {
                const nodeAttributes = this.graph.getNodeAttributes(nodeName);
                return {
                  name: nodeName,
                  latitude: nodeAttributes.latitude,
                  longitude: nodeAttributes.longitude,
                };
              });

              const estimatedTime = this.estimateTime(altResult.path);
              const fareCalculation = calculateFare(altResult.totalDistance);

              alternatives.push({
                id: `alternative_${i + 1}`,
                type: "alternative",
                name: `Alternative Route ${i + 1}`,
                path: altResult.path,
                pathCoordinates,
                distance: altResult.totalDistance,
                totalFare: fareCalculation.totalFare,
                fareBreakdown: fareCalculation.breakdown,
                estimatedTime,
                color: colors[i % colors.length],
                description: `Alternative path avoiding ${nodeToAvoid}`,
              });
            }
          }
        } catch (error) {
          // Continue to next alternative if this one fails
          continue;
        }
      }
    }

    return alternatives.slice(0, 4); // Limit to 4 alternatives to avoid too many options
  }

  // Find routes via different intermediate nodes
  findRoutesViaIntermediateNodes(source, destination, existingPaths) {
    const routes = [];
    const colors = ["#2ecc71", "#e67e22", "#9b59b6", "#1abc9c"]; // Green, Orange, Purple, Turquoise
    const foundPaths = new Set(
      existingPaths.map((path) => JSON.stringify(path))
    );

    // Get all nodes that could serve as intermediate points
    const allNodes = this.graph.nodes();
    const potentialIntermediates = allNodes.filter(
      (node) =>
        node !== source &&
        node !== destination &&
        this.graph.hasEdge(source, node) && // Direct connection from source
        this.graph.hasEdge(node, destination) // Direct connection to destination
    );

    // Try up to 3 different intermediate routes
    for (let i = 0; i < Math.min(3, potentialIntermediates.length); i++) {
      try {
        const intermediate = potentialIntermediates[i];

        // Create path: source -> intermediate -> destination
        const path = [source, intermediate, destination];
        const pathKey = JSON.stringify(path);

        if (!foundPaths.has(pathKey)) {
          // Calculate total distance and fare from edges
          const edge1 = this.graph.edge(source, intermediate);
          const edge2 = this.graph.edge(intermediate, destination);

          const dist1 = this.graph.getEdgeAttribute(edge1, "weight") || 0;
          const dist2 = this.graph.getEdgeAttribute(edge2, "weight") || 0;
          const fare1 = this.graph.getEdgeAttribute(edge1, "fare") || 0;
          const fare2 = this.graph.getEdgeAttribute(edge2, "fare") || 0;

          const totalDistance = dist1 + dist2;
          const totalFare = fare1 + fare2;

          const routeResult = {
            path,
            totalDistance,
            totalFare,
            fareBreakdown: {
              segments: [
                {
                  from: source,
                  to: intermediate,
                  distance: Math.round(dist1 * 100) / 100,
                  fare: fare1,
                },
                {
                  from: intermediate,
                  to: destination,
                  distance: Math.round(dist2 * 100) / 100,
                  fare: fare2,
                },
              ],
              totalSegments: 2,
            },
          };

          routes.push(
            this.createRouteObject(
              routeResult,
              `via_${intermediate.replace(/\s+/g, "_")}`,
              colors[i % colors.length],
              `Route via ${intermediate}`
            )
          );

          foundPaths.add(pathKey);
        }
      } catch (error) {
        continue;
      }
    }

    return routes;
  }

  // Helper function to create route object
  createRouteObject(routeResult, id, color, description) {
    const pathCoordinates = routeResult.path.map((nodeName) => {
      const nodeAttributes = this.graph.getNodeAttributes(nodeName);
      return {
        name: nodeName,
        latitude: nodeAttributes.latitude,
        longitude: nodeAttributes.longitude,
      };
    });

    const estimatedTime = this.estimateTime(routeResult.path);

    return {
      id,
      type: "alternative",
      name: `Alternative Route`,
      path: routeResult.path,
      pathCoordinates,
      distance: routeResult.totalDistance,
      totalFare: routeResult.totalFare,
      fareBreakdown: routeResult.fareBreakdown,
      estimatedTime,
      color,
      description,
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
      console.log("⚠️ Graph not initialized when getting locations");
      return [];
    }

    const locations = this.graph
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

    console.log(
      `📍 Available locations (${locations.length}):`,
      locations.slice(0, 10).map((l) => l.name)
    );
    return locations;
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
};
