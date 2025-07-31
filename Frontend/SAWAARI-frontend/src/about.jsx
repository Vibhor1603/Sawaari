import React, { useState, useEffect, useRef } from "react";
import { NavLink } from "react-router-dom";

export default function About() {
  const [isVisible, setIsVisible] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);
  const sectionRef = useRef(null);

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
  }, []);

  const features = [
    {
      id: 0,
      title: "Real-time Hotspots",
      description:
        "Live tracking of auto rickshaw availability with color-coded density maps",
      icon: "fas fa-map-marker-alt",
      link: "/hotspots",
      color: "#00ff88",
      stats: "500+ Active Spots",
      image: "/download.jpeg",
    },
    {
      id: 1,
      title: "Smart Route Planning",
      description:
        "AI-powered route optimization with dynamic fare estimates and traffic updates",
      icon: "fas fa-route",
      link: "/routes",
      color: "#ffeb3b",
      stats: "30% Fare Savings",
      image: "/auto-rik.jpeg",
    },
    {
      id: 2,
      title: "Ride Sharing Network",
      description:
        "Connect with fellow travelers for cost-effective and eco-friendly journeys",
      icon: "fas fa-users",
      link: "/ridebuddy",
      color: "#ff6b35",
      stats: "10K+ Connections",
      image: "/download.jpeg",
    },
  ];

  const currentFeature = features[activeFeature];

  return (
    <section
      ref={sectionRef}
      className={`about-section ${isVisible ? "visible" : ""}`}
    >
      {/* Hero Introduction */}
      <div className="about-hero">
        <div className="container">
          <div className="text-center">
            <div className="section-badge">
              <i className="fas fa-info-circle"></i>
              <span>About SAWAARI</span>
            </div>
            <h2 className="section-title">
              Revolutionizing{" "}
              <span className="highlight-yellow">Urban Transportation</span>
            </h2>
            <p className="section-description">
              We're not just another app – we're the bridge between traditional
              auto rickshaw services and modern digital convenience, making
              every journey smarter and more efficient.
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Features Showcase */}
      <div className="features-showcase">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-lg-6">
              <div className="feature-content">
                <div className="feature-navigation">
                  {features.map((feature, index) => (
                    <button
                      key={index}
                      className={`feature-nav-btn ${
                        index === activeFeature ? "active" : ""
                      }`}
                      onClick={() => setActiveFeature(index)}
                      style={{
                        borderColor:
                          index === activeFeature
                            ? feature.color
                            : "rgba(255, 255, 255, 0.2)",
                        backgroundColor:
                          index === activeFeature
                            ? `${feature.color}20`
                            : "transparent",
                      }}
                    >
                      <div
                        className="nav-icon"
                        style={{ color: feature.color }}
                      >
                        <i className={feature.icon}></i>
                      </div>
                      <div className="nav-content">
                        <div className="nav-title">{feature.title}</div>
                        <div className="nav-stats">{feature.stats}</div>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="active-feature-details">
                  <div className="feature-header">
                    <div
                      className="feature-icon-large"
                      style={{
                        backgroundColor: `${currentFeature.color}20`,
                        borderColor: currentFeature.color,
                      }}
                    >
                      <i
                        className={currentFeature.icon}
                        style={{ color: currentFeature.color }}
                      ></i>
                    </div>
                    <div className="feature-info">
                      <h3 className="feature-title">{currentFeature.title}</h3>
                      <p className="feature-description">
                        {currentFeature.description}
                      </p>
                    </div>
                  </div>

                  <div className="feature-actions">
                    <NavLink
                      to={currentFeature.link}
                      className="feature-cta"
                      style={{
                        background: `linear-gradient(135deg, ${currentFeature.color}, ${currentFeature.color}dd)`,
                        boxShadow: `0 10px 25px ${currentFeature.color}40`,
                      }}
                    >
                      <span>Explore {currentFeature.title}</span>
                      <i className="fas fa-arrow-right"></i>
                    </NavLink>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-lg-6">
              <div className="feature-visual">
                <div className="image-container">
                  <img
                    src={currentFeature.image}
                    alt={currentFeature.title}
                    className="feature-image"
                  />
                  <div className="image-overlay">
                    <div className="overlay-content">
                      <div className="stat-bubble">
                        <i className={currentFeature.icon}></i>
                        <span>{currentFeature.stats}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Interactive Elements */}
                <div className="floating-elements">
                  <div
                    className="floating-element element-1"
                    style={{ color: currentFeature.color }}
                  >
                    <i className="fas fa-bolt"></i>
                  </div>
                  <div
                    className="floating-element element-2"
                    style={{ color: currentFeature.color }}
                  >
                    <i className="fas fa-star"></i>
                  </div>
                  <div
                    className="floating-element element-3"
                    style={{ color: currentFeature.color }}
                  >
                    <i className="fas fa-heart"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mission Statement */}
      <div className="mission-section">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-lg-8 text-center">
              <div className="mission-content">
                <div className="mission-icon">
                  <i className="fas fa-rocket"></i>
                </div>
                <h3 className="mission-title">
                  Our <span className="highlight-green">Mission</span>
                </h3>
                <p className="mission-description">
                  To digitize and optimize India's auto rickshaw ecosystem,
                  creating a seamless bridge between traditional transportation
                  and modern technology. We believe every journey should be
                  efficient, transparent, and accessible to all.
                </p>
                <div className="mission-stats">
                  <div className="stat-item">
                    <div className="stat-number">2.5M+</div>
                    <div className="stat-label">Auto Rickshaws</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-number">50M+</div>
                    <div className="stat-label">Daily Passengers</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-number">100%</div>
                    <div className="stat-label">Digital Future</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
