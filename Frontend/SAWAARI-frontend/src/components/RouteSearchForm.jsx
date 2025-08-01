import {
  useState,
  useEffect,
  useCallback,
  memo,
  useMemo,
  useContext,
} from "react";
import PropTypes from "prop-types";
import { AuthContext } from "../AuthContext";
import routeService from "../services/routeService";
import fareService from "../services/fareService";
import toast from "../utils/toast";

const RouteSearchForm = memo(
  ({
    onSearch,
    loading = false,
    initialSource = "",
    initialDestination = "",
  }) => {
    const { hotspot } = useContext(AuthContext);
    const [source, setSource] = useState(initialSource);
    const [destination, setDestination] = useState(initialDestination);
    const [fareEstimate, setFareEstimate] = useState(null);
    const [isCalculatingFare, setIsCalculatingFare] = useState(false);
    const [errors, setErrors] = useState({});

    // Memoize available hotspot locations
    const availableLocations = useMemo(() => {
      if (!hotspot || !Array.isArray(hotspot)) return [];
      return hotspot
        .map((spot) => ({ name: spot.name }))
        .sort((a, b) => a.name.localeCompare(b.name));
    }, [hotspot]);

    // Memoize available destination options (exclude selected source)
    const availableDestinations = useMemo(() => {
      return availableLocations.filter((location) => location.name !== source);
    }, [availableLocations, source]);

    // Memoize available source options (exclude selected destination)
    const availableSources = useMemo(() => {
      return availableLocations.filter(
        (location) => location.name !== destination
      );
    }, [availableLocations, destination]);

    const calculateFareEstimate = useCallback(async () => {
      if (!source || !destination || source === destination) return;

      setIsCalculatingFare(true);
      try {
        // First calculate route to get distance
        const routeResponse = await routeService.calculateRoute(
          source,
          destination
        );
        if (routeResponse.success && routeResponse.data) {
          const distance = routeResponse.data.distance || 0;

          // Then calculate fare estimates
          const fareEstimates = fareService.getFareEstimates(distance);
          setFareEstimate({
            distance,
            current: fareEstimates.current,
            estimates: fareEstimates.estimates,
          });
        }
      } catch (error) {
        console.error("Error calculating fare:", error);
        // Don't show error toast for fare calculation as it's not critical
      } finally {
        setIsCalculatingFare(false);
      }
    }, [source, destination]);

    // Calculate fare estimate when both source and destination are selected
    useEffect(() => {
      if (source && destination && source !== destination) {
        calculateFareEstimate();
      } else {
        setFareEstimate(null);
      }
    }, [source, destination, calculateFareEstimate]);

    const validateForm = () => {
      const newErrors = {};

      if (!source.trim()) {
        newErrors.source = "Source location is required";
      }

      if (!destination.trim()) {
        newErrors.destination = "Destination location is required";
      }

      if (source && destination && source === destination) {
        newErrors.destination = "Source and destination cannot be the same";
      }

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
      e.preventDefault();

      if (!validateForm()) {
        toast.error("Please fix the form errors before searching");
        return;
      }

      if (onSearch) {
        onSearch({
          source: {
            name: source.trim(),
            coordinates: null, // Will be populated by backend if needed
          },
          destination: {
            name: destination.trim(),
            coordinates: null, // Will be populated by backend if needed
          },
          fareEstimate,
        });
      }
    };

    const handleSourceChange = (e) => {
      const value = e.target.value;
      setSource(value);
      setErrors((prev) => ({ ...prev, source: "" }));

      // Clear destination if it's the same as source
      if (value === destination) {
        setDestination("");
        setErrors((prev) => ({ ...prev, destination: "" }));
      }
    };

    const handleDestinationChange = (e) => {
      const value = e.target.value;
      setDestination(value);
      setErrors((prev) => ({ ...prev, destination: "" }));

      // Clear source if it's the same as destination
      if (value === source) {
        setSource("");
        setErrors((prev) => ({ ...prev, source: "" }));
      }
    };

    const clearForm = () => {
      setSource("");
      setDestination("");
      setFareEstimate(null);
      setErrors({});
    };

    return (
      <div className="route-search-form">
        <form onSubmit={handleSubmit} className="search-form">
          <div className="form-header">
            <h3 className="form-title">Find Your Ride Buddy</h3>
            <p className="form-subtitle">
              Enter your route to find companions traveling the same way
            </p>
          </div>

          <div className="form-row">
            {/* Source Dropdown */}
            <div className="form-group">
              <label htmlFor="source" className="form-label">
                <i className="fas fa-map-marker-alt"></i>
                From
              </label>
              <div className="input-container">
                <select
                  id="source"
                  className={`form-input ${errors.source ? "error" : ""}`}
                  value={source}
                  onChange={handleSourceChange}
                  disabled={loading}
                >
                  <option value="">-- Select Source Location --</option>
                  {availableSources.map((location, index) => (
                    <option key={index} value={location.name}>
                      {location.name}
                    </option>
                  ))}
                </select>
              </div>
              {errors.source && (
                <span className="error-message">{errors.source}</span>
              )}
            </div>

            {/* Destination Dropdown */}
            <div className="form-group">
              <label htmlFor="destination" className="form-label">
                <i className="fas fa-flag-checkered"></i>
                To
              </label>
              <div className="input-container">
                <select
                  id="destination"
                  className={`form-input ${errors.destination ? "error" : ""}`}
                  value={destination}
                  onChange={handleDestinationChange}
                  disabled={loading}
                >
                  <option value="">-- Select Destination Location --</option>
                  {availableDestinations.map((location, index) => (
                    <option key={index} value={location.name}>
                      {location.name}
                    </option>
                  ))}
                </select>
              </div>
              {errors.destination && (
                <span className="error-message">{errors.destination}</span>
              )}
            </div>
          </div>

          {/* Fare Estimate Display */}
          {fareEstimate && (
            <div className="fare-estimate">
              <div className="fare-header">
                <i className="fas fa-calculator"></i>
                <span>Estimated Fare</span>
                {isCalculatingFare && <div className="fare-loading"></div>}
              </div>
              <div className="fare-details">
                <div className="fare-item">
                  <span className="fare-label">Distance:</span>
                  <span className="fare-value">
                    {fareEstimate.distance.toFixed(1)} km
                  </span>
                </div>
                <div className="fare-item">
                  <span className="fare-label">Current Rate:</span>
                  <span className="fare-value">
                    ₹{fareEstimate.current.totalFare}
                  </span>
                </div>
                <div className="fare-item">
                  <span className="fare-label">Shared Cost:</span>
                  <span className="fare-value shared">
                    ₹{Math.round(fareEstimate.current.totalFare / 2)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={clearForm}
              disabled={loading || (!source && !destination)}
            >
              <i className="fas fa-times"></i>
              Clear
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !source || !destination}
            >
              {loading ? (
                <>
                  <div className="btn-spinner"></div>
                  Searching...
                </>
              ) : (
                <>
                  <i className="fas fa-search"></i>
                  Find Ride Buddies
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    );
  }
);

RouteSearchForm.displayName = "RouteSearchForm";

RouteSearchForm.propTypes = {
  onSearch: PropTypes.func.isRequired,
  loading: PropTypes.bool,
  initialSource: PropTypes.string,
  initialDestination: PropTypes.string,
};

export default RouteSearchForm;
