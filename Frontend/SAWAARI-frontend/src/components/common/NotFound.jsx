import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

// Add the backgroundShift animation styles
const backgroundShiftStyles = `
  @keyframes backgroundShift {
    0%, 100% {
      transform: translateX(0) translateY(0);
    }
    25% {
      transform: translateX(-15px) translateY(-15px);
    }
    50% {
      transform: translateX(15px) translateY(15px);
    }
    75% {
      transform: translateX(-8px) translateY(8px);
    }
  }
`;

const NotFound = () => {
  const navigate = useNavigate();
  const [rickshawPosition, setRickshawPosition] = useState(0);
  const [isAnimating, setIsAnimating] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setRickshawPosition((prev) => (prev + 1) % 100);
    }, 50);

    return () => clearInterval(interval);
  }, []);

  const handleGoHome = () => {
    setIsAnimating(false);
    setTimeout(() => navigate("/"), 300);
  };

  return (
    <>
      <style>{backgroundShiftStyles}</style>
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center px-4 overflow-hidden relative">
        <div className="text-center max-w-2xl mx-auto">
          {/* Animated 404 */}
          <div className="relative mb-8">
            <h1
              className="text-9xl font-bold text-yellow-500 opacity-20 select-none"
              style={{ color: "#f4b942" }}
            >
              404
            </h1>

            {/* Animated Rickshaw */}
            <div
              className={`absolute top-1/2 left-0 transform -translate-y-1/2 transition-all duration-300 ${
                isAnimating ? "animate-bounce" : ""
              }`}
              style={{
                left: `${rickshawPosition}%`,
                transform: `translateX(-50%) translateY(-50%) ${
                  rickshawPosition > 50 ? "scaleX(-1)" : "scaleX(1)"
                }`,
              }}
            >
              <div className="text-6xl">🛺</div>
            </div>
          </div>

          {/* Main Content */}
          <div className="space-y-6">
            <h2
              className="text-4xl font-bold text-white mb-4"
              style={{ textShadow: "0 1px 2px rgba(0, 0, 0, 0.3)" }}
            >
              Oops! Wrong Route! 🗺️
            </h2>

            <p
              className="text-xl text-gray-300 mb-6"
              style={{ textShadow: "0 1px 1px rgba(0, 0, 0, 0.2)" }}
            >
              Looks like our rickshaw took a wrong turn! The page you&apos;re
              looking for doesn&apos;t exist.
            </p>

            {/* Fun Messages */}
            <div
              className="glass-card border-l-4 mb-8"
              style={{
                borderLeftColor: "#f4b942",
                backgroundColor: "rgba(255, 255, 255, 0.05)",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
              }}
            >
              <div className="flex items-center space-x-3 mb-3">
                <span className="text-2xl">🚨</span>
                <h3
                  className="text-lg font-semibold text-white"
                  style={{ textShadow: "0 1px 2px rgba(0, 0, 0, 0.3)" }}
                >
                  Route Not Found!
                </h3>
              </div>
              <p
                className="text-gray-300"
                style={{ textShadow: "0 1px 1px rgba(0, 0, 0, 0.2)" }}
              >
                Don&apos;t worry, even the best rickshaw drivers sometimes take
                scenic routes. Let&apos;s get you back on track!
              </p>
            </div>

            {/* Action Button */}
            <div className="flex justify-center items-center mt-8">
              <button
                onClick={handleGoHome}
                className="btn-primary px-8 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg"
                style={{
                  background:
                    "linear-gradient(135deg, #f4b942 0%, #e6a635 100%)",
                  color: "#000000",
                  boxShadow: "0 4px 15px rgba(244, 185, 66, 0.2)",
                }}
              >
                🏠 Take Me Home
              </button>
            </div>
          </div>

          {/* Floating Elements */}
          <div className="absolute top-10 left-10 text-4xl animate-pulse opacity-50">
            🚦
          </div>
          <div
            className="absolute top-20 right-20 text-3xl animate-bounce opacity-50"
            style={{ animationDelay: "0.5s" }}
          >
            🛣️
          </div>
          <div
            className="absolute bottom-20 left-20 text-3xl animate-pulse opacity-50"
            style={{ animationDelay: "1s" }}
          >
            🗺️
          </div>
          <div
            className="absolute bottom-10 right-10 text-4xl animate-bounce opacity-50"
            style={{ animationDelay: "1.5s" }}
          >
            🏁
          </div>
        </div>

        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5 pointer-events-none">
          <div
            className="absolute top-1/4 left-1/4 w-32 h-32 border-2 rounded-full animate-spin"
            style={{
              animationDuration: "20s",
              borderColor: "#f4b942",
            }}
          ></div>
          <div
            className="absolute top-3/4 right-1/4 w-24 h-24 border-2 rounded-full animate-spin"
            style={{
              animationDuration: "15s",
              animationDirection: "reverse",
              borderColor: "#2d5016",
            }}
          ></div>
          <div
            className="absolute top-1/2 left-1/2 w-40 h-40 border-2 rounded-full animate-spin"
            style={{
              animationDuration: "25s",
              borderColor: "rgba(244, 185, 66, 0.3)",
            }}
          ></div>
        </div>

        {/* Website Background Pattern */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
          radial-gradient(circle at 20% 80%, rgba(244, 185, 66, 0.08) 0%, transparent 50%),
          radial-gradient(circle at 80% 20%, rgba(45, 80, 22, 0.08) 0%, transparent 50%),
          radial-gradient(circle at 40% 40%, rgba(244, 185, 66, 0.03) 0%, transparent 50%),
          radial-gradient(circle at 60% 60%, rgba(45, 80, 22, 0.05) 0%, transparent 50%)
        `,
            animation: "backgroundShift 25s ease-in-out infinite",
          }}
        ></div>
      </div>
    </>
  );
};

export default NotFound;
