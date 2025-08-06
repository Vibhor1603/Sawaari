/* eslint-disable react/prop-types */
/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";

import routeService from "./services/routeService";
import LocationTracker from "./LocationTracker";
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
  const [fareBreakdown, setFareBreakdown] = useState(null);
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
        const { path, pathCoordinates, totalFare, fareBreakdown, distance } =
          result.data;

        // Convert pathCoordinates to the format expected by the map
        const coordinates = pathCoordinates.map((coord) => [
          coord.latitude,
          coord.longitude,
        ]);

        setShortestPath(path);
        setPathCoordinates(coordinates);
        setTotalFare(totalFare);
        setFareBreakdown(fareBreakdown);
        setDistance(distance);
        setRouteData(result.data);
        setShowResults(true);

        if (result.cached) {
          console.log("✅ Used cached route data");
        }
      } else {
        setError(result.message || "Failed to calculate route.");
      }
    } catch (error) {
      console.error("Route calculation error:", error);
      setError("Unable to calculate route. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const clickHandler = (latitude, longitude) => {
    setSelectedDestination([latitude, longitude]);
  };

  const handleNewSearch = () => {
    setShowResults(false);
    setShortestPath([]);
    setPathCoordinates([]);
    setTotalFare(0);
    setRouteData(null);
    setFareBreakdown(null);
    setDistance(0);
    setError("");
  };

  return (
    <div className="min-h-screen bg-black pt-20 relative overflow-hidden">
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
                  <div className="mt-4 p-3 bg-red-500/20 border border-red-500/40 rounded-lg">
                    <p className="text-sm text-red-200">{error}</p>
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
                    className="px-4 py-2 bg-sawaari-yellow text-black rounded-lg hover:bg-sawaari-yellow/80 transition-colors text-sm font-semibold"
                  >
                    New Search
                  </button>
                </div>

                {/* Route Steps */}
                <div className="max-h-48 overflow-y-auto mb-4 space-y-2">
                  {shortestPath.map((node, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-2 bg-black/40 rounded-lg"
                    >
                      <span className="w-8 h-8 bg-sawaari-yellow-muted border border-sawaari-yellow-border rounded-full flex items-center justify-center text-sm font-bold text-sawaari-yellow">
                        {index + 1}
                      </span>
                      <span className="text-sm text-gray-200 flex-1 text-readable-secondary">
                        {node}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Fare Summary */}
                <div className="bg-black/60 rounded-lg p-4 space-y-3">
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
                  {fareBreakdown && fareBreakdown.timeType !== "regular" && (
                    <div className="text-center">
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-sawaari-yellow-muted border border-sawaari-yellow-border rounded-full text-xs text-sawaari-yellow">
                        {fareBreakdown.timeType === "night"
                          ? "🌙 Night Rate"
                          : "⚡ Peak Rate"}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Map */}
          <div className="lg:col-span-3">
            <div className="glass-strong rounded-2xl p-4">
              <h2 className="text-xl font-bold text-white mb-4 text-readable">
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
                  <HotspotMarkers
                    hotspot={hotspot}
                    clickHandler={clickHandler}
                  />
                  {pathCoordinates.length > 0 && (
                    <Polyline
                      positions={pathCoordinates}
                      color="#f4b942"
                      weight={4}
                    />
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
