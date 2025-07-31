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
    <nav
      className="fixed top-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-md border-b border-white/10"
      ref={navRef}
    >
      <div className="container-sawaari">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <NavLink
            to="/"
            className="flex items-center space-x-3 text-white hover:text-sawaari-yellow transition-colors duration-300"
          >
            <div className="w-10 h-10 bg-sawaari-yellow rounded-full flex items-center justify-center">
              <span className="text-black font-bold text-lg">S</span>
            </div>
            <span className="text-xl font-bold text-sawaari-yellow">
              SAWAARI
            </span>
          </NavLink>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-8">
            <div className="flex items-center space-x-1">
              <NavLink
                to="/home"
                className={({ isActive }) =>
                  `px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                    isActive
                      ? "text-sawaari-yellow bg-sawaari-yellow/20"
                      : "text-gray-300 hover:text-sawaari-yellow hover:bg-sawaari-yellow/10"
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
                      ? "text-sawaari-yellow bg-sawaari-yellow/20"
                      : "text-gray-300 hover:text-sawaari-yellow hover:bg-sawaari-yellow/10"
                  }`
                }
              >
                Hotspots
              </NavLink>
              <NavLink
                to="/routes"
                className={({ isActive }) =>
                  `px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                    isActive
                      ? "text-sawaari-yellow bg-sawaari-yellow/20"
                      : "text-gray-300 hover:text-sawaari-yellow hover:bg-sawaari-yellow/10"
                  }`
                }
              >
                Routes
              </NavLink>
              <NavLink
                to="/ridebuddy"
                className={({ isActive }) =>
                  `px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                    isActive
                      ? "text-sawaari-yellow bg-sawaari-yellow/20"
                      : "text-gray-300 hover:text-sawaari-yellow hover:bg-sawaari-yellow/10"
                  }`
                }
              >
                Ride Buddy
              </NavLink>
              <NavLink
                to="/feedbacks"
                className={({ isActive }) =>
                  `px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                    isActive
                      ? "text-sawaari-yellow bg-sawaari-yellow/20"
                      : "text-gray-300 hover:text-sawaari-yellow hover:bg-sawaari-yellow/10"
                  }`
                }
              >
                Contact
              </NavLink>
            </div>

            {/* Auth Buttons */}
            <div className="flex items-center space-x-3">
              {!isAuthenticated ? (
                <>
                  <NavLink to="/signin" className="btn-secondary">
                    Sign In
                  </NavLink>
                  <NavLink to="/signup" className="btn-primary">
                    Sign Up
                  </NavLink>
                </>
              ) : (
                <>
                  {user && (
                    <span className="text-sm text-gray-200">
                      Welcome,{" "}
                      <span className="text-sawaari-yellow font-medium">
                        {user.email?.split("@")[0]}
                      </span>
                    </span>
                  )}
                  <NavLink to="/logout" className="btn-primary">
                    Logout
                  </NavLink>
                </>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={toggleNav}
            className="lg:hidden p-2 rounded-lg text-gray-300 hover:text-sawaari-yellow hover:bg-sawaari-yellow/10 transition-all duration-300"
            aria-controls="mobile-menu"
            aria-expanded={isNavOpen}
            aria-label="Toggle navigation"
          >
            <div className="w-6 h-6 flex flex-col justify-center items-center">
              <span
                className={`block h-0.5 w-6 bg-current transition-all duration-300 ${
                  isNavOpen ? "rotate-45 translate-y-1" : "-translate-y-1"
                }`}
              ></span>
              <span
                className={`block h-0.5 w-6 bg-current transition-all duration-300 ${
                  isNavOpen ? "opacity-0" : "opacity-100"
                }`}
              ></span>
              <span
                className={`block h-0.5 w-6 bg-current transition-all duration-300 ${
                  isNavOpen ? "-rotate-45 -translate-y-1" : "translate-y-1"
                }`}
              ></span>
            </div>
          </button>
        </div>

        {/* Mobile Navigation */}
        <div
          className={`lg:hidden transition-all duration-300 ease-in-out ${
            isNavOpen
              ? "max-h-96 opacity-100"
              : "max-h-0 opacity-0 overflow-hidden"
          }`}
        >
          <div className="px-2 pt-2 pb-3 space-y-1 bg-black/90 border border-white/20 rounded-lg mt-2 mb-4 shadow-lg">
            <NavLink
              to="/home"
              onClick={closeNav}
              className={({ isActive }) =>
                `block px-4 py-3 rounded-lg text-base font-medium transition-all duration-300 ${
                  isActive
                    ? "text-sawaari-yellow bg-sawaari-yellow/20"
                    : "text-gray-300 hover:text-sawaari-yellow hover:bg-sawaari-yellow/10"
                }`
              }
            >
              Home
            </NavLink>
            <NavLink
              to="/hotspots"
              onClick={closeNav}
              className={({ isActive }) =>
                `block px-4 py-3 rounded-lg text-base font-medium transition-all duration-300 ${
                  isActive
                    ? "text-sawaari-yellow bg-sawaari-yellow/20"
                    : "text-gray-300 hover:text-sawaari-yellow hover:bg-sawaari-yellow/10"
                }`
              }
            >
              Hotspots
            </NavLink>
            <NavLink
              to="/routes"
              onClick={closeNav}
              className={({ isActive }) =>
                `block px-4 py-3 rounded-lg text-base font-medium transition-all duration-300 ${
                  isActive
                    ? "text-sawaari-yellow bg-sawaari-yellow/20"
                    : "text-gray-300 hover:text-sawaari-yellow hover:bg-sawaari-yellow/10"
                }`
              }
            >
              Routes
            </NavLink>
            <NavLink
              to="/ridebuddy"
              onClick={closeNav}
              className={({ isActive }) =>
                `block px-4 py-3 rounded-lg text-base font-medium transition-all duration-300 ${
                  isActive
                    ? "text-sawaari-yellow bg-sawaari-yellow/20"
                    : "text-gray-300 hover:text-sawaari-yellow hover:bg-sawaari-yellow/10"
                }`
              }
            >
              Ride Buddy
            </NavLink>
            <NavLink
              to="/feedbacks"
              onClick={closeNav}
              className={({ isActive }) =>
                `block px-4 py-3 rounded-lg text-base font-medium transition-all duration-300 ${
                  isActive
                    ? "text-sawaari-yellow bg-sawaari-yellow/20"
                    : "text-gray-300 hover:text-sawaari-yellow hover:bg-sawaari-yellow/10"
                }`
              }
            >
              Contact
            </NavLink>

            <div className="border-t border-white/20 pt-4 mt-4">
              {!isAuthenticated ? (
                <div className="space-y-2">
                  <NavLink
                    to="/signin"
                    onClick={closeNav}
                    className="btn-secondary w-full"
                  >
                    Sign In
                  </NavLink>
                  <NavLink
                    to="/signup"
                    onClick={closeNav}
                    className="btn-primary w-full"
                  >
                    Sign Up
                  </NavLink>
                </div>
              ) : (
                <div className="space-y-2">
                  {user && (
                    <div className="px-3 py-2 text-sm text-gray-300 text-center">
                      Welcome,{" "}
                      <span className="text-sawaari-yellow font-medium">
                        {user.email?.split("@")[0]}
                      </span>
                    </div>
                  )}
                  <NavLink
                    to="/logout"
                    onClick={closeNav}
                    className="btn-primary w-full"
                  >
                    Logout
                  </NavLink>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
