/* eslint-disable no-unused-vars */
import React, { useState } from "react";
import {
  LocationSearch,
  CompactLocationSearch,
  EnhancedMapWithSearch,
} from "../common";

// Example component demonstrating all location search features
const LocationSearchExample = () => {
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [searchHistory, setSearchHistory] = useState([]);

  const handleLocationSelect = (locationData) => {
    console.log("Location selected:", locationData);
    setSelectedLocation(locationData);

    // Add to search history
    setSearchHistory((prev) => [
      locationData,
      ...prev.filter((item) => item.name !== locationData.name).slice(0, 4),
    ]);
  };

  const clearSelection = () => {
    setSelectedLocation(null);
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-sawaari-yellow mb-2">
            Location Search Examples
          </h1>
          <p className="text-gray-400">
            Demonstrating different location search implementations
          </p>
        </div>

        {/* Selected Location Display */}
        {selectedLocation && (
          <div className="bg-black/40 border border-sawaari-yellow/30 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-sawaari-yellow">
                  Selected Location
                </h3>
                <p className="text-white">{selectedLocation.name}</p>
                <p className="text-gray-400 text-sm">
                  Lat: {selectedLocation.coordinates.latitude.toFixed(6)}, Lng:{" "}
                  {selectedLocation.coordinates.longitude.toFixed(6)}
                </p>
              </div>
              <button
                onClick={clearSelection}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Search Examples Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Full Location Search */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-sawaari-yellow">
              Full Location Search
            </h2>
            <div className="bg-black/20 border border-white/20 rounded-lg p-4">
              <LocationSearch
                onLocationSelect={handleLocationSelect}
                placeholder="Search for any location..."
                className="w-full"
                autoFocus={false}
              />
              <p className="text-gray-400 text-sm mt-2">
                Full-featured search with detailed results and error handling
              </p>
            </div>
          </div>

          {/* Compact Search Variants */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-sawaari-yellow">
              Compact Search Variants
            </h2>

            {/* Small */}
            <div className="bg-black/20 border border-white/20 rounded-lg p-4">
              <h3 className="text-sm font-medium text-white mb-2">
                Small Size
              </h3>
              <CompactLocationSearch
                onLocationSelect={handleLocationSelect}
                placeholder="Small search..."
                size="sm"
                className="w-full"
              />
            </div>

            {/* Medium */}
            <div className="bg-black/20 border border-white/20 rounded-lg p-4">
              <h3 className="text-sm font-medium text-white mb-2">
                Medium Size
              </h3>
              <CompactLocationSearch
                onLocationSelect={handleLocationSelect}
                placeholder="Medium search..."
                size="md"
                className="w-full"
              />
            </div>

            {/* Large */}
            <div className="bg-black/20 border border-white/20 rounded-lg p-4">
              <h3 className="text-sm font-medium text-white mb-2">
                Large Size
              </h3>
              <CompactLocationSearch
                onLocationSelect={handleLocationSelect}
                placeholder="Large search..."
                size="lg"
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* Search History */}
        {searchHistory.length > 0 && (
          <div className="bg-black/20 border border-white/20 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-sawaari-yellow mb-3">
              Recent Searches
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {searchHistory.map((location, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedLocation(location)}
                  className="text-left p-2 bg-black/40 hover:bg-sawaari-yellow/20 rounded border border-white/10 hover:border-sawaari-yellow/30 transition-all"
                >
                  <div className="text-white text-sm font-medium truncate">
                    {location.name}
                  </div>
                  <div className="text-gray-400 text-xs truncate">
                    {location.coordinates.latitude.toFixed(4)},{" "}
                    {location.coordinates.longitude.toFixed(4)}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Map with Integrated Search */}
        <div className="bg-black/20 border border-white/20 rounded-lg p-4">
          <h2 className="text-xl font-semibold text-sawaari-yellow mb-4">
            Map with Integrated Search
          </h2>
          <div className="h-96 rounded-lg overflow-hidden">
            <EnhancedMapWithSearch
              center={
                selectedLocation
                  ? [
                      selectedLocation.coordinates.latitude,
                      selectedLocation.coordinates.longitude,
                    ]
                  : [28.6139, 77.209]
              }
              zoom={selectedLocation ? 16 : 14}
              showSearch={true}
              searchPlaceholder="Search on map..."
              onLocationSelect={handleLocationSelect}
              searchBbox={[76.8, 28.4, 77.6, 28.9]}
            />
          </div>
        </div>

        {/* API Information */}
        <div className="bg-black/20 border border-white/20 rounded-lg p-4">
          <h2 className="text-xl font-semibold text-sawaari-yellow mb-3">
            Features & Implementation
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h3 className="font-semibold text-white mb-2">Key Features:</h3>
              <ul className="text-gray-300 space-y-1">
                <li>• 200ms debounced search</li>
                <li>• Rate limiting (200ms between requests)</li>
                <li>• Keyboard navigation (arrows, enter, escape)</li>
                <li>• Click outside to close</li>
                <li>• Loading states and error handling</li>
                <li>• Responsive design</li>
                <li>• Multiple size variants</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-2">
                Technical Details:
              </h3>
              <ul className="text-gray-300 space-y-1">
                <li>• Uses Photon API (free, no API key)</li>
                <li>• GeoJSON response format</li>
                <li>• 5-minute result caching</li>
                <li>• Delhi NCR bounding box</li>
                <li>• Smooth map animations</li>
                <li>• TypeScript-ready</li>
                <li>• Accessible components</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocationSearchExample;
