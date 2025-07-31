/* eslint-disable no-unused-vars */
import React, { useContext } from "react";
import { NavLink } from "react-router-dom";
import { AuthContext } from "./AuthContext";
import About from "./about";
import Testimonials from "./testimonials";
import WhySawaari from "./WhySawaari";
import Footer from "./footer";
import { testimonials } from "./userTestimonials";
import InteractiveHero from "./Carousel";

export default function Root() {
  const { isAuthenticated, user } = useContext(AuthContext);

  return (
    <>
      <InteractiveHero />

      {/* User Dashboard Section - Only show for authenticated users */}
      {isAuthenticated && user && (
        <section className="user-dashboard-section">
          <div className="container">
            <div className="row">
              <div className="col-12">
                <div className="dashboard-header text-center mb-4">
                  <h2 className="dashboard-title">
                    Welcome back, {user.email?.split("@")[0] || "User"}!
                  </h2>
                  <p className="dashboard-subtitle text-muted">
                    Quick access to your favorite SAWAARI features
                  </p>
                </div>
              </div>
            </div>

            <div className="row g-4">
              {/* Ride Buddy Quick Access */}
              <div className="col-md-4">
                <div className="dashboard-card h-100">
                  <div className="card-body text-center">
                    <div className="dashboard-icon ride-buddy-icon mb-3">
                      <i className="fas fa-users"></i>
                    </div>
                    <h5 className="card-title">Ride Buddy</h5>
                    <p className="card-text text-muted">
                      Find travel companions and share rides to save money
                    </p>
                    <NavLink to="/ridebuddy" className="btn btn-primary">
                      <i className="fas fa-search me-2"></i>
                      Find Ride Buddy
                    </NavLink>
                  </div>
                </div>
              </div>

              {/* Hotspots Quick Access */}
              <div className="col-md-4">
                <div className="dashboard-card h-100">
                  <div className="card-body text-center">
                    <div className="dashboard-icon hotspots-icon mb-3">
                      <i className="fas fa-map-marker-alt"></i>
                    </div>
                    <h5 className="card-title">Smart Hotspots</h5>
                    <p className="card-text text-muted">
                      Discover nearby auto rickshaw availability in real-time
                    </p>
                    <NavLink to="/hotspots" className="btn btn-success">
                      <i className="fas fa-location-arrow me-2"></i>
                      View Hotspots
                    </NavLink>
                  </div>
                </div>
              </div>

              {/* Routes Quick Access */}
              <div className="col-md-4">
                <div className="dashboard-card h-100">
                  <div className="card-body text-center">
                    <div className="dashboard-icon routes-icon mb-3">
                      <i className="fas fa-route"></i>
                    </div>
                    <h5 className="card-title">Intelligent Routes</h5>
                    <p className="card-text text-muted">
                      Get optimal routes with dynamic fare estimates
                    </p>
                    <NavLink to="/routes" className="btn btn-warning">
                      <i className="fas fa-directions me-2"></i>
                      Plan Route
                    </NavLink>
                  </div>
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
