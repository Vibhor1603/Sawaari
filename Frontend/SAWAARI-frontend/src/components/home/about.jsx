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
      stats: "100+ Active Spots",
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
      <div
        className="absolute inset-0 pointer-events-none overflow-hidden"
        style={{ zIndex: 1 }}
      >
        <div
          className="absolute top-[15%] left-[8%] text-lg sm:text-xl animate-subtle-float"
          style={{ zIndex: 1, opacity: 0.15 }}
        >
          🛺
        </div>
        <div
          className="hidden sm:block absolute top-[25%] right-[12%] text-lg sm:text-xl animate-subtle-float"
          style={{ animationDelay: "1s", zIndex: 1, opacity: 0.18 }}
        >
          🛺
        </div>
        <div
          className="hidden lg:block absolute bottom-[20%] left-[15%] text-sm sm:text-lg animate-subtle-float"
          style={{ animationDelay: "2s", zIndex: 1, opacity: 0.15 }}
        >
          🛺
        </div>
      </div>

      <div className="container-sawaari relative z-10">
        {/* Hero Introduction - Responsive */}
        <div className="text-center mb-12 sm:mb-16 lg:mb-20">
          <div className="inline-flex items-center gap-2 sm:gap-3 bg-sawaari-yellow-muted border border-sawaari-yellow-border rounded-full px-4 sm:px-6 py-2 sm:py-3 mb-4 sm:mb-6">
            <span className="text-lg sm:text-xl lg:text-2xl">🚀</span>
            <span className="text-xs sm:text-sm font-medium text-sawaari-yellow text-readable">
              Why Choose SAWAARI?
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 sm:mb-6 text-readable px-4">
            Revolutionizing Urban Mobility
          </h2>
          <p className="text-base sm:text-lg lg:text-xl text-gray-200 max-w-3xl mx-auto leading-relaxed text-readable-secondary px-4">
            Experience the future of transportation with our innovative platform
            that connects you with reliable auto rickshaw services across India.
          </p>
        </div>

        {/* Feature Showcase - Responsive Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 mb-12 sm:mb-16">
          {features.map((feature, index) => (
            <div
              key={feature.id}
              className={`card group transition-all duration-500 ${
                index === activeFeature
                  ? "scale-105 border-sawaari-yellow/50"
                  : "hover:scale-105"
              }`}
            >
              <div className="p-4 sm:p-6 lg:p-8 text-center">
                <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-sawaari-yellow-muted border border-sawaari-yellow-border rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6 group-hover:scale-110 transition-transform duration-300">
                  <span className="text-xl sm:text-2xl lg:text-3xl">
                    {feature.icon}
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-white mb-2 sm:mb-3 text-readable">
                  {feature.title}
                </h3>
                <p className="text-sm sm:text-base text-gray-300 mb-3 sm:mb-4 text-readable-secondary">
                  {feature.description}
                </p>
                <div className="inline-flex items-center gap-2 bg-sawaari-yellow-muted border border-sawaari-yellow-border rounded-full px-3 sm:px-4 py-1 sm:py-2">
                  <span className="text-xs font-semibold text-sawaari-yellow">
                    {feature.stats}
                  </span>
                </div>
                <div className="btn-container-center mt-3 sm:mt-4">
                  <NavLink to={feature.link} className="feature-btn">
                    Learn More
                  </NavLink>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Interactive Feature Highlight - Responsive */}
        <div className="text-center">
          <div className="card max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-4 sm:mb-6">
              <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-sawaari-yellow-muted border border-sawaari-yellow-border rounded-2xl flex items-center justify-center">
                <span className="text-xl sm:text-2xl lg:text-3xl">
                  {currentFeature.icon}
                </span>
              </div>
              <div className="text-center sm:text-left">
                <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-white text-readable">
                  {currentFeature.title}
                </h3>
                <p className="text-sm sm:text-base text-gray-300 text-readable-secondary">
                  {currentFeature.stats}
                </p>
              </div>
            </div>
            <p className="text-sm sm:text-base lg:text-lg text-gray-200 mb-4 sm:mb-6 text-readable-secondary">
              {currentFeature.description}
            </p>
            <div className="btn-container-center">
              <NavLink
                to={currentFeature.link}
                className="cta-btn inline-flex items-center gap-2"
              >
                <span>Explore {currentFeature.title}</span>
                <span className="text-lg sm:text-xl">→</span>
              </NavLink>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
