/* eslint-disable react/prop-types */
import DatabaseLocationSelect from "../../components/common/DatabaseLocationSelect";

export default function RouteForm({
  source,
  setSource,
  destination,
  setDestination,
  handleRouteSearch,
}) {
  return (
    <div className="max-w-md mx-auto">
      <form onSubmit={handleRouteSearch} className="space-y-3 sm:space-y-4">
        {/* Source Location */}
        <div className="space-y-1 sm:space-y-2">
          <label className="flex items-center gap-2 text-xs sm:text-sm font-medium text-white">
            <span>📍</span>
            Source Location
          </label>
          <DatabaseLocationSelect
            value={source}
            onChange={setSource}
            placeholder="Search source"
            className="w-full border-0"
          />
        </div>

        {/* Destination Location */}
        <div className="space-y-1 sm:space-y-2">
          <label className="flex items-center gap-2 text-xs sm:text-sm font-medium text-white">
            <span>🎯</span>
            Destination Location
          </label>
          <DatabaseLocationSelect
            value={destination}
            onChange={setDestination}
            placeholder="Search destination"
            className="w-full border-0"
          />
        </div>

        {/* Submit Button */}
        <div className="flex justify-center">
          <button
            type="submit"
            className="flex items-center justify-center gap-2 px-6 py-2 bg-gradient-to-r from-sawaari-yellow to-sawaari-yellow/80 text-black font-medium text-sm rounded-lg shadow-sawaari-subtle hover:shadow-sawaari-glow hover:-translate-y-0.5 transition-all duration-300 transform hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none group border-0"
            disabled={!source || !destination}
          >
            <span>Find Best Route</span>
          </button>
        </div>

        {/* Simple Tips - Hidden on mobile to save space */}
        <div className="hidden sm:block mt-4 p-3">
          <h4 className="text-xs font-semibold text-sawaari-yellow mb-2">
            Quick Tips
          </h4>
          <ul className="text-xs text-gray-300 space-y-1">
            <li>• Choose locations from available rickshaw points</li>
            <li>• Routes optimized for shortest time</li>
            <li>• Fare estimates include traffic</li>
            <li>• Real-time updates for accuracy</li>
          </ul>
        </div>
      </form>
    </div>
  );
}
