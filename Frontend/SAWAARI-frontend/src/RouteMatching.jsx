
import { createGraph, findShortestPath } from './utils.jsx';
import { v4 as uuidv4 } from 'uuid';

let globalGraph;

export function initializeGraph(hotspots) {
  globalGraph = createGraph(hotspots);
}

export async function storeRoute(userId, source, destination) {
  if (!globalGraph) {
    throw new Error("Graph not initialized. Call initializeGraph first.");
  }

  try {
    const { path } = findShortestPath(globalGraph, source, destination);
    const route = {
      id: uuidv4(),
      userId,
      source,
      destination,
      waypoints: path,
      timestamp: new Date().toISOString()  // Use ISO string for consistent date format
    };
    
    return route;
  } catch (error) {
    console.error('Error finding shortest path:', error);
    throw error;
  }
}



export async function findMatchingRoutes(routeData,routes) {

  const currentRoute = routes.find(route => route.id === routeData.id);

  if (!currentRoute) {
    throw new Error("Route not found");
  }


  const matches = routes
  .filter(route => route.id !== routeData.id)
  .map(route => {
      const matchCount = compareWaypoints(currentRoute.waypoints, route.waypoints);
      const matchPercentage = (matchCount / Math.max(currentRoute.waypoints.length, route.waypoints.length)) * 100;
      return {
        userId: route.userId,
        matchPercentage: Number(matchPercentage.toFixed(2)),  // Round to 2 decimal places
        source: route.source,
        destination: route.destination
      };
    })
    .filter(match => match.matchPercentage > 40);  // 30% match threshold

  return matches;
}

function compareWaypoints(waypoints1, waypoints2) {
  const minLength = Math.min(waypoints1.length, waypoints2.length);
  return waypoints1.slice(0, minLength).filter((wp, i) => wp === waypoints2[i]).length;
}