/* eslint-disable react/prop-types */
import { useEffect } from "react";
import { useMap } from "react-leaflet";

// Component to provide map control functionality to parent components
const MapController = ({ onMapReady, mapControlRef }) => {
  const map = useMap();

  useEffect(() => {
    if (map) {
      // Set map reference for external control
      if (mapControlRef) {
        mapControlRef.current = map;
      }

      // Notify parent that map is ready
      if (onMapReady) {
        onMapReady(map);
      }
    }
  }, [map, onMapReady, mapControlRef]);

  return null; // This component doesn't render anything
};

export default MapController;
