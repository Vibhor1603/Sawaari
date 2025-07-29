/* eslint-disable no-unused-vars */
/* eslint-disable react/prop-types */
import React, { useState, useEffect } from "react";
import routeService from "./services/routeService";

export default function RouteForm({
  source,
  setSource,
  destination,
  setDestination,
  handleRouteSearch,
  hotspot,
}) {
  const [availableLocations, setAvailableLocations] = useState([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);

  // Fetch available locations from API
  useEffect(() => {
    // DISABLED: API call causing infinite requests
    // Use hotspot prop directly instead of API call
    if (hotspot && Array.isArray(hotspot)) {
      setAvailableLocations(
        hotspot
          .map((spot) => ({ name: spot.name }))
          .sort((a, b) => a.name.localeCompare(b.name))
      );
    }
    setIsLoadingLocations(false);
  }, []); // FIXED: Empty dependency array to run only once

  // Extract unique location names from the available locations
  const getLocationNames = () => {
    return availableLocations.map((location) => location.name).sort();
  };

  const locationNames = getLocationNames();

  return (
    <form onSubmit={handleRouteSearch}>
      <div className="mb-3">
        <label
          htmlFor="source"
          className="form-label"
          style={{ color: "var(--text-secondary)", fontWeight: "600" }}
        >
          Select Source Location
        </label>
        <select
          className="form-control"
          id="source"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          required
          disabled={isLoadingLocations}
        >
          <option value="">
            {isLoadingLocations
              ? "Loading locations..."
              : "-- Select Source --"}
          </option>
          {locationNames.map((name, index) => (
            <option key={index} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>
      <div className="mb-3">
        <label
          htmlFor="destination"
          className="form-label"
          style={{ color: "var(--text-secondary)", fontWeight: "600" }}
        >
          Select Destination Location
        </label>
        <select
          className="form-control"
          id="destination"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          required
          disabled={isLoadingLocations}
        >
          <option value="">
            {isLoadingLocations
              ? "Loading locations..."
              : "-- Select Destination --"}
          </option>
          {locationNames.map((name, index) => (
            <option key={index} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>
      <button type="submit" className="btn btn-primary submit-btn">
        <i className="fas fa-search me-2"></i>
        Find Route
      </button>
    </form>
  );
}
