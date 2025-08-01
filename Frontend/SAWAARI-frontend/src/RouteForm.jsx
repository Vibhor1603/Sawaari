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
    <div className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl p-6 max-w-md mx-auto">
      {/* Simple Header */}
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-white mb-2">Route Planner</h3>
        <p className="text-sm text-gray-300">
          Find the best route for your journey
        </p>
      </div>

      <form onSubmit={handleRouteSearch} className="space-y-4">
        {/* Source Location */}
        <div>
          <label
            htmlFor="source"
            className="block text-sm font-semibold text-sawaari-yellow mb-2"
          >
            📍 Source Location
          </label>
          <select
            className="w-full p-3 bg-black/30 border border-white/20 rounded-lg text-white focus:border-sawaari-yellow focus:ring-2 focus:ring-sawaari-yellow/20 focus:outline-none transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            id="source"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            required
            disabled={isLoadingLocations}
          >
            <option value="" className="text-gray-400">
              {isLoadingLocations
                ? "Loading locations..."
                : "-- Select Source --"}
            </option>
            {locationNames.map((name, index) => (
              <option key={index} value={name} className="text-white bg-black">
                {name}
              </option>
            ))}
          </select>
        </div>

        {/* Destination Location */}
        <div>
          <label
            htmlFor="destination"
            className="block text-sm font-semibold text-sawaari-yellow mb-2"
          >
            🎯 Destination Location
          </label>
          <select
            className="w-full p-3 bg-black/30 border border-white/20 rounded-lg text-white focus:border-sawaari-yellow focus:ring-2 focus:ring-sawaari-yellow/20 focus:outline-none transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            id="destination"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            required
            disabled={isLoadingLocations}
          >
            <option value="" className="text-gray-400">
              {isLoadingLocations
                ? "Loading locations..."
                : "-- Select Destination --"}
            </option>
            {locationNames.map((name, index) => (
              <option key={index} value={name} className="text-white bg-black">
                {name}
              </option>
            ))}
          </select>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full flex items-center justify-center gap-2 p-3 bg-gradient-to-r from-sawaari-yellow to-sawaari-yellow/80 text-black font-semibold text-sm rounded-lg shadow-sawaari-subtle hover:shadow-sawaari-glow hover:-translate-y-1 transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none group"
          disabled={isLoadingLocations}
        >
          <span className="text-lg">🔍</span>
          <span>Find Best Route</span>
          <span className="text-lg group-hover:animate-rickshaw-bounce">
            🛺
          </span>
        </button>

        {/* Simple Tips */}
        <div className="mt-4 p-3 bg-sawaari-yellow-muted border border-sawaari-yellow-border rounded-lg">
          <h4 className="text-xs font-semibold text-sawaari-yellow mb-2">
            💡 Quick Tips
          </h4>
          <ul className="text-xs text-gray-300 space-y-1">
            <li>• Choose locations from available hotspots</li>
            <li>• Routes optimized for shortest time</li>
            <li>• Fare estimates include traffic</li>
            <li>• Real-time updates for accuracy</li>
          </ul>
        </div>
      </form>
    </div>
  );
}
