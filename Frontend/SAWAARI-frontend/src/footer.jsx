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

      <div className="container-sawaari py-12 relative z-10">
        <div className="grid md:grid-cols-2 gap-8 items-center mb-8">
          {/* Brand Section */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-sawaari-yellow rounded-full flex items-center justify-center">
              <span className="text-black font-bold text-2xl">S</span>
            </div>
            <div>
              <h5 className="text-2xl font-bold text-sawaari-yellow mb-1 text-readable">
                SAWAARI
              </h5>
              <p className="text-gray-300 font-medium text-readable-secondary">
                Smart Transportation Solutions
              </p>
              <p className="text-sm text-gray-400 text-readable-secondary">
                हर सफर, एक नई कहानी
              </p>
            </div>
          </div>
        </div>

        {/* Main Footer Content */}
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          {/* Company Info */}
          <div className="space-y-4">
            <h6 className="text-lg font-semibold text-white text-readable">
              About SAWAARI
            </h6>
            <p className="text-gray-300 leading-relaxed text-readable-secondary">
              Revolutionizing urban mobility by connecting passengers with
              reliable auto rickshaw services across India.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h6 className="text-lg font-semibold text-white text-readable">
              Quick Links
            </h6>
            <ul className="space-y-2">
              <li>
                <a
                  href="/hotspots"
                  className="text-gray-300 hover:text-sawaari-yellow transition-colors duration-300 text-readable-secondary"
                >
                  Find Hotspots
                </a>
              </li>
              <li>
                <a
                  href="/routes"
                  className="text-gray-300 hover:text-sawaari-yellow transition-colors duration-300 text-readable-secondary"
                >
                  Plan Routes
                </a>
              </li>
              <li>
                <a
                  href="/ridebuddy"
                  className="text-gray-300 hover:text-sawaari-yellow transition-colors duration-300 text-readable-secondary"
                >
                  Ride Buddy
                </a>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div className="space-y-4">
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
          <div className="space-y-4">
            <h6 className="text-lg font-semibold text-white text-readable">
              Contact Info
            </h6>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-sawaari-yellow">📧</span>
                <span className="text-gray-300 text-readable-secondary">
                  support@sawaari.com
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sawaari-yellow">📍</span>
                <span className="text-gray-300 text-readable-secondary">
                  Noida, Uttar Pradesh
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="border-t border-white/10 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-center md:text-left">
              <p className="text-gray-400 text-readable-secondary">
                © 2024 SAWAARI. All rights reserved.
              </p>
            </div>
            <div className="flex items-center gap-6">
              <span className="text-gray-400 text-readable-secondary">
                Made with ❤️ in India
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
