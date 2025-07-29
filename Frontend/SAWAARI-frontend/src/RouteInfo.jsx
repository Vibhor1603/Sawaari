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
import FareEstimator from "./FareEstimator";

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
  }, []); // FIXED: Empty dependency array to run only once on mount

  const handleRouteSearch = async (e) => {
    e.preventDefault();
    setError("");
    setShortestPath([]);
    setPathCoordinates([]);
    setTotalFare(0);
    setIsLoading(true);

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

  return (
    <div className="container route-container">
      {/* Development Note */}
      <div
        className="alert alert-info mb-4"
        style={{
          background: "var(--tertiary-dark)",
          border: "1px solid var(--accent-yellow)",
          color: "var(--text-primary)",
        }}
      >
        <i
          className="fas fa-info-circle me-2"
          style={{ color: "var(--accent-yellow)" }}
        ></i>
        <strong>Note:</strong> Route calculation now uses smart caching to
        prevent unnecessary API calls while maintaining real functionality.
      </div>

      <div className="row align-items-start">
        <div className="col-md-4">
          <div className="route-form-section">
            <h3>Plan Your Route</h3>
            <RouteForm
              source={source}
              setSource={setSource}
              destination={destination}
              setDestination={setDestination}
              handleRouteSearch={handleRouteSearch}
              hotspot={hotspot}
              isLoading={isLoading}
            />
            {error && <div className="alert alert-danger mt-3">{error}</div>}
            {shortestPath.length > 0 && (
              <div className="mt-4">
                <h3>Shortest Path</h3>
                <ul className="list-group">
                  {shortestPath.map((node, index) => (
                    <li key={index} className="list-group-item">
                      <span className="route-step-number">{index + 1}.</span>
                      {node}
                    </li>
                  ))}
                </ul>

                {/* Enhanced Fare Information */}
                <div className="route-summary mt-3">
                  <div className="summary-item">
                    <i className="fas fa-route me-2"></i>
                    <strong>Distance:</strong> {distance.toFixed(1)} km
                  </div>
                  {routeData?.estimatedTime && (
                    <div className="summary-item">
                      <i className="fas fa-clock me-2"></i>
                      <strong>Estimated Time:</strong>{" "}
                      {routeData.estimatedTime.formatted}
                    </div>
                  )}
                  <div className="summary-item fare-highlight">
                    <i className="fas fa-rupee-sign me-2"></i>
                    <strong>Current Fare:</strong> ₹{totalFare}
                    {fareBreakdown && fareBreakdown.timeType !== "regular" && (
                      <span className="fare-type-badge">
                        {fareBreakdown.timeType === "night"
                          ? "🌙 Night"
                          : "⚡ Peak"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Fare Estimator Component */}
            <FareEstimator
              source={source}
              destination={destination}
              distance={distance}
              onFareUpdate={(fare) => setTotalFare(fare)}
            />
          </div>
        </div>
        <div className="col-md-8">
          <div className="map-section">
            <h3>Route Map</h3>
            <div className="routes-map">
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
                <HotspotMarkers hotspot={hotspot} clickHandler={clickHandler} />
                {pathCoordinates.length > 0 && (
                  <Polyline
                    positions={pathCoordinates}
                    color="#00ff88"
                    weight={4}
                  />
                )}
              </MapContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
