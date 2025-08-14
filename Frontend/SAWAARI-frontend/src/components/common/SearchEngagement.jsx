/* eslint-disable react/prop-types */
import { useState, useEffect } from "react";

const SearchEngagement = ({ searchState }) => {
  const [currentMessage, setCurrentMessage] = useState(0);

  // Fun auto-rickshaw jokes, puns, and engaging messages for Indian audience
  const messages = [
    {
      type: "joke",
      icon: "😄",
      text: "Why did the auto-rickshaw break up with the taxi? Because it wanted more 'space' for passengers!",
    },
    {
      type: "pun",
      icon: "🛺",
      text: "Auto-rickshaw drivers are the best comedians - they always know how to 'meter' out the jokes!",
    },
    {
      type: "motivation",
      icon: "🌟",
      text: "Stay here! Your ride buddy hero might be just around the corner!",
    },
    {
      type: "fact",
      icon: "💡",
      text: "Fun Fact: Auto-rickshaws can make U-turns in spaces where cars can't even park!",
    },
    {
      type: "joke",
      icon: "😂",
      text: "What's an auto-rickshaw's favorite music? Anything with a good 'beat' - just like the engine!",
    },
    {
      type: "motivation",
      icon: "🚀",
      text: "Good things come to those who wait... and search for ride buddies!",
    },
    {
      type: "pun",
      icon: "🎯",
      text: "Finding a ride buddy is like finding the perfect auto fare - rare but totally worth it!",
    },
    {
      type: "fact",
      icon: "🌍",
      text: "Did you know? Mumbai has over 200,000 auto-rickshaws - that's a lot of potential ride buddies!",
    },
    {
      type: "joke",
      icon: "🤣",
      text: "Why don't auto-rickshaws ever get lost? Because they always know the 'shortest route' to your heart!",
    },
    {
      type: "motivation",
      icon: "⭐",
      text: "Your perfect travel companion is searching too - patience is the key!",
    },
    {
      type: "pun",
      icon: "🛣️",
      text: "Life is like an auto ride - it's all about enjoying the journey, not just the destination!",
    },
    {
      type: "fact",
      icon: "🔥",
      text: "Auto-rickshaws are eco-friendly heroes - they produce 40% less pollution than cars!",
    },
    {
      type: "joke",
      icon: "😆",
      text: "What do you call an auto-rickshaw that tells jokes? A 'comic-shaw'!",
    },
    {
      type: "motivation",
      icon: "💫",
      text: "Don't leave yet! The best connections happen when you least expect them!",
    },
    {
      type: "pun",
      icon: "🎪",
      text: "Sharing an auto is like sharing popcorn - it's always better with a buddy!",
    },
  ];

  // Change message every 4 seconds
  useEffect(() => {
    if (!searchState.isActive) return;

    const interval = setInterval(() => {
      setCurrentMessage((prev) => (prev + 1) % messages.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [searchState.isActive, messages.length]);

  if (!searchState.isActive) return null;

  const message = messages[currentMessage];
  const formatTime = (milliseconds) => {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className="bg-gradient-to-r from-emerald-500/20 to-blue-500/20 backdrop-blur-sm rounded-lg sm:rounded-2xl p-4 pb-2 sm:p-6 mb-1 sm:mb-3 -400/20 shadow-xl">
      {/* Header with Status */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="relative">
            <div className="w-3 h-3 sm:w-4 sm:h-4 bg-emerald-400 rounded-full animate-pulse"></div>
            <div className="absolute inset-0 w-3 h-3 sm:w-4 sm:h-4 bg-emerald-400 rounded-full animate-ping opacity-60"></div>
          </div>
          <span className="text-white font-bold text-sm sm:text-lg">
            Searching for Buddies
          </span>
        </div>

        <div className="flex items-center gap-2 bg-black/30 backdrop-blur-sm rounded-lg px-3 py-1.5">
          <svg
            className="w-3 h-3 sm:w-4 sm:h-4 text-white/80"
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
          <span className="text-white font-mono text-xs sm:text-sm font-bold">
            {formatTime(searchState.timeRemaining)}
          </span>
        </div>
      </div>

      {/* Route Display */}
      <div className="text-center mb-4">
        <div className="inline-flex items-center gap-2 sm:gap-3 bg-black/30 rounded-lg px-3 py-1.5 sm:px-4 sm:py-2">
          <span className="text-white font-medium text-xs sm:text-sm truncate max-w-[80px] sm:max-w-none">
            {searchState.source}
          </span>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-sawaari-yellow rounded-full"></div>
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-sawaari-yellow rounded-full opacity-60"></div>
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-sawaari-yellow rounded-full opacity-30"></div>
          </div>
          <span className="text-white font-medium text-xs sm:text-sm truncate max-w-[80px] sm:max-w-none">
            {searchState.destination}
          </span>
        </div>
      </div>

      {/* Fun Message */}
      <div className="bg-black/30 rounded-lg p-4 mb-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl flex-shrink-0">{message.icon}</span>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold text-sawaari-yellow uppercase tracking-wide">
                {message.type === "joke"
                  ? "Auto Humor"
                  : message.type === "pun"
                  ? "Rickshaw Pun"
                  : message.type === "fact"
                  ? "Fun Fact"
                  : "Stay Motivated"}
              </span>
              <div className="flex-1 h-px bg-gradient-to-r from-sawaari-yellow/50 to-transparent"></div>
            </div>
            <p className="text-white text-sm leading-relaxed">{message.text}</p>
          </div>
        </div>
      </div>

      {/* Match Count */}
      {searchState.matchCount > 0 && (
        <div className="text-center">
          <div className="inline-flex items-center gap-2 bg-green-500/20 border border-green-400/30 rounded-lg px-4 py-2">
            <span className="text-green-300 text-lg">✨</span>
            <span className="text-green-200 font-medium text-sm">
              {searchState.matchCount} match
              {searchState.matchCount !== 1 ? "es" : ""} found!
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchEngagement;
