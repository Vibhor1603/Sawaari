/* eslint-disable no-unused-vars */
/* eslint-disable react/prop-types */
import React from 'react';

export default function RouteForm({ source, setSource, destination, setDestination, handleRouteSearch }) {
  return (
    <form onSubmit={handleRouteSearch}>
      <div className="mb-3">
        <input
          type="text"
          className="form-control"
          id="source"
          placeholder='Enter source hotspot name'
          value={source}
          onChange={(e) => setSource(e.target.value)}
        />
      </div>
      <div className="mb-3">
        <input
          type="text"
          className="form-control"
          id="destination"
          placeholder='Enter destination hotspot name'
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
        />
      </div>
      <button type="submit" className="btn btn-primary submit-btn">Search</button>
    </form>
  );
}