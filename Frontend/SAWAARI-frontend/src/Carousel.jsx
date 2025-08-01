import { useState, useEffect, useRef } from "react";
import { NavLink } from "react-router-dom";

export default function InteractiveHero() {
  const [activeFeature, setActiveFeature] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const heroRef = useRef(null);

  const features = [
    {
      id: 0,
      title: "Find Rickshaws",
      description: "Discover available auto rickshaws near you instantly",
      link: "/hotspots",
    },
    {
      id: 1,
      title: "Best Routes",
      description: "Get the fastest routes with transparent pricing",
      link: "/routes",
    },
    {
      id: 2,
      title: "Share Rides",
      description: "Connect with others for affordable journeys",
      link: "/ridebuddy",
    },
  ];

  // Auto-rotate features
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % features.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [features.length]);

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

  return (
    <section
      ref={heroRef}
      className={`relative min-h-screen bg-black transition-all duration-700 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* Enhanced background decorations with subtle colors */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Subtle floating auto rickshaw silhouettes */}
        <div className="absolute top-20 right-20 text-6xl opacity-[0.03] animate-subtle-float">
          🛺
        </div>
        <div
          className="absolute bottom-32 left-16 text-4xl opacity-[0.03] animate-subtle-float"
          style={{ animationDelay: "2s" }}
        >
          🛺
        </div>
        <div
          className="absolute top-1/2 right-1/4 text-3xl opacity-[0.02] animate-subtle-float"
          style={{ animationDelay: "4s" }}
        >
          🛺
        </div>

        {/* Enhanced route-inspired dotted lines */}
        <div className="absolute top-1/3 left-0 w-full h-px route-line opacity-[0.08]"></div>
        <div
          className="absolute bottom-1/3 left-0 w-full h-px route-line opacity-[0.08]"
          style={{ animationDelay: "1s" }}
        ></div>

        {/* Additional subtle decorative elements */}
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-sawaari-yellow/20 rounded-full animate-pulse-slow"></div>
        <div
          className="absolute bottom-1/4 right-1/4 w-1 h-1 bg-sawaari-yellow/30 rounded-full animate-pulse-slow"
          style={{ animationDelay: "1s" }}
        ></div>
      </div>

      <div className="container-sawaari">
        <div className="grid lg:grid-cols-2 gap-16 items-center min-h-screen py-20">
          {/* Content Section - Enhanced with subtle colors */}
          <div className="max-w-2xl">
            {/* Enhanced badge with subtle colors */}
            <div className="inline-flex items-center gap-3 bg-sawaari-yellow-muted border border-sawaari-yellow-border rounded-full px-6 py-3 mb-8 backdrop-blur-sm">
              <span className="text-2xl">🛺</span>
              <span className="text-sm font-medium text-sawaari-yellow text-readable">
                India&apos;s Ride Companion
              </span>
            </div>

            {/* Enhanced SAWAARI wordmark with better readability */}
            <h1 className="mb-8">
              <span className="block text-6xl lg:text-7xl font-black text-white leading-none mb-4 text-readable">
                SAWAARI
              </span>
              <span className="block text-xl lg:text-2xl font-normal text-gray-200 text-readable-secondary">
                Your Journey, Simplified
              </span>
            </h1>

            {/* Enhanced tagline with better contrast */}
            <p className="text-lg lg:text-xl text-gray-200 leading-relaxed mb-12 max-w-xl text-readable-secondary">
              Experience the convenience of finding, booking, and sharing auto
              rickshaw rides across India with our smart platform designed for
              modern travelers.
            </p>

            {/* Enhanced CTA buttons with subtle effects */}
            <div className="flex flex-col sm:flex-row gap-4 mb-12">
              <NavLink to="/hotspots" className="btn-primary">
                Find Rides
              </NavLink>
              <NavLink to="/ridebuddy" className="btn-secondary">
                Share Journey
              </NavLink>
            </div>

            {/* Enhanced feature indicators with subtle colors */}
            <div className="flex gap-6">
              {features.map((feature, index) => (
                <button
                  key={feature.id}
                  className={`flex-1 p-4 text-left rounded-xl border transition-all duration-300 hover:shadow-sawaari-subtle ${
                    index === activeFeature
                      ? "border-sawaari-yellow bg-sawaari-yellow-muted"
                      : "border-white/20 bg-black/40 hover:border-sawaari-yellow/50 hover:bg-sawaari-yellow-muted/50"
                  }`}
                  onClick={() => setActiveFeature(index)}
                >
                  <h3 className="font-semibold text-white mb-1 text-readable">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-gray-200 text-readable-secondary">
                    {feature.description}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Enhanced Visual Section with Auto Rickshaw Animation */}
          <div className="flex justify-center items-center relative">
            {/* Main rickshaw container with enhanced styling */}
            <div className="relative">
              {/* Enhanced background with subtle gradient */}
              <div className="w-80 h-80 bg-gradient-to-br from-sawaari-yellow-muted to-sawaari-yellow-muted rounded-2xl flex items-center justify-center shadow-sawaari-xl border border-sawaari-yellow-border backdrop-blur-sm">
                <div className="text-8xl opacity-80 animate-rickshaw-bounce">
                  🛺
                </div>
              </div>

              {/* Enhanced wheel accents with rotation */}
              <div className="absolute -top-4 -right-4 w-8 h-8 border-2 border-sawaari-yellow rounded-full opacity-60 wheel-accent animate-wheel-rotate"></div>
              <div
                className="absolute -bottom-4 -left-4 w-6 h-6 border-2 border-sawaari-yellow rounded-full opacity-60 wheel-accent animate-wheel-rotate"
                style={{ animationDelay: "1s" }}
              ></div>
              <div
                className="absolute top-1/2 -left-8 w-4 h-4 border-2 border-sawaari-yellow rounded-full opacity-40 wheel-accent animate-wheel-rotate"
                style={{ animationDelay: "2s" }}
              ></div>

              {/* Small driving auto rickshaw animation */}
              <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2">
                <div className="relative">
                  {/* Map trail effect */}
                  <div className="absolute bottom-0 left-0 w-32 h-1 bg-gradient-to-r from-sawaari-yellow/40 to-transparent rounded-full animate-map-trail"></div>

                  {/* Small driving rickshaw */}
                  <div className="text-2xl animate-rickshaw-drive relative z-10">
                    🛺
                  </div>

                  {/* Additional trail effects */}
                  <div
                    className="absolute bottom-0 left-0 w-24 h-0.5 bg-gradient-to-r from-sawaari-yellow/30 to-transparent rounded-full animate-map-trail"
                    style={{ animationDelay: "2s" }}
                  ></div>
                </div>
              </div>

              {/* Floating particles for enhanced effect */}
              <div className="absolute top-4 right-4 w-2 h-2 bg-sawaari-yellow/40 rounded-full animate-subtle-float"></div>
              <div
                className="absolute bottom-8 right-8 w-1 h-1 bg-sawaari-yellow/50 rounded-full animate-subtle-float"
                style={{ animationDelay: "3s" }}
              ></div>
              <div
                className="absolute top-1/2 right-1/2 w-1.5 h-1.5 bg-sawaari-yellow/30 rounded-full animate-subtle-float"
                style={{ animationDelay: "1.5s" }}
              ></div>
            </div>

            {/* Additional decorative elements */}
            <div className="absolute top-0 right-0 w-16 h-16 border border-sawaari-yellow/20 rounded-full animate-subtle-float"></div>
            <div
              className="absolute bottom-0 left-0 w-12 h-12 border border-sawaari-yellow/20 rounded-full animate-subtle-float"
              style={{ animationDelay: "2s" }}
            ></div>
          </div>
        </div>
      </div>
    </section>
  );
}
