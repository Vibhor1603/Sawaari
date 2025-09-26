import { useState, useEffect, useRef } from "react";
import { NavLink } from "react-router-dom";

export default function InteractiveHero() {
  const [activeFeature, setActiveFeature] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const heroRef = useRef(null);

  const features = [
    {
      id: 0,
      title: "Auto Rickshaw Stands",
      description: "Find nearby auto stands for your commute",
      link: "/hotspots",
      tagline: "Last Mile Travel Made Simple",
    },
    {
      id: 1,
      title: "Smart Routes",
      description: "Find auto routes to your destination",
      link: "/routes",
      tagline: "Last Mile Travel Made Simple",
    },
    {
      id: 2,
      title: "Share Your Auto",
      description: "Connect with co-passengers heading the same way",
      link: "/ridebuddy",
      tagline: "Last Mile Travel Made Simple",
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
      {/* Enhanced background decorations with subtle colors - Responsive */}
      <div
        className="absolute inset-0 overflow-hidden pointer-events-none"
        style={{ zIndex: 1 }}
      >
        {/* Subtle floating auto rickshaw silhouettes - Responsive positioning with reduced opacity */}
        <div
          className="hidden sm:block absolute top-16 sm:top-20 right-4 sm:right-8 lg:right-20 text-2xl sm:text-3xl lg:text-4xl animate-subtle-float"
          style={{ opacity: 0.12, zIndex: 1 }}
        >
          🛺
        </div>
        <div
          className="absolute bottom-20 sm:bottom-32 left-4 sm:left-8 lg:left-16 text-xl sm:text-2xl lg:text-3xl animate-subtle-float"
          style={{ animationDelay: "2s", opacity: 0.15, zIndex: 1 }}
        >
          🛺
        </div>
        <div
          className="hidden lg:block absolute top-1/2 right-1/4 text-lg sm:text-xl lg:text-2xl animate-subtle-float"
          style={{ animationDelay: "4s", opacity: 0.12, zIndex: 1 }}
        >
          🛺
        </div>

        {/* Enhanced route-inspired dotted lines */}
        <div className="absolute top-1/3 left-0 w-full h-px route-line opacity-[0.08]"></div>
        <div
          className="absolute bottom-1/3 left-0 w-full h-px route-line opacity-[0.08]"
          style={{ animationDelay: "1s" }}
        ></div>

        {/* Additional subtle decorative elements - Responsive */}
        <div className="absolute top-1/4 left-1/4 w-1 h-1 sm:w-2 sm:h-2 bg-sawaari-yellow/20 rounded-full animate-pulse-slow"></div>
        <div
          className="absolute bottom-1/4 right-1/4 w-1 h-1 bg-sawaari-yellow/30 rounded-full animate-pulse-slow"
          style={{ animationDelay: "1s" }}
        ></div>
      </div>

      <div className="container-sawaari">
        <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-16 items-center min-h-screen pt-20 pb-12 sm:pt-24 sm:pb-16 lg:pt-20 lg:pb-20">
          {/* Content Section - Enhanced with subtle colors - Fully Responsive */}
          <div className="max-w-2xl">
            {/* Enhanced badge with subtle colors - Responsive */}
            <div className="inline-flex items-center gap-2 sm:gap-3 bg-sawaari-yellow-muted border border-sawaari-yellow-border rounded-full px-4 sm:px-6 py-2 sm:py-3 mb-6 sm:mb-8 backdrop-blur-sm">
              <span className="text-lg sm:text-xl lg:text-2xl">🛺</span>
              <span className="text-xs sm:text-sm font-medium text-sawaari-yellow text-readable">
                Auto Rickshaw Services
              </span>
            </div>

            {/* Enhanced SAWAARI wordmark with better readability - Responsive */}
            <h1 className="mb-6 sm:mb-8">
              <span className="block text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-white leading-none mb-2 sm:mb-4 text-readable">
                <span className="text-sawaari-yellow">SAW</span>AARI
              </span>
              <span className="block text-xl sm:text-2xl lg:text-3xl font-light text-gray-200 text-readable-secondary">
                Last Mile Travel Made Simple
              </span>
            </h1>

            {/* Enhanced CTA buttons with subtle effects - Responsive */}
            <div className="btn-group-responsive mb-8 sm:mb-12">
              <NavLink to="/hotspots" className="cta-btn">
                Find Rides
              </NavLink>
              <NavLink to="/ridebuddy" className="cta-btn btn-secondary">
                Share Journey
              </NavLink>
            </div>

            {/* Enhanced feature indicators with subtle colors - Responsive */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 lg:gap-6">
              {features.map((feature, index) => (
                <NavLink
                  key={feature.id}
                  to={feature.link}
                  className={`flex-1 p-3 sm:p-4 text-left rounded-xl border transition-all duration-300 hover:shadow-sawaari-subtle cursor-pointer ${
                    index === activeFeature
                      ? "border-sawaari-yellow bg-sawaari-yellow-muted"
                      : "border-white/20 bg-black/40 hover:border-sawaari-yellow/50 hover:bg-sawaari-yellow-muted/50"
                  }`}
                  onClick={() => setActiveFeature(index)}
                >
                  <h3 className="font-semibold text-white mb-1 text-sm sm:text-base text-readable">
                    {feature.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-200 text-readable-secondary">
                    {feature.description}
                  </p>
                </NavLink>
              ))}
            </div>
          </div>

          {/* Enhanced Visual Section with Auto Rickshaw Animation - Fully Responsive */}
          <div className="flex justify-center items-center relative mt-8 lg:mt-0">
            {/* Main rickshaw container with enhanced styling - Responsive */}
            <div className="relative">
              {/* Enhanced background with subtle gradient - Responsive sizing */}
              <div className="w-64 h-64 sm:w-72 sm:h-72 lg:w-80 lg:h-80 bg-gradient-to-br from-sawaari-yellow-muted to-sawaari-yellow-muted rounded-2xl flex items-center justify-center shadow-sawaari-xl border border-sawaari-yellow-border backdrop-blur-sm">
                <div className="text-5xl sm:text-6xl lg:text-8xl opacity-80 animate-rickshaw-bounce">
                  🛺
                </div>
              </div>

              {/* Enhanced wheel accents with rotation - Responsive */}
              <div className="absolute -top-2 -right-2 sm:-top-3 sm:-right-3 lg:-top-4 lg:-right-4 w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 border-2 border-sawaari-yellow rounded-full opacity-60 wheel-accent animate-wheel-rotate"></div>
              <div
                className="absolute -bottom-2 -left-2 sm:-bottom-3 sm:-left-3 lg:-bottom-4 lg:-left-4 w-5 h-5 sm:w-6 sm:h-6 border-2 border-sawaari-yellow rounded-full opacity-60 wheel-accent animate-wheel-rotate"
                style={{ animationDelay: "1s" }}
              ></div>
              <div
                className="absolute top-1/2 -left-4 sm:-left-6 lg:-left-8 w-3 h-3 sm:w-4 sm:h-4 border-2 border-sawaari-yellow rounded-full opacity-40 wheel-accent animate-wheel-rotate"
                style={{ animationDelay: "2s" }}
              ></div>

              {/* Small driving auto rickshaw animation - Responsive */}
              <div className="absolute -bottom-6 sm:-bottom-8 left-1/2 transform -translate-x-1/2">
                <div className="relative">
                  {/* Map trail effect - Responsive */}
                  <div className="absolute bottom-0 left-0 w-24 sm:w-28 lg:w-32 h-0.5 sm:h-1 bg-gradient-to-r from-sawaari-yellow/40 to-transparent rounded-full animate-map-trail"></div>

                  {/* Small driving rickshaw - Responsive */}
                  <div className="text-lg sm:text-xl lg:text-2xl animate-rickshaw-drive relative z-10">
                    🛺
                  </div>

                  {/* Additional trail effects - Responsive */}
                  <div
                    className="absolute bottom-0 left-0 w-18 sm:w-20 lg:w-24 h-0.5 bg-gradient-to-r from-sawaari-yellow/30 to-transparent rounded-full animate-map-trail"
                    style={{ animationDelay: "2s" }}
                  ></div>
                </div>
              </div>

              {/* Floating particles for enhanced effect - Responsive */}
              <div className="absolute top-3 right-3 sm:top-4 sm:right-4 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-sawaari-yellow/40 rounded-full animate-subtle-float"></div>
              <div
                className="absolute bottom-6 right-6 sm:bottom-8 sm:right-8 w-1 h-1 bg-sawaari-yellow/50 rounded-full animate-subtle-float"
                style={{ animationDelay: "3s" }}
              ></div>
              <div
                className="absolute top-1/2 right-1/2 w-1 h-1 sm:w-1.5 sm:h-1.5 bg-sawaari-yellow/30 rounded-full animate-subtle-float"
                style={{ animationDelay: "1.5s" }}
              ></div>
            </div>

            {/* Additional decorative elements - Responsive */}
            <div className="absolute top-0 right-0 w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 border border-sawaari-yellow/20 rounded-full animate-subtle-float"></div>
            <div
              className="absolute bottom-0 left-0 w-10 h-10 sm:w-12 sm:h-12 border border-sawaari-yellow/20 rounded-full animate-subtle-float"
              style={{ animationDelay: "2s" }}
            ></div>
          </div>
        </div>
      </div>
    </section>
  );
}
