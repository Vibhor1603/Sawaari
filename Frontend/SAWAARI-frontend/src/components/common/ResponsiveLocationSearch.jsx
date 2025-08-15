/* eslint-disable react/prop-types */
import { useState, useEffect } from "react";
import LocationSearch from "./LocationSearch";
import MobileLocationSearch from "./MobileLocationSearch";

// Responsive location search that switches between desktop and mobile versions
const ResponsiveLocationSearch = ({
  onLocationSelect,
  placeholder = "Search for a location on the map",
  className = "",
  disabled = false,
  autoFocus = false,
  mobileBreakpoint = 768, // px
}) => {
  const [isMobile, setIsMobile] = useState(false);

  // Check if device is mobile
  useEffect(() => {
    const checkIsMobile = () => {
      const width = window.innerWidth;
      const isTouchDevice =
        "ontouchstart" in window || navigator.maxTouchPoints > 0;
      setIsMobile(width < mobileBreakpoint || isTouchDevice);
    };

    // Initial check
    checkIsMobile();

    // Listen for resize events
    window.addEventListener("resize", checkIsMobile);

    return () => window.removeEventListener("resize", checkIsMobile);
  }, [mobileBreakpoint]);

  // Common props for both components
  const commonProps = {
    onLocationSelect,
    placeholder,
    className,
    disabled,
  };

  // Render mobile or desktop version based on screen size
  if (isMobile) {
    return <MobileLocationSearch {...commonProps} />;
  }

  return <LocationSearch {...commonProps} autoFocus={autoFocus} />;
};

export default ResponsiveLocationSearch;
