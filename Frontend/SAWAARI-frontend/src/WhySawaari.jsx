import React, { useState, useEffect, useRef } from "react";

export default function WhySawaari() {
  const [isVisible, setIsVisible] = useState(false);
  const [activeStatIndex, setActiveStatIndex] = useState(0);
  const sectionRef = useRef(null);

  // Auto rickshaw facts and statistics
  const autoRickshawFacts = [
    {
      number: "2.5M+",
      label: "Auto Rickshaws in India",
      description:
        "Serving millions of passengers daily across urban and rural areas",
      icon: "fas fa-taxi",
      color: "#ffeb3b",
    },
    {
      number: "50M+",
      label: "Daily Passengers",
      description:
        "People rely on auto rickshaws for their daily commute and transportation needs",
      icon: "fas fa-users",
      color: "#00ff88",
    },
    {
      number: "₹15-50",
      label: "Average Fare Range",
      description:
        "Affordable transportation option for short to medium distance travel",
      icon: "fas fa-rupee-sign",
      color: "#ffeb3b",
    },
    {
      number: "3-5km",
      label: "Typical Journey Distance",
      description:
        "Perfect for last-mile connectivity and local transportation",
      icon: "fas fa-route",
      color: "#00ff88",
    },
  ];

  const challenges = [
    {
      title: "No Real-time Information",
      description:
        "Passengers struggle to find available auto rickshaws, especially during peak hours",
      icon: "fas fa-clock",
      solution: "Live hotspot tracking",
    },
    {
      title: "Fare Transparency Issues",
      description:
        "Unclear pricing leads to disputes and passenger dissatisfaction",
      icon: "fas fa-question-circle",
      solution: "Dynamic fare estimates",
    },
    {
      title: "Route Inefficiency",
      description: "Drivers and passengers often take longer, costlier routes",
      icon: "fas fa-map",
      solution: "Smart route planning",
    },
    {
      title: "Limited Connectivity",
      description: "No platform to connect passengers for shared rides",
      icon: "fas fa-link",
      solution: "Ride sharing network",
    },
  ];

  // Intersection Observer for animations
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

  // Auto-rotate statistics
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStatIndex((prev) => (prev + 1) % autoRickshawFacts.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [autoRickshawFacts.length]);

  return (
    <section
      ref={sectionRef}
      className={`why-sawaari-section ${isVisible ? "visible" : ""}`}
    >
      {/* Hero Section with Statistics */}
      <div className="stats-hero">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-lg-6">
              <div className="stats-content">
                <div className="section-badge">
                  <i className="fas fa-chart-line"></i>
                  <span>The Reality</span>
                </div>
                <h2 className="section-title">
                  Auto Rickshaws: The{" "}
                  <span className="highlight-yellow">Backbone</span> of Indian
                  Transportation
                </h2>
                <p className="section-description">
                  Despite being an integral part of India's transportation
                  ecosystem, auto rickshaws lack the digital infrastructure they
                  deserve. SAWAARI bridges this gap with smart technology.
                </p>

                {/* Interactive Statistics */}
                <div className="interactive-stats">
                  {autoRickshawFacts.map((stat, index) => (
                    <div
                      key={index}
                      className={`stat-item ${
                        index === activeStatIndex ? "active" : ""
                      }`}
                      onClick={() => setActiveStatIndex(index)}
                    >
                      <div className="stat-icon" style={{ color: stat.color }}>
                        <i className={stat.icon}></i>
                      </div>
                      <div className="stat-content">
                        <div
                          className="stat-number"
                          style={{ color: stat.color }}
                        >
                          {stat.number}
                        </div>
                        <div className="stat-label">{stat.label}</div>
                        <div className="stat-description">
                          {stat.description}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="col-lg-6">
              <div className="stats-visual">
                {/* Animated Auto Rickshaw Scene */}
                <div className="rickshaw-scene">
                  <div className="city-skyline">
                    <div className="building building-1"></div>
                    <div className="building building-2"></div>
                    <div className="building building-3"></div>
                    <div className="building building-4"></div>
                  </div>

                  <div className="traffic-scene">
                    {/* Multiple Auto Rickshaws */}
                    <div className="auto-rickshaw rickshaw-1">
                      <div className="rickshaw-body">
                        <div className="rickshaw-roof"></div>
                        <div className="rickshaw-cabin">
                          <div className="passenger"></div>
                        </div>
                      </div>
                      <div className="rickshaw-wheels">
                        <div className="wheel"></div>
                        <div className="wheel"></div>
                        <div className="wheel"></div>
                      </div>
                    </div>

                    <div className="auto-rickshaw rickshaw-2">
                      <div className="rickshaw-body">
                        <div className="rickshaw-roof"></div>
                        <div className="rickshaw-cabin">
                          <div className="passenger"></div>
                          <div className="passenger"></div>
                        </div>
                      </div>
                      <div className="rickshaw-wheels">
                        <div className="wheel"></div>
                        <div className="wheel"></div>
                        <div className="wheel"></div>
                      </div>
                    </div>

                    <div className="auto-rickshaw rickshaw-3">
                      <div className="rickshaw-body">
                        <div className="rickshaw-roof"></div>
                        <div className="rickshaw-cabin">
                          <div className="passenger"></div>
                        </div>
                      </div>
                      <div className="rickshaw-wheels">
                        <div className="wheel"></div>
                        <div className="wheel"></div>
                        <div className="wheel"></div>
                      </div>
                    </div>
                  </div>

                  {/* Floating Statistics */}
                  <div className="floating-stats">
                    <div className="floating-stat stat-bubble-1">
                      <i className="fas fa-users"></i>
                      <span>50M+ Daily</span>
                    </div>
                    <div className="floating-stat stat-bubble-2">
                      <i className="fas fa-rupee-sign"></i>
                      <span>₹15-50</span>
                    </div>
                    <div className="floating-stat stat-bubble-3">
                      <i className="fas fa-taxi"></i>
                      <span>2.5M+ Autos</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Problems & Solutions Section */}
      <div className="problems-solutions">
        <div className="container">
          <div className="section-header text-center">
            <div className="section-badge">
              <i className="fas fa-lightbulb"></i>
              <span>The Solution</span>
            </div>
            <h2 className="section-title">
              Transforming Challenges into{" "}
              <span className="highlight-green">Opportunities</span>
            </h2>
            <p className="section-description">
              Every problem in the auto rickshaw ecosystem is an opportunity for
              innovation. Here's how SAWAARI addresses the core challenges.
            </p>
          </div>

          <div className="challenges-grid">
            {challenges.map((challenge, index) => (
              <div key={index} className="challenge-card">
                <div className="challenge-problem">
                  <div className="problem-icon">
                    <i className={challenge.icon}></i>
                  </div>
                  <div className="problem-content">
                    <h4 className="problem-title">{challenge.title}</h4>
                    <p className="problem-description">
                      {challenge.description}
                    </p>
                  </div>
                </div>

                <div className="solution-arrow">
                  <i className="fas fa-arrow-right"></i>
                </div>

                <div className="challenge-solution">
                  <div className="solution-badge">
                    <i className="fas fa-check-circle"></i>
                    <span>SAWAARI Solution</span>
                  </div>
                  <div className="solution-text">{challenge.solution}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
