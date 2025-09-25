const EventEmitter = require("events");
const WebSocket = require("ws");
const { findRideBuddySearches, updateRideBuddySearch } = require("./database");

class RouteMatchingEvents extends EventEmitter {}
const matchEvents = new RouteMatchingEvents();

class RouteMatchingManager {
  constructor() {
    this.activeSearches = new Map();
    this.matchEvents = matchEvents;
    this.initializeEventHandlers();
  }

  initializeEventHandlers() {
    // Listen for new matches
    this.matchEvents.on("newMatch", async (data) => {
      const { searchId, userId, matchData } = data;

      try {
        // Update the search with new match
        await updateRideBuddySearch(searchId, {
          $push: { matches: matchData },
          $inc: { matchCount: 1 },
        });

        // Emit WebSocket event to notify the user
        this.notifyUser(userId, "ride_buddy_new_potential_match", {
          searchId,
          newMatch: matchData,
        });
      } catch (error) {
        console.error("Failed to handle new match:", error);
      }
    });
  }

  notifyUser(userId, eventName, data) {
    // Your WebSocket emit logic here
    global.io.to(userId).emit(eventName, data);
  }

  // Method to trigger a new match event
  emitNewMatch(searchId, userId, matchData) {
    this.matchEvents.emit("newMatch", { searchId, userId, matchData });
  }

  // Start tracking a search
  trackSearch(searchId, userId, searchData) {
    this.activeSearches.set(searchId, { userId, ...searchData });
  }

  // Stop tracking a search
  untrackSearch(searchId) {
    this.activeSearches.delete(searchId);
  }

  // Get all active searches
  getActiveSearches() {
    return Array.from(this.activeSearches.entries());
  }
}

// Create singleton instance
const routeMatchingManager = new RouteMatchingManager();
module.exports = routeMatchingManager;
