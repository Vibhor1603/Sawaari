/* eslint-disable react/prop-types */
import { useEffect } from "react";
import { useMap } from "react-leaflet";

export default function MapInteractionHandler({ selectedDestination }) {
  const map = useMap();

  useEffect(() => {
    if (selectedDestination) {
      map.setView(selectedDestination, 14);
    }
  }, [map, selectedDestination]);

  return null;
}
