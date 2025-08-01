/* eslint-disable react/prop-types */
import { useState, useEffect, useCallback } from "react";
import routeService from "./services/routeService";

export default function FareEstimator({
  source,
  destination,
  distance,
  onFareUpdate,
}) {
  const [fareData, setFareData] = useState(null);
  const [waitingTime, setWaitingTime] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showEstimates, setShowEstimates] = useState(false);

  // Memoized function to prevent unnecessary re-renders
  const calculateFareEstimates = useCallback(async () => {
    if (!source || !destination) return;

    setIsLoading(true);
    setError("");

    try {
      const result = await routeService.calculateFareEstimates(
        source,
        destination,
        waitingTime
      );

      if (result.success) {
        setFareData(result.data);
        // Update parent component with current fare
        if (onFareUpdate) {
          onFareUpdate(result.data.current.totalFare);
        }

        if (result.cached) {
          console.log("✅ Used cached fare data");
        }
      } else {
        setError(result.message || "Failed to calculate fare estimates");
      }
    } catch (error) {
      console.error("Fare estimation error:", error);
      setError("Unable to calculate fare estimates. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [source, destination, waitingTime, onFareUpdate]);

  // Only calculate on initial load - no automatic recalculation
  useEffect(() => {
    if (source && destination) {
      calculateFareEstimates();
    }
  }, []); // FIXED: Empty dependency array to prevent continuous calls

  // Manual recalculation when waiting time changes
  const handleWaitingTimeChange = (newWaitingTime) => {
    setWaitingTime(newWaitingTime);
    // Only recalculate if we have existing data
    if (fareData && source && destination) {
      calculateFareEstimates();
    }
  };

  const getTimeTypeIcon = (type) => {
    switch (type) {
      case "night":
        return "🌙";
      case "peak":
        return "⚡";
      default:
        return "🕐";
    }
  };

  if (!source || !destination) {
    return null;
  }

  return (
    <div className="fare-estimator">
      <div className="fare-header">
        <h4>
          <i className="fas fa-rupee-sign me-2"></i>
          Fare Estimation
        </h4>

        {/* Waiting Time Input */}
        <div className="waiting-time-input mb-3">
          <label htmlFor="waitingTime" className="form-label">
            Expected Waiting Time (minutes)
          </label>
          <div className="input-group">
            <input
              type="number"
              id="waitingTime"
              className="form-control"
              value={waitingTime}
              onChange={(e) =>
                handleWaitingTimeChange(
                  Math.max(0, parseInt(e.target.value) || 0)
                )
              }
              min="0"
              max="60"
              placeholder="0"
            />
            <button
              className="btn btn-outline-primary"
              type="button"
              onClick={calculateFareEstimates}
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="spinner-border spinner-border-sm"></span>
              ) : (
                <i className="fas fa-sync-alt"></i>
              )}
            </button>
          </div>
          <small className="form-text text-muted">
            Click refresh to update fare with new waiting time
          </small>
        </div>
      </div>

      {isLoading && (
        <div className="text-center py-3">
          <div className="spinner-border spinner-border-sm text-success me-2"></div>
          Calculating fare estimates...
        </div>
      )}

      {error && (
        <div className="alert alert-warning">
          <i className="fas fa-exclamation-triangle me-2"></i>
          {error}
        </div>
      )}

      {fareData && !isLoading && (
        <div className="fare-results">
          {/* Current Fare */}
          <div className="current-fare-card">
            <div className="fare-amount">
              <span className="currency">₹</span>
              <span className="amount">{fareData.current.totalFare}</span>
              <span className="time-indicator">
                {getTimeTypeIcon(fareData.current.breakdown.timeType)}
                <small>{fareData.current.breakdown.timeType}</small>
              </span>
            </div>

            {/* Fare Breakdown */}
            <div className="fare-breakdown">
              <div className="breakdown-item">
                <span>Base Fare</span>
                <span>₹{fareData.current.breakdown.baseFare}</span>
              </div>
              <div className="breakdown-item">
                <span>
                  Distance (
                  {fareData.distance?.toFixed(1) ||
                    distance?.toFixed(1) ||
                    "0.0"}{" "}
                  km)
                </span>
                <span>₹{fareData.current.breakdown.distanceFare}</span>
              </div>
              {fareData.current.breakdown.waitingFare > 0 && (
                <div className="breakdown-item">
                  <span>Waiting Time ({waitingTime} min)</span>
                  <span>₹{fareData.current.breakdown.waitingFare}</span>
                </div>
              )}
              <div className="breakdown-item subtotal">
                <span>Subtotal</span>
                <span>₹{fareData.current.breakdown.subtotal}</span>
              </div>
              {fareData.current.breakdown.timeMultiplier !== 1 && (
                <div className="breakdown-item multiplier">
                  <span>
                    {fareData.current.breakdown.timeType === "night"
                      ? "Night Surcharge"
                      : "Peak Hour Surcharge"}
                    ({fareData.current.breakdown.timeMultiplier}x)
                  </span>
                  <span>
                    +₹
                    {fareData.current.totalFare -
                      fareData.current.breakdown.subtotal}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Show/Hide Estimates Toggle */}
          <button
            className="btn btn-outline-primary btn-sm w-100 mt-3"
            onClick={() => setShowEstimates(!showEstimates)}
          >
            {showEstimates ? "Hide" : "Show"} Fare Estimates for Different Times
            <i
              className={`fas fa-chevron-${showEstimates ? "up" : "down"} ms-2`}
            ></i>
          </button>

          {/* Time-based Estimates */}
          {showEstimates && (
            <div className="fare-estimates mt-3">
              <h6>Fare Estimates by Time</h6>
              <div className="estimates-grid">
                {Object.entries(fareData.estimates).map(
                  ([timeType, estimate]) => (
                    <div key={timeType} className="estimate-card">
                      <div className="estimate-header">
                        <span className="time-icon">
                          {getTimeTypeIcon(estimate.breakdown.timeType)}
                        </span>
                        <span className="time-label">
                          {timeType === "regular" && "Regular Hours"}
                          {timeType === "peakMorning" && "Morning Peak"}
                          {timeType === "peakEvening" && "Evening Peak"}
                          {timeType === "night" && "Night Time"}
                        </span>
                      </div>
                      <div className="estimate-fare">₹{estimate.totalFare}</div>
                      <div className="estimate-time">
                        {timeType === "regular" && "10 AM - 5 PM"}
                        {timeType === "peakMorning" && "8 AM - 10 AM"}
                        {timeType === "peakEvening" && "5 PM - 8 PM"}
                        {timeType === "night" && "10 PM - 6 AM"}
                      </div>
                    </div>
                  )
                )}
              </div>

              {/* Money-saving tip */}
              <div className="savings-tip">
                <i className="fas fa-lightbulb text-warning me-2"></i>
                <strong>Money-saving tip:</strong> Travel during regular hours
                (10 AM - 5 PM) to save ₹
                {Math.max(
                  0,
                  fareData.current.totalFare -
                    fareData.estimates.regular.totalFare
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
