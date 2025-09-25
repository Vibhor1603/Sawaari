// Match Notification Service
// Handles notifications for route matches

const realTimeRideBuddyService = require("./realTimeRideBuddy");

class MatchNotificationService {
  constructor() {
    this.activeSearches = new Map(); // userId -> search info
    console.log("🔍 Match Notification Service initialized");
  }

  // Register a new search
  registerSearch(userId, searchId, searchData) {
    this.activeSearches.set(userId, { searchId, ...searchData });
    console.log(`🔍 New search registered for user ${userId}`);
  }

  // Notify user about a new potential match
  async notifyNewMatch(userId, matchData) {
    console.log(`🎯 New match found for user ${userId}:`, matchData);

    return realTimeRideBuddyService.sendNotificationToUser(
      userId,
      "ride_buddy_new_potential_match",
      {
        newMatch: matchData,
        timestamp: new Date().toISOString(),
      }
    );
  }

  // Notify multiple users about matches
  async notifyMatches(matches) {
    const notifications = [];
    for (const match of matches) {
      if (match.userId && match.matchData) {
        notifications.push(this.notifyNewMatch(match.userId, match.matchData));
      }
    }
    return Promise.all(notifications);
  }

  // Remove a search when it expires or is cancelled
  removeSearch(userId) {
    this.activeSearches.delete(userId);
    console.log(`🧹 Search removed for user ${userId}`);
  }

  // Get active search info for a user
  getActiveSearch(userId) {
    return this.activeSearches.get(userId);
  }

  // Get all active searches
  getAllActiveSearches() {
    return Array.from(this.activeSearches.entries()).map(
      ([userId, search]) => ({
        userId,
        ...search,
      })
    );
  }
}

const matchNotificationService = new MatchNotificationService();
module.exports = matchNotificationService;
