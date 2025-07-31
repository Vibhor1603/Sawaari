import { useState, useEffect, useRef } from "react";
import { NavLink } from "react-router-dom";

export default function InteractiveHero() {
  const [activeFeature, setActiveFeature] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const heroRef = useRef(null);
  const intervalRef = useRef(null);

  const features = [
    {
      id: 0,
      title: "Find Rickshaws",
      description: "Discover available auto rickshaws near you instantly",
      icon: "fas fa-search-location",
      link: "/hotspots",
      color: "#ff6b35",
    },
    {
      id: 1,
      title: "Best Routes",
      description: "Get the fastest routes with transparent pricing",
      icon: "fas fa-route",
      link: "/routes",
      color: "#ffeb3b",
    },
    {
      id: 2,
      title: "Share Rides",
      description: "Connect with others for affordable journeys",
      icon: "fas fa-users",
      link: "/ridebuddy",
      color: "#00ff88",
    },
  ];

  // Auto-rotate features with play/pause
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setActiveFeature((prev) => (prev + 1) % features.length);
      }, 5000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isPlaying, features.length]);

  // Intersection Observer for animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    if (heroRef.current) {
      observer.observe(heroRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleFeatureChange = (index) => {
    setActiveFeature(index);
    setIsPlaying(false);
    setTimeout(() => setIsPlaying(true), 8000);
  };

  const currentFeature = features[activeFeature];

  return (
    <section
      ref={heroRef}
      className={`hero-section ${isVisible ? "visible" : ""}`}
    >
      {/* Artistic Background */}
      <div className="hero-bg">
        <div className="bg-pattern"></div>
        <div className="floating-rickshaws">
          {[...Array(4)].map((_, i) => (
            <div key={i} className={`floating-rickshaw rickshaw-${i + 1}`}>
              🛺
            </div>
          ))}
        </div>
      </div>

      <div className="container">
        <div className="hero-content">
          {/* Main Brand Section */}
          <div className="brand-section">
            <div className="brand-badge">
              <span className="badge-icon">🛺</span>
              <span>India's Ride Companion</span>
            </div>

            <h1 className="brand-title">
              <span className="title-main">SAWAARI</span>
              <span className="title-subtitle">Your Journey, Simplified</span>
            </h1>

            <p className="brand-description">
              Experience the convenience of finding, booking, and sharing auto
              rickshaw rides across India with our smart platform designed for
              modern travelers.
            </p>
          </div>

          {/* Feature Showcase */}
          <div className="feature-showcase">
            <div className="feature-display">
              <div
                className="feature-icon"
                style={{ color: currentFeature.color }}
              >
                <i className={currentFeature.icon}></i>
              </div>
              <div className="feature-content">
                <h3 className="feature-title">{currentFeature.title}</h3>
                <p className="feature-desc">{currentFeature.description}</p>
              </div>
            </div>

            <NavLink
              to={currentFeature.link}
              className="cta-button"
              style={{
                background: `linear-gradient(135deg, ${currentFeature.color}, ${currentFeature.color}dd)`,
              }}
            >
              <span>Get Started</span>
              <i className="fas fa-arrow-right"></i>
            </NavLink>
          </div>

          {/* Feature Navigation */}
          <div className="feature-nav">
            {features.map((feature, index) => (
              <button
                key={feature.id}
                className={`nav-item ${
                  index === activeFeature ? "active" : ""
                }`}
                onClick={() => handleFeatureChange(index)}
                style={{
                  borderColor:
                    index === activeFeature
                      ? feature.color
                      : "rgba(255,255,255,0.2)",
                  background:
                    index === activeFeature
                      ? `${feature.color}15`
                      : "transparent",
                }}
              >
                <i
                  className={feature.icon}
                  style={{ color: feature.color }}
                ></i>
                <span>{feature.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Visual Elements */}
        <div className="hero-visual">
          <div className="rickshaw-scene">
            <div className="main-rickshaw">
              <div
                className="rickshaw-body"
                style={{ borderColor: currentFeature.color }}
              >
                <div
                  className="rickshaw-roof"
                  style={{ background: currentFeature.color }}
                ></div>
                <div className="rickshaw-cabin">
                  <div className="seat"></div>
                  <div className="seat"></div>
                </div>
                <div className="rickshaw-wheels">
                  <div className="wheel"></div>
                  <div className="wheel"></div>
                  <div className="wheel"></div>
                </div>
              </div>
            </div>

            <div className="journey-path">
              <div
                className="path-start"
                style={{ background: currentFeature.color }}
              >
                <i className="fas fa-map-marker-alt"></i>
              </div>
              <div
                className="path-line"
                style={{
                  background: `linear-gradient(90deg, ${currentFeature.color}, transparent, ${currentFeature.color})`,
                }}
              ></div>
              <div
                className="path-end"
                style={{ background: currentFeature.color }}
              >
                <i className="fas fa-flag"></i>
              </div>
            </div>

            <div className="info-cards">
              <div className="info-card">
                <i className="fas fa-rupee-sign"></i>
                <span>₹30-50</span>
              </div>
              <div className="info-card">
                <i className="fas fa-clock"></i>
                <span>15 min</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="scroll-hint">
        <span>Explore Features</span>
        <i className="fas fa-chevron-down"></i>
      </div>
    </section>
  );
}
