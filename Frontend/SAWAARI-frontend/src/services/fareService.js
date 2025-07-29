// Fare Calculation Service for SAWAARI
class FareService {
  constructor() {
    // Fare configuration
    this.fareConfig = {
      baseFare: 25, // Rs. 25 base fare
      perKmFare: 10, // Rs. 10 per km
      waitingTimeFare: 5, // Rs. 5 per minute waiting time
      nightMultiplier: 1.5, // 1.5x for night time (10 PM to 6 AM)
      peakMultiplier: 1.2, // 1.2x for peak hours (8-10 AM, 5-8 PM)
    };
  }

  /**
   * Calculate estimated fare for a route
   * @param {number} distance - Distance in kilometers
   * @param {number} waitingTime - Waiting time in minutes (default: 0)
   * @param {Date} travelTime - Travel time (default: current time)
   * @returns {Object} Fare breakdown and total
   */
  calculateFare(distance, waitingTime = 0, travelTime = new Date()) {
    // Input validation
    if (!distance || distance < 0) {
      throw new Error("Distance must be a positive number");
    }

    if (waitingTime < 0) {
      throw new Error("Waiting time cannot be negative");
    }

    // Base calculations
    const baseFare = this.fareConfig.baseFare;
    const distanceFare = distance * this.fareConfig.perKmFare;
    const waitingFare = waitingTime * this.fareConfig.waitingTimeFare;

    // Calculate base total
    let subtotal = baseFare + distanceFare + waitingFare;

    // Time-based multipliers
    const timeMultiplier = this.getTimeMultiplier(travelTime);
    const finalFare = subtotal * timeMultiplier.multiplier;

    // Round to nearest rupee
    const roundedFare = Math.round(finalFare);

    return {
      breakdown: {
        baseFare,
        distanceFare: Math.round(distanceFare),
        waitingFare: Math.round(waitingFare),
        subtotal: Math.round(subtotal),
        timeMultiplier: timeMultiplier.multiplier,
        timeType: timeMultiplier.type,
      },
      totalFare: roundedFare,
      distance,
      waitingTime,
      travelTime: travelTime.toISOString(),
    };
  }

  /**
   * Get time-based multiplier
   * @param {Date} travelTime - Travel time
   * @returns {Object} Multiplier and type
   */
  getTimeMultiplier(travelTime) {
    const hour = travelTime.getHours();

    // Night time: 10 PM to 6 AM (22:00 to 06:00)
    if (hour >= 22 || hour < 6) {
      return {
        multiplier: this.fareConfig.nightMultiplier,
        type: "night",
        description: "Night time surcharge (10 PM - 6 AM)",
      };
    }

    // Peak hours: 8-10 AM and 5-8 PM
    if ((hour >= 8 && hour < 10) || (hour >= 17 && hour < 20)) {
      return {
        multiplier: this.fareConfig.peakMultiplier,
        type: "peak",
        description: "Peak hour surcharge (8-10 AM, 5-8 PM)",
      };
    }

    // Regular hours
    return {
      multiplier: 1.0,
      type: "regular",
      description: "Regular hours",
    };
  }

  /**
   * Calculate fare for different time scenarios
   * @param {number} distance - Distance in kilometers
   * @param {number} waitingTime - Waiting time in minutes
   * @returns {Object} Fare estimates for different times
   */
  getFareEstimates(distance, waitingTime = 0) {
    const now = new Date();

    // Current time
    const currentFare = this.calculateFare(distance, waitingTime, now);

    // Peak morning (9 AM)
    const peakMorning = new Date();
    peakMorning.setHours(9, 0, 0, 0);
    const peakMorningFare = this.calculateFare(
      distance,
      waitingTime,
      peakMorning
    );

    // Peak evening (6 PM)
    const peakEvening = new Date();
    peakEvening.setHours(18, 0, 0, 0);
    const peakEveningFare = this.calculateFare(
      distance,
      waitingTime,
      peakEvening
    );

    // Night time (11 PM)
    const nightTime = new Date();
    nightTime.setHours(23, 0, 0, 0);
    const nightFare = this.calculateFare(distance, waitingTime, nightTime);

    // Regular time (2 PM)
    const regularTime = new Date();
    regularTime.setHours(14, 0, 0, 0);
    const regularFare = this.calculateFare(distance, waitingTime, regularTime);

    return {
      current: currentFare,
      estimates: {
        regular: regularFare,
        peakMorning: peakMorningFare,
        peakEvening: peakEveningFare,
        night: nightFare,
      },
      recommendations: this.getFareRecommendations(distance, waitingTime),
    };
  }

  /**
   * Get fare recommendations for optimal travel times
   * @param {number} distance - Distance in kilometers
   * @param {number} waitingTime - Waiting time in minutes
   * @returns {Array} Recommendations sorted by fare
   */
  getFareRecommendations(distance, waitingTime = 0) {
    const estimates = [];

    // Generate estimates for different hours
    for (let hour = 0; hour < 24; hour++) {
      const testTime = new Date();
      testTime.setHours(hour, 0, 0, 0);

      const fare = this.calculateFare(distance, waitingTime, testTime);
      estimates.push({
        hour,
        timeLabel: this.formatHour(hour),
        fare: fare.totalFare,
        type: fare.breakdown.timeType,
        multiplier: fare.breakdown.timeMultiplier,
      });
    }

    // Sort by fare (cheapest first)
    return estimates.sort((a, b) => a.fare - b.fare);
  }

  /**
   * Format hour for display
   * @param {number} hour - Hour (0-23)
   * @returns {string} Formatted time
   */
  formatHour(hour) {
    const period = hour >= 12 ? "PM" : "AM";
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:00 ${period}`;
  }

  /**
   * Get fare configuration
   * @returns {Object} Current fare configuration
   */
  getFareConfig() {
    return { ...this.fareConfig };
  }

  /**
   * Update fare configuration (admin function)
   * @param {Object} newConfig - New fare configuration
   */
  updateFareConfig(newConfig) {
    this.fareConfig = { ...this.fareConfig, ...newConfig };
  }

  /**
   * Calculate fare with custom parameters
   * @param {Object} params - Custom parameters
   * @returns {Object} Fare calculation result
   */
  calculateCustomFare(params) {
    const {
      distance,
      waitingTime = 0,
      travelTime = new Date(),
      customBaseFare,
      customPerKmFare,
      customWaitingFare,
    } = params;

    // Temporarily update config if custom values provided
    const originalConfig = { ...this.fareConfig };

    if (customBaseFare !== undefined) this.fareConfig.baseFare = customBaseFare;
    if (customPerKmFare !== undefined)
      this.fareConfig.perKmFare = customPerKmFare;
    if (customWaitingFare !== undefined)
      this.fareConfig.waitingTimeFare = customWaitingFare;

    try {
      const result = this.calculateFare(distance, waitingTime, travelTime);
      return result;
    } finally {
      // Restore original config
      this.fareConfig = originalConfig;
    }
  }
}

// Create singleton instance
const fareService = new FareService();

export default fareService;
