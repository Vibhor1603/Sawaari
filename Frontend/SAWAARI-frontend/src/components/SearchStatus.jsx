/* eslint-disable react/prop-types */

const SearchStatus = ({ searchState, onCancel }) => {
  if (!searchState.isActive) return null;

  const formatTime = (milliseconds) => {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const getProgressPercentage = () => {
    const totalTime = 5 * 60 * 1000; // 5 minutes in milliseconds
    const elapsed = totalTime - searchState.timeRemaining;
    return Math.min(100, (elapsed / totalTime) * 100);
  };

  return (
    <div className="bg-gradient-to-r from-emerald-500/20 to-blue-500/20 backdrop-blur-sm rounded-2xl p-5 mb-6 border border-emerald-400/20 shadow-xl">
      {/* Header with Status */}
      <div className="flex items-center justify-center gap-3 mb-4">
        <div className="relative">
          <div className="w-4 h-4 bg-emerald-400 rounded-full animate-pulse"></div>
          <div className="absolute inset-0 w-4 h-4 bg-emerald-400 rounded-full animate-ping opacity-60"></div>
        </div>
        <span className="text-white font-bold text-lg">Search Active</span>
      </div>

      {/* Route Display */}
      <div className="text-center mb-4">
        <div className="inline-flex items-center gap-3 bg-black/30 rounded-xl px-4 py-2">
          <span className="text-white font-medium text-sm">
            {searchState.source}
          </span>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-sawaari-yellow rounded-full"></div>
            <div className="w-2 h-2 bg-sawaari-yellow rounded-full opacity-60"></div>
            <div className="w-2 h-2 bg-sawaari-yellow rounded-full opacity-30"></div>
          </div>
          <span className="text-white font-medium text-sm">
            {searchState.destination}
          </span>
        </div>
      </div>

      {/* Timer and Cancel Row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 bg-black/30 backdrop-blur-sm rounded-xl px-4 py-2">
          <svg
            className="w-4 h-4 text-white/80"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="text-white font-mono text-sm font-bold">
            {formatTime(searchState.timeRemaining)}
          </span>
        </div>

        <button
          onClick={onCancel}
          className="bg-red-500/80 hover:bg-red-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 flex items-center gap-2 hover:scale-105 shadow-lg"
          title="Cancel search"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
          <span>Cancel</span>
        </button>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-white/70">
          <span>Search Progress</span>
          <span>{Math.round(getProgressPercentage())}%</span>
        </div>
        <div className="w-full bg-black/30 rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-400 to-blue-400 rounded-full transition-all duration-1000 ease-out shadow-sm"
            style={{ width: `${getProgressPercentage()}%` }}
          />
        </div>
      </div>

      {/* Match Count */}
      {searchState.matchCount > 0 && (
        <div className="text-center mt-4 pt-4 border-t border-white/10">
          <div className="inline-flex items-center gap-2 bg-green-500/20 border border-green-400/30 rounded-xl px-4 py-2">
            <span className="text-green-300 text-lg">✨</span>
            <span className="text-green-200 font-medium text-sm">
              {searchState.matchCount} match
              {searchState.matchCount !== 1 ? "es" : ""} found
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchStatus;
