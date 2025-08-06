import React from "react";

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
    <div className="bg-gradient-to-r from-emerald-500/90 to-blue-500/90 backdrop-blur-sm rounded-xl p-4 mb-6 border border-emerald-400/30 shadow-lg">
      <div className="flex items-center justify-between">
        {/* Left: Status and Route */}
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="w-3 h-3 bg-green-300 rounded-full animate-pulse"></div>
              <div className="absolute inset-0 w-3 h-3 bg-green-300 rounded-full animate-ping opacity-75"></div>
            </div>
            <span className="text-white font-semibold text-sm">
              Active Search
            </span>
          </div>

          <div className="hidden sm:block w-px h-5 bg-white/30"></div>

          <div className="min-w-0 flex-1">
            <div className="text-white text-sm font-medium truncate">
              <span className="opacity-90">{searchState.source}</span>
              <span className="mx-2 opacity-60">→</span>
              <span className="opacity-90">{searchState.destination}</span>
            </div>
            {searchState.matchCount > 0 && (
              <div className="text-green-200 text-xs mt-1">
                ✨ {searchState.matchCount} match
                {searchState.matchCount !== 1 ? "es" : ""} found
              </div>
            )}
          </div>
        </div>

        {/* Right: Timer and Cancel */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="flex items-center gap-2 bg-black/20 backdrop-blur-sm rounded-lg px-3 py-2">
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
            <span className="text-white font-mono text-sm font-semibold">
              {formatTime(searchState.timeRemaining)}
            </span>
          </div>

          <button
            onClick={onCancel}
            className="bg-red-500/80 hover:bg-red-500 text-white px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-1.5 hover:scale-105"
            title="Cancel search"
          >
            <svg
              className="w-3.5 h-3.5"
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
            <span className="hidden sm:inline">Cancel</span>
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-3 pt-3 border-t border-white/20">
        <div className="flex items-center justify-between text-xs text-white/80 mb-2">
          <span>Search Progress</span>
          <span>{Math.round(getProgressPercentage())}%</span>
        </div>
        <div className="w-full bg-black/20 rounded-full h-1.5 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-green-300 to-blue-300 rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${getProgressPercentage()}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default SearchStatus;
