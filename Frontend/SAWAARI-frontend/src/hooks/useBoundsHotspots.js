// Custom hook for bounds-based hotspot loading in route maps
import { useState, useEffect, useCallback, useRef } from "react";
import geoHotspotService from "../services/geoHotspotService";

export const useBoundsHotspots = () => {
  const [hotspots, setHotspots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastBounds, setLastBounds] = useState(null);

  // Use ref to prevent unnecessary re-renders
  const loadingRef = useRef(false);

  // Load hotspots for given bounds
  const loadHotspotsForBounds = useCallback(
    async (bounds, zoom = 10) => {
      // Prevent concurrent loading
      if (loadingRef.current) {
        return;
      }

      // Check if bounds are the same as last request (reduced threshold)
      if (
        lastBounds &&
        Math.abs(bounds.north - lastBounds.north) < 0.005 &&
        Math.abs(bounds.south - lastBounds.south) < 0.005 &&
        Math.abs(bounds.east - lastBounds.east) < 0.005 &&
        Math.abs(bounds.west - lastBounds.west) < 0.005
      ) {
        return;
      }

      try {
        loadingRef.current = true;
        setLoading(true);
        setError(null);

        const result = await geoHotspotService.getHotspotsInBounds(
          bounds,
          zoom
        );

        if (result.success) {
          // Only update if we have data
          if (result.data && result.data.length > 0) {
            setHotspots(result.data);
            setLastBounds(bounds);
          } else if (!result.cached) {
            // Only clear if it's a fresh request with no data
            setHotspots([]);
            setLastBounds(bounds);
          }
        } else {
          setError(result.error || "Failed to load hotspots");
        }
      } catch (err) {
        console.error("Error loading hotspots for bounds:", err);
        setError("Failed to load hotspots");
      } finally {
        loadingRef.current = false;
        setLoading(false);
      }
    },
    [lastBounds]
  );

  // Handle map bounds change
  const onMapBoundsChange = useCallback(
    (bounds, zoom) => {
      loadHotspotsForBounds(bounds, zoom);
    },
    [loadHotspotsForBounds]
  );

  // Load initial hotspots for default bounds (centered around the map center)
  useEffect(() => {
    const defaultBounds = {
      north: 28.643043462708848,
      south: 28.623043462708848,
      east: 77.45792897992077,
      west: 77.42792897992077,
    };
    loadHotspotsForBounds(defaultBounds, 14);
  }, [loadHotspotsForBounds]);

  return {
    hotspots,
    loading,
    error,
    onMapBoundsChange,
    loadHotspotsForBounds,
  };
};
