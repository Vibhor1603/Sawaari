import { useState, useEffect } from "react";

export default function RouteForm({
  source,
  setSource,
  destination,
  setDestination,
  handleRouteSearch,
  hotspot,
}) {
  const [availableLocations, setAvailableLocations] = useState([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);

  // Fetch available locations from API
  useEffect(() => {
    // Use hotspot prop directly instead of API call
    if (hotspot && Array.isArray(hotspot)) {
      setAvailableLocations(
        hotspot
          .map((spot) => ({ name: spot.name }))
          .sort((a, b) => a.name.localeCompare(b.name))
      );
    }
    setIsLoadingLocations(false);
  }, [hotspot]);

  // Extract unique location names from the available locations
  const getLocationNames = () => {
    return availableLocations.map((location) => location.name).sort();
  };

  const locationNames = getLocationNames();

  return (
    <div className="glass-strong rounded-2xl p-6 border border-border-color">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-accent-green/20 rounded-full flex items-center justify-center">
          <i className="fas fa-route text-accent-green text-xl"></i>
        </div>
        <div>
          <h3 className="text-xl font-bold text-text-primary">Route Planner</h3>
          <p className="text-sm text-text-secondary">
            Find the best route for your journey
          </p>
        </div>
      </div>

      <form onSubmit={handleRouteSearch} className="space-y-6">
        {/* Source Location */}
        <div>
          <label
            htmlFor="source"
            className="block text-sm font-semibold text-accent-yellow mb-2"
          >
            📍 Select Source Location
          </label>
          <select
            className="w-full p-4 bg-tertiary-dark border border-border-color rounded-lg text-text-primary focus:border-accent-green focus:ring-2 focus:ring-accent-green/20 focus:outline-none transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            id="source"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            required
            disabled={isLoadingLocations}
          >
            <option value="" className="text-text-muted">
              {isLoadingLocations
                ? "Loading locations..."
                : "-- Select Source --"}
            </option>
            {locationNames.map((name, index) => (
              <option key={index} value={name} className="text-text-primary">
                {name}
              </option>
            ))}
          </select>
        </div>

        {/* Destination Location */}
        <div>
          <label
            htmlFor="destination"
            className="block text-sm font-semibold text-accent-yellow mb-2"
          >
            🎯 Select Destination Location
          </label>
          <select
            className="w-full p-4 bg-tertiary-dark border border-border-color rounded-lg text-text-primary focus:border-accent-green focus:ring-2 focus:ring-accent-green/20 focus:outline-none transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            id="destination"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            required
            disabled={isLoadingLocations}
          >
            <option value="" className="text-text-muted">
              {isLoadingLocations
                ? "Loading locations..."
                : "-- Select Destination --"}
            </option>
            {locationNames.map((name, index) => (
              <option key={index} value={name} className="text-text-primary">
                {name}
              </option>
            ))}
          </select>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full flex items-center justify-center gap-3 p-4 bg-gradient-to-r from-accent-green to-accent-yellow text-primary-dark font-bold text-lg rounded-lg shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none group"
          disabled={isLoadingLocations}
        >
          <i className="fas fa-search text-xl group-hover:animate-pulse"></i>
          <span>Find Best Route</span>
          <span className="text-xl group-hover:animate-bounce-slow">🛺</span>
        </button>

        {/* Quick Tips */}
        <div className="mt-6 p-4 bg-accent-yellow/10 border border-accent-yellow/30 rounded-lg">
          <h4 className="text-sm font-semibold text-accent-yellow mb-2">
            💡 Quick Tips
          </h4>
          <ul className="text-xs text-text-secondary space-y-1">
            <li>• Choose locations from available hotspots</li>
            <li>• Routes are optimized for shortest time and distance</li>
            <li>• Fare estimates include traffic conditions</li>
            <li>• Real-time updates for better accuracy</li>
          </ul>
        </div>
      </form>
    </div>
  );
}
