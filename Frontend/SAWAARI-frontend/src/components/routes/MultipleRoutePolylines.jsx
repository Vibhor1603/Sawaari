/* eslint-disable react/prop-types */
import React from "react";
import { Polyline } from "react-leaflet";

export default function MultipleRoutePolylines({ routes, selectedRouteId }) {
  if (!routes || routes.length === 0) {
    return null;
  }

  return (
    <>
      {routes.map((route) => {
        if (!route.pathCoordinates || route.pathCoordinates.length === 0) {
          return null;
        }

        // Convert coordinates to the format expected by Leaflet
        const coordinates = route.pathCoordinates.map((coord) => [
          coord.latitude,
          coord.longitude,
        ]);

        const isSelected = selectedRouteId === route.id;

        return (
          <Polyline
            key={route.id}
            positions={coordinates}
            color={route.color || "#f4b942"}
            weight={isSelected ? 6 : 4}
            opacity={isSelected ? 1 : 0.7}
            dashArray={
              isSelected ? null : route.type === "alternative" ? "10, 5" : null
            }
          />
        );
      })}
    </>
  );
}
