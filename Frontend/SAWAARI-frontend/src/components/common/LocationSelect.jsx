import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import Select, { components } from "react-select";
import PropTypes from "prop-types";

const LocationSelect = ({
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
  const [loadedCount, setLoadedCount] = useState(pageSize);
  const scrollPositionRef = useRef(0);
  const shouldRestoreScroll = useRef(false);

  // Filter options based on search term
  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    return options.filter((option) =>
      option.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [options, searchTerm]);

  // Get currently visible options (lazy loaded)
  const visibleOptions = useMemo(() => {
    return filteredOptions.slice(0, loadedCount);
  }, [filteredOptions, loadedCount]);

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
  const handleInputChange = useCallback(
    (inputValue) => {
      setSearchTerm(inputValue);
      setLoadedCount(pageSize); // Reset to initial page size when searching
    },
    [pageSize]
  );

  // Load more options
  const loadMore = useCallback(() => {
    if (loadedCount < filteredOptions.length) {
      // Store current scroll position
      const menuListElement = document.querySelector(
        ".react-select__menu-list"
      );
      if (menuListElement) {
        scrollPositionRef.current = menuListElement.scrollTop;
        shouldRestoreScroll.current = true;
      }

      setLoadedCount((prev) =>
        Math.min(prev + pageSize, filteredOptions.length)
      );
    }
  }, [loadedCount, filteredOptions.length, pageSize]);

  // Reset loaded count when options change
  useEffect(() => {
    setLoadedCount(pageSize);
  }, [options, pageSize]);

  // Restore scroll position after loading more items
  useEffect(() => {
    if (shouldRestoreScroll.current) {
      const menuListElement = document.querySelector(
        ".react-select__menu-list"
      );
      if (menuListElement && scrollPositionRef.current > 0) {
        // Use requestAnimationFrame to ensure DOM is fully updated
        requestAnimationFrame(() => {
          menuListElement.scrollTop = scrollPositionRef.current;
          shouldRestoreScroll.current = false;
        });
      }
    }
  }, [loadedCount]);

  // Custom MenuList component with load more
  const MenuList = (props) => {
    const { children } = props;
    return (
      <components.MenuList {...props}>
        {children}
        {loadedCount < filteredOptions.length && (
          <div className="px-3 py-2 text-center text-xs border-t border-gray-700 bg-black">
            <span
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                loadMore();
              }}
              className="text-sawaari-yellow hover:text-yellow-300 cursor-pointer transition-colors duration-200 bg-gray-900 hover:bg-gray-800 px-3 py-1 rounded"
            >
              Load More
            </span>
          </div>
        )}
      </components.MenuList>
    );
  };

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
        menuPortalTarget={document.body}
        menuPosition="fixed"
        className="react-select-container"
        classNamePrefix="react-select"
        onInputChange={handleInputChange}
        filterOption={() => true} // Disable built-in filtering since we handle it
        noOptionsMessage={({ inputValue }) =>
          inputValue
            ? `No locations found matching "${inputValue}"`
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

LocationSelect.propTypes = {
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

export default LocationSelect;
