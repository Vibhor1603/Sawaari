/* eslint-disable no-unused-vars */
/* eslint-disable react/no-unescaped-entities */
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css'; // Ensure Leaflet CSS is imported

export default function Hotspots() {
  const center = [28.633043462708848, 77.44792897992077];
  const zoom = 13;

  return (
    <div id="map" style={{ height: '80vh', width: '100%' }}>
      <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%' }}>
      <TileLayer
  url="https://tile.openstreetmap.de/{z}/{x}/{y}.png'"
  attribution= '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

/>

        <Marker position={center}>
          <Popup>
            A popup message
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
