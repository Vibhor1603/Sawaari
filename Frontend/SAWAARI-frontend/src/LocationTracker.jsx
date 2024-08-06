/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { Marker, Popup, useMap } from 'react-leaflet';

export default function LocationTracker() {
  const map = useMap();
  const [position, setPosition] = useState(null);

  useEffect(() => {
    function fetchLocation() {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const newPosition = [pos.coords.latitude, pos.coords.longitude];
          setPosition(newPosition);
          map.setView(newPosition, 13);
        },
        (err) => {
          console.error('Error fetching location:', err);
        },
        {
          enableHighAccuracy: true,
        }
      );
    }
    fetchLocation();
  }, [map]);

  return position === null ? null : (
    <Marker position={position}>
      <Popup>You are here</Popup>
    </Marker>
  );
}