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
      {/* Subtle background decorations - floating auto rickshaw silhouettes, barely visible */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 text-6xl opacity-5 animate-subtle-float">
          🛺
        </div>
        <div
          className="absolute bottom-32 left-16 text-4xl opacity-5 animate-subtle-float"
          style={{ animationDelay: "2s" }}
        >
          🛺
        </div>

        {/* Route-inspired dotted lines connecting sections */}
        <div className="absolute top-1/3 left-0 w-full h-px route-line opacity-10"></div>
        <div
          className="absolute bottom-1/3 left-0 w-full h-px route-line opacity-10"
          style={{ animationDelay: "1s" }}
        ></div>
      </div>

      <div className="container-sawaari">
        <div className="grid lg:grid-cols-2 gap-16 items-center min-h-screen py-20">
          {/* Content Section - Clean and spacious */}
          <div className="max-w-2xl">
            {/* Clean badge - subtly Indian */}
            <div className="inline-flex items-center gap-3 bg-sawaari-yellow/20 border border-sawaari-yellow/40 rounded-full px-6 py-3 mb-8">
              <span className="text-2xl">🛺</span>
              <span className="text-sm font-medium text-sawaari-yellow">
                India&apos;s Ride Companion
              </span>
            </div>

            {/* Large, elegant SAWAARI wordmark */}
            <h1 className="mb-8">
              <span className="block text-6xl lg:text-7xl font-black text-white leading-none mb-4">
                SAWAARI
              </span>
              <span className="block text-xl lg:text-2xl font-normal text-gray-200">
                Your Journey, Simplified
              </span>
            </h1>

            {/* Simple tagline explaining the service clearly */}
            <p className="text-lg lg:text-xl text-gray-200 leading-relaxed mb-12 max-w-xl">
              Experience the convenience of finding, booking, and sharing auto
              rickshaw rides across India with our smart platform designed for
              modern travelers.
            </p>

            {/* Clean CTA buttons - following button design standards */}
            <div className="flex flex-col sm:flex-row gap-4 mb-12">
              <NavLink to="/hotspots" className="btn-primary">
                Find Rides
              </NavLink>
              <NavLink to="/ridebuddy" className="btn-secondary">
                Share Journey
              </NavLink>
            </div>

            {/* Feature indicators - minimal and clean */}
            <div className="flex gap-6">
              {features.map((feature, index) => (
                <button
                  key={feature.id}
                  className={`flex-1 p-4 text-left rounded-xl border transition-all duration-300 hover:shadow-lg ${
                    index === activeFeature
                      ? "border-sawaari-yellow bg-sawaari-yellow/20"
                      : "border-white/20 bg-black/40 hover:border-sawaari-yellow/50"
                  }`}
                  onClick={() => setActiveFeature(index)}
                >
                  <h3 className="font-semibold text-white mb-1">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-gray-200">{feature.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Visual Section - Artistic but functional rickshaw illustration */}
          <div className="flex justify-center items-center">
            <div className="relative">
              {/* Clean, line art style rickshaw illustration - premium yet accessible */}
              <div className="w-80 h-80 bg-gradient-to-br from-sawaari-yellow/30 to-sawaari-green/30 rounded-2xl flex items-center justify-center shadow-2xl border border-white/10">
                <div className="text-8xl opacity-80">🛺</div>
              </div>

              {/* Circular wheel motifs as design accents */}
              <div className="absolute -top-4 -right-4 w-8 h-8 border-2 border-sawaari-yellow rounded-full opacity-60 wheel-accent"></div>
              <div className="absolute -bottom-4 -left-4 w-6 h-6 border-2 border-sawaari-green rounded-full opacity-60 wheel-accent"></div>
              <div className="absolute top-1/2 -left-8 w-4 h-4 border-2 border-sawaari-yellow rounded-full opacity-40 wheel-accent"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
