/* eslint-disable react/prop-types */
// Enhanced Map component with geolocation-based hotspot loading
import React, { useMemo } from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import { useMapHotspots } from "../../hooks/useMapHotspots";
import HotspotMarkers from "../../features/hotspots/HotspotMarkers";
import { LocationTracker, MapEventHandler } from "../map";

// MapEventHandler is now imported from ../map

// Enhanced loading indicator
function LoadingIndicator({ loading }) {
  if (!loading) return null;

  return (
    <div className="absolute top-3 right-3 bg-black/90 backdrop-blur-sm text-white px-3 py-2 rounded-lg text-xs flex items-center gap-2 z-[1000] border border-white/20">
      <div className="w-3 h-3 border-2 border-white/40 border-t-sawaari-yellow rounded-full animate-spin" />
      <span>Loading hotspots...</span>
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
  zoom = 14,
  onHotspotClick,
  style = { height: "100%", width: "100%" },
  showControls = true,
}) {
  // Memoize the center to prevent unnecessary re-renders
  const memoizedCenter = useMemo(
    () => ({
      latitude: center[0],
      longitude: center[1],
    }),
    [center]
  );

  const {
    hotspots,
    loading,
    error,
    onMapBoundsChange,
    onLocationChange,
    refreshHotspots,
  } = useMapHotspots(memoizedCenter, zoom);

  return (
    <div style={{ position: "relative", ...style }}>
      <MapContainer
        key={`map-${center[0]}-${center[1]}-${zoom}`}
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
          <LoadingIndicator loading={loading} />
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
