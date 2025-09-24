import { useContext, useState, useEffect, useRef } from "react";
import { NavLink } from "react-router-dom";
import { AuthContext } from "../../AuthContext";
import { useAuthModal } from "../../contexts/AuthModalContext";

export default function Navbar() {
  const { isAuthenticated, user } = useContext(AuthContext);
  const { openSigninModal, openSignupModal } = useAuthModal();
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
    <nav
      className="fixed top-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-md border-b border-white/10"
      ref={navRef}
    >
      <div className="container-sawaari">
        <div className="flex items-center justify-between h-16">
          {/* Enhanced Brand */}
          <NavLink
            to="/"
            className="flex items-center space-x-3 text-white hover:text-sawaari-yellow transition-colors duration-300"
          >
            <div className="w-14 h-10  rounded-full flex items-center justify-center shadow-sawaari-subtle">
              <span className="text-black font-bold text-lg"><img src="/logo.jpg" /></span>
            </div>
            <span className="text-xl font-bold text-sawaari-yellow text-readable">
              SAWAARI
            </span>
          </NavLink>

          {/* Enhanced Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-8">
            <div className="flex items-center space-x-1">
              <NavLink
                to="/home"
                className={({ isActive }) =>
                  `px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                    isActive
                      ? "text-sawaari-yellow bg-sawaari-yellow-muted border border-sawaari-yellow-border text-readable"
                      : "text-gray-300 hover:text-sawaari-yellow hover:bg-sawaari-yellow-muted/50 text-readable-secondary"
                  }`
                }
              >
                Home
              </NavLink>
              <NavLink
                to="/hotspots"
                className={({ isActive }) =>
                  `px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                    isActive
                      ? "text-sawaari-yellow bg-sawaari-yellow-muted border border-sawaari-yellow-border text-readable"
                      : "text-gray-300 hover:text-sawaari-yellow hover:bg-sawaari-yellow-muted/50 text-readable-secondary"
                  }`
                }
              >
                Rickshaw Points
              </NavLink>
              <NavLink
                to="/routes"
                className={({ isActive }) =>
                  `px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                    isActive
                      ? "text-sawaari-yellow bg-sawaari-yellow-muted border border-sawaari-yellow-border text-readable"
                      : "text-gray-300 hover:text-sawaari-yellow hover:bg-sawaari-yellow-muted/50 text-readable-secondary"
                  }`
                }
              >
                Route Planner
              </NavLink>
              <NavLink
                to="/ridebuddy"
                className={({ isActive }) =>
                  `px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                    isActive
                      ? "text-sawaari-yellow bg-sawaari-yellow-muted border border-sawaari-yellow-border text-readable"
                      : "text-gray-300 hover:text-sawaari-yellow hover:bg-sawaari-yellow-muted/50 text-readable-secondary"
                  }`
                }
              >
                Find Travel Buddy
              </NavLink>
              <NavLink
                to="/contact"
                className={({ isActive }) =>
                  `px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                    isActive
                      ? "text-sawaari-yellow bg-sawaari-yellow-muted border border-sawaari-yellow-border text-readable"
                      : "text-gray-300 hover:text-sawaari-yellow hover:bg-sawaari-yellow-muted/50 text-readable-secondary"
                  }`
                }
              >
                Contact Us
              </NavLink>
            </div>

            {/* Enhanced User Menu */}
            <div className="flex items-center space-x-4">
              {isAuthenticated ? (
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-sawaari-yellow-muted border border-sawaari-yellow-border rounded-full flex items-center justify-center">
                      <span className="text-sawaari-yellow text-sm font-medium text-readable">
                        {user.email?.charAt(0).toUpperCase() || "U"}
                      </span>
                    </div>
                    <span className="text-sm text-gray-300 hidden md:block text-readable-secondary">
                      {user.email?.split("@")[0] || "User"}
                    </span>
                  </div>
                  <NavLink
                    to="/profile"
                    className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-sawaari-yellow hover:bg-sawaari-yellow-muted/50 rounded-lg transition-all duration-300 text-readable-secondary"
                  >
                    Profile
                  </NavLink>
                  <NavLink
                    to="/logout"
                    className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-sawaari-yellow hover:bg-sawaari-yellow-muted/50 rounded-lg transition-all duration-300 text-readable-secondary"
                  >
                    Logout
                  </NavLink>
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  <button
                    onClick={openSigninModal}
                    className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-sawaari-yellow hover:bg-sawaari-yellow-muted/50 rounded-lg transition-all duration-300 text-readable-secondary"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={openSignupModal}
                    className="btn-primary px-4 py-2 text-sm"
                  >
                    Sign Up
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Enhanced Mobile Menu Button */}
          <button
            onClick={toggleNav}
            className="lg:hidden p-2 rounded-lg text-gray-300 hover:text-sawaari-yellow hover:bg-sawaari-yellow-muted/50 transition-all duration-300"
            aria-label="Toggle navigation menu"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {isNavOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>

        {/* Enhanced Mobile Navigation */}
        {isNavOpen && (
          <div className="lg:hidden py-4 border-t border-white/10">
            <div className="flex flex-col space-y-2">
              <NavLink
                to="/home"
                onClick={closeNav}
                className={({ isActive }) =>
                  `px-4 py-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                    isActive
                      ? "text-sawaari-yellow bg-sawaari-yellow-muted border border-sawaari-yellow-border text-readable"
                      : "text-gray-300 hover:text-sawaari-yellow hover:bg-sawaari-yellow-muted/50 text-readable-secondary"
                  }`
                }
              >
                Home
              </NavLink>
              <NavLink
                to="/hotspots"
                onClick={closeNav}
                className={({ isActive }) =>
                  `px-4 py-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                    isActive
                      ? "text-sawaari-yellow bg-sawaari-yellow-muted border border-sawaari-yellow-border text-readable"
                      : "text-gray-300 hover:text-sawaari-yellow hover:bg-sawaari-yellow-muted/50 text-readable-secondary"
                  }`
                }
              >
                Rickshaw Points
              </NavLink>
              <NavLink
                to="/routes"
                onClick={closeNav}
                className={({ isActive }) =>
                  `px-4 py-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                    isActive
                      ? "text-sawaari-yellow bg-sawaari-yellow-muted border border-sawaari-yellow-border text-readable"
                      : "text-gray-300 hover:text-sawaari-yellow hover:bg-sawaari-yellow-muted/50 text-readable-secondary"
                  }`
                }
              >
                Route Planner
              </NavLink>
              <NavLink
                to="/ridebuddy"
                onClick={closeNav}
                className={({ isActive }) =>
                  `px-4 py-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                    isActive
                      ? "text-sawaari-yellow bg-sawaari-yellow-muted border border-sawaari-yellow-border text-readable"
                      : "text-gray-300 hover:text-sawaari-yellow hover:bg-sawaari-yellow-muted/50 text-readable-secondary"
                  }`
                }
              >
                Find Travel Buddy
              </NavLink>
              <NavLink
                to="/contact"
                onClick={closeNav}
                className={({ isActive }) =>
                  `px-4 py-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                    isActive
                      ? "text-sawaari-yellow bg-sawaari-yellow-muted border border-sawaari-yellow-border text-readable"
                      : "text-gray-300 hover:text-sawaari-yellow hover:bg-sawaari-yellow-muted/50 text-readable-secondary"
                  }`
                }
              >
                Contact Us
              </NavLink>

              {/* Enhanced Mobile User Menu */}
              <div className="pt-4 border-t border-white/10">
                {isAuthenticated ? (
                  <div className="flex flex-col space-y-2">
                    <div className="flex items-center space-x-3 px-4 py-3">
                      <div className="w-8 h-8 bg-sawaari-yellow-muted border border-sawaari-yellow-border rounded-full flex items-center justify-center">
                        <span className="text-sawaari-yellow text-sm font-medium text-readable">
                          {user.email?.charAt(0).toUpperCase() || "U"}
                        </span>
                      </div>
                      <span className="text-sm text-gray-300 text-readable-secondary">
                        {user.email?.split("@")[0] || "User"}
                      </span>
                    </div>
                    <NavLink
                      to="/profile"
                      onClick={closeNav}
                      className="px-4 py-3 text-sm font-medium text-gray-300 hover:text-sawaari-yellow hover:bg-sawaari-yellow-muted/50 rounded-lg transition-all duration-300 text-readable-secondary"
                    >
                      Profile
                    </NavLink>
                    <NavLink
                      to="/logout"
                      onClick={closeNav}
                      className="px-4 py-3 text-sm font-medium text-gray-300 hover:text-sawaari-yellow hover:bg-sawaari-yellow-muted/50 rounded-lg transition-all duration-300 text-readable-secondary"
                    >
                      Logout
                    </NavLink>
                  </div>
                ) : (
                  <div className="flex flex-col space-y-2">
                    <button
                      onClick={() => {
                        openSigninModal();
                        closeNav();
                      }}
                      className="px-4 py-3 text-sm font-medium text-gray-300 hover:text-sawaari-yellow hover:bg-sawaari-yellow-muted/50 rounded-lg transition-all duration-300 text-readable-secondary text-left"
                    >
                      Sign In
                    </button>
                    <button
                      onClick={() => {
                        openSignupModal();
                        closeNav();
                      }}
                      className="btn-primary px-4 py-3 text-sm text-left"
                    >
                      Sign Up
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
