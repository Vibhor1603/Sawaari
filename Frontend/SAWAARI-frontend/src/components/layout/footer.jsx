import { useState, useEffect, useRef } from "react";

export default function Footer() {
  const [isVisible, setIsVisible] = useState(false);
  const footerRef = useRef(null);

  // Intersection Observer for fade-in animation
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.2 }
    );

    if (footerRef.current) {
      observer.observe(footerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <footer
      ref={footerRef}
      className={`relative section-dark border-t border-white/20 transition-all duration-700 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      }`}
    >
      {/* Street Elements Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-4 left-[10%] text-lg opacity-10 animate-subtle-float">
          🛺
        </div>
        <div
          className="absolute top-6 right-[15%] text-lg opacity-10 animate-subtle-float"
          style={{ animationDelay: "1s" }}
        >
          🛺
        </div>
        <div
          className="absolute bottom-4 left-[20%] text-lg opacity-10 animate-subtle-float"
          style={{ animationDelay: "2s" }}
        >
          🛺
        </div>
        <div
          className="absolute bottom-6 right-[25%] text-lg opacity-10 animate-subtle-float"
          style={{ animationDelay: "3s" }}
        >
          🛺
        </div>
      </div>

      <div className="container-sawaari py-6 sm:py-12 relative z-10">
        <div className="grid md:grid-cols-2 gap-4 sm:gap-8 items-center mb-6 sm:mb-8">
          {/* Brand Section */}
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-sawaari-yellow rounded-full flex items-center justify-center">
              <span className="text-black font-bold text-lg sm:text-2xl">
                S
              </span>
            </div>
            <div>
              <h5 className="text-xl sm:text-2xl font-bold text-sawaari-yellow mb-1 text-readable">
                SAWAARI
              </h5>
              <p className="text-sm sm:text-base text-gray-300 font-medium text-readable-secondary">
                Smart Transportation Solutions
              </p>
              <p className="text-xs sm:text-sm text-gray-400 text-readable-secondary">
                हर सफर, एक नई कहानी
              </p>
            </div>
          </div>
        </div>

        {/* Main Footer Content */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-8 mb-6 sm:mb-8">
          {/* Company Info */}
          <div className="col-span-2 md:col-span-1 space-y-3 sm:space-y-4">
            <h6 className="text-sm sm:text-lg font-semibold text-white text-readable">
              About SAWAARI
            </h6>
            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed text-readable-secondary">
              Revolutionizing urban mobility by connecting passengers with
              reliable auto rickshaw services across India.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-3 sm:space-y-4">
            <h6 className="text-sm sm:text-lg font-semibold text-white text-readable">
              Quick Links
            </h6>
            <ul className="space-y-1 sm:space-y-2">
              <li>
                <a
                  href="/hotspots"
                  className="text-xs sm:text-sm text-gray-300 hover:text-sawaari-yellow transition-colors duration-300 text-readable-secondary"
                >
                  Rickshaw Points
                </a>
              </li>
              <li>
                <a
                  href="/routes"
                  className="text-xs sm:text-sm text-gray-300 hover:text-sawaari-yellow transition-colors duration-300 text-readable-secondary"
                >
                  Route Planner
                </a>
              </li>
              <li>
                <a
                  href="/ridebuddy"
                  className="text-xs sm:text-sm text-gray-300 hover:text-sawaari-yellow transition-colors duration-300 text-readable-secondary"
                >
                  Find Travel Buddy
                </a>
              </li>
            </ul>
          </div>

          {/* Support - Hidden on mobile to save space */}
          <div className="hidden md:block space-y-4">
            <h6 className="text-lg font-semibold text-white text-readable">
              Support
            </h6>
            <ul className="space-y-2">
              <li>
                <a
                  href="/contact"
                  className="text-gray-300 hover:text-sawaari-yellow transition-colors duration-300 text-readable-secondary"
                >
                  Contact Us
                </a>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div className="space-y-3 sm:space-y-4 min-w-0">
            <h6 className="text-sm sm:text-lg font-semibold text-white text-readable">
              Contact
            </h6>
            <div className="space-y-2 sm:space-y-3">
              <div className="flex items-start gap-2 sm:gap-3">
                <span className="text-sawaari-yellow text-sm flex-shrink-0">
                  📧
                </span>
                <span className="text-xs sm:text-sm text-gray-300 text-readable-secondary break-words min-w-0">
                  sawaaribyvibhor@gmail.com
                </span>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="text-sawaari-yellow text-sm">📍</span>
                <span className="text-xs sm:text-sm text-gray-300 text-readable-secondary">
                  Noida, UP
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="border-t border-white/10 pt-4 sm:pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-2 sm:gap-4">
            <div className="text-center md:text-left">
              <p className="text-xs sm:text-sm text-gray-400 text-readable-secondary">
                © 2024 SAWAARI. All rights reserved.
              </p>
            </div>
            <div className="flex items-center gap-6">
              <span className="text-xs sm:text-sm text-gray-400 text-readable-secondary">
                Made with ❤️ in India
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
