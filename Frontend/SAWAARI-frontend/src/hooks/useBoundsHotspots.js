// Custom hook for bounds-based hotspot loading in route maps
import { useState, useEffect, useCallback, useRef } from "react";
import geoHotspotService from "../services/geoHotspotService";

export const useBoundsHotspots = () => {
  const hookId = useRef(Math.random().toString(36).substr(2, 9));
  console.log("🚀 useBoundsHotspots hook initialized:", {
    hookId: hookId.current,
  });

  const [hotspots, setHotspots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastBounds, setLastBounds] = useState(null);

  // Debug hotspots state changes
  useEffect(() => {
    console.log("🔄 useBoundsHotspots state changed:", {
      hookId: hookId.current,
      count: hotspots.length,
      names: hotspots.map((h) => h.name).slice(0, 3),
    });
  }, [hotspots]);

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
            console.log("🔄 useBoundsHotspots CALLING setHotspots with data:", {
              hookId: hookId.current,
              count: result.data.length,
              names: result.data.map((h) => h.name).slice(0, 3),
            });
            setHotspots(result.data);
            setLastBounds(bounds);
          } else if (!result.cached) {
            // Only clear if it's a fresh request with no data
            console.log(
              "🔄 useBoundsHotspots CALLING setHotspots with empty:",
              {
                hookId: hookId.current,
                count: 0,
              }
            );
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

  return {
    hotspots,
    loading,
    error,
    onMapBoundsChange,
    loadHotspotsForBounds,
  };
};
