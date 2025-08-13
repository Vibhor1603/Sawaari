/* eslint-disable react/prop-types */
// Enhanced Map component with geolocation-based hotspot loading
import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { useMapHotspots } from "../../hooks/useMapHotspots";
import HotspotMarkers from "../../features/hotspots/HotspotMarkers";
import LocationTracker from "../../components/map/LocationTracker";

// Component to handle map events and trigger hotspot loading
function MapEventHandler({ onBoundsChange, onLocationChange }) {
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (boundsChangeTimeoutRef.current) {
        clearTimeout(boundsChangeTimeoutRef.current);
      }
    };
  }, []);

  return null;
}

// Loading indicator component with anti-flicker
function LoadingIndicator({ loading, stats }) {
  const [showLoading, setShowLoading] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const loadingTimeoutRef = useRef(null);
  const statsTimeoutRef = useRef(null);

  // Prevent flickering by delaying loading indicator
  useEffect(() => {
    if (loading) {
      loadingTimeoutRef.current = setTimeout(() => {
        setShowLoading(true);
      }, 200); // Only show loading after 200ms
    } else {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
      setShowLoading(false);
    }

    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [loading]);

  // Show stats briefly after loading
  useEffect(() => {
    if (!loading && stats.total > 0) {
      setShowStats(true);
      statsTimeoutRef.current = setTimeout(() => {
        setShowStats(false);
      }, 3000); // Show stats for 3 seconds
    }

    return () => {
      if (statsTimeoutRef.current) {
        clearTimeout(statsTimeoutRef.current);
      }
    };
  }, [loading, stats.total]);

  if (!showLoading && !showStats) return null;

  return (
    <div
      className="map-loading-indicator"
      style={{
        position: "absolute",
        top: "10px",
        right: "10px",
        background: "rgba(0, 0, 0, 0.8)",
        color: "white",
        padding: "8px 12px",
        borderRadius: "6px",
        fontSize: "12px",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        gap: "8px",
        transition: "opacity 0.3s ease",
        opacity: showLoading || showStats ? 1 : 0,
      }}
    >
      {showLoading && (
        <>
          <div
            className="spinner"
            style={{
              width: "12px",
              height: "12px",
              border: "2px solid #ffffff40",
              borderTop: "2px solid #00ff88",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
            }}
          />
          <span>Loading hotspots...</span>
        </>
      )}
      {showStats && !showLoading && (
        <span>
          {stats.total} hotspots loaded
          {stats.cached > 0 && ` (${stats.cached} cached)`}
        </span>
      )}
    </div>
  );
}

// Error indicator component
function ErrorIndicator({ error, onRetry }) {
  if (!error) return null;

  return (
    <div
      className="map-error-indicator"
      style={{
        position: "absolute",
        top: "10px",
        left: "10px",
        background: "rgba(220, 53, 69, 0.9)",
        color: "white",
        padding: "8px 12px",
        borderRadius: "6px",
        fontSize: "12px",
        zIndex: 1000,
        maxWidth: "250px",
      }}
    >
      <div style={{ marginBottom: "4px" }}>
        <i className="fas fa-exclamation-triangle me-1"></i>
        Error loading hotspots
      </div>
      <div style={{ fontSize: "11px", opacity: 0.9 }}>{error}</div>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            background: "transparent",
            border: "1px solid white",
            color: "white",
            padding: "2px 6px",
            borderRadius: "3px",
            fontSize: "10px",
            marginTop: "4px",
            cursor: "pointer",
          }}
        >
          Retry
        </button>
      )}
    </div>
  );
}

// Main Enhanced Map component
export default function EnhancedMap({
  center = [28.6139, 77.209],
  zoom = 10,
  onHotspotClick,
  style = { height: "100%", width: "100%" },
  showControls = true,
}) {
  const {
    hotspots,
    loading,
    error,
    stats,
    onMapBoundsChange,
    onLocationChange,
    refreshHotspots,
  } = useMapHotspots({ latitude: center[0], longitude: center[1] }, zoom);

  return (
    <div style={{ position: "relative", ...style }}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: "100%", width: "100%" }}
        zoomControl={showControls}
      >
        <TileLayer
          url="https://tile.openstreetmap.de/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        <LocationTracker />

        <MapEventHandler
          onBoundsChange={onMapBoundsChange}
          onLocationChange={onLocationChange}
        />

        <HotspotMarkers hotspot={hotspots} clickHandler={onHotspotClick} />
      </MapContainer>

      {showControls && (
        <>
          <LoadingIndicator loading={loading} stats={stats} />
          <ErrorIndicator error={error} onRetry={refreshHotspots} />
        </>
      )}

      {/* Add CSS for spinner animation */}
      <style>{`
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
