import { useState, useEffect } from 'react';

export function useHotspotData() {
  const [hotspotData, setHotspotData] = useState(() => {
    // Get initial state from local storage if available
    const savedData = localStorage.getItem('hotspotData');
    return savedData ? JSON.parse(savedData) : [];
  });

  useEffect(() => {
    // Fetch data from the database only if not already fetched
    if (hotspotData.length === 0) {
      fetch('http://localhost:5000/hotspots') // Replace with your API endpoint
        .then(response => response.json())
        .then(data => {
          setHotspotData(data);
          localStorage.setItem('hotspotData', JSON.stringify(data));
        })
        .catch(error => console.error('Error fetching hotspot data:', error));
    }
  }, [hotspotData]);

  return [hotspotData, setHotspotData];
}
