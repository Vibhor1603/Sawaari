/* eslint-disable no-unused-vars */
/* eslint-disable react/prop-types */
import React, { useState, useEffect, useRef, useCallback } from "react";
import Select, { components } from "react-select";
import locationService from "../../services/locationService";

const DatabaseLocationSelect = ({
  value,
  onChange,
  placeholder = "Search location",
  label,
  icon,
  required = false,
  className = "",
  disabled = false,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isSearching, setIsSearching] = useState(false);

  const searchTimeoutRef = useRef(null);
  const scrollPositionRef = useRef(0);
  const shouldRestoreScroll = useRef(false);

  // Load initial locations
  const loadInitialLocations = useCallback(async () => {
    if (locations.length > 0) return; // Already loaded

    setLoading(true);
    setError(null);

    try {
      const result = await locationService.getLocationsPaginated(1, 20);
      setLocations(result.data);
      setHasMore(result.pagination.hasMore);
      setCurrentPage(1);
    } catch (err) {
      setError("Failed to load locations");
      console.error("Error loading initial locations:", err);
    } finally {
      setLoading(false);
    }
  }, [locations.length]);

  // Load more locations
  const loadMoreLocations = useCallback(async () => {
    if (loading || !hasMore || isSearching) return;

    // Store current scroll position
    const menuListElement = document.querySelector(".react-select__menu-list");
    if (menuListElement) {
      scrollPositionRef.current = menuListElement.scrollTop;
      shouldRestoreScroll.current = true;
    }

    setLoading(true);

    try {
      const nextPage = currentPage + 1;
      const result = await locationService.getLocationsPaginated(nextPage, 20);

      setLocations((prev) => [...prev, ...result.data]);
      setHasMore(result.pagination.hasMore);
      setCurrentPage(nextPage);
    } catch (err) {
      setError("Failed to load more locations");
      console.error("Error loading more locations:", err);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, isSearching, currentPage]);

  // Search locations
  const searchLocations = useCallback(async (query) => {
    if (!query.trim()) {
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setLoading(true);
    setError(null);

    try {
      const result = await locationService.searchLocations(query, 20);
      // Update locations with search results
      setLocations(result.data);
      setHasMore(false); // No pagination for search results
    } catch (err) {
      setError("Failed to search locations");
      console.error("Error searching locations:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle search input change with debouncing
  const handleInputChange = useCallback(
    (inputValue) => {
      setSearchTerm(inputValue);

      // Clear previous timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      // Reset to initial state if no search term
      if (!inputValue.trim()) {
        setIsSearching(false);
        setCurrentPage(1);
        setHasMore(true);
        loadInitialLocations();
        return;
      }

      // Debounce search
      searchTimeoutRef.current = setTimeout(() => {
        searchLocations(inputValue);
      }, 300);
    },
    [searchLocations, loadInitialLocations]
  );

  // Handle selection change
  const handleChange = (selectedOption) => {
    onChange(selectedOption ? selectedOption.value : "");
  };

  // Load initial locations on mount
  useEffect(() => {
    loadInitialLocations();
  }, [loadInitialLocations]);

  // Restore scroll position after loading more items
  useEffect(() => {
    if (shouldRestoreScroll.current) {
      const menuListElement = document.querySelector(
        ".react-select__menu-list"
      );
      if (menuListElement && scrollPositionRef.current > 0) {
        requestAnimationFrame(() => {
          menuListElement.scrollTop = scrollPositionRef.current;
          shouldRestoreScroll.current = false;
        });
      }
    }
  }, [locations.length]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Transform locations to react-select format
  const selectOptions = locations.map((location) => ({
    value: location.name,
    label: location.name,
  }));

  // Find the selected option
  const selectedOption = value ? { value, label: value } : null;

  // Custom MenuList component with load more
  const MenuList = (props) => {
    const { children } = props;
    return (
      <components.MenuList {...props}>
        {children}
        {!isSearching && hasMore && (
          <div className="px-3 py-2 text-center text-xs border-t border-gray-700 bg-black">
            <span
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                loadMoreLocations();
              }}
              className="text-sawaari-yellow hover:text-yellow-300 cursor-pointer transition-colors duration-200 bg-gray-900 hover:bg-gray-800 px-3 py-1 rounded"
            >
              {loading ? "Loading..." : "Load More"}
            </span>
          </div>
        )}
      </components.MenuList>
    );
  };

  // Custom styles to match the website theme (same as original LocationSelect)
  const customStyles = {
    control: (provided, state) => ({
      ...provided,
      backgroundColor: "rgba(0, 0, 0, 0.4)",
      border: state.isFocused
        ? "1px solid #f4b942"
        : "1px solid rgba(255, 255, 255, 0.1)",
      borderRadius: "0.5rem",
      padding: "0.125rem",
      minHeight: "40px",
      boxShadow: "none",
      "&:hover": {
        border: "1px solid rgba(255, 255, 255, 0.2)",
      },
      transition: "all 0.3s ease",
    }),
    input: (provided) => ({
      ...provided,
      color: "#ffffff",
      fontSize: "0.875rem",
    }),
    placeholder: (provided) => ({
      ...provided,
      color: "#9ca3af",
      fontSize: "0.875rem",
    }),
    singleValue: (provided) => ({
      ...provided,
      color: "#ffffff",
      fontSize: "0.875rem",
    }),
    menu: (provided) => ({
      ...provided,
      backgroundColor: "#000000",
      border: "1px solid rgba(255, 255, 255, 0.05)",
      borderRadius: "0.5rem",
      zIndex: 9999,
      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.3)",
    }),
    menuList: (provided) => ({
      ...provided,
      backgroundColor: "#000000",
      borderRadius: "0.5rem",
      padding: "0.25rem",
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isFocused
        ? "rgba(244, 185, 66, 0.2)"
        : state.isSelected
        ? "rgba(244, 185, 66, 0.3)"
        : "transparent",
      color: state.isSelected ? "#ffffff" : "#e5e7eb",
      padding: "0.5rem 0.75rem",
      fontSize: "0.875rem",
      cursor: "pointer",
      "&:hover": {
        backgroundColor: "rgba(244, 185, 66, 0.2)",
      },
    }),
    dropdownIndicator: (provided) => ({
      ...provided,
      color: "#9ca3af",
      "&:hover": {
        color: "#f4b942",
      },
    }),
    clearIndicator: (provided) => ({
      ...provided,
      color: "#9ca3af",
      "&:hover": {
        color: "#f4b942",
      },
    }),
    indicatorSeparator: (provided) => ({
      ...provided,
      backgroundColor: "rgba(255, 255, 255, 0.2)",
    }),
  };

  return (
    <div className={className}>
      {label && (
        <label className="block text-xs font-semibold text-sawaari-yellow mb-1 text-readable">
          {icon && <span className="mr-1">{icon}</span>}
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}
      <Select
        value={selectedOption}
        onChange={handleChange}
        options={selectOptions}
        placeholder={placeholder}
        styles={customStyles}
        isSearchable={true}
        isClearable={false}
        isDisabled={disabled}
        menuPortalTarget={document.body}
        menuPosition="fixed"
        className="react-select-container"
        classNamePrefix="react-select"
        onInputChange={handleInputChange}
        filterOption={() => true} // Disable built-in filtering since we handle it
        noOptionsMessage={({ inputValue }) =>
          inputValue
            ? `No locations found matching "${inputValue}"`
            : loading
            ? "Loading locations..."
            : "No locations available"
        }
        components={{
          IndicatorSeparator: () => null,
          MenuList,
        }}
      />
    </div>
  );
};

export default DatabaseLocationSelect;
