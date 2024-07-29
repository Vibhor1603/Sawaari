// /* eslint-disable no-unused-vars */
// /* LocationTracker.jsx */
// import { useMap,Marker,Popup } from 'react-leaflet';
// import React, { useState, useEffect } from 'react';
// import 'leaflet/dist/leaflet.css';

// function LocationTracker() {
//   const map = useMap();
//   const [position, setPosition] = useState(null);

//   useEffect(() => {
//     function fetchLocation() {
//       navigator.geolocation.getCurrentPosition(
//         (pos) => {
//           const newPosition = [pos.coords.latitude, pos.coords.longitude];
//           setPosition(newPosition);
//           map.setView(newPosition, 13); // Set map view to the new position
//         },
//         (err) => {
//           console.error('Error fetching location:', err);
//         },
//         {
//           enableHighAccuracy: true,
//         }
//       );
//     }
//     fetchLocation();
//   }, [map]);

//   return position === null ? null : (
//     <Marker position={position}>
//       <Popup>You are here</Popup>
//     </Marker>
//   );
// }

// export default LocationTracker;
