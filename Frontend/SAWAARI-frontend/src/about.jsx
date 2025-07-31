import { useState, useEffect, useRef } from "react";
import { NavLink } from "react-router-dom";

export default function About() {
  const [isVisible, setIsVisible] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);
  const sectionRef = useRef(null);

  const features = [
    {
      id: 0,
      title: "Real-time Hotspots",
      description:
        "Live tracking of auto rickshaw availability with color-coded density maps",
      icon: "🔥",
      link: "/hotspots",
      stats: "500+ Active Spots",
    },
    {
      id: 1,
      title: "Smart Route Planning",
      description:
        "AI-powered route optimization with dynamic fare estimates and traffic updates",
      icon: "🗺️",
      link: "/routes",
      stats: "30% Fare Savings",
    },
    {
      id: 2,
      title: "Ride Sharing Network",
      description:
        "Connect with fellow travelers for cost-effective and eco-friendly journeys",
      icon: "👥",
      link: "/ridebuddy",
      stats: "10K+ Connections",
    },
  ];

  // Intersection Observer for fade-in animation
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Auto-rotate features
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % features.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [features.length]);

  const currentFeature = features[activeFeature];

  return (
    <section
      ref={sectionRef}
      className={`section section-dark transition-all duration-700 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      }`}
    >
      {/* Background Elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[15%] left-[8%] text-2xl opacity-10 animate-subtle-float">
          🛺
        </div>
        <div
          className="absolute top-[25%] right-[12%] text-2xl opacity-10 animate-subtle-float"
          style={{ animationDelay: "1s" }}
        >
          🛺
        </div>
        <div
          className="absolute bottom-[20%] left-[15%] text-2xl opacity-10 animate-subtle-float"
          style={{ animationDelay: "2s" }}
        >
          🛺
        </div>
        <div
          className="absolute bottom-[30%] right-[20%] text-2xl opacity-10 animate-subtle-float"
          style={{ animationDelay: "3s" }}
        >
          🛺
        </div>
      </div>

      <div className="container-sawaari relative z-10">
        {/* Hero Introduction */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-3 bg-sawaari-yellow/20 border border-sawaari-yellow/40 rounded-full px-6 py-3 mb-8">
            <span className="text-2xl">ℹ️</span>
            <span className="text-lg font-semibold text-sawaari-yellow">
              About SAWAARI
            </span>
          </div>
          <h2 className="text-4xl lg:text-6xl font-bold text-white mb-6">
            Revolutionizing{" "}
            <span className="gradient-text-sawaari">Urban Transportation</span>
          </h2>
          <p className="text-lg lg:text-xl text-gray-200 max-w-4xl mx-auto leading-relaxed">
            We are not just another app – we are the bridge between traditional
            auto rickshaw services and modern digital convenience, making every
            journey smarter and more efficient.
          </p>
        </div>

        {/* Interactive Features Showcase */}
        <div className="grid lg:grid-cols-2 gap-16 items-center mb-20">
          <div className="space-y-8">
            {/* Feature Navigation */}
            <div className="space-y-4">
              {features.map((feature, index) => (
                <button
                  key={index}
                  className={`w-full flex items-center gap-4 p-6 rounded-xl border transition-all duration-300 hover:shadow-lg ${
                    index === activeFeature
                      ? "border-sawaari-yellow bg-sawaari-yellow/20"
                      : "border-white/20 bg-black/40 hover:border-sawaari-yellow/50"
                  }`}
                  onClick={() => setActiveFeature(index)}
                >
                  <div className="text-4xl">{feature.icon}</div>
                  <div className="flex-1 text-left">
                    <div className="text-lg font-bold text-text-primary">
                      {feature.title}
                    </div>
                    <div className="text-sm text-text-muted">
                      {feature.stats}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Active Feature Details */}
            <div className="card p-8">
              <div className="flex items-start gap-6 mb-6">
                <div className="w-16 h-16 bg-sawaari-yellow/20 border border-sawaari-yellow/40 rounded-2xl flex items-center justify-center text-2xl">
                  {currentFeature.icon}
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-white mb-3">
                    {currentFeature.title}
                  </h3>
                  <p className="text-gray-200 leading-relaxed">
                    {currentFeature.description}
                  </p>
                </div>
              </div>

              <NavLink
                to={currentFeature.link}
                className="btn-primary inline-flex items-center gap-2"
              >
                <span>Explore {currentFeature.title}</span>
                <span>→</span>
              </NavLink>
            </div>
          </div>

          {/* Feature Visual */}
          <div className="relative">
            <div className="w-80 h-80 bg-gradient-to-br from-sawaari-yellow/30 to-sawaari-green/30 rounded-2xl flex items-center justify-center shadow-2xl border border-white/10 mx-auto">
              <div className="text-8xl opacity-80">{currentFeature.icon}</div>
            </div>

            {/* Floating Elements */}
            <div className="absolute -top-4 -right-4 w-12 h-12 bg-sawaari-yellow rounded-full flex items-center justify-center animate-subtle-float">
              <span className="text-white">⚡</span>
            </div>
            <div className="absolute top-1/2 -left-4 w-12 h-12 bg-sawaari-green rounded-full flex items-center justify-center animate-subtle-float">
              <span className="text-white">⭐</span>
            </div>
            <div className="absolute -bottom-4 right-1/4 w-12 h-12 bg-sawaari-yellow rounded-full flex items-center justify-center animate-subtle-float">
              <span className="text-white">❤️</span>
            </div>
          </div>
        </div>

        {/* Mission Statement */}
        <div className="text-center">
          <div className="max-w-4xl mx-auto">
            <div className="w-20 h-20 mx-auto mb-8 bg-sawaari-yellow/20 border border-sawaari-yellow/40 rounded-full flex items-center justify-center">
              <span className="text-3xl">🚀</span>
            </div>
            <h3 className="text-3xl lg:text-4xl font-bold text-white mb-6">
              Our <span className="text-sawaari-yellow">Mission</span>
            </h3>
            <p className="text-lg lg:text-xl text-gray-200 leading-relaxed mb-12">
              To digitize and optimize India&apos;s auto rickshaw ecosystem,
              creating a seamless bridge between traditional transportation and
              modern technology. We believe every journey should be efficient,
              transparent, and accessible to all.
            </p>

            {/* Mission Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="card p-8 text-center">
                <div className="text-4xl font-black text-sawaari-yellow mb-2">
                  2.5M+
                </div>
                <div className="text-gray-200">Auto Rickshaws</div>
              </div>
              <div className="card p-8 text-center">
                <div className="text-4xl font-black text-sawaari-yellow mb-2">
                  50M+
                </div>
                <div className="text-gray-200">Daily Passengers</div>
              </div>
              <div className="card p-8 text-center">
                <div className="text-4xl font-black text-sawaari-yellow mb-2">
                  100%
                </div>
                <div className="text-gray-200">Digital Future</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
