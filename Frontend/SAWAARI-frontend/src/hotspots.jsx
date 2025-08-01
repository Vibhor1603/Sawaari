import { useState } from "react";
import EnhancedMap from "./components/EnhancedMap";

// Component to display hotspots with enhanced geolocation-based loading
function Hotspots() {
  const [selectedDestination, setSelectedDestination] = useState([
    28.619155291665052, 77.42591115327116,
  ]);

  // Handle hotspot click
  const handleHotspotClick = (latitude, longitude) => {
    setSelectedDestination([latitude, longitude]);
    console.log("Hotspot clicked:", latitude, longitude);
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
      <div className="container-sawaari pt-40 pb-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Info */}
          <div className="lg:col-span-1 space-y-6">
            <div className="glass-strong rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-sawaari-yellow/20 border border-sawaari-yellow/40 rounded-full flex items-center justify-center">
                  <span className="text-xl animate-subtle-float">🔥</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">
                    Live <span className="text-sawaari-yellow">Hotspots</span>
                  </h1>
                  <p className="text-sm text-gray-200">
                    Real-time availability
                  </p>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="text-center bg-black/40 rounded-lg p-3">
                  <div className="text-xl font-bold text-sawaari-yellow">
                    500+
                  </div>
                  <div className="text-xs text-gray-200">Active Spots</div>
                </div>
                <div className="text-center bg-black/40 rounded-lg p-3">
                  <div className="text-xl font-bold text-sawaari-yellow">
                    24/7
                  </div>
                  <div className="text-xs text-gray-200">Live Updates</div>
                </div>
              </div>

              {/* Legend */}
              <div className="space-y-2 text-sm text-gray-200">
                <h3 className="text-white font-semibold mb-2">Map Legend</h3>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                  <span>High availability</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-yellow-500 rounded-full"></span>
                  <span>Medium availability</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                  <span>Low availability</span>
                </div>
              </div>

              <div className="mt-4 p-3 bg-sawaari-yellow/10 border border-sawaari-yellow/20 rounded-lg">
                <p className="text-xs text-gray-200">
                  <span className="text-sawaari-yellow font-semibold">
                    Tip:
                  </span>{" "}
                  Click on hotspots to see destinations and fares
                </p>
              </div>
            </div>
          </div>

          {/* Right Column - Map */}
          <div className="lg:col-span-2">
            <div className="glass-strong rounded-2xl p-4">
              <h2 className="text-xl font-bold text-white mb-4">
                Interactive Hotspot Map
              </h2>
              <div className="h-[500px] rounded-xl overflow-hidden border border-white/10">
                <EnhancedMap
                  center={[28.633043462708848, 77.44792897992077]}
                  zoom={10}
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
