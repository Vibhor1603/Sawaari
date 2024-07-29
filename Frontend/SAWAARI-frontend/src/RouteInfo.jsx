/* eslint-disable react/prop-types */
/* eslint-disable no-unused-vars */

import Hotspots from './hotspots'
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvent } from 'react-leaflet';
import 'leaflet/dist/leaflet.css'; // Ensure Leaflet CSS is imported
import React, { useState, useEffect } from 'react';

export default function RouteInfo(props) {


  



  return (
    <div className='container route-container' >
      <form >
      <div className='route-map container'>
  <div className="mb-3">
    <label htmlFor="source" className="form-label">Source</label>
    <input type="email" className="form-control" id="source" aria-describedby="emailHelp" placeholder='enter source'/>
   
  </div>
  <div className="mb-3">
    <label htmlFor="destination" className="form-label">Destination</label>
    <input type="password" className="form-control" id="destination" placeholder='enter the destination'/>
  </div>
  </div>
  <button type="submit" className="btn btn-primary submit-btn">Search</button>
</form>
<div className="routes-map container"><Hotspots hotspot={props.hotspot}/></div>

    </div>
  )
}
