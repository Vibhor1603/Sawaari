/* eslint-disable no-unused-vars */
/* eslint-disable react/prop-types */
import React from "react";
import { Circle, Popup } from "react-leaflet";

export default function HotspotMarkers({ hotspot, clickHandler }) {
  const circleOptions = {
    fillOpacity: 0.6,
    weight: 2,
  };

  // Safety check for hotspot data
  if (!hotspot || !Array.isArray(hotspot) || hotspot.length === 0) {
    return null;
  }

  return (
    <>
      {hotspot.map((item) => {
        if (
          !item.latitude ||
          !item.longitude ||
          !item.color_code ||
          !item.destinations
        ) {
          return null;
        }

        return (
          <Circle
            key={item._id}
            center={[item.latitude, item.longitude]}
            pathOptions={{
              ...circleOptions,
              fillColor: item.color_code,
              color: "#f4b942",
              fillOpacity: 0.4,
              weight: 3,
            }}
            radius={250}
          >
            <Popup className="custom-popup">
              <div className="hotspot-popup bg-gradient-to-br from-black/95 via-gray-900/95 to-black/95 backdrop-blur-md border-2 border-sawaari-yellow/50 rounded-lg p-2 min-w-[180px] max-w-[220px] shadow-xl">
                {/* Header */}
                <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-sawaari-yellow/30">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-bold text-sm text-readable truncate">
                      {item.name}
                    </h3>
                    <p className="text-sawaari-yellow/80 text-xs text-readable-secondary">
                      Auto Stand • {item.destinations.length} routes
                    </p>
                  </div>
                </div>

                {/* Destinations List */}
                <div className="space-y-1 max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-sawaari-yellow/20 scrollbar-track-transparent hover:scrollbar-thumb-sawaari-yellow/40">
                  {item.destinations.map((result) => (
                    <button
                      key={result.name}
                      className="w-full p-1.5 bg-gradient-to-r from-black/40 to-gray-900/40 border border-sawaari-yellow/30 rounded-md hover:from-sawaari-yellow/20 hover:to-sawaari-yellow/10 hover:border-sawaari-yellow/60 transition-all duration-200 text-left group"
                      onClick={() =>
                        clickHandler(result.latitude, result.longitude)
                      }
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sawaari-yellow text-xs">
                              📍
                            </span>
                            <span className="text-white font-semibold text-xs text-readable group-hover:text-sawaari-yellow transition-colors truncate block">
                              {result.name}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          <div className="bg-sawaari-yellow/20 border border-sawaari-yellow/40 rounded px-1.5 py-0.5">
                            <span className="text-sawaari-yellow font-bold text-xs text-readable">
                              ₹{result.estimated_fare}
                            </span>
                          </div>
                          <span className="text-sawaari-yellow opacity-0 group-hover:opacity-100 transition-opacity text-xs">
                            →
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Footer with Instructions */}
                <div className="mt-1.5 pt-1.5 border-t border-sawaari-yellow/30">
                  <div className="flex items-center justify-center gap-1 text-xs text-sawaari-yellow/80 text-readable-secondary bg-sawaari-yellow/10 border border-sawaari-yellow/20 rounded py-1">
                    <span className="text-sawaari-yellow">🎯</span>
                    <span>Click to select</span>
                  </div>
                </div>
              </div>
            </Popup>
          </Circle>
        );
      })}
    </>
  );
}
