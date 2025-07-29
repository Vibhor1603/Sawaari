import React, { useState } from "react";
import RouteSearchForm from "./RouteSearchForm";

const RouteSearchFormDemo = () => {
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (searchData) => {
    console.log("Search initiated with data:", searchData);
    setIsSearching(true);

    // Simulate API call delay
    setTimeout(() => {
      setSearchResults({
        source: searchData.source,
        destination: searchData.destination,
        fareEstimate: searchData.fareEstimate,
        timestamp: new Date().toISOString(),
      });
      setIsSearching(false);
    }, 2000);
  };

  return (
    <div
      style={{
        padding: "2rem",
        minHeight: "100vh",
        background: "var(--gradient-dark)",
      }}
    >
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        <h1
          style={{
            textAlign: "center",
            color: "var(--text-primary)",
            marginBottom: "2rem",
            fontSize: "2rem",
            fontWeight: "700",
          }}
        >
          Ride Buddy Route Search Demo
        </h1>

        <RouteSearchForm onSearch={handleSearch} loading={isSearching} />

        {searchResults && (
          <div
            style={{
              marginTop: "2rem",
              padding: "1.5rem",
              background: "var(--secondary-dark)",
              borderRadius: "12px",
              border: "1px solid var(--border-color)",
            }}
          >
            <h3 style={{ color: "var(--accent-green)", marginBottom: "1rem" }}>
              Search Results
            </h3>
            <div style={{ color: "var(--text-primary)" }}>
              <p>
                <strong>From:</strong> {searchResults.source}
              </p>
              <p>
                <strong>To:</strong> {searchResults.destination}
              </p>
              {searchResults.fareEstimate && (
                <>
                  <p>
                    <strong>Distance:</strong>{" "}
                    {searchResults.fareEstimate.distance} km
                  </p>
                  <p>
                    <strong>Estimated Fare:</strong> ₹
                    {searchResults.fareEstimate.current.totalFare}
                  </p>
                  <p>
                    <strong>Shared Cost:</strong> ₹
                    {Math.round(
                      searchResults.fareEstimate.current.totalFare / 2
                    )}
                  </p>
                </>
              )}
              <p>
                <strong>Search Time:</strong>{" "}
                {new Date(searchResults.timestamp).toLocaleString()}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RouteSearchFormDemo;
