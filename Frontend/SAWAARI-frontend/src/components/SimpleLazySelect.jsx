import React, { useState, useMemo, useCallback } from "react";
import Select from "react-select";
import PropTypes from "prop-types";

const SimpleLazySelect = ({
  value,
  onChange,
  options,
  placeholder,
  label,
  icon,
  required = false,
  className = "",
  pageSize = 15,
}) => {
  const [inputValue, setInputValue] = useState("");
  const [menuIsOpen, setMenuIsOpen] = useState(false);

  // Filter and limit options based on search
  const filteredAndLimitedOptions = useMemo(() => {
    let filtered = options;

    // Filter by search term
    if (inputValue) {
      filtered = options.filter((option) =>
        option.toLowerCase().includes(inputValue.toLowerCase())
      );
    }

    // Limit to pageSize for performance
    const limited = filtered.slice(0, pageSize);

    return {
      options: limited.map((option) => ({ value: option, label: option })),
      totalCount: filtered.length,
      showingCount: limited.length,
      hasMore: filtered.length > pageSize,
    };
  }, [options, inputValue, pageSize]);

  // Find the selected option
  const selectedOption = value ? { value, label: value } : null;

  // Handle selection change
  const handleChange = (selectedOption) => {
    onChange(selectedOption ? selectedOption.value : "");
  };

  // Handle input change (search)
  const handleInputChange = useCallback((newInputValue) => {
    setInputValue(newInputValue);
  }, []);

  // Custom NoOptionsMessage
  const NoOptionsMessage = ({ inputValue }) => (
    <div className="px-3 py-4 text-center text-sm text-gray-400">
      {inputValue ? (
        <div>
          <div className="text-yellow-400 mb-1">🔍</div>
          No locations found matching "{inputValue}"
          <div className="text-xs mt-1 text-gray-500">
            Try a different search term
          </div>
        </div>
      ) : (
        <div>
          <div className="text-yellow-400 mb-1">📍</div>
          Start typing to search locations
        </div>
      )}
    </div>
  );

  // Custom LoadingMessage
  const LoadingMessage = () => (
    <div className="px-3 py-4 text-center text-sm text-gray-400">
      <div className="flex items-center justify-center gap-2">
        <div className="w-3 h-3 border border-sawaari-yellow border-t-transparent rounded-full animate-spin"></div>
        Searching locations...
      </div>
    </div>
  );

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
      border: "1px solid rgba(255, 255, 255, 0.1)",
      borderRadius: "0.5rem",
      zIndex: 9999,
      maxHeight: "300px",
    }),
    menuList: (provided) => ({
      ...provided,
      backgroundColor: "#000000",
      borderRadius: "0.5rem",
      padding: "0.25rem",
      maxHeight: "270px",
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
            ({filteredAndLimitedOptions.totalCount} locations)
          </span>
        </label>
      )}
      <Select
        value={selectedOption}
        onChange={handleChange}
        options={filteredAndLimitedOptions.options}
        placeholder={placeholder}
        styles={customStyles}
        isSearchable={true}
        isClearable={false}
        menuPortalTarget={document.body}
        menuPosition="fixed"
        className="react-select-container"
        classNamePrefix="react-select"
        onInputChange={handleInputChange}
        onMenuOpen={() => setMenuIsOpen(true)}
        onMenuClose={() => setMenuIsOpen(false)}
        filterOption={() => true} // Disable built-in filtering since we handle it
        components={{
          IndicatorSeparator: () => null,
          NoOptionsMessage,
          LoadingMessage,
        }}
        inputValue={inputValue}
        menuIsOpen={menuIsOpen}
      />

      {/* Show info about limited results */}
      {menuIsOpen && filteredAndLimitedOptions.hasMore && (
        <div className="text-xs text-gray-400 mt-1 px-2">
          Showing first {filteredAndLimitedOptions.showingCount} of{" "}
          {filteredAndLimitedOptions.totalCount} locations.
          <span className="text-sawaari-yellow ml-1">
            Keep typing to narrow down results.
          </span>
        </div>
      )}
    </div>
  );
};

SimpleLazySelect.propTypes = {
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

export default SimpleLazySelect;
