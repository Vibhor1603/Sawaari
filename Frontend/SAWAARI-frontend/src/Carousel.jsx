import React, { useState, useEffect, useRef } from "react";
import { NavLink } from "react-router-dom";

export default function InteractiveHero() {
  const [activeFeature, setActiveFeature] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(false);
  const heroRef = useRef(null);
  const intervalRef = useRef(null);

  const features = [
    {
      id: 0,
      title: "Smart Hotspots",
      description:
        "Discover auto rickshaw availability in real-time with live tracking",
      icon: "fas fa-map-marker-alt",
      link: "/hotspots",
      color: "#00ff88",
      stats: "500+ Active Spots",
      benefit: "Find rides 3x faster",
    },
    {
      id: 1,
      title: "Intelligent Routes",
      description:
        "Get optimal routes with dynamic fare estimates and traffic updates",
      icon: "fas fa-route",
      link: "/routes",
      color: "#ffeb3b",
      stats: "AI-Powered Navigation",
      benefit: "Save up to 30% on fares",
    },
    {
      id: 2,
      title: "Ride Sharing",
      description:
        "Connect with fellow travelers for cost-effective and eco-friendly journeys",
      icon: "fas fa-users",
      link: "/ridebuddy",
      color: "#ff6b35",
      stats: "10K+ Happy Users",
      benefit: "Split costs, make friends",
    },
  ];

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

  // Auto-rotate features with play/pause
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setActiveFeature((prev) => (prev + 1) % features.length);
      }, 6000);
    } else {
      clearInterval(intervalRef.current);
    }

    return () => clearInterval(intervalRef.current);
  }, [isPlaying, features.length]);

  // Mouse tracking for parallax effect
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (heroRef.current) {
        const rect = heroRef.current.getBoundingClientRect();
        setMousePosition({
          x: (e.clientX - rect.left) / rect.width,
          y: (e.clientY - rect.top) / rect.height,
        });
      }
    };

    const heroElement = heroRef.current;
    if (heroElement) {
      heroElement.addEventListener("mousemove", handleMouseMove);
      return () =>
        heroElement.removeEventListener("mousemove", handleMouseMove);
    }
  }, []);

  const handleFeatureChange = (index) => {
    setActiveFeature(index);
    setIsPlaying(false);
    // Resume auto-play after 10 seconds
    setTimeout(() => setIsPlaying(true), 10000);
  };

  const currentFeature = features[activeFeature];

  return (
    <div
      ref={heroRef}
      className={`interactive-hero ${isVisible ? "visible" : ""}`}
    >
      {/* Dynamic Background */}
      <div className="hero-background">
        <div
          className="gradient-orb orb-1"
          style={{
            transform: `translate(${mousePosition.x * 20}px, ${
              mousePosition.y * 20
            }px)`,
            background: `radial-gradient(circle, ${currentFeature.color}20, transparent)`,
          }}
        ></div>
        <div
          className="gradient-orb orb-2"
          style={{
            transform: `translate(${-mousePosition.x * 15}px, ${
              -mousePosition.y * 15
            }px)`,
            background: `radial-gradient(circle, ${currentFeature.color}15, transparent)`,
          }}
        ></div>
        <div
          className="floating-rickshaw"
          style={{
            transform: `translate(${mousePosition.x * 10}px, ${
              mousePosition.y * 10
            }px) rotate(-15deg)`,
          }}
        >
          🛺
        </div>

        {/* Animated particles */}
        <div className="particles">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className={`particle particle-${i + 1}`}
              style={{
                animationDelay: `${i * 0.5}s`,
                color: currentFeature.color,
              }}
            >
              ✨
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="hero-content">
        <div className="container">
          <div className="row align-items-center min-vh-100">
            {/* Left Side - Enhanced Text Content */}
            <div className="col-lg-6">
              <div className="hero-text">
                {/* Brand Introduction */}
                <div className="brand-intro">
                  <div className="brand-badge">
                    <i className="fas fa-bolt"></i>
                    Smart Transportation
                  </div>
                  <h1 className="brand-name">
                    <span className="brand-highlight">SAWAARI</span>
                  </h1>
                  <p className="brand-tagline">
                    Your intelligent companion for seamless auto rickshaw
                    experiences
                  </p>
                </div>

                {/* Enhanced Feature Showcase */}
                <div className="feature-showcase">
                  <div className="feature-content">
                    <div
                      className="feature-icon"
                      style={{ borderColor: currentFeature.color }}
                    >
                      <i
                        className={currentFeature.icon}
                        style={{ color: currentFeature.color }}
                      ></i>
                    </div>
                    <div className="feature-text">
                      <h3 className="feature-title">{currentFeature.title}</h3>
                      <p className="feature-description">
                        {currentFeature.description}
                      </p>
                      <div className="feature-stats">
                        <span className="stat-item">
                          <i className="fas fa-chart-line"></i>
                          {currentFeature.stats}
                        </span>
                        <span className="stat-item">
                          <i className="fas fa-star"></i>
                          {currentFeature.benefit}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Enhanced Actions */}
                  <div className="hero-actions">
                    <NavLink
                      to={currentFeature.link}
                      className="hero-cta-primary"
                      style={{
                        background: `linear-gradient(135deg, ${currentFeature.color}, ${currentFeature.color}dd)`,
                        boxShadow: `0 10px 25px ${currentFeature.color}40`,
                      }}
                    >
                      <span>Explore {currentFeature.title}</span>
                      <i className="fas fa-arrow-right"></i>
                    </NavLink>
                    <button
                      className="hero-cta-secondary"
                      onClick={() => setIsPlaying(!isPlaying)}
                    >
                      <i
                        className={`fas fa-${isPlaying ? "pause" : "play"}`}
                      ></i>
                      {isPlaying ? "Pause" : "Play"} Tour
                    </button>
                  </div>
                </div>

                {/* Enhanced Feature Navigation */}
                <div className="feature-navigation">
                  <div className="feature-dots">
                    {features.map((feature, index) => (
                      <button
                        key={index}
                        className={`feature-dot ${
                          index === activeFeature ? "active" : ""
                        }`}
                        onClick={() => handleFeatureChange(index)}
                        style={{
                          backgroundColor:
                            index === activeFeature
                              ? feature.color
                              : "transparent",
                          borderColor: feature.color,
                        }}
                        title={feature.title}
                      />
                    ))}
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{
                        backgroundColor: currentFeature.color,
                        animationDuration: isPlaying ? "6s" : "paused",
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side - Enhanced Visual */}
            <div className="col-lg-6">
              <div className="hero-visual">
                {/* Interactive Rickshaw */}
                <div className="rickshaw-container">
                  <div
                    className="rickshaw-main"
                    style={{
                      transform: `translate(${mousePosition.x * 5}px, ${
                        mousePosition.y * 5
                      }px)`,
                    }}
                  >
                    <div className="rickshaw-body">
                      <div
                        className="rickshaw-roof"
                        style={{ backgroundColor: currentFeature.color }}
                      ></div>
                      <div className="rickshaw-cabin">
                        <div className="rickshaw-seat"></div>
                        <div className="rickshaw-seat"></div>
                        <div className="passenger-indicator">
                          <i className="fas fa-user"></i>
                        </div>
                      </div>
                      <div className="rickshaw-front">
                        <div
                          className="rickshaw-light"
                          style={{ backgroundColor: currentFeature.color }}
                        ></div>
                        <div
                          className="rickshaw-light"
                          style={{ backgroundColor: currentFeature.color }}
                        ></div>
                      </div>
                    </div>
                    <div className="rickshaw-wheels">
                      <div className="wheel wheel-front"></div>
                      <div className="wheel wheel-back-left"></div>
                      <div className="wheel wheel-back-right"></div>
                    </div>

                    {/* Speed lines for motion effect */}
                    <div className="speed-lines">
                      {[...Array(3)].map((_, i) => (
                        <div
                          key={i}
                          className={`speed-line line-${i + 1}`}
                        ></div>
                      ))}
                    </div>
                  </div>

                  {/* Enhanced Route Path */}
                  <div className="route-path">
                    <div
                      className="path-dot start-dot"
                      style={{ backgroundColor: currentFeature.color }}
                    >
                      <i className="fas fa-play"></i>
                    </div>
                    <div
                      className="path-line"
                      style={{
                        background: `linear-gradient(90deg, ${currentFeature.color}, transparent, ${currentFeature.color})`,
                      }}
                    ></div>
                    <div
                      className="path-dot end-dot"
                      style={{ backgroundColor: currentFeature.color }}
                    >
                      <i className="fas fa-flag-checkered"></i>
                    </div>
                  </div>

                  {/* Interactive Elements */}
                  <div className="interactive-elements">
                    <div
                      className="info-bubble bubble-1"
                      style={{ borderColor: currentFeature.color }}
                    >
                      <i className="fas fa-rupee-sign"></i>
                      <span>₹25-45</span>
                    </div>
                    <div
                      className="info-bubble bubble-2"
                      style={{ borderColor: currentFeature.color }}
                    >
                      <i className="fas fa-clock"></i>
                      <span>12 min</span>
                    </div>
                    <div
                      className="info-bubble bubble-3"
                      style={{ borderColor: currentFeature.color }}
                    >
                      <i className="fas fa-route"></i>
                      <span>3.2 km</span>
                    </div>
                  </div>
                </div>

                {/* Enhanced Quick Actions */}
                <div className="quick-actions">
                  {features.map((feature, index) => (
                    <button
                      key={feature.id}
                      className={`quick-action ${
                        index === activeFeature ? "active" : ""
                      }`}
                      onClick={() => handleFeatureChange(index)}
                      style={{
                        borderColor:
                          index === activeFeature
                            ? feature.color
                            : "var(--border-color)",
                        backgroundColor:
                          index === activeFeature
                            ? `${feature.color}20`
                            : "transparent",
                      }}
                    >
                      <div
                        className="action-icon"
                        style={{
                          color:
                            index === activeFeature
                              ? feature.color
                              : "var(--text-secondary)",
                        }}
                      >
                        <i className={feature.icon}></i>
                      </div>
                      <span
                        className="action-label"
                        style={{
                          color:
                            index === activeFeature
                              ? feature.color
                              : "var(--text-secondary)",
                        }}
                      >
                        {feature.title}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Scroll Indicator */}
      <div className="scroll-indicator">
        <div className="scroll-text">Discover More</div>
        <div className="scroll-arrow" style={{ color: currentFeature.color }}>
          <i className="fas fa-chevron-down"></i>
        </div>
      </div>
    </div>
  );
}
