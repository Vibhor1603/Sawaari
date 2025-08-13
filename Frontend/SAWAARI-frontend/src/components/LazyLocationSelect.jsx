import { useState, useMemo, useCallback } from "react";
import Select from "react-select";
import PropTypes from "prop-types";
import { useLazyOptions } from "../hooks/useLazyOptions";
import PerformanceMonitor from "./PerformanceMonitor";

const LazyLocationSelect = ({
  value,
  onChange,
  options,
  placeholder,
  label,
  icon,
  required = false,
  className = "",
  pageSize = 20,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Use the lazy options hook
  const { visibleOptions, loadMore, hasMore, loadedCount, totalCount } =
    useLazyOptions(options, pageSize, searchTerm);

  // Transform options to react-select format
  const selectOptions = useMemo(() => {
    return visibleOptions.map((option) => ({
      value: option,
      label: option,
    }));
  }, [visibleOptions]);

  // Find the selected option
  const selectedOption = value ? { value, label: value } : null;

  // Handle selection change
  const handleChange = (selectedOption) => {
    onChange(selectedOption ? selectedOption.value : "");
  };

  // Handle input change (search)
  const handleInputChange = useCallback((inputValue) => {
    setSearchTerm(inputValue);
  }, []);

  // Custom styles to match the website theme
  const customStyles = {
    control: (provided, state) => ({
      ...provided,
      backgroundColor: "rgba(0, 0, 0, 0.3)",
      border: state.isFocused
        ? "2px solid #f4b942"
        : "1px solid rgba(255, 255, 255, 0.2)",
      borderRadius: "0.5rem",
      padding: "0.125rem",
      minHeight: "40px",
      boxShadow: state.isFocused ? "0 0 0 2px rgba(244, 185, 66, 0.2)" : "none",
      "&:hover": {
        border: "1px solid rgba(255, 255, 255, 0.3)",
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
      border: "1px solid rgba(255, 255, 255, 0.2)",
      borderRadius: "0.5rem",
      zIndex: 1000,
      maxHeight: "300px",
      position: "absolute",
      top: "100%",
      left: 0,
      right: 0,
      marginTop: "4px",
      boxShadow: "0 10px 25px rgba(0, 0, 0, 0.8)",
      backdropFilter: "blur(10px)",
    }),
    menuList: (provided) => ({
      ...provided,
      maxHeight: "none", // Let the MenuList component handle this
      padding: 0,
      overflowY: "visible", // Let the MenuList component handle this
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
          <span className="text-xs text-gray-400 ml-2">
            ({totalCount} locations)
          </span>
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
        className="react-select-container"
        classNamePrefix="react-select"
        onInputChange={handleInputChange}
        onMenuOpen={() => setIsMenuOpen(true)}
        onMenuClose={() => setIsMenuOpen(false)}
        filterOption={() => true}
        components={{
          IndicatorSeparator: () => null,
          MenuList: ({ children, ...props }) => (
            <div
              {...props}
              style={{
                ...props.style,
                maxHeight: "270px",
                overflowY: "auto",
                backgroundColor: "rgba(0, 0, 0, 0.95)",
                borderRadius: "0.5rem",
                padding: "0.25rem",
                backdropFilter: "blur(10px)",
              }}
            >
              <div
                style={{ backgroundColor: "#000000", borderRadius: "0.375rem" }}
              >
                {children}
              </div>
              {hasMore && (
                <div className="px-3 py-2 text-center border-t border-gray-600 bg-black sticky bottom-0 rounded-b-lg">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      loadMore();
                    }}
                    className="text-xs text-sawaari-yellow hover:text-yellow-300 transition-colors duration-200 cursor-pointer bg-gray-900 hover:bg-gray-800 border-none outline-none p-2 rounded w-full"
                  >
                    Load More ({loadedCount} of {totalCount} shown)
                  </button>
                </div>
              )}
            </div>
          ),
          NoOptionsMessage: ({ inputValue }) => (
            <div className="px-3 py-4 text-center text-sm text-gray-400">
              {inputValue ? (
                <div>
                  <div className="text-yellow-400 mb-1">🔍</div>
                  No locations found matching &quot;{inputValue}&quot;
                  <div className="text-xs mt-1 text-gray-500">
                    Try a different search term
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-yellow-400 mb-1">📍</div>
                  No locations available
                </div>
              )}
            </div>
          ),
        }}
        menuIsOpen={isMenuOpen}
      />

      {/* Loading indicator when menu is closed but options are being processed */}
      {!isMenuOpen && searchTerm && (
        <div className="text-xs text-gray-400 mt-1 flex items-center gap-1">
          <div className="w-2 h-2 border border-sawaari-yellow border-t-transparent rounded-full animate-spin"></div>
          Searching locations...
        </div>
      )}

      {/* Performance Monitor for Development */}
      <PerformanceMonitor options={options} visible={isMenuOpen} />
    </div>
  );
};

LazyLocationSelect.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  options: PropTypes.arrayOf(PropTypes.string).isRequired,
  placeholder: PropTypes.string,
  label: PropTypes.string,
  icon: PropTypes.string,
  required: PropTypes.bool,
  className: PropTypes.string,
  pageSize: PropTypes.number,
};

export default LazyLocationSelect;
