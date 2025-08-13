import { useState, useEffect } from "react";

export function useHotspotData() {
  const [hotspotData, setHotspotData] = useState([]);

  useEffect(() => {
    const fetchHotspots = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/hotspots`
        );
        const result = await response.json();

        // Extract the data array from the response
        const data = result.success ? result.data : [];
        setHotspotData(data);
        localStorage.setItem("hotspotData", JSON.stringify(data));
      } catch (error) {
        console.error("Error fetching hotspot data:", error);
        setHotspotData([]); // Set empty array on error
      }
    };

    // Always fetch fresh data (remove localStorage caching for now)
    fetchHotspots();
  }, []); // Empty dependency array - fetch once on mount

  return [hotspotData, setHotspotData];
}
