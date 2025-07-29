/* eslint-disable react/prop-types */
/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable no-unused-vars */
/* eslint-disable react/no-unescaped-entities */
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMap,
  useMapEvent,
} from "react-leaflet";
import "leaflet/dist/leaflet.css"; // Ensure Leaflet CSS is imported
import React, { useState, useEffect } from "react";

// Component to track and display the user's location
function LocationTracker() {
  const map = useMap(); // Access the map instance

  const [position, setPosition] = useState(null);

  useEffect(() => {
    function fetchLocation() {
      if (navigator.geolocation && map) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const newPosition = [pos.coords.latitude, pos.coords.longitude];
            setPosition(newPosition);
            // Only set view if map is ready
            if (map && map.setView) {
              map.setView(newPosition, 13);
            }
          },
          (err) => {
            console.warn("Location access denied or failed:", err.message);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000,
          }
        );
      }
    }

    // Add a small delay to ensure map is fully initialized
    const timer = setTimeout(fetchLocation, 100);
    return () => clearTimeout(timer);
  }, [map]);

  return position === null ? null : (
    <Marker position={position}>
      <Popup>You are here</Popup>
    </Marker>
  );
}

// Component to display hotspots and handle map interactions
function Hotspots(prop) {
  const [selectedDestination, setSelectedDestination] = useState([
    28.619155291665052, 77.42591115327116,
  ]);
  const zoom = 10;

  const { hotspot } = prop;

  // Show loading state if hotspot data is not available
  if (!hotspot) {
    return (
      <div className="container text-center" style={{ marginTop: "120px" }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-3">Loading hotspot data...</p>
        <small className="text-muted">Debug: hotspot is {typeof hotspot}</small>
      </div>
    );
  }

  // Show error state if hotspot is not an array
  if (!Array.isArray(hotspot)) {
    return (
      <div className="container text-center" style={{ marginTop: "120px" }}>
        <div className="alert alert-warning">
          <h4>Data Loading Issue</h4>
          <p>Hotspot data is not available. Please refresh the page.</p>
          <button
            className="btn btn-primary"
            onClick={() => window.location.reload()}
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  // Show empty state if no hotspots
  if (hotspot.length === 0) {
    return (
      <div className="container text-center" style={{ marginTop: "120px" }}>
        <div className="alert alert-info">
          <h4>No Hotspots Available</h4>
          <p>No hotspot data is currently available. Please try again later.</p>
        </div>
      </div>
    );
  }
  // Child component to manage map interactions and updates
  function clickHandler(latitude, longitude) {
    setSelectedDestination([latitude, longitude]);
  }

  function MapInteractionHandler({ selectedDestination }) {
    const map = useMap();

    useEffect(() => {
      if (selectedDestination) {
        map.setView(selectedDestination, 16);
      }
    }, [map, selectedDestination]);

    return null;
  }

  const circleOptions = {
    fillOpacity: 0.5,
  };

  // Generate hotspot circles with popup content - with safety check
  const hotspotData = (hotspot && Array.isArray(hotspot) ? hotspot : []).map(
    (item) => (
      <Circle
        key={item._id}
        center={[item.latitude, item.longitude]}
        pathOptions={{ ...circleOptions, fillColor: item.color_code }}
        radius={200}
      >
        <Popup className="custom-popup">
          <div className="hotspot-popup">
            <h3 className="hotspot-name">{item.name}</h3>
            <p className="hotspot-description">Available destinations:</p>
            <ul className="destination-list">
              {item.destinations.map((result) => (
                <li key={result.name} className="destination-item">
                  <button
                    className="destination-button"
                    onClick={() =>
                      clickHandler(result.latitude, result.longitude)
                    }
                  >
                    <span className="destination-name">{result.name}</span>
                    <span className="estimated-fare">
                      ₹{result.estimated_fare}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </Popup>
      </Circle>
    )
  );

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
        <strong>Note:</strong> Currently showing limited locations due to data
        availability. More locations will be added soon to expand coverage
        across the city.
      </div>

      <div className="container hotspot-info">
        <h4>
          Click On the hotspots available in your area to get more information
          about them
        </h4>
      </div>
      <div
        id="map"
        className="container "
        style={{
          height: "70vh",
          width: "75%",
          border: "5px solid rgb(241, 190, 95)",
          borderRadius: "5px",
        }}
      >
        <MapContainer
          center={[28.633043462708848, 77.44792897992077]}
          zoom={zoom}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            url="https://tile.openstreetmap.de/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <LocationTracker />
          <MapInteractionHandler selectedDestination={selectedDestination} />
          {hotspotData}
        </MapContainer>
      </div>
    </>
  );
}

export default Hotspots;
