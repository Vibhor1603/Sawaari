import React, { useState, useMemo, useCallback, useEffect } from "react";
import Select, { components } from "react-select";
import PropTypes from "prop-types";

const WorkingInfiniteSelect = ({
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
  const [displayedOptions, setDisplayedOptions] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Filter options based on search term
  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    return options.filter((option) =>
      option.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [options, searchTerm]);

  // Update displayed options when filtered options or page changes
  useEffect(() => {
    const endIndex = currentPage * pageSize;
    const newDisplayedOptions = filteredOptions.slice(0, endIndex);
    setDisplayedOptions(newDisplayedOptions);
    console.log("📋 Updated displayed options:", {
      page: currentPage,
      pageSize,
      endIndex,
      displayed: newDisplayedOptions.length,
      total: filteredOptions.length,
    });
  }, [filteredOptions, currentPage, pageSize]);

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
    setIsLoading(false);
  }, [searchTerm]);

  // Reset page when options change
  useEffect(() => {
    setCurrentPage(1);
    setIsLoading(false);
  }, [options]);

  // Transform options to react-select format
  const selectOptions = useMemo(() => {
    return displayedOptions.map((option) => ({
      value: option,
      label: option,
    }));
  }, [displayedOptions]);

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

  // Load more options
  const loadMore = useCallback(() => {
    const hasMore = displayedOptions.length < filteredOptions.length;
    console.log("🔄 LoadMore called:", {
      hasMore,
      isLoading,
      displayed: displayedOptions.length,
      total: filteredOptions.length,
      currentPage,
    });

    if (hasMore && !isLoading) {
      setIsLoading(true);
      console.log("✅ Loading next page...");

      setTimeout(() => {
        setCurrentPage((prev) => {
          const newPage = prev + 1;
          console.log("📄 Page updated:", prev, "→", newPage);
          return newPage;
        });
        setIsLoading(false);
      }, 200);
    }
  }, [displayedOptions.length, filteredOptions.length, isLoading, currentPage]);

  // Custom MenuList component with infinite scroll
  const MenuList = (props) => {
    const { children } = props;

    const handleScroll = useCallback(
      (e) => {
        const { target } = e;
        const { scrollTop, scrollHeight, clientHeight } = target;
        const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

        // Load more when scrolled to bottom (with 10px threshold)
        if (distanceFromBottom <= 10) {
          loadMore();
        }
      },
      [loadMore]
    );

    const hasMore = displayedOptions.length < filteredOptions.length;

    return (
      <components.MenuList {...props} onScroll={handleScroll}>
        {children}
        {hasMore && (
          <div className="px-3 py-2 text-center text-xs text-gray-400 border-t border-gray-700">
            <div className="flex items-center justify-center gap-2">
              <div className="w-3 h-3 border border-sawaari-yellow border-t-transparent rounded-full animate-spin"></div>
              {isLoading
                ? "Loading more locations..."
                : "Scroll for more locations..."}
            </div>
          </div>
        )}
      </components.MenuList>
    );
  };

  // Custom NoOptionsMessage
  const NoOptionsMessage = (props) => (
    <components.NoOptionsMessage {...props}>
      <div className="text-center text-sm text-gray-400">
        {searchTerm ? (
          <div>
            <div className="text-yellow-400 mb-1">🔍</div>
            No locations found matching "{searchTerm}"
          </div>
        ) : (
          <div>
            <div className="text-yellow-400 mb-1">📍</div>
            Start typing to search locations
          </div>
        )}
      </div>
    </components.NoOptionsMessage>
  );

  // Custom styles
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
      overflowY: "auto",
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
        filterOption={() => true} // Disable built-in filtering
        components={{
          IndicatorSeparator: () => null,
          MenuList,
          NoOptionsMessage,
        }}
      />
    </div>
  );
};

WorkingInfiniteSelect.propTypes = {
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

export default WorkingInfiniteSelect;
