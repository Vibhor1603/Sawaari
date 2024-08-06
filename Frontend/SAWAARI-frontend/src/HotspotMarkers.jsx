/* eslint-disable no-unused-vars */
/* eslint-disable react/prop-types */
import React from 'react';
import { Circle, Popup } from 'react-leaflet';

export default function HotspotMarkers({ hotspot, clickHandler }) {
  const circleOptions = {
    fillOpacity: 0.5,
  };

  return (
    <>
      {hotspot.map((item) => {
        if (!item.latitude || !item.longitude || !item.color_code || !item.destinations) {
          console.warn('Missing data for hotspot:', item);
          return null;
        }

        return (
          <Circle
            key={item._id}
            center={[item.latitude, item.longitude]}
            pathOptions={{ ...circleOptions, fillColor: item.color_code }}
            radius={200}
          >
            <Popup className="custom-popup">
              <div className="hotspot-popup">
                <h3 className="hotspot-name">{item.name}</h3>
                <p className="hotspot-description">Available destinations:</p>
                <ul className="destination-list">
                  {item.destinations.map((result) => (
                    <li key={result.name} className="destination-item">
                      <button 
                        className="destination-button"
                        onClick={() => clickHandler(result.latitude, result.longitude)}
                      >
                        <span className="destination-name">{result.name}</span>
                        <span className="estimated-fare">₹{result.estimated_fare}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </Popup>
          </Circle>
        );
      })}
    </>
  );
}