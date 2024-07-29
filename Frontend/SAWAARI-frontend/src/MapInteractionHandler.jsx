/* eslint-disable no-unused-vars */
/* MapInteractionHandler.jsx */
import React from 'react';
import { useMap, useMapEvent } from 'react-leaflet';

function MapInteractionHandler(props) {
  const map = useMap();
  const zoom = 13;
  const onDestinationSelect=props
  // Handle map clicks
  useMapEvent('click', () => {
    if (onDestinationSelect) {
      onDestinationSelect(map.getCenter());
    }
  });

  return null;
}

export default MapInteractionHandler;
