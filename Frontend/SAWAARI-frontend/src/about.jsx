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
          <div className="inline-flex items-center gap-3 bg-sawaari-yellow-muted border border-sawaari-yellow-border rounded-full px-6 py-3 mb-6">
            <span className="text-2xl">🚀</span>
            <span className="text-sm font-medium text-sawaari-yellow text-readable">
              Why Choose SAWAARI?
            </span>
          </div>
          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6 text-readable">
            Revolutionizing Urban Mobility
          </h2>
          <p className="text-xl text-gray-200 max-w-3xl mx-auto leading-relaxed text-readable-secondary">
            Experience the future of transportation with our innovative platform
            that connects you with reliable auto rickshaw services across India.
          </p>
        </div>

        {/* Feature Showcase */}
        <div className="grid lg:grid-cols-3 gap-8 mb-16">
          {features.map((feature, index) => (
            <div
              key={feature.id}
              className={`card group transition-all duration-500 ${
                index === activeFeature
                  ? "scale-105 border-sawaari-yellow/50"
                  : "hover:scale-105"
              }`}
            >
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-sawaari-yellow-muted border border-sawaari-yellow-border rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                  <span className="text-3xl">{feature.icon}</span>
                </div>
                <h3 className="text-xl font-semibold text-white mb-3 text-readable">
                  {feature.title}
                </h3>
                <p className="text-gray-300 mb-4 text-readable-secondary">
                  {feature.description}
                </p>
                <div className="inline-flex items-center gap-2 bg-sawaari-yellow-muted border border-sawaari-yellow-border rounded-full px-4 py-2">
                  <span className="text-xs font-semibold text-sawaari-yellow">
                    {feature.stats}
                  </span>
                </div>
                <NavLink to={feature.link} className="btn-primary w-full mt-4">
                  Learn More
                </NavLink>
              </div>
            </div>
          ))}
        </div>

        {/* Interactive Feature Highlight */}
        <div className="text-center">
          <div className="card max-w-4xl mx-auto p-8">
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="w-16 h-16 bg-sawaari-yellow-muted border border-sawaari-yellow-border rounded-2xl flex items-center justify-center">
                <span className="text-3xl">{currentFeature.icon}</span>
              </div>
              <div className="text-left">
                <h3 className="text-2xl font-bold text-white text-readable">
                  {currentFeature.title}
                </h3>
                <p className="text-gray-300 text-readable-secondary">
                  {currentFeature.stats}
                </p>
              </div>
            </div>
            <p className="text-lg text-gray-200 mb-6 text-readable-secondary">
              {currentFeature.description}
            </p>
            <NavLink
              to={currentFeature.link}
              className="btn-primary inline-flex items-center gap-2"
            >
              <span>Explore {currentFeature.title}</span>
              <span className="text-xl">→</span>
            </NavLink>
          </div>
        </div>
      </div>
    </section>
  );
}
