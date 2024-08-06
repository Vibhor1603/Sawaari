/* eslint-disable no-unused-vars */
/* eslint-disable react/prop-types */
import React, { useState, useEffect } from 'react';
import { initializeGraph, storeRoute, findMatchingRoutes } from './RouteMatching';

export default function RideBuddy({ hotspot }) {
  const [rideInfo, setRideInfo] = useState({
    name: '',
    source: '',
    destination: '',
    gender: ''
  });
  const [matches, setMatches] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    initializeGraph(hotspot);
  }, [hotspot]);

  const handleInput = (event) => {
    const { name, value } = event.target;
    setRideInfo(prev => ({ ...prev, [name]: value }));
  };

  const handleRideForm = async (e) => {
    e.preventDefault();
    setError(null);
  
    try {
      // First, store the route and get the route object
      const route = await storeRoute(rideInfo.name, rideInfo.source, rideInfo.destination);
  
      // Then, send data to your server
      const response = await fetch('http://localhost:5000/ridebuddy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({...rideInfo, id: route.id})
      }); 
  
      if (!response.ok) {
        throw new Error('Failed to submit ride information');
      }
  
      // Finally, find matching routes
      const matchingRoutes = await findMatchingRoutes(route);
      setMatches(matchingRoutes);
  
    } catch (error) {
      console.error("Error processing ride form:", error);
      setError(error.message);
    } 
  };
      

  return (
    <div>
      <form className='form' onSubmit={handleRideForm}>
        <div className="mb-3">
          <label htmlFor="inputName" className="form-label">Your name</label>
          <input 
            type="text" 
            name='name' 
            required 
            className="form-control" 
            id="inputName" 
            onChange={handleInput} 
            value={rideInfo.name}
          />
        </div>
        <div className="mb-3">
          <label htmlFor="inputSource" className="form-label">Enter Source</label>
          <input 
            type="text" 
            name='source' 
            required 
            className="form-control" 
            id="inputSource" 
            onChange={handleInput}
            value={rideInfo.source}
          />
        </div>
        <div className="mb-3">
          <label htmlFor="inputDestination" className="form-label">Destination</label>
          <input 
            type="text" 
            name='destination' 
            required 
            onChange={handleInput} 
            className="form-control" 
            id="inputDestination"
            value={rideInfo.destination}
          />
        </div>
        <div className="mb-3 gender">
          <label htmlFor="selectGender" className="form-label">Gender</label>
          <select 
            name="gender" 
            required 
            onChange={handleInput} 
            id="selectGender"
            value={rideInfo.gender}
            className="form-select"
          >
            <option value="">Select your gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>
        <button type="submit" className="btn btn-primary">
          Submit
        </button>
      </form>

      {error && (
        <div className="alert alert-danger mt-3" role="alert">
          {error}
        </div>
      )}

      <div className="container matches mt-4">
        <h3>Matching Routes:</h3>
        {matches.length > 0 ? (
          <ul className="list-group">
            {matches.map((match, index) => (
              <li key={index} className="list-group-item">
                User: {match.userId}, 
                Match: {match.matchPercentage.toFixed(2)}%,
                Route: {match.source} to {match.destination}
              </li>
            ))}
          </ul>
        ) : (
          <p>No matching routes found.</p>
        )}
      </div>
    </div>
  );
}