/* eslint-disable no-unused-vars */
import { useState, useEffect } from "react";
import { CompactLocationSearch } from "./index";
import photonService from "../../services/photonService";

// Performance test component for location search
const LocationSearchPerformanceTest = () => {
  const [searchStats, setSearchStats] = useState({
    totalSearches: 0,
    averageResponseTime: 0,
    cacheHits: 0,
    errors: 0,
    lastSearchTime: null,
  });

  const [testResults, setTestResults] = useState([]);

  const handleLocationSelect = (locationData) => {
    const now = Date.now();
    const responseTime = searchStats.lastSearchTime
      ? now - searchStats.lastSearchTime
      : 0;

    setTestResults((prev) => [
      {
        timestamp: now,
        location: locationData.name,
        responseTime,
        coordinates: locationData.coordinates,
      },
      ...prev.slice(0, 9), // Keep last 10 results
    ]);

    // Update stats
    setSearchStats((prev) => ({
      ...prev,
      totalSearches: prev.totalSearches + 1,
      averageResponseTime:
        prev.totalSearches > 0
          ? (prev.averageResponseTime * prev.totalSearches + responseTime) /
            (prev.totalSearches + 1)
          : responseTime,
    }));
  };

  const getCacheStats = () => {
    return photonService.getCacheStats();
  };

  const clearCache = () => {
    photonService.clearCache();
    setSearchStats((prev) => ({ ...prev, cacheHits: 0 }));
  };

  return (
    <div className="bg-black/20 border border-white/20 rounded-lg p-4 space-y-4">
      <h3 className="text-lg font-semibold text-sawaari-yellow">
        Location Search Performance Test
      </h3>

      {/* Search Component */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-white">Test Search:</h4>
        <CompactLocationSearch
          onLocationSelect={handleLocationSelect}
          placeholder="Type to test search performance..."
          size="md"
          className="w-full max-w-md"
        />
      </div>

      {/* Performance Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-black/40 rounded p-3 text-center">
          <div className="text-sawaari-yellow font-bold text-lg">
            {searchStats.totalSearches}
          </div>
          <div className="text-gray-400 text-xs">Total Searches</div>
        </div>

        <div className="bg-black/40 rounded p-3 text-center">
          <div className="text-sawaari-yellow font-bold text-lg">
            {searchStats.averageResponseTime.toFixed(0)}ms
          </div>
          <div className="text-gray-400 text-xs">Avg Response</div>
        </div>

        <div className="bg-black/40 rounded p-3 text-center">
          <div className="text-sawaari-yellow font-bold text-lg">
            {getCacheStats().cacheSize}
          </div>
          <div className="text-gray-400 text-xs">Cache Entries</div>
        </div>

        <div className="bg-black/40 rounded p-3 text-center">
          <div className="text-sawaari-yellow font-bold text-lg">
            {searchStats.errors}
          </div>
          <div className="text-gray-400 text-xs">Errors</div>
        </div>
      </div>

      {/* Recent Results */}
      {testResults.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-white">Recent Results:</h4>
            <button
              onClick={clearCache}
              className="text-xs text-sawaari-yellow hover:text-yellow-300 transition-colors"
            >
              Clear Cache
            </button>
          </div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {testResults.map((result, index) => (
              <div
                key={index}
                className="flex items-center justify-between text-xs bg-black/40 rounded p-2"
              >
                <div className="text-white truncate flex-1">
                  {result.location}
                </div>
                <div className="text-gray-400 ml-2">
                  {result.responseTime}ms
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Performance Tips */}
      <div className="text-xs text-gray-400 space-y-1">
        <div>• Search debounced to 150ms for faster response</div>
        <div>• Results cached for 10 minutes</div>
        <div>• Previous requests cancelled automatically</div>
        <div>• Optimized for Delhi NCR region</div>
      </div>
    </div>
  );
};

export default LocationSearchPerformanceTest;
