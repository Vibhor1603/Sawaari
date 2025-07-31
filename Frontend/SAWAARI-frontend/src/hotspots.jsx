/* eslint-disable react/prop-types */
/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable no-unused-vars */
/* eslint-disable react/no-unescaped-entities */
import React, { useState } from "react";
import EnhancedMap from "./components/EnhancedMap";

// Hotspot click handler
function handleHotspotClick(latitude, longitude) {
  console.log("Hotspot clicked:", latitude, longitude);
}

// Component to display hotspots with enhanced geolocation-based loading
function Hotspots() {
  const [selectedDestination, setSelectedDestination] = useState([
    28.619155291665052, 77.42591115327116,
  ]);

  // Handle hotspot click
  const handleHotspotClick = (latitude, longitude) => {
    setSelectedDestination([latitude, longitude]);
  };

  return (
    <>
      {/* Development Note */}
      <div
        className="alert alert-info mb-4"
        style={{
          background: "var(--tertiary-dark)",
          textAlign: "center",

          border: "1px solid var(--accent-yellow)",
          color: "var(--text-primary)",
          margin: "120px 2rem 2rem 2rem",
          borderRadius: "16px",
        }}
      >
        <i
          className="fas fa-info-circle me-2"
          style={{ color: "var(--accent-yellow)" }}
        ></i>
        <strong>Note:</strong> Currently showing limited auto rickshaw stands
        due to data availability. More auto stands will be added soon to expand
        coverage across the city.
      </div>

      <div className="hotspot-info">
        <h4>
          Auto rickshaw stands load dynamically as you explore the map. Click on
          hotspots to see destinations and fares.
        </h4>
      </div>
      <div id="map">
        <EnhancedMap
          center={[28.633043462708848, 77.44792897992077]}
          zoom={10}
          onHotspotClick={handleHotspotClick}
          showControls={true}
        />
      </div>
    </>
  );
}

export default Hotspots;
