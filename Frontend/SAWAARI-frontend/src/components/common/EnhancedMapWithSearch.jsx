/* eslint-disable react/prop-types */
// Enhanced Map component with integrated location search
import React, { useMemo, useRef } from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import { useMapHotspots } from "../../hooks/useMapHotspots";
import { useMapControl } from "../../hooks/useMapControl";
import HotspotMarkers from "../../features/hotspots/HotspotMarkers";
import { LocationTracker, MapEventHandler, MapController } from "../map";
import LocationSearch from "./LocationSearch";

// Simple loading indicator
function LoadingIndicator({ loading }) {
  if (!loading) return null;

  return (
    <div className="absolute top-3 right-3 bg-black/80 text-white px-3 py-2 rounded-lg text-xs flex items-center gap-2 z-[1000]">
      <div className="w-3 h-3 border-2 border-white/40 border-t-sawaari-yellow rounded-full animate-spin" />
      <span>Loading...</span>
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

// Main Enhanced Map component with search
export default function EnhancedMapWithSearch({
  center = [28.6139, 77.209],
  zoom = 14,
  onHotspotClick,
  style = { height: "100%", width: "100%" },
  showControls = true,
  showSearch = true,
  searchPlaceholder = "Search for a location...",
  onLocationSelect,
  searchBbox = null, // Delhi NCR bbox: [76.8, 28.4, 77.6, 28.9]
}) {
  const mapControlRef = useRef(null);
  const { centerMap, getMapBounds } = useMapControl();

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

  // Handle location selection from search
  const handleLocationSelect = (locationData) => {
    const { coordinates } = locationData;

    // Center map on selected location
    if (mapControlRef.current) {
      mapControlRef.current.flyTo(
        [coordinates.latitude, coordinates.longitude],
        16,
        {
          duration: 1.5,
          easeLinearity: 0.1,
        }
      );
    }

    // Call parent callback if provided
    if (onLocationSelect) {
      onLocationSelect(locationData);
    }
  };

  // Handle map ready
  const handleMapReady = (map) => {
    mapControlRef.current = map;
  };

  // Get current map bounds for search bbox
  const getCurrentBbox = () => {
    if (searchBbox) return searchBbox;

    if (mapControlRef.current) {
      try {
        const bounds = mapControlRef.current.getBounds();
        return [
          bounds.getWest(),
          bounds.getSouth(),
          bounds.getEast(),
          bounds.getNorth(),
        ];
      } catch (error) {
        console.error("Error getting map bounds for search:", error);
      }
    }

    // Default Delhi NCR bbox
    return [76.8, 28.4, 77.6, 28.9];
  };

  return (
    <div style={{ position: "relative", ...style }}>
      {/* Location Search */}
      {showSearch && (
        <div className="absolute top-3 left-3 right-3 z-[1001]">
          <LocationSearch
            onLocationSelect={handleLocationSelect}
            placeholder={searchPlaceholder}
            bbox={getCurrentBbox()}
            className="max-w-md mx-auto sm:mx-0"
          />
        </div>
      )}

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

        <MapController
          onMapReady={handleMapReady}
          mapControlRef={mapControlRef}
        />

        <HotspotMarkers hotspot={hotspots} clickHandler={onHotspotClick} />
      </MapContainer>

      {showControls && (
        <>
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
