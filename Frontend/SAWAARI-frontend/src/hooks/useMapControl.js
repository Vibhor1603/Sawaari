import { useRef, useCallback } from "react";

// Hook for controlling map programmatically
export const useMapControl = () => {
  const mapRef = useRef(null);

  // Set map reference
  const setMapRef = useCallback((map) => {
    mapRef.current = map;
  }, []);

  // Center map on coordinates with smooth animation
  const centerMap = useCallback((coordinates, zoom = 16) => {
    if (!mapRef.current || !coordinates) return;

    const { latitude, longitude } = coordinates;

    try {
      // Use flyTo for smooth animation
      mapRef.current.flyTo([latitude, longitude], zoom, {
        duration: 1.5, // Animation duration in seconds
        easeLinearity: 0.1,
      });
    } catch (error) {
      console.error("Error centering map:", error);
      // Fallback to setView if flyTo fails
      try {
        mapRef.current.setView([latitude, longitude], zoom);
      } catch (fallbackError) {
        console.error("Error with fallback setView:", fallbackError);
      }
    }
  }, []);

  // Get current map bounds
  const getMapBounds = useCallback(() => {
    if (!mapRef.current) return null;

    try {
      const bounds = mapRef.current.getBounds();
      return {
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest(),
        // Format for Photon API bbox parameter
        bbox: [
          bounds.getWest(),
          bounds.getSouth(),
          bounds.getEast(),
          bounds.getNorth(),
        ],
      };
    } catch (error) {
      console.error("Error getting map bounds:", error);
      return null;
    }
  }, []);

  // Get current map center
  const getMapCenter = useCallback(() => {
    if (!mapRef.current) return null;

    try {
      const center = mapRef.current.getCenter();
      return {
        latitude: center.lat,
        longitude: center.lng,
      };
    } catch (error) {
      console.error("Error getting map center:", error);
      return null;
    }
  }, []);

  // Get current zoom level
  const getZoom = useCallback(() => {
    if (!mapRef.current) return null;

    try {
      return mapRef.current.getZoom();
    } catch (error) {
      console.error("Error getting zoom level:", error);
      return null;
    }
  }, []);

  // Set zoom level
  const setZoom = useCallback((zoom) => {
    if (!mapRef.current) return;

    try {
      mapRef.current.setZoom(zoom);
    } catch (error) {
      console.error("Error setting zoom level:", error);
    }
  }, []);

  // Fit map to bounds
  const fitBounds = useCallback((bounds, options = {}) => {
    if (!mapRef.current || !bounds) return;

    try {
      mapRef.current.fitBounds(bounds, {
        padding: [20, 20],
        maxZoom: 16,
        ...options,
      });
    } catch (error) {
      console.error("Error fitting bounds:", error);
    }
  }, []);

  return {
    mapRef,
    setMapRef,
    centerMap,
    getMapBounds,
    getMapCenter,
    getZoom,
    setZoom,
    fitBounds,
  };
};
