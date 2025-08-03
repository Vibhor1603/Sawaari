// React hook for dynamic hotspot loading based on map viewport
import { useState, useEffect, useCallback, useRef } from "react";
import geoHotspotService from "../services/geoHotspotService";

export const useMapHotspots = (initialCenter = null, initialZoom = 10) => {
  const [hotspots, setHotspots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastBounds, setLastBounds] = useState(null);
  const [stats, setStats] = useState({ total: 0, cached: 0, fresh: 0 });

  // Use ref to prevent unnecessary re-renders
  const loadingRef = useRef(false);
  const timeoutRef = useRef(null);

  // Load hotspots for given bounds
  const loadHotspots = useCallback(
    async (bounds, zoom) => {
      // Prevent concurrent loading
      if (loadingRef.current) {
        if (import.meta.env.DEV) {
          console.log("⏳ Already loading, skipping request");
        }
        return;
      }

      // Check if bounds are the same as last request (increased threshold)
      if (
        lastBounds &&
        Math.abs(bounds.north - lastBounds.north) < 0.05 &&
        Math.abs(bounds.south - lastBounds.south) < 0.05 &&
        Math.abs(bounds.east - lastBounds.east) < 0.05 &&
        Math.abs(bounds.west - lastBounds.west) < 0.05
      ) {
        if (import.meta.env.DEV) {
          console.log("📍 Bounds haven't changed significantly, skipping");
        }
        return;
      }

      try {
        loadingRef.current = true;
        setLoading(true);
        setError(null);

        // Only log in development
        if (import.meta.env.DEV) {
          console.log("🗺️ Loading hotspots for bounds:", bounds, "zoom:", zoom);
        }

        const result = await geoHotspotService.getHotspotsInBounds(
          bounds,
          zoom
        );

        if (result.success) {
          setHotspots(result.data);
          setLastBounds(bounds);

          // Replace stats instead of accumulating
          setStats({
            total: result.data.length,
            cached: result.cached ? result.data.length : 0,
            fresh: result.cached ? 0 : result.data.length,
          });

          // Only log in development
          if (import.meta.env.DEV) {
            console.log(
              `✅ Loaded ${result.data.length} hotspots ${
                result.cached ? "(cached)" : "(fresh)"
              }`
            );
          }
        } else {
          setError(result.error || "Failed to load hotspots");
          console.error("❌ Failed to load hotspots:", result.error);
        }
      } catch (err) {
        setError(err.message);
        console.error("❌ Error loading hotspots:", err);
      } finally {
        setLoading(false);
        loadingRef.current = false;
      }
    },
    [lastBounds]
  );

  // Debounced hotspot loading to prevent too many API calls during map movement
  const loadHotspotsDebounced = useCallback(
    (bounds, zoom, delay = 2000) => {
      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set new timeout with longer delay
      timeoutRef.current = setTimeout(() => {
        loadHotspots(bounds, zoom);
      }, delay);
    },
    [loadHotspots]
  );

  // Load hotspots near user location
  const loadNearbyHotspots = useCallback(
    async (latitude, longitude, radius = 5) => {
      if (loadingRef.current) {
        if (import.meta.env.DEV) {
          console.log("⏳ Already loading nearby hotspots, skipping");
        }
        return;
      }

      try {
        loadingRef.current = true;
        setLoading(true);
        setError(null);

        // Only log in development
        if (import.meta.env.DEV) {
          console.log(
            "📍 Loading nearby hotspots for location:",
            latitude,
            longitude
          );
        }

        const result = await geoHotspotService.getHotspotsNearLocation(
          latitude,
          longitude,
          radius
        );

        if (result.success) {
          setHotspots(result.data);

          // Replace stats instead of accumulating
          setStats({
            total: result.data.length,
            cached: result.cached ? result.data.length : 0,
            fresh: result.cached ? 0 : result.data.length,
          });

          // Only log in development
          if (import.meta.env.DEV) {
            console.log(
              `✅ Loaded ${result.data.length} nearby hotspots ${
                result.cached ? "(cached)" : "(fresh)"
              }`
            );
          }
        } else {
          setError(result.error || "Failed to load nearby hotspots");
          console.error("❌ Failed to load nearby hotspots:", result.error);
        }
      } catch (err) {
        setError(err.message);
        console.error("❌ Error loading nearby hotspots:", err);
      } finally {
        setLoading(false);
        loadingRef.current = false;
      }
    },
    []
  );

  // Handle map bounds change (called when user pans/zooms)
  const onMapBoundsChange = useCallback(
    (bounds, zoom) => {
      // Skip if already loading
      if (loadingRef.current) {
        return;
      }

      // Skip if bounds haven't changed significantly (moved to loadHotspots)
      loadHotspotsDebounced(bounds, zoom, 3000); // Much longer debounce delay
    },
    [loadHotspotsDebounced]
  );

  // Handle user location change
  const onLocationChange = useCallback(
    (latitude, longitude) => {
      loadNearbyHotspots(latitude, longitude);
    },
    [loadNearbyHotspots]
  );

  // Refresh hotspots (clear cache and reload)
  const refreshHotspots = useCallback(() => {
    geoHotspotService.clearCache();
    if (lastBounds) {
      loadHotspots(lastBounds, 10);
    }
  }, [lastBounds, loadHotspots]);

  // Initialize with user location or default center
  useEffect(() => {
    if (initialCenter) {
      const bounds = geoHotspotService.calculateBounds(
        initialCenter,
        initialZoom
      );
      loadHotspots(bounds, initialZoom);
    } else {
      // Try to get user location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            loadNearbyHotspots(latitude, longitude);
          },
          (error) => {
            console.warn("Geolocation failed:", error);
            // Fallback to default Delhi location
            const defaultCenter = { latitude: 28.6139, longitude: 77.209 };
            const bounds = geoHotspotService.calculateBounds(
              defaultCenter,
              initialZoom
            );
            loadHotspots(bounds, initialZoom);
          }
        );
      } else {
        // Fallback to default Delhi location
        const defaultCenter = { latitude: 28.6139, longitude: 77.209 };
        const bounds = geoHotspotService.calculateBounds(
          defaultCenter,
          initialZoom
        );
        loadHotspots(bounds, initialZoom);
      }
    }

    // Cleanup timeout on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [initialCenter, initialZoom, loadHotspots, loadNearbyHotspots]);

  return {
    hotspots,
    loading,
    error,
    stats,
    onMapBoundsChange,
    onLocationChange,
    refreshHotspots,
    loadHotspots,
    loadNearbyHotspots,
  };
};
