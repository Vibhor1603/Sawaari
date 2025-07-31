import React, { useContext } from "react";
import { NavLink } from "react-router-dom";
import { AuthContext } from "./AuthContext";
import About from "./about";
import WhySawaari from "./WhySawaari";
import InteractiveHero from "./Carousel";

export default function Root() {
  const { isAuthenticated, user } = useContext(AuthContext);

  return (
    <>
      <InteractiveHero />

      {/* User Dashboard Section - Clean modern design */}
      {isAuthenticated && user && (
        <section className="section section-dark">
          <div className="container-sawaari">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-3 bg-sawaari-yellow/20 border border-sawaari-yellow/40 rounded-full px-6 py-3 mb-6">
                <span className="text-2xl">👋</span>
                <span className="text-sm font-medium text-sawaari-yellow">
                  Welcome back, {user.email?.split("@")[0] || "User"}!
                </span>
              </div>
              <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
                Your SAWAARI Dashboard
              </h2>
              <p className="text-lg text-gray-300 max-w-2xl mx-auto">
                Quick access to your favorite transportation features
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {/* Ride Buddy Card */}
              <div className="card group hover:shadow-sawaari-lg transition-all duration-300">
                <div className="p-8 text-center">
                  <div className="w-16 h-16 bg-sawaari-yellow/20 border border-sawaari-yellow/40 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                    <span className="text-2xl">👥</span>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-3">
                    Ride Buddy
                  </h3>
                  <p className="text-gray-300 mb-6">
                    Find travel companions and share rides to save money
                  </p>
                  <NavLink to="/ridebuddy" className="btn-primary w-full">
                    Find Ride Buddy
                  </NavLink>
                </div>
              </div>

              {/* Hotspots Card */}
              <div className="card group hover:shadow-sawaari-lg transition-all duration-300">
                <div className="p-8 text-center">
                  <div className="w-16 h-16 bg-sawaari-yellow/20 border border-sawaari-yellow/40 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                    <span className="text-2xl">🔥</span>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-3">
                    Smart Hotspots
                  </h3>
                  <p className="text-gray-300 mb-6">
                    Discover nearby auto rickshaw availability in real-time
                  </p>
                  <NavLink to="/hotspots" className="btn-primary w-full">
                    View Hotspots
                  </NavLink>
                </div>
              </div>

              {/* Routes Card */}
              <div className="card group hover:shadow-sawaari-lg transition-all duration-300">
                <div className="p-8 text-center">
                  <div className="w-16 h-16 bg-sawaari-yellow/20 border border-sawaari-yellow/40 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                    <span className="text-2xl">🗺️</span>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-3">
                    Intelligent Routes
                  </h3>
                  <p className="text-gray-300 mb-6">
                    Get optimal routes with dynamic fare estimates
                  </p>
                  <NavLink to="/routes" className="btn-primary w-full">
                    Plan Route
                  </NavLink>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      <WhySawaari />
      <About />
    </>
  );
}
