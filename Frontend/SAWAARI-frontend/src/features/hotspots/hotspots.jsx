/* eslint-disable no-unused-vars */
import { useState, useEffect } from "react";
import { EnhancedMap, ResponsiveLocationSearch } from "../../components/common";

// Component to display hotspots with enhanced geolocation-based loading
function Hotspots() {
  const [selectedDestination, setSelectedDestination] = useState([
    28.619155291665052, 77.42591115327116,
  ]);

  // No need to fetch all hotspots - EnhancedMap will handle bounds-based loading

  // Set document title
  useEffect(() => {
    document.title = "Rickshaw Points - SAWAARI";
    return () => {
      document.title = "SAWAARI - Smart Rickshaw Navigation";
    };
  }, []);

  // Handle hotspot click
  const handleHotspotClick = (latitude, longitude) => {
    setSelectedDestination([latitude, longitude]);
  };

  return (
    <div className="min-h-screen bg-black pt-20 relative overflow-hidden">
      {/* Creative Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Floating Rickshaws */}
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute text-2xl opacity-10 animate-float"
            style={{
              top: `${Math.random() * 80 + 10}%`,
              left: `${Math.random() * 90 + 5}%`,
              animationDelay: `${i * 0.8}s`,
              animationDuration: `${6 + Math.random() * 4}s`,
            }}
          >
            🛺
          </div>
        ))}

        {/* Moving Route Lines */}
        <div className="absolute top-1/4 left-0 w-full h-px opacity-5">
          <div className="h-full bg-gradient-to-r from-transparent via-sawaari-yellow to-transparent animate-pulse"></div>
        </div>
        <div className="absolute top-3/4 left-0 w-full h-px opacity-5">
          <div
            className="h-full bg-gradient-to-r from-transparent via-sawaari-yellow to-transparent animate-pulse"
            style={{ animationDelay: "2s" }}
          ></div>
        </div>

        {/* Pulsing Hotspot Indicators */}
        {[...Array(8)].map((_, i) => (
          <div
            key={`hotspot-${i}`}
            className="absolute w-3 h-3 bg-sawaari-yellow rounded-full opacity-20 animate-ping"
            style={{
              top: `${20 + Math.random() * 60}%`,
              left: `${10 + Math.random() * 80}%`,
              animationDelay: `${i * 1.2}s`,
            }}
          />
        ))}
      </div>

      {/* Main Content Area */}
      <div className="container-sawaari py-6 sm:py-10 lg:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {/* Left Column - Info */}
          <div className="lg:col-span-1 space-y-4 sm:space-y-6 order-1 lg:order-1">
            <div className="bg-black/20 backdrop-blur-sm border border-white/20 rounded-xl sm:rounded-2xl p-3 sm:p-6">
              <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                <div className="w-8 h-8 sm:w-12 sm:h-12 bg-sawaari-yellow/20 border border-sawaari-yellow/40 rounded-full flex items-center justify-center">
                  <span className="text-sm sm:text-xl animate-subtle-float">
                    🔥
                  </span>
                </div>
                <div>
                  <h1 className="text-lg sm:text-xl font-bold text-white">
                    Rickshaw <span className="text-sawaari-yellow">Points</span>
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-200 hidden sm:block">
                    Auto-rickshaw service locations
                  </p>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-3 sm:mb-4">
                <div className="text-center bg-black/40 rounded-lg p-2 sm:p-3">
                  <div className="text-lg sm:text-xl font-bold text-sawaari-yellow">
                    500+
                  </div>
                  <div className="text-xs text-gray-200">Active Spots</div>
                </div>
                <div className="text-center bg-black/40 rounded-lg p-2 sm:p-3">
                  <div className="text-lg sm:text-xl font-bold text-sawaari-yellow">
                    24/7
                  </div>
                  <div className="text-xs text-gray-200">Live Updates</div>
                </div>
              </div>

              {/* Legend - Hidden on mobile to save space */}
              <div className="space-y-2 text-sm text-gray-200 hidden sm:block">
                <h3 className="text-white font-semibold mb-2">Map Legend</h3>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                  <span>High availability</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-orange-500 rounded-full"></span>
                  <span>Medium availability</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-yellow-500 rounded-full"></span>
                  <span>Low availability</span>
                </div>
              </div>

              <div className="mt-3 sm:mt-4 p-2 sm:p-3 bg-sawaari-yellow/10 border border-sawaari-yellow/20 rounded-lg">
                <p className="text-xs text-gray-200">
                  <span className="text-sawaari-yellow font-semibold">
                    Tip:
                  </span>{" "}
                  <span className="hidden sm:inline">
                    Click on rickshaw points to see destinations and fares
                  </span>
                  <span className="sm:hidden">Tap points for info</span>
                </p>
              </div>

              <div className="mt-2 sm:mt-3 p-2 sm:p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-xs text-gray-200">
                  <span className="text-blue-400 font-semibold">Note:</span>{" "}
                  <span className="hidden sm:inline">
                    Stay tuned and keep coming back.{" "}
                  </span>
                  More points coming soon!
                </p>
              </div>
            </div>
          </div>

          {/* Right Column - Map */}
          <div className="lg:col-span-2 order-2 lg:order-2">
            <div className="bg-black/20 backdrop-blur-sm border border-white/20 rounded-xl sm:rounded-2xl p-3 sm:p-4">
              <h2 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4">
                Interactive Rickshaw Points Map
              </h2>
              <div className="h-[50vh] sm:h-[60vh] lg:h-[500px] rounded-lg sm:rounded-xl overflow-hidden border border-white/10 relative">
                {/* Responsive Location Search */}
                <div className="absolute top-2 left-2 right-2 sm:top-3 sm:left-3 sm:right-3 z-[1001]">
                  <ResponsiveLocationSearch
                    onLocationSelect={(locationData) => {
                      // Update selected destination when location is selected
                      setSelectedDestination([
                        locationData.coordinates.latitude,
                        locationData.coordinates.longitude,
                      ]);
                    }}
                    placeholder="Search for a location on the map"
                    className="max-w-md mx-auto sm:mx-0"
                  />
                </div>

                <EnhancedMap
                  center={selectedDestination}
                  zoom={14}
                  onHotspotClick={handleHotspotClick}
                  showControls={true}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Hotspots;
