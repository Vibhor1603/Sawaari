/* eslint-disable react/prop-types */
import React, { useState, useRef, useEffect, useCallback } from "react";
import { Search, X, MapPin, Loader2 } from "lucide-react";
import photonService from "../../services/photonService";

const LocationSearch = ({
  onLocationSelect,
  placeholder = "Search for a location on the map",
  className = "",
  bbox = null, // Optional bounding box for regional search
  disabled = false,
  autoFocus = false,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const searchTimeoutRef = useRef(null);
  const lastSearchTime = useRef(0);
  const inputRef = useRef(null);
  const resultsRef = useRef(null);

  // Debounced search function
  const performSearch = useCallback(
    async (query) => {
      if (!query || query.trim().length < 2) {
        setSearchResults([]);
        setShowResults(false);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      setError(null);
      lastSearchTime.current = Date.now();

      try {
        const results = await photonService.searchLocations(query, {
          limit: 5,
          bbox: bbox,
        });

        // Always show the latest results
        if (results.error) {
          setError(results.error);
          setSearchResults([]);
        } else {
          setSearchResults(results.features || []);
          setError(null);
        }
        setShowResults(true);
        setSelectedIndex(-1);
      } catch (err) {
        setError("Failed to search locations");
        setSearchResults([]);
        setShowResults(true);
      } finally {
        setIsSearching(false);
      }
    },
    [bbox]
  );

  // Handle input change with debouncing
  const handleInputChange = useCallback(
    (e) => {
      const value = e.target.value;
      setSearchQuery(value);

      // Clear previous timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      // Set new timeout for debounced search (very fast response)
      searchTimeoutRef.current = setTimeout(() => {
        performSearch(value);
      }, 100);
    },
    [performSearch]
  );

  // Handle result selection
  const handleResultSelect = useCallback(
    (feature) => {
      const coordinates = photonService.getCoordinates(feature);
      if (coordinates && onLocationSelect) {
        onLocationSelect({
          name: feature.properties.displayName,
          coordinates: coordinates,
          feature: feature,
        });
      }

      setSearchQuery(feature.properties.displayName);
      setShowResults(false);
      setSelectedIndex(-1);
    },
    [onLocationSelect]
  );

  // Handle clear search
  const handleClear = useCallback(() => {
    setSearchQuery("");
    setSearchResults([]);
    setShowResults(false);
    setError(null);
    setSelectedIndex(-1);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e) => {
      if (!showResults) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < searchResults.length - 1 ? prev + 1 : prev
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
          break;
        case "Enter":
          e.preventDefault();
          if (selectedIndex >= 0 && searchResults[selectedIndex]) {
            handleResultSelect(searchResults[selectedIndex]);
          }
          break;
        case "Escape":
          setShowResults(false);
          setSelectedIndex(-1);
          break;
      }
    },
    [showResults, searchResults, selectedIndex, handleResultSelect]
  );

  // Handle click outside to close results
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (resultsRef.current && !resultsRef.current.contains(event.target)) {
        setShowResults(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Auto focus if requested
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className={`relative ${className}`} ref={resultsRef}>
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </div>

        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => searchResults.length > 0 && setShowResults(true)}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full pl-10 pr-10 py-2 bg-black/80 backdrop-blur-sm border-2 border-white/30 rounded-xl text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-sawaari-yellow focus:border-sawaari-yellow transition-all duration-200 text-sm font-medium shadow-lg"
        />

        {/* Loading Spinner */}
        {isSearching && (
          <div className="absolute inset-y-0 right-8 flex items-center">
            <Loader2 className="h-4 w-4 text-sawaari-yellow animate-spin" />
          </div>
        )}

        {/* Clear Button */}
        {searchQuery && !isSearching && (
          <button
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-sawaari-yellow transition-colors duration-200"
            disabled={disabled}
          >
            <X className="h-4 w-4 text-gray-400 hover:text-white" />
          </button>
        )}
      </div>

      {/* Results Dropdown */}
      {showResults && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-black/95 backdrop-blur-md border-2 border-white/30 rounded-xl shadow-2xl z-50 max-h-72 overflow-y-auto">
          {error ? (
            <div className="p-3 text-red-400 text-sm flex items-center gap-2">
              <X className="h-4 w-4" />
              {error}
            </div>
          ) : searchResults.length > 0 ? (
            <div className="py-1">
              {searchResults.map((feature, index) => (
                <button
                  key={`${feature.properties.osm_id || index}`}
                  onClick={() => handleResultSelect(feature)}
                  className={`w-full px-4 py-3 text-left hover:bg-sawaari-yellow/25 transition-colors duration-200 flex items-start gap-3 border-b border-white/10 last:border-b-0 ${
                    index === selectedIndex ? "bg-sawaari-yellow/25" : ""
                  }`}
                >
                  <MapPin className="h-4 w-4 text-sawaari-yellow mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-medium truncate">
                      {feature.properties.name || "Unknown Location"}
                    </div>
                    <div className="text-gray-400 text-xs truncate">
                      {feature.properties.displayName}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : searchQuery.length >= 2 && !isSearching ? (
            <div className="p-3 text-gray-400 text-sm text-center">
              No locations found for "{searchQuery}&quot;
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default LocationSearch;
