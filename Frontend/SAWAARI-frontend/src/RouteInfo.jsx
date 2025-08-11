/* eslint-disable react/prop-types */
/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  Popup,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import routeService from "./services/routeService";
import LocationTracker from "./LocationTracker";

// Custom icons for route markers
const startIcon = new L.DivIcon({
  html: '<div style="background: #10B981; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-size: 16px; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">🚀</div>',
  className: "custom-marker",
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

const endIcon = new L.DivIcon({
  html: '<div style="background: #EF4444; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-size: 16px; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">🏁</div>',
  className: "custom-marker",
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

const transferIcon = new L.DivIcon({
  html: '<div style="background: #F97316; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-size: 16px; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">🔄</div>',
  className: "custom-marker",
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});
import MapInteractionHandler from "./MapInteractionHandler";
import HotspotMarkers from "./HotspotMarkers";
import RouteForm from "./RouteForm";

export default function RouteInfo({ hotspot }) {
  const [source, setSource] = useState("");
  const [destination, setDestination] = useState("");
  const [shortestPath, setShortestPath] = useState([]);
  const [pathCoordinates, setPathCoordinates] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedDestination, setSelectedDestination] = useState([
    28.619155291665052, 77.42591115327116,
  ]);
  const [totalFare, setTotalFare] = useState(0);
  const [routeData, setRouteData] = useState(null);

  const [distance, setDistance] = useState(0);
  const [showResults, setShowResults] = useState(false);

  // Set document title
  useEffect(() => {
    document.title = "Route Planner - SAWAARI";
    return () => {
      document.title = "SAWAARI - Smart Rickshaw Navigation";
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    // Initialize the backend graph when component mounts (only once)
    const initializeGraph = async () => {
      try {
        if (isMounted) {
          const result = await routeService.initializeGraph();
          if (result.cached) {
            console.log("✅ Graph already initialized (cached)");
          }
        }
      } catch (error) {
        console.warn("Graph initialization failed:", error);
      }
    };

    // Only initialize if hotspot data exists and component is still mounted
    if (Array.isArray(hotspot) && hotspot.length > 0 && isMounted) {
      initializeGraph();
    }

    return () => {
      isMounted = false;
    };
  }, [hotspot]); // FIXED: Empty dependency array to run only once on mount

  const handleRouteSearch = async (e) => {
    e.preventDefault();
    setError("");
    setShortestPath([]);
    setPathCoordinates([]);
    setTotalFare(0);
    setIsLoading(true);
    setShowResults(false);

    if (!source || !destination) {
      setError("Please enter both source and destination.");
      setIsLoading(false);
      return;
    }

    try {
      // Use the real API-based route calculation with smart caching
      const result = await routeService.calculateRoute(source, destination);

      if (result.success) {
        const { path, pathCoordinates, totalFare, distance } = result.data;

        // Convert pathCoordinates to the format expected by the map
        const coordinates = pathCoordinates.map((coord) => [
          coord.latitude,
          coord.longitude,
        ]);

        setShortestPath(path);
        setPathCoordinates(coordinates);
        setTotalFare(totalFare);
        setDistance(distance);
        setRouteData(result.data);
        setShowResults(true);

        if (result.cached) {
          console.log("✅ Used cached route data");
        }
      } else {
        // Enhanced error handling for better UX
        const errorMessage = result.message || "Failed to calculate route.";
        if (
          errorMessage.includes("No route found") ||
          errorMessage.includes("not found")
        ) {
          setError(
            "🚫 No direct route available between these locations. Try selecting different pickup points or destinations from the map."
          );
        } else if (
          errorMessage.includes("Source location") &&
          errorMessage.includes("not found")
        ) {
          setError(
            "📍 Source location not found. Please select a valid pickup point from the available hotspots."
          );
        } else if (
          errorMessage.includes("Destination location") &&
          errorMessage.includes("not found")
        ) {
          setError(
            "📍 Destination not found. Please select a valid destination from the available hotspots."
          );
        } else {
          setError(errorMessage);
        }
      }
    } catch (error) {
      console.error("Route calculation error:", error);
      if (error.message.includes("No route found")) {
        setError(
          "🚫 No direct route available between these locations. Try selecting different pickup points or destinations from the map."
        );
      } else if (error.message.includes("not found")) {
        setError(
          "📍 Location not found. Please select valid locations from the available hotspots on the map."
        );
      } else {
        setError(
          "⚠️ Unable to calculate route. Please check your connection and try again."
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewSearch = () => {
    setShowResults(false);
    setShortestPath([]);
    setPathCoordinates([]);
    setTotalFare(0);
    setRouteData(null);
    setDistance(0);
    setError("");
  };

  return (
    <div className="min-h-screen bg-black pt-10 relative overflow-hidden">
      {/* Creative Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Animated Route Lines */}
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute opacity-5 animate-move-bg"
            style={{
              top: `${15 + i * 15}%`,
              left: "-100px",
              width: "200%",
              height: "2px",
              background: `linear-gradient(90deg, transparent, ${
                i % 2 === 0 ? "#f4b942" : "#2d5016"
              }, transparent)`,
              animationDelay: `${i * 2}s`,
            }}
          />
        ))}

        {/* Floating Navigation Icons */}
        {["🧭", "📍", "🗺️", "🛣️", "⚡", "🎯"].map((icon, i) => (
          <div
            key={i}
            className="absolute text-3xl opacity-10 animate-drift"
            style={{
              top: `${Math.random() * 80 + 10}%`,
              left: `${Math.random() * 90 + 5}%`,
              animationDelay: `${i * 2.5}s`,
            }}
          >
            {icon}
          </div>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="container-sawaari pt-24 pb-8">
        <div className="grid lg:grid-cols-5 gap-8">
          {/* Left Column - Route Form or Results */}
          <div className="lg:col-span-2 space-y-6">
            {!showResults ? (
              /* Route Form */
              <div className="glass-strong rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-sawaari-yellow-muted border border-sawaari-yellow-border rounded-full flex items-center justify-center">
                    <span className="text-xl">🗺️</span>
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-white text-readable">
                      Route Planner
                    </h1>
                    <p className="text-sm text-gray-200 text-readable-secondary">
                      Smart navigation
                    </p>
                  </div>
                </div>

                <RouteForm
                  source={source}
                  setSource={setSource}
                  destination={destination}
                  setDestination={setDestination}
                  handleRouteSearch={handleRouteSearch}
                  hotspot={hotspot}
                  isLoading={isLoading}
                />

                {error && (
                  <div className="mt-4 p-4 bg-red-500/20 border border-red-500/40 rounded-lg">
                    <div className="flex items-start gap-3">
                      <div className="text-red-400 text-lg mt-0.5">⚠️</div>
                      <div className="flex-1">
                        <p className="text-sm text-red-200 leading-relaxed">
                          {error}
                        </p>
                        {error.includes("No direct route available") && (
                          <div className="mt-3 p-3 bg-black/30 rounded-lg">
                            <p className="text-xs text-gray-300 mb-2">
                              💡 <strong>Suggestions:</strong>
                            </p>
                            <ul className="text-xs text-gray-300 space-y-1">
                              <li>
                                • Try selecting nearby hotspots from the map
                              </li>
                              <li>
                                • Check if both locations have active
                                auto-rickshaw services
                              </li>
                              <li>
                                • Consider breaking your journey into multiple
                                segments
                              </li>
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <p className="text-xs text-gray-200">
                    <span className="text-blue-400 font-semibold">
                      📍 Note:
                    </span>{" "}
                    Currently showing sample routes for testing purposes. More
                    locations and routes will be added soon!
                  </p>
                </div>
              </div>
            ) : (
              /* Route Results */
              <div className="glass-strong rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-sawaari-yellow-muted border border-sawaari-yellow-border rounded-full flex items-center justify-center">
                      <span className="text-xl">✅</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white text-readable">
                        Route Found
                      </h3>
                      <p className="text-sm text-gray-200 text-readable-secondary">
                        {source} → {destination}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleNewSearch}
                    className="px-2 sm:px-3 py-2 bg-sawaari-yellow text-black rounded-lg hover:bg-sawaari-yellow/80 transition-colors text-sm font-semibold"
                  >
                    New Search
                  </button>
                </div>

                {/* Route Steps */}
                <div className="max-h-48 overflow-y-visible mb-6 space-y-2">
                  {shortestPath.map((node, index) => {
                    const isStart = index === 0;
                    const isEnd = index === shortestPath.length - 1;
                    const isTransfer = !isStart && !isEnd;

                    return (
                      <div key={index}>
                        <div className="flex items-center gap-3 p-3 bg-black/40 rounded-lg">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-8 h-8 ${
                                isStart
                                  ? "bg-green-500"
                                  : isEnd
                                  ? "bg-red-500"
                                  : "bg-orange-500"
                              } rounded-full flex items-center justify-center text-sm font-bold text-white`}
                            >
                              {isStart ? "🚀" : isEnd ? "🏁" : "🔄"}
                            </span>
                            {isTransfer && (
                              <span className="text-xs bg-orange-500/20 border border-orange-500/40 rounded px-2 py-1 text-orange-300">
                                Transfer
                              </span>
                            )}
                          </div>
                          <div className="flex-1">
                            <span className="text-sm text-gray-200 text-readable-secondary">
                              {node}
                            </span>
                            {isTransfer && (
                              <p className="text-xs text-orange-300 mt-1">
                                🛺 Change auto-rickshaw here
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Connection line between steps */}
                        {index < shortestPath.length - 1 && (
                          <div className="flex items-center gap-3 py-1 pl-4">
                            <div className="w-8 flex justify-center">
                              <div className="w-0.5 h-4 bg-gray-600"></div>
                            </div>
                            <span className="text-xs text-gray-400">
                              🛺 Auto ride to next stop
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Fare Summary */}
                <div className="bg-black/60 rounded-lg p-4 space-y-2 mt-24">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-200 text-readable-secondary">
                      Distance:
                    </span>
                    <span className="text-white font-semibold text-readable">
                      {distance.toFixed(1)} km
                    </span>
                  </div>
                  {routeData?.estimatedTime && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-200 text-readable-secondary">
                        Time:
                      </span>
                      <span className="text-white font-semibold text-readable">
                        {routeData.estimatedTime.formatted}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-xl border-t border-white/10 pt-3">
                    <span className="text-gray-200 text-readable-secondary">
                      Total Fare:
                    </span>
                    <span className="text-sawaari-yellow font-bold text-readable">
                      ₹{totalFare}
                    </span>
                  </div>

                  {/* Transfer Information */}
                  {shortestPath.length > 2 && (
                    <div className="mt-4 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                      <div className="flex items-start gap-2">
                        <span className="text-orange-400 text-sm mt-0.5">
                          🔄
                        </span>
                        <div>
                          <p className="text-xs text-orange-300 font-semibold">
                            Transfer Required
                          </p>
                          <p className="text-xs text-gray-300 mt-1">
                            You&apos;ll need to change auto-rickshaws{" "}
                            {shortestPath.length - 2} time(s) during this
                            journey. Look for the orange markers on the map for
                            transfer points.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Map */}
          <div className="lg:col-span-3">
            <div className="glass-strong rounded-2xl sm:p-4 ">
              <h2 className="text-xl font-bold text-white mb-4  text-readable">
                Interactive Route Map
              </h2>
              <div className="h-[600px] rounded-xl overflow-hidden border border-white/10">
                <MapContainer
                  center={[28.633043462708848, 77.44792897992077]}
                  zoom={10}
                  style={{ height: "100%", width: "100%" }}
                >
                  <TileLayer
                    url="https://tile.openstreetmap.de/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />
                  <LocationTracker />
                  <MapInteractionHandler
                    selectedDestination={selectedDestination}
                  />
                  <HotspotMarkers hotspot={hotspot} />
                  {pathCoordinates.length > 0 && (
                    <>
                      <Polyline
                        positions={pathCoordinates}
                        color="#1a1a1a"
                        weight={6}
                        opacity={0.8}
                      />

                      {/* Route markers */}
                      {pathCoordinates.map((coord, index) => {
                        const isStart = index === 0;
                        const isEnd = index === pathCoordinates.length - 1;
                        const isTransfer = !isStart && !isEnd;

                        let icon = transferIcon;
                        let popupText =
                          "Transfer Point - Change auto-rickshaw here";

                        if (isStart) {
                          icon = startIcon;
                          popupText = `Start: ${shortestPath[index]}`;
                        } else if (isEnd) {
                          icon = endIcon;
                          popupText = `Destination: ${shortestPath[index]}`;
                        } else {
                          popupText = `Transfer at: ${shortestPath[index]} - Change auto-rickshaw here`;
                        }

                        return (
                          <Marker key={index} position={coord} icon={icon}>
                            <Popup>
                              <div className="text-center">
                                <p className="font-semibold text-gray-800">
                                  {popupText}
                                </p>
                                {isTransfer && (
                                  <p className="text-xs text-orange-600 mt-1">
                                    🛺 Wait here for your next auto-rickshaw
                                  </p>
                                )}
                              </div>
                            </Popup>
                          </Marker>
                        );
                      })}
                    </>
                  )}
                </MapContainer>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
