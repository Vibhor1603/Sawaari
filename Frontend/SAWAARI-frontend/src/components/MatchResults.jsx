import { useState, useMemo } from "react";
import PropTypes from "prop-types";
import rideBuddyService from "../services/rideBuddyService";
import toast from "../utils/toast";

const MatchResults = ({
  matches = [],
  onSendRequest,
  sentRequests = [],
  loading = false,
  onRefresh,
}) => {
  const [sendingRequests, setSendingRequests] = useState(new Set());
  const [sortBy, setSortBy] = useState("overlap"); // overlap, fare, distance
  const [filterBy, setFilterBy] = useState("all"); // all, high-overlap, low-fare
  const [searchQuery, setSearchQuery] = useState("");

  // Filter and sort matches
  const filteredAndSortedMatches = useMemo(() => {
    let filtered = [...matches];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (match) =>
          match.userName?.toLowerCase().includes(query) ||
          match.userEmail?.toLowerCase().includes(query) ||
          match.source?.toLowerCase().includes(query) ||
          match.destination?.toLowerCase().includes(query)
      );
    }

    // Apply category filter
    switch (filterBy) {
      case "high-overlap":
        filtered = filtered.filter(
          (match) => (match.overlapPercentage || 0) >= 70
        );
        break;
      case "low-fare":
        filtered = filtered.filter(
          (match) => (match.estimatedSharedFare || 0) <= 100
        );
        break;
      default:
        break;
    }

    // Sort matches
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "overlap":
          return (b.overlapPercentage || 0) - (a.overlapPercentage || 0);
        case "fare":
          return (a.estimatedSharedFare || 0) - (b.estimatedSharedFare || 0);
        case "distance":
          return (a.sharedDistance || 0) - (b.sharedDistance || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [matches, sortBy, filterBy, searchQuery]);

  const handleSendRequest = async (match) => {
    if (sendingRequests.has(match._id || match.userId)) {
      return; // Already sending
    }

    try {
      setSendingRequests(
        (prev) => new Set([...prev, match._id || match.userId])
      );

      const requestData = {
        receiverId: match.userId,
        routeDetails: {
          senderRoute: {
            source: match.source,
            destination: match.destination,
          },
          receiverRoute: {
            source: match.source,
            destination: match.destination,
          },
          overlapPercentage: match.overlapPercentage || 0,
          sharedDistance: match.sharedDistance || 0,
          estimatedSharedFare: match.estimatedSharedFare || 0,
        },
        message: `Hi! I&apos;d like to share a ride from ${match.source} to ${match.destination}.`,
      };

      const result = await rideBuddyService.sendConnectionRequest(requestData);

      if (result.success) {
        toast.success(`Request sent to ${match.userName || match.userEmail}!`);
        if (onSendRequest) {
          onSendRequest(match, result.data);
        }
      } else {
        toast.error(result.error || "Failed to send request");
      }
    } catch (error) {
      console.error("Error sending request:", error);
      toast.error("Failed to send request. Please try again.");
    } finally {
      setSendingRequests((prev) => {
        const newSet = new Set(prev);
        newSet.delete(match._id || match.userId);
        return newSet;
      });
    }
  };

  const isRequestSent = (match) => {
    return sentRequests.some(
      (req) =>
        req.receiverId === match.userId ||
        req.receiverId === match._id ||
        req.receiverEmail === match.userEmail ||
        req.status === "pending"
    );
  };

  const isRequestPending = (match) => {
    return sendingRequests.has(match._id || match.userId);
  };

  const getOverlapColor = (percentage) => {
    if (percentage >= 80) return "high";
    if (percentage >= 60) return "medium";
    return "low";
  };

  const formatFare = (fare) => {
    return fare ? `₹${Math.round(fare)}` : "N/A";
  };

  const formatDistance = (distance) => {
    return distance ? `${distance.toFixed(1)} km` : "N/A";
  };

  if (loading) {
    return (
      <div className="match-results loading">
        <div className="loading-header">
          <div className="loading-spinner"></div>
          <span>Finding ride buddies...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="match-results">
      {/* Header */}
      <div className="results-header">
        <div className="header-info">
          <h3 className="results-title">
            <i className="fas fa-users"></i>
            Potential Ride Buddies
          </h3>
          <span className="results-count">
            {filteredAndSortedMatches.length} of {matches.length} matches
          </span>
        </div>

        {onRefresh && (
          <button
            className="btn btn-refresh"
            onClick={onRefresh}
            disabled={loading}
          >
            <i className="fas fa-sync-alt"></i>
            Refresh
          </button>
        )}
      </div>

      {matches.length === 0 ? (
        <div className="no-matches">
          <div className="no-matches-icon">
            <i className="fas fa-search"></i>
          </div>
          <h4>No Matches Found</h4>
          <p>
            We couldn&apos;t find any ride buddies for your route right now. Try
            adjusting your search or check back later.
          </p>
          {onRefresh && (
            <button className="btn btn-primary" onClick={onRefresh}>
              <i className="fas fa-sync-alt"></i>
              Search Again
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Filters and Search */}
          <div className="results-controls">
            <div className="search-box">
              <i className="fas fa-search"></i>
              <input
                type="text"
                placeholder="Search by name, email, or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>

            <div className="filter-controls">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="sort-select"
              >
                <option value="overlap">Sort by Route Overlap</option>
                <option value="fare">Sort by Shared Fare</option>
                <option value="distance">Sort by Distance</option>
              </select>

              <select
                value={filterBy}
                onChange={(e) => setFilterBy(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Matches</option>
                <option value="high-overlap">High Overlap (70%+)</option>
                <option value="low-fare">Low Fare (₹100-)</option>
              </select>
            </div>
          </div>

          {/* Results List */}
          <div className="matches-list">
            {filteredAndSortedMatches.map((match, index) => (
              <div
                key={match._id || match.userId || index}
                className="match-card"
              >
                <div className="match-header">
                  <div className="user-info">
                    <div className="user-avatar">
                      <i className="fas fa-user"></i>
                    </div>
                    <div className="user-details">
                      <h4 className="user-name">
                        {match.userName ||
                          match.userEmail?.split("@")[0] ||
                          "Anonymous User"}
                      </h4>
                      <span className="user-email">{match.userEmail}</span>
                    </div>
                  </div>

                  <div className="match-stats">
                    <div
                      className={`overlap-badge ${getOverlapColor(
                        match.overlapPercentage || 0
                      )}`}
                    >
                      <i className="fas fa-route"></i>
                      {Math.round(match.overlapPercentage || 0)}% overlap
                    </div>
                  </div>
                </div>

                <div className="route-info">
                  <div className="route-path">
                    <div className="route-point source">
                      <i className="fas fa-map-marker-alt"></i>
                      <span>{match.source}</span>
                    </div>
                    <div className="route-arrow">
                      <i className="fas fa-arrow-right"></i>
                    </div>
                    <div className="route-point destination">
                      <i className="fas fa-flag-checkered"></i>
                      <span>{match.destination}</span>
                    </div>
                  </div>
                </div>

                <div className="match-details">
                  <div className="detail-item">
                    <i className="fas fa-coins"></i>
                    <span className="detail-label">Shared Fare:</span>
                    <span className="detail-value fare">
                      {formatFare(match.estimatedSharedFare)}
                    </span>
                  </div>

                  <div className="detail-item">
                    <i className="fas fa-road"></i>
                    <span className="detail-label">Shared Distance:</span>
                    <span className="detail-value">
                      {formatDistance(match.sharedDistance)}
                    </span>
                  </div>

                  {match.createdAt && (
                    <div className="detail-item">
                      <i className="fas fa-clock"></i>
                      <span className="detail-label">Posted:</span>
                      <span className="detail-value">
                        {new Date(match.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>

                <div className="match-actions">
                  {isRequestSent(match) ? (
                    <button className="btn btn-sent" disabled>
                      <i className="fas fa-check"></i>
                      Request Sent
                    </button>
                  ) : (
                    <button
                      className="btn btn-primary"
                      onClick={() => handleSendRequest(match)}
                      disabled={isRequestPending(match)}
                    >
                      {isRequestPending(match) ? (
                        <>
                          <div className="btn-spinner"></div>
                          Sending...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-paper-plane"></i>
                          Send Request
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {filteredAndSortedMatches.length === 0 && matches.length > 0 && (
            <div className="no-filtered-matches">
              <i className="fas fa-filter"></i>
              <p>
                No matches found with current filters. Try adjusting your search
                criteria.
              </p>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setSearchQuery("");
                  setFilterBy("all");
                }}
              >
                Clear Filters
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

MatchResults.propTypes = {
  matches: PropTypes.arrayOf(
    PropTypes.shape({
      _id: PropTypes.string,
      userId: PropTypes.string,
      userName: PropTypes.string,
      userEmail: PropTypes.string.isRequired,
      source: PropTypes.string.isRequired,
      destination: PropTypes.string.isRequired,
      overlapPercentage: PropTypes.number,
      estimatedSharedFare: PropTypes.number,
      sharedDistance: PropTypes.number,
      createdAt: PropTypes.string,
    })
  ),
  onSendRequest: PropTypes.func,
  sentRequests: PropTypes.arrayOf(
    PropTypes.shape({
      receiverId: PropTypes.string,
      receiverEmail: PropTypes.string,
    })
  ),
  loading: PropTypes.bool,
  onRefresh: PropTypes.func,
};

export default MatchResults;
