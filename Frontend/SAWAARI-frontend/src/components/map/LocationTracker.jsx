/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from "react";
import { Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";

// Create a custom icon for user location
const userLocationIcon = L.divIcon({
  className: "user-location-marker",
  html: `
    <div style="
      width: 20px;
      height: 20px;
      background: #3b82f6;
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      position: relative;
    ">
      <div style="
        position: absolute;
        top: -10px;
        left: -10px;
        width: 40px;
        height: 40px;
        background: rgba(59, 130, 246, 0.2);
        border-radius: 50%;
        animation: pulse 2s infinite;
      "></div>
    </div>
    <style>
      @keyframes pulse {
        0% {
          transform: scale(0.8);
          opacity: 1;
        }
        100% {
          transform: scale(2);
          opacity: 0;
        }
      }
    </style>
  `,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

export default function LocationTracker() {
  const map = useMap();
  const [position, setPosition] = useState(null);
  const [locationError, setLocationError] = useState(null);

  useEffect(() => {
    function fetchLocation() {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const newPosition = [pos.coords.latitude, pos.coords.longitude];
          setPosition(newPosition);
          setLocationError(null);
          // Don't automatically center the map, let user control it
        },
        (err) => {
          console.error("Error fetching location:", err);
          setLocationError(err.message);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        }
      );
    }
    fetchLocation();
  }, [map]);

  return position === null ? null : (
    <Marker position={position} icon={userLocationIcon}>
      <Popup>
        <div style={{ textAlign: "center" }}>
          <strong>📍 You are here</strong>
          <br />
          <small>Current location</small>
        </div>
      </Popup>
    </Marker>
  );
}
