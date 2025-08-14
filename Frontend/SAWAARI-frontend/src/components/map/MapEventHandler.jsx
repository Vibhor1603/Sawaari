import { useRef } from "react";
import { useMap, useMapEvents } from "react-leaflet";

// Component to handle map events and trigger hotspot loading
export default function MapEventHandler({ onBoundsChange, onLocationChange }) {
  const map = useMap();
  const boundsChangeTimeoutRef = useRef(null);

  useMapEvents({
    moveend: () => {
      // Debounce bounds change events with longer delay
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
      }, 3000); // Much longer delay to prevent spam
    },

    zoomend: () => {
      // Debounce zoom events too
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
      }, 2000); // Longer delay for zoom too
    },

    locationfound: (e) => {
      const { lat, lng } = e.latlng;
      onLocationChange(lat, lng);
    },
  });

  return null;
}
