/* eslint-disable no-unused-vars */
/* eslint-disable react/prop-types */
import { useState, useEffect } from "react";

const LocationBanner = ({
  onUseDefaultLocation,
  defaultLocation = [28.61906956113947, 77.42676112811002],
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [isOutsideServiceArea, setIsOutsideServiceArea] = useState(false);

  // Check if coordinates are within Delhi NCR area (rough bounds)
  const isInDelhiNCR = (lat, lng) => {
    // Delhi NCR approximate bounds
    const bounds = {
      north: 28.9,
      south: 28.3,
      east: 77.6,
      west: 76.8,
    };
    return (
      lat >= bounds.south &&
      lat <= bounds.north &&
      lng >= bounds.west &&
      lng <= bounds.east
    );
  };

  useEffect(() => {
    // Check if banner was previously dismissed
    const dismissed = localStorage.getItem("locationBannerDismissed");
    if (dismissed) {
      setIsDismissed(true);
      return;
    }

    // Try to get user location to determine if they're outside service area
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ lat: latitude, lng: longitude });

          const isInside = isInDelhiNCR(latitude, longitude);

          // Check if user is outside Delhi NCR
          if (!isInside) {
            setIsOutsideServiceArea(true);

            // Only show banner if user is outside service area
            setTimeout(() => {
              setIsVisible(true);
            }, 1500);
          }
        },
        (error) => {
          console.log(
            "❌ LocationBanner: Location access failed:",
            error.message
          );
          console.log(
            "🚨 LocationBanner: Showing banner due to location failure"
          );
          // If location access denied or failed, show banner anyway (assume they might be outside)
          setTimeout(() => {
            setIsVisible(true);
          }, 1000);
        },
        {
          timeout: 5000,
          maximumAge: 300000, // 5 minutes
        }
      );
    } else {
      console.log("❌ LocationBanner: No geolocation support");
      console.log("🚨 LocationBanner: Showing banner due to no geolocation");
      // No geolocation support, show banner (assume they might be outside)
      setTimeout(() => {
        setIsVisible(true);
      }, 1000);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    localStorage.setItem("locationBannerDismissed", "true");
  };

  const handleUseDefaultLocation = () => {
    onUseDefaultLocation(defaultLocation);
    handleDismiss();
  };

  if (isDismissed || !isVisible) return null;

  return (
    <div className="fixed top-20 left-4 right-4 z-[1002] animate-slide-down">
      <div className="max-w-4xl mx-auto">
        <div className="bg-gradient-to-r from-blue-600/95 to-indigo-600/95 backdrop-blur-sm border border-blue-400/30 rounded-xl p-4 shadow-lg">
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className="flex-shrink-0 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center mt-0.5">
              <span className="text-lg">📍</span>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="text-white">
                  <p className="text-sm sm:text-base font-medium mb-1">
                    Service Available in Noida, Delhi & Ghaziabad
                  </p>
                  <p className="text-xs sm:text-sm text-blue-100 opacity-90">
                    {isOutsideServiceArea
                      ? "You're outside our service area. Try our demo to explore features!"
                      : "Outside our service area? Try our demo to explore features!"}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={handleUseDefaultLocation}
                    className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs sm:text-sm font-medium rounded-lg transition-colors duration-200 border border-white/20 hover:border-white/40"
                  >
                    Try Demo
                  </button>
                  <button
                    onClick={handleDismiss}
                    className="p-1.5 hover:bg-white/20 text-white/80 hover:text-white rounded-lg transition-colors duration-200"
                    aria-label="Dismiss"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocationBanner;
