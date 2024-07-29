/* eslint-disable react/prop-types */
/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable no-unused-vars */
/* eslint-disable react/no-unescaped-entities */
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvent } from 'react-leaflet';
import 'leaflet/dist/leaflet.css'; // Ensure Leaflet CSS is imported
import React, { useState, useEffect } from 'react';

// Component to track and display the user's location
function LocationTracker() {
  const map = useMap(); // Access the map instance

  const [position, setPosition] = useState(null);

  useEffect(() => {
    function fetchLocation() {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const newPosition = [pos.coords.latitude, pos.coords.longitude];
          setPosition(newPosition);
          map.setView(newPosition, 13); // Set map view to the new position
        },
        (err) => {
          console.error('Error fetching location:', err);
        },
        {
          enableHighAccuracy: true,
        }
      );
    }
    fetchLocation();
  }, [map]); // Dependency array includes map to ensure map is ready

  return position === null ? null : (
    <Marker position={position}>
      <Popup>You are here</Popup>
    </Marker>
  );
}

// Component to display hotspots and handle map interactions
function Hotspots(prop) {
  const [selectedDestination, setSelectedDestination] = useState([28.619155291665052, 77.42591115327116]);
  const zoom = 10;
 
const {hotspot} = prop;
  // Child component to manage map interactions and updates
  function clickHandler(latitude, longitude) {
    setSelectedDestination([latitude, longitude]);

  }

  function MapInteractionHandler({ selectedDestination }) {
    const map = useMap();
  
    useEffect(() => {
      if (selectedDestination) {
        map.setView(selectedDestination, 16);
      }
    }, [map, selectedDestination]);
  
    return null;
  }


  

  const circleOptions = {
    
    fillOpacity: 0.5,
  };

  // Generate hotspot circles with popup content
  const hotspotData = hotspot.map((item) => (
    <Circle
      key={item._id}
      center={[item.latitude, item.longitude]}
      pathOptions={{ ...circleOptions, fillColor: item.color_code }}
      radius={200}
    >
      <Popup>
        <div className="card mb-4" style={{ width: '13rem' }}>
          <div className="card-body">
            <p className="card-text">{`${item.name}:This hotspot will go to -`}</p>
            {item.destinations.map((result) => (
              <div key={result.name}>
                <ul>
                  <li>
                    <button onClick={() => clickHandler(result.latitude, result.longitude)}>
                      {result.name}
                    </button>
                    , estimated fare is {result.estimated_fare}
                  </li>
                </ul>
              </div>
            ))}
          </div>
        </div>
      </Popup>
    </Circle>
  ));

  
  return (
    <div id="map" className="container mt-100"
    
    style={{ height: '80vh', width: '100%' }}>
      <MapContainer center={[28.633043462708848, 77.44792897992077]} zoom={zoom} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          url="https://tile.openstreetmap.de/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <LocationTracker />
        <MapInteractionHandler selectedDestination={selectedDestination}/>
        {hotspotData}
      </MapContainer>
    </div>
  );
}

export default Hotspots;
