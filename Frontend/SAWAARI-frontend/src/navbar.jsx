import { useContext } from "react";
import { NavLink } from "react-router-dom";
import { AuthContext } from "./AuthContext";

export default function Navbar() {
  const { isAuthenticated, user, isLoading } = useContext(AuthContext);

  return (
    <nav className="navbar fixed-top navbar-expand-lg">
      <div className="container-fluid">
        <NavLink to="/" className="navbar-brand">
          <img src="/logo.jpg" alt="SAWAARI" className="logo-img" />
          <span>SAWAARI</span>
        </NavLink>

        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
          aria-controls="navbarNav"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="navbarNav">
          <div className="navbar-nav nav-bar">
            <NavLink to="/home" className="nav-link nav-items">
              Home
            </NavLink>
            <NavLink to="/hotspots" className="nav-link nav-items">
              Hotspots
            </NavLink>
            <NavLink to="/routes" className="nav-link nav-items">
              Routes
            </NavLink>
            <NavLink to="/ridebuddy" className="nav-link nav-items">
              Ride Buddy
            </NavLink>
            <NavLink to="/feedbacks" className="nav-link nav-items">
              Contact
            </NavLink>
          </div>

          <div className="navbar-nav ms-auto">
            {!isAuthenticated ? (
              <>
                <NavLink className="nav-link signin-btn" to="/signin">
                  Sign In
                </NavLink>
                <NavLink className="nav-link login-btn" to="/signup">
                  Sign Up
                </NavLink>
              </>
            ) : (
              <>
                {user && (
                  <span className="nav-link user-info">
                    Welcome, {user.email}
                  </span>
                )}
                <NavLink className="nav-link login-btn" to="/logout">
                  Logout
                </NavLink>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
