/* eslint-disable react/prop-types */
import { useState, useRef, useEffect, useCallback } from "react";
import { Search, X, MapPin, Loader2 } from "lucide-react";
import photonService from "../../services/photonService";

const CompactLocationSearch = ({
  onLocationSelect,
  placeholder = "Search location...",
  className = "",
  disabled = false,
  size = "sm", // "sm" | "md" | "lg"
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const searchTimeoutRef = useRef(null);
  const inputRef = useRef(null);
  const resultsRef = useRef(null);

  // Size configurations with improved mobile visibility
  const sizeConfig = {
    sm: {
      input: "py-1.5 px-8 text-xs",
      icon: "h-3 w-3",
      result: "px-3 py-2 text-xs",
      dropdown: "max-h-48",
    },
    md: {
      input: "py-2 px-10 text-sm",
      icon: "h-4 w-4",
      result: "px-3 py-2.5 text-sm",
      dropdown: "max-h-56",
    },
    lg: {
      input: "py-2.5 px-12 text-base",
      icon: "h-5 w-5",
      result: "px-4 py-3 text-base",
      dropdown: "max-h-64",
    },
  };

  const config = sizeConfig[size] || sizeConfig.md;

  // Debounced search function
  const performSearch = useCallback(async (query) => {
    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      setShowResults(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    try {
      const results = await photonService.searchLocations(query, {
        limit: 5,
        // No bbox restriction - search worldwide
      });

      if (results.features) {
        setSearchResults(results.features);
        setShowResults(true);
        setSelectedIndex(-1);
      }
    } catch (err) {
      console.error("Search error:", err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Handle input change with debouncing
  const handleInputChange = useCallback(
    (e) => {
      const value = e.target.value;
      setSearchQuery(value);

      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

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

      setSearchQuery(feature.properties.name || feature.properties.displayName);
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
        <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
          <Search className={`${config.icon} text-gray-400`} />
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
          className={`w-full ${config.input} pr-8 bg-black/80 backdrop-blur-sm border-2 border-white/30 rounded-xl text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-sawaari-yellow focus:border-sawaari-yellow transition-all duration-200 font-medium shadow-lg`}
        />

        {/* Loading Spinner */}
        {isSearching && (
          <div className="absolute inset-y-0 right-6 flex items-center">
            <Loader2
              className={`${config.icon} text-sawaari-yellow animate-spin`}
            />
          </div>
        )}

        {/* Clear Button */}
        {searchQuery && !isSearching && (
          <button
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-2 flex items-center hover:text-sawaari-yellow transition-colors duration-200"
            disabled={disabled}
          >
            <X className={`${config.icon} text-gray-400 hover:text-white`} />
          </button>
        )}
      </div>

      {/* Results Dropdown */}
      {showResults && (
        <div
          className={`absolute top-full left-0 right-0 mt-2 bg-black/95 backdrop-blur-md border-2 border-white/30 rounded-xl shadow-2xl z-50 ${config.dropdown} overflow-y-auto`}
        >
          {searchResults.length > 0 ? (
            <div className="py-1">
              {searchResults.map((feature, index) => (
                <button
                  key={`${feature.properties.osm_id || index}`}
                  onClick={() => handleResultSelect(feature)}
                  className={`w-full ${
                    config.result
                  } text-left hover:bg-sawaari-yellow/25 transition-colors duration-200 flex items-start gap-2 border-b border-white/10 last:border-b-0 ${
                    index === selectedIndex ? "bg-sawaari-yellow/25" : ""
                  }`}
                >
                  <MapPin
                    className={`${config.icon} text-sawaari-yellow mt-0.5 flex-shrink-0`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-medium truncate">
                      {feature.properties.name || "Unknown Location"}
                    </div>
                    {size !== "sm" && (
                      <div className="text-gray-400 text-xs truncate">
                        {feature.properties.displayName}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : searchQuery.length >= 2 && !isSearching ? (
            <div className={`${config.result} text-gray-400 text-center`}>
              No locations found
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default CompactLocationSearch;
