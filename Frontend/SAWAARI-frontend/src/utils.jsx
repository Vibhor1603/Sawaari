import Graph from 'graphology';
import { dijkstra } from 'graphology-shortest-path';


export function haversineDistance(lat1, lon1, lat2, lon2) {
  const toRadians = (degrees) => degrees * (Math.PI / 180);

  const R = 6371; // Radius of the Earth in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in kilometers

  return distance;
}

export function createGraph(hotspots) {
  
  const graph = new Graph();

  // First, add all nodes to the graph
  hotspots.forEach(hotspot => {
    graph.addNode(hotspot.name, {
      latitude: hotspot.latitude,
      longitude: hotspot.longitude
    });
  });

  // Then, add edges
  hotspots.forEach(hotspot => {
    hotspot.destinations.forEach(destination => {
      if (graph.hasNode(hotspot.name) && graph.hasNode(destination.name)) {
        const distance = haversineDistance(
          hotspot.latitude,
          hotspot.longitude,
          destination.latitude,
          destination.longitude
        );
        graph.addEdge(hotspot.name, destination.name, { weight: distance, fare: destination.estimated_fare });
      } else {
        console.warn(`Cannot add edge between ${hotspot.name} and ${destination.name}: one or both nodes not found`);
      }
    });
  });

  console.log('Graph created:', graph);
  return graph;
}

export function findShortestPath(graph, start, end) {
  console.log(`Finding shortest path between ${start} and ${end}`);
  try {
    const path = dijkstra.bidirectional(graph, start, end);
    console.log('Path found:', path);

    let totalFare = 0;
    for (let i = 0; i < path.length - 1; i++) {
      const edge = graph.edge(path[i], path[i + 1]);
      totalFare += graph.getEdgeAttribute(edge, 'fare');
    }

    return { path, totalFare };
  } catch (error) {
    console.error("Error finding shortest path:", error);
    return { path: [], totalFare: 0 };
  }
}
