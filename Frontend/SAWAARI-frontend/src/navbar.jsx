import { useContext, useState, useEffect, useRef } from "react";
import { NavLink } from "react-router-dom";
import { AuthContext } from "./AuthContext";

export default function Navbar() {
  const { isAuthenticated, user } = useContext(AuthContext);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const navRef = useRef(null);

  const toggleNav = () => {
    setIsNavOpen(!isNavOpen);
  };

  const closeNav = () => {
    setIsNavOpen(false);
  };

  // Close navbar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (navRef.current && !navRef.current.contains(event.target)) {
        setIsNavOpen(false);
      }
    };

    if (isNavOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isNavOpen]);

  return (
    <nav className="navbar fixed-top navbar-expand-lg" ref={navRef}>
      <div className="container-fluid">
        <NavLink to="/" className="navbar-brand">
          <img src="/logo.jpg" alt="SAWAARI" className="logo-img" />
          <span>SAWAARI</span>
        </NavLink>

        <button
          className="navbar-toggler"
          type="button"
          onClick={toggleNav}
          aria-controls="navbarNav"
          aria-expanded={isNavOpen}
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div
          className={`collapse navbar-collapse ${isNavOpen ? "show" : ""}`}
          id="navbarNav"
        >
          <div className="navbar-nav nav-bar">
            <NavLink
              to="/home"
              className="nav-link nav-items"
              onClick={closeNav}
            >
              Home
            </NavLink>
            <NavLink
              to="/hotspots"
              className="nav-link nav-items"
              onClick={closeNav}
            >
              Hotspots
            </NavLink>
            <NavLink
              to="/routes"
              className="nav-link nav-items"
              onClick={closeNav}
            >
              Routes
            </NavLink>
            <NavLink
              to="/ridebuddy"
              className="nav-link nav-items"
              onClick={closeNav}
            >
              Ride Buddy
            </NavLink>
            <NavLink
              to="/feedbacks"
              className="nav-link nav-items"
              onClick={closeNav}
            >
              Contact
            </NavLink>
          </div>

          <div className="navbar-nav ms-auto">
            {!isAuthenticated ? (
              <>
                <NavLink
                  className="nav-link signin-btn"
                  to="/signin"
                  onClick={closeNav}
                >
                  Sign In
                </NavLink>
                <NavLink
                  className="nav-link login-btn"
                  to="/signup"
                  onClick={closeNav}
                >
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
                <NavLink
                  className="nav-link login-btn"
                  to="/logout"
                  onClick={closeNav}
                >
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
