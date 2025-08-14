/* eslint-disable react/prop-types */
import React, { useState } from "react";

export default function RouteOptions({
  routes,
  recommendations,
  onRouteSelect,
  selectedRouteId,
  onNewSearch,
}) {
  const [expandedRoute, setExpandedRoute] = useState(null);

  if (!routes || routes.length === 0) {
    return (
      <div className="glass-strong rounded-xl sm:rounded-2xl p-4 sm:p-6">
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-red-500/20 border border-red-500/40 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">❌</span>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No Routes Found</h3>
          <p className="text-gray-300 mb-4">
            We couldn't find any routes between these locations.
          </p>
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-4">
            <h4 className="text-blue-400 font-semibold mb-2">Suggestions:</h4>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• Check if location names are spelled correctly</li>
              <li>• Try using nearby locations</li>
              <li>• Contact support if the issue persists</li>
            </ul>
          </div>
          <button
            onClick={onNewSearch}
            className="px-6 py-2 bg-sawaari-yellow text-black rounded-lg hover:bg-sawaari-yellow/80 transition-colors font-semibold"
          >
            Try Different Locations
          </button>
        </div>
      </div>
    );
  }

  const getRouteIcon = (type) => {
    switch (type) {
      case "shortest":
        return "📏";
      case "alternative":
        return "🔄";
      default:
        return "🗺️";
    }
  };

  const getRecommendationBadge = (route) => {
    if (recommendations.fastest?.id === route.id) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/20 border border-green-500/40 rounded-full text-xs text-green-400">
          ⚡ Fastest
        </span>
      );
    }
    if (recommendations.cheapest?.id === route.id) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/20 border border-blue-500/40 rounded-full text-xs text-blue-400">
          💰 Cheapest
        </span>
      );
    }
    if (recommendations.shortest?.id === route.id) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-500/20 border border-purple-500/40 rounded-full text-xs text-purple-400">
          📏 Shortest
        </span>
      );
    }
    return null;
  };

  return (
    <div className="glass-strong rounded-xl sm:rounded-2xl p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-3 sm:gap-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-sawaari-yellow-muted border border-sawaari-yellow-border rounded-full flex items-center justify-center">
            <span className="text-lg sm:text-xl">🛣️</span>
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-white">
              Route Options
            </h3>
            <p className="text-xs sm:text-sm text-gray-200">
              {routes.length} routes found
            </p>
          </div>
        </div>
        <button
          onClick={onNewSearch}
          className="px-3 py-2 sm:px-4 sm:py-2 bg-sawaari-yellow text-black rounded-lg hover:bg-sawaari-yellow/80 transition-colors text-xs sm:text-sm font-semibold self-start sm:self-auto"
        >
          New Search
        </button>
      </div>

      {/* Recommendations Summary */}
      {recommendations && (
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4 sm:mb-6">
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-2 sm:p-3 text-center">
            <div className="text-green-400 font-bold text-base sm:text-lg">
              ⚡
            </div>
            <div className="text-xs text-gray-300">Fastest</div>
            <div className="text-xs sm:text-sm text-white font-semibold">
              {recommendations.fastest?.estimatedTime?.formatted || "N/A"}
            </div>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-2 sm:p-3 text-center">
            <div className="text-blue-400 font-bold text-base sm:text-lg">
              💰
            </div>
            <div className="text-xs text-gray-300">Cheapest</div>
            <div className="text-xs sm:text-sm text-white font-semibold">
              ₹{recommendations.cheapest?.totalFare || "N/A"}
            </div>
          </div>
          <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-2 sm:p-3 text-center">
            <div className="text-purple-400 font-bold text-base sm:text-lg">
              📏
            </div>
            <div className="text-xs text-gray-300">Shortest</div>
            <div className="text-xs sm:text-sm text-white font-semibold">
              {recommendations.shortest?.distance?.toFixed(1) || "N/A"} km
            </div>
          </div>
        </div>
      )}

      {/* Route Options */}
      <div className="space-y-2 sm:space-y-3 max-h-80 sm:max-h-96 overflow-y-auto">
        {routes.map((route, index) => (
          <div
            key={route.id}
            className={`border rounded-lg p-3 sm:p-4 cursor-pointer transition-all duration-200 ${
              selectedRouteId === route.id
                ? "border-sawaari-yellow/60 bg-sawaari-yellow/10"
                : "border-white/10 bg-black/40 hover:border-white/20 hover:bg-black/60"
            }`}
            onClick={() => onRouteSelect(route)}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="text-lg sm:text-xl">
                  {getRouteIcon(route.type)}
                </span>
                <div>
                  <h4 className="text-white font-semibold text-xs sm:text-sm">
                    {route.name}
                  </h4>
                  <p className="text-gray-400 text-xs hidden sm:block">
                    {route.description}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 sm:gap-2">
                {getRecommendationBadge(route)}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedRoute(
                      expandedRoute === route.id ? null : route.id
                    );
                  }}
                  className="text-gray-400 hover:text-white transition-colors p-1"
                >
                  {expandedRoute === route.id ? "▼" : "▶"}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-4 text-xs sm:text-sm">
              <div>
                <span className="text-gray-400">Distance:</span>
                <div className="text-white font-semibold">
                  {route.distance.toFixed(1)} km
                </div>
              </div>
              <div>
                <span className="text-gray-400">Time:</span>
                <div className="text-white font-semibold">
                  {route.estimatedTime.formatted}
                </div>
              </div>
              <div>
                <span className="text-gray-400">Fare:</span>
                <div className="text-sawaari-yellow font-bold">
                  ₹{route.totalFare}
                </div>
              </div>
            </div>

            {/* Expanded Details */}
            {expandedRoute === route.id && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <h5 className="text-white font-semibold mb-2">
                  Route Details:
                </h5>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {route.path.map((stop, stopIndex) => (
                    <div
                      key={stopIndex}
                      className="flex items-center gap-2 text-sm"
                    >
                      <span className="w-6 h-6 bg-sawaari-yellow-muted border border-sawaari-yellow-border rounded-full flex items-center justify-center text-xs font-bold text-sawaari-yellow">
                        {stopIndex + 1}
                      </span>
                      <span className="text-gray-300">{stop}</span>
                    </div>
                  ))}
                </div>

                {route.fareBreakdown && (
                  <div className="mt-3 p-3 bg-black/40 rounded-lg">
                    <h6 className="text-white font-semibold text-xs mb-2">
                      Fare Breakdown:
                    </h6>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Base Fare:</span>
                        <span className="text-white">
                          ₹{route.fareBreakdown.baseFare}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Distance:</span>
                        <span className="text-white">
                          ₹{route.fareBreakdown.distanceFare}
                        </span>
                      </div>
                      {route.fareBreakdown.timeType !== "regular" && (
                        <div className="flex justify-between col-span-2">
                          <span className="text-gray-400">
                            {route.fareBreakdown.timeType === "night"
                              ? "Night Rate:"
                              : "Peak Rate:"}
                          </span>
                          <span className="text-sawaari-yellow">
                            {route.fareBreakdown.timeMultiplier}x
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
