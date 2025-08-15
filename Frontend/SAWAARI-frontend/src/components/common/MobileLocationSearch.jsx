/* eslint-disable react/prop-types */
import { useState, useRef, useEffect, useCallback } from "react";
import { Search, X, MapPin, Loader2 } from "lucide-react";
import photonService from "../../services/photonService";

// Mobile-optimized location search component
const MobileLocationSearch = ({
  onLocationSelect,
  placeholder = "Search for a location on the map",
  className = "",
  disabled = false,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const searchTimeoutRef = useRef(null);
  const inputRef = useRef(null);
  const resultsRef = useRef(null);

  // Optimized search for mobile
  const performSearch = useCallback(async (query) => {
    if (!query || query.trim().length < 2) {
      // Reduced from 3 to 2 for mobile
      setSearchResults([]);
      setShowResults(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    try {
      const results = await photonService.searchLocations(query, {
        limit: 4, // Reduced for mobile screens
        // No bbox restriction - search worldwide
      });

      if (results.features) {
        setSearchResults(results.features);
        setShowResults(true);
        setSelectedIndex(-1);
      }
    } catch (err) {
      console.error("Mobile search error:", err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Faster debounce for mobile
  const handleInputChange = useCallback(
    (e) => {
      const value = e.target.value;
      setSearchQuery(value);

      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      searchTimeoutRef.current = setTimeout(() => {
        performSearch(value);
      }, 100); // Even faster for mobile
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

      setSearchQuery(feature.properties.name || feature.properties.displayName);
      setShowResults(false);
      setSelectedIndex(-1);

      // Blur input on mobile to hide keyboard
      if (inputRef.current) {
        inputRef.current.blur();
      }
    },
    [onLocationSelect]
  );

  // Handle clear search
  const handleClear = useCallback(() => {
    setSearchQuery("");
    setSearchResults([]);
    setShowResults(false);
    setSelectedIndex(-1);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Touch-optimized keyboard navigation
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
          if (inputRef.current) {
            inputRef.current.blur();
          }
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

    document.addEventListener("touchstart", handleClickOutside);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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
      {/* Mobile-optimized Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
          <Search className="h-3.5 w-3.5 text-gray-300" />
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
          className="w-full pl-8 pr-8 py-2.5 bg-black/90 backdrop-blur-md border border-white/40 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-1 focus:ring-sawaari-yellow focus:border-sawaari-yellow transition-all duration-200 text-xs font-medium shadow-lg placeholder:text-xs"
          style={{
            fontSize: "14px", // Prevents zoom on iOS
            WebkitAppearance: "none", // Removes iOS styling
          }}
        />

        {/* Loading Spinner */}
        {isSearching && (
          <div className="absolute inset-y-0 right-8 flex items-center">
            <Loader2 className="h-3.5 w-3.5 text-sawaari-yellow animate-spin" />
          </div>
        )}

        {/* Clear Button */}
        {searchQuery && !isSearching && (
          <button
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-2 flex items-center hover:text-sawaari-yellow transition-colors duration-200"
            disabled={disabled}
          >
            <X className="h-3.5 w-3.5 text-gray-300 hover:text-white" />
          </button>
        )}
      </div>

      {/* Mobile-optimized Results Dropdown */}
      {showResults && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-black/95 backdrop-blur-md border border-white/40 rounded-lg shadow-xl z-50 max-h-64 overflow-y-auto">
          {searchResults.length > 0 ? (
            <div className="py-1">
              {searchResults.map((feature, index) => (
                <button
                  key={`${feature.properties.osm_id || index}`}
                  onClick={() => handleResultSelect(feature)}
                  className={`w-full px-2.5 py-2.5 text-left hover:bg-sawaari-yellow/25 active:bg-sawaari-yellow/30 transition-colors duration-200 flex items-start gap-2 border-b border-white/10 last:border-b-0 ${
                    index === selectedIndex ? "bg-sawaari-yellow/25" : ""
                  }`}
                  style={{
                    minHeight: "50px", // Touch-friendly height but smaller
                  }}
                >
                  <MapPin className="h-4 w-4 text-sawaari-yellow mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-medium truncate">
                      {feature.properties.name || "Unknown Location"}
                    </div>
                    <div className="text-gray-300 text-xs truncate mt-0.5">
                      {feature.properties.displayName}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : searchQuery.length >= 2 && !isSearching ? (
            <div className="p-3 text-gray-400 text-center text-xs">
              No locations found for "{searchQuery}"
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default MobileLocationSearch;
