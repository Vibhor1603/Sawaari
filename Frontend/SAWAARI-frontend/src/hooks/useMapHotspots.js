// React hook for dynamic hotspot loading based on map viewport
import { useState, useEffect, useCallback, useRef } from "react";
import geoHotspotService from "../services/geoHotspotService";

export const useMapHotspots = (initialCenter = null, initialZoom = 10) => {
  const [hotspots, setHotspots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({ total: 0, cached: 0, fresh: 0 });

  // Use ref to prevent unnecessary re-renders
  const loadingRef = useRef(false);
  const timeoutRef = useRef(null);

  // Load hotspots for given bounds
  const loadHotspots = useCallback(async (bounds, zoom) => {
    // Prevent concurrent loading
    if (loadingRef.current) {
      return;
    }

    try {
      loadingRef.current = true;
      setLoading(true);
      setError(null);

      const result = await geoHotspotService.getHotspotsInBounds(bounds, zoom);

      if (result.success && result.data) {
        setHotspots(result.data);
        setStats({
          total: result.data.length,
          cached: result.cached ? result.data.length : 0,
          fresh: result.cached ? 0 : result.data.length,
        });
      } else {
        setError(result.error || "Failed to load hotspots");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, []);

  // Debounced hotspot loading to prevent too many API calls during map movement
  const loadHotspotsDebounced = useCallback(
    (bounds, zoom, delay = 500) => {
      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set new timeout
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
        return;
      }

      try {
        loadingRef.current = true;
        setLoading(true);
        setError(null);

        const result = await geoHotspotService.getHotspotsNearLocation(
          latitude,
          longitude,
          radius
        );

        if (result.success && result.data) {
          setHotspots(result.data);
          setStats({
            total: result.data.length,
            cached: result.cached ? result.data.length : 0,
            fresh: result.cached ? 0 : result.data.length,
          });
        } else {
          setError(result.error || "Failed to load nearby hotspots");
        }
      } catch (err) {
        setError(err.message);
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

      loadHotspotsDebounced(bounds, zoom, 500);
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
    // Trigger a reload by clearing current hotspots
    setHotspots([]);
  }, []);

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
