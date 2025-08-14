import { useRef } from "react";
import { useMap, useMapEvents } from "react-leaflet";

// Component to handle map events and trigger hotspot loading
export default function MapEventHandler({ onBoundsChange, onLocationChange }) {
  const map = useMap();
  const boundsChangeTimeoutRef = useRef(null);

  useMapEvents({
    moveend: () => {
      // Debounce bounds change events with reasonable delay
      if (boundsChangeTimeoutRef.current) {
        clearTimeout(boundsChangeTimeoutRef.current);
      }

      boundsChangeTimeoutRef.current = setTimeout(() => {
        const bounds = map.getBounds();
        const zoom = map.getZoom();

        const boundsObj = {
          north: bounds.getNorth(),
          south: bounds.getSouth(),
          east: bounds.getEast(),
          west: bounds.getWest(),
        };

        onBoundsChange(boundsObj, zoom);
      }, 500); // Reduced delay for better responsiveness
    },

    zoomend: () => {
      // Immediate response for zoom changes
      if (boundsChangeTimeoutRef.current) {
        clearTimeout(boundsChangeTimeoutRef.current);
      }

      boundsChangeTimeoutRef.current = setTimeout(() => {
        const bounds = map.getBounds();
        const zoom = map.getZoom();

        const boundsObj = {
          north: bounds.getNorth(),
          south: bounds.getSouth(),
          east: bounds.getEast(),
          west: bounds.getWest(),
        };

        onBoundsChange(boundsObj, zoom);
      }, 200); // Much faster response for zoom
    },

    locationfound: (e) => {
      const { lat, lng } = e.latlng;
      onLocationChange(lat, lng);
    },
  });

  return null;
}
