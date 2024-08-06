/* eslint-disable react/prop-types */
/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

import { createGraph, findShortestPath } from './utils';
import LocationTracker from './LocationTracker';
import MapInteractionHandler from './MapInteractionHandler';
import HotspotMarkers from './HotspotMarkers';
import RouteForm from './RouteForm';

export default function RouteInfo({ hotspot }) {
  const [source, setSource] = useState('');
  const [destination, setDestination] = useState('');
  const [shortestPath, setShortestPath] = useState([]);
  const [pathCoordinates, setPathCoordinates] = useState([]);
  const [graph, setGraph] = useState(null);
  const [error, setError] = useState('');
  const [selectedDestination, setSelectedDestination] = useState([28.619155291665052, 77.42591115327116]);
  const [totalFare, setTotalFare] = useState(0);

  useEffect(() => {
    console.log('RouteInfo component mounted');
    console.log('Hotspot prop:', hotspot);
    if (Array.isArray(hotspot) && hotspot.length > 0) {
      const newGraph = createGraph(hotspot);
      setGraph(newGraph);
      console.log('Graph created:', newGraph);
    } else {
      console.log('No valid hotspot data');
    }
  }, [hotspot]);

  const handleRouteSearch = (e) => {
    e.preventDefault();
    setError('');
    setShortestPath([]);
    setPathCoordinates([]);
    setTotalFare(0);

    console.log('Form submitted');
    console.log('Current state:', { source, destination, graph });

    if (!graph) {
      console.error('Graph not initialized');
      setError('Graph not initialized. Please check hotspot data.');
      return;
    }

    if (!source || !destination) {
      console.error('Source or destination is empty');
      setError('Please enter both source and destination.');
      return;
    }

    if (!graph.hasNode(source) || !graph.hasNode(destination)) {
      console.error('Invalid source or destination');
      setError('Invalid source or destination. Please check the hotspot names.');
      return;
    }

    console.log('Graph nodes:', graph.nodes());
    console.log('Graph edges:', graph.edges());

    const { path, totalFare } = findShortestPath(graph, source, destination);

    if (path.length > 0) {
      const coordinates = path.map(node => {
        const hotspotNode = graph.getNodeAttributes(node);
        return [hotspotNode.latitude, hotspotNode.longitude];
      });
      console.log('Path coordinates:', coordinates);
      setPathCoordinates(coordinates);
      setShortestPath(path);
      setTotalFare(totalFare);
      console.log('Total fare:', totalFare);
    } else {
      console.log('No path found');
      setError('No path found between the given source and destination.');
      setShortestPath([]);
      setPathCoordinates([]);
    }
  };

  const clickHandler = (latitude, longitude) => {
    setSelectedDestination([latitude, longitude]);
  };

  return (
    <div className='container route-container outer'>
      <div className="row">
        <div className="col-md-4">
          <RouteForm
            source={source}
            setSource={setSource}
            destination={destination}
            setDestination={setDestination}
            handleRouteSearch={handleRouteSearch}
          />
          {error && <div className="alert alert-danger mt-3">{error}</div>}
          {shortestPath.length > 0 && (
            <div className='mt-3'>
              <h3>Shortest Path</h3>
              <ul className="list-group">
                {shortestPath.map((node, index) => (
                  <li key={index} className="list-group-item">{node}</li>
                ))}
              </ul>
              <h5>Total Estimated Fare: ₹{totalFare}</h5>
            </div>
          )}
        </div>
        <div className="col-md-8">
          <div className="routes-map" style={{ height: '500px', width: '100%' }}>
            <MapContainer center={[28.633043462708848, 77.44792897992077]} zoom={10} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                url="https://tile.openstreetmap.de/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              <LocationTracker />
              <MapInteractionHandler selectedDestination={selectedDestination} />
              <HotspotMarkers hotspot={hotspot} clickHandler={clickHandler} />
              {pathCoordinates.length > 0 && (
                <Polyline positions={pathCoordinates} color="blue" />
              )}
            </MapContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 // /* eslint-disable no-unused-vars */
// /* eslint-disable react/prop-types */
// import React, { useState, useEffect } from 'react';
// import Graph from 'graphology';
// import { dijkstra } from 'graphology-shortest-path';
// import { MapContainer, TileLayer, Polyline } from 'react-leaflet';
// import 'leaflet/dist/leaflet.css';

// function haversineDistance(lat1, lon1, lat2, lon2) {
//   const toRadians = (degrees) => degrees * (Math.PI / 180);

//   const R = 6371; // Radius of the Earth in kilometers
//   const dLat = toRadians(lat2 - lat1);
//   const dLon = toRadians(lon2 - lon1);
//   const a =
//     Math.sin(dLat / 2) * Math.sin(dLat / 2) +
//     Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
//     Math.sin(dLon / 2) * Math.sin(dLon / 2);
//   const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
//   const distance = R * c; // Distance in kilometers

//   return distance;
// }

// function createGraph(hotspots) {
//   console.log('Creating graph with hotspots:', hotspots);
//   const graph = new Graph();

//   // First, add all nodes to the graph
//   hotspots.forEach(hotspot => {
//     graph.addNode(hotspot.name, {
//       latitude: hotspot.latitude,
//       longitude: hotspot.longitude
//     });
//   });

//   // Then, add edges
//   hotspots.forEach(hotspot => {
//     hotspot.destinations.forEach(destination => {
//       if (graph.hasNode(hotspot.name) && graph.hasNode(destination.name)) {
//         const distance = haversineDistance(
//           hotspot.latitude,
//           hotspot.longitude,
//           destination.latitude,
//           destination.longitude
//         );
//         graph.addEdge(hotspot.name, destination.name, { weight: distance });
//       } else {
//         console.warn(`Cannot add edge between ${hotspot.name} and ${destination.name}: one or both nodes not found`);
//       }
//     });
//   });

//   console.log('Graph created:', graph);
//   return graph;
// }

// function findShortestPath(graph, start, end) {
//   console.log(`Finding shortest path between ${start} and ${end}`);
//   try {
//     const path = dijkstra.bidirectional(graph, start, end);
//     console.log('Path found:', path);
//     return path || [];
//   } catch (error) {
//     console.error("Error finding shortest path:", error);
//     return [];
//   }
// }

// export default function RouteInfo({ hotspot }) {
//   const [source, setSource] = useState('');
//   const [destination, setDestination] = useState('');
//   const [shortestPath, setShortestPath] = useState([]);
//   const [pathCoordinates, setPathCoordinates] = useState([]);
//   const [graph, setGraph] = useState(null);
//   const [error, setError] = useState('');

//   useEffect(() => {
//     console.log('RouteInfo component mounted');
//     console.log('Hotspot prop:', hotspot);
//     if (Array.isArray(hotspot) && hotspot.length > 0) {
//       const newGraph = createGraph(hotspot);
//       setGraph(newGraph);
//     } else {
//       console.log('No valid hotspot data');
//     }
//   }, [hotspot]);

//   const handleRouteSearch = (e) => {
//     e.preventDefault();
//     setError('');
//     setShortestPath([]);
// setPathCoordinates([]);

//     console.log('Form submitted');
//     console.log('Current state:', { source, destination, graph });

//     if (!graph) {
//       console.error('Graph not initialized');
//       setError('Graph not initialized. Please check hotspot data.');
//       return;
//     }

//     if (!source || !destination) {
//       console.error('Source or destination is empty');
//       setError('Please enter both source and destination.');
//       return;
//     }

//     if (!graph.hasNode(source) || !graph.hasNode(destination)) {
//       console.error('Invalid source or destination');
//       setError('Invalid source or destination. Please check the hotspot names.');
//       return;
//     }

//     console.log('Graph nodes:', graph.nodes());
//     console.log('Graph edges:', graph.edges());

//     const path = findShortestPath(graph, source, destination);

//     if (path.length > 0) {
//       const coordinates = path.map(node => {
//         const hotspotNode = graph.getNodeAttributes(node);
//         return [hotspotNode.latitude, hotspotNode.longitude];
//       });
//       console.log('Path coordinates:', coordinates);
//       setPathCoordinates(coordinates);
//       setShortestPath(path);
//     } else {
//       console.log('No path found');
//       setError('No path found between the given source and destination.');
//       setShortestPath([]);
//       setPathCoordinates([]);
//     }
//   };

//   return (
//     <div className='container route-container'>
//       <div className="row">
//         <div className="col-md-4">
//           <form onSubmit={handleRouteSearch}>
//             <div className="mb-3">
//               <input
//                 type="text"
//                 className="form-control"
//                 id="source"
//                 placeholder='Enter source hotspot name'
//                 value={source}
//                 onChange={(e) => setSource(e.target.value)}
//               />
//             </div>
//             <div className="mb-3">
//               <input
//                 type="text"
//                 className="form-control"
//                 id="destination"
//                 placeholder='Enter destination hotspot name'
//                 value={destination}
//                 onChange={(e) => setDestination(e.target.value)}
//               />
//             </div>
//             <button type="submit" className="btn btn-primary submit-btn">Search</button>
//           </form>
//           {error && <div className="alert alert-danger mt-3">{error}</div>}
//           {shortestPath.length > 0 && (
//             <div className='mt-3'>
//               <h3>Shortest Path</h3>
//               <ul className="list-group">
//                 {shortestPath.map((node, index) => (
//                   <li key={index} className="list-group-item">{node} </li>
//                 ))}
//               </ul>
//             </div>
//           )}
//         </div>
//         <div className="col-md-8">
//           <div className="routes-map" style={{ height: '400px', width: '100%' }}>
//             <MapContainer center={[28.633043462708848, 77.44792897992077]} zoom={10} style={{ height: '100%', width: '100%' }}>
//               <TileLayer
//                 url="https://tile.openstreetmap.de/{z}/{x}/{y}.png"
//                 attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
//               />
//               {pathCoordinates.length > 0 && (
//                 <Polyline positions={pathCoordinates} color="blue" />
//               )}
//             </MapContainer>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }