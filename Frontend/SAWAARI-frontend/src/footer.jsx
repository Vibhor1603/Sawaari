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
              <span className="text-white font-bold text-2xl">S</span>
            </div>
            <div>
              <h5 className="text-2xl font-bold text-sawaari-green mb-1">
                SAWAARI
              </h5>
              <p className="text-text-muted font-medium">
                Smart Transportation Solutions
              </p>
              <p className="text-sm text-text-secondary font-kalam">
                हर सफर, एक नई कहानी
              </p>
            </div>
          </div>

          {/* Social Links */}
          <div className="flex justify-center md:justify-end">
            <nav className="flex flex-wrap gap-3">
              <a
                href="#"
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-neutral-200 rounded-full text-text-secondary hover:text-sawaari-yellow hover:border-sawaari-yellow hover:bg-sawaari-light-yellow transition-all duration-300 transform hover:scale-105"
              >
                <span>📘</span>
                <span className="hidden sm:inline">Facebook</span>
              </a>
              <a
                href="#"
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-neutral-200 rounded-full text-text-secondary hover:text-sawaari-yellow hover:border-sawaari-yellow hover:bg-sawaari-light-yellow transition-all duration-300 transform hover:scale-105"
              >
                <span>📷</span>
                <span className="hidden sm:inline">Instagram</span>
              </a>
              <a
                href="#"
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-neutral-200 rounded-full text-text-secondary hover:text-sawaari-yellow hover:border-sawaari-yellow hover:bg-sawaari-light-yellow transition-all duration-300 transform hover:scale-105"
              >
                <span>🐦</span>
                <span className="hidden sm:inline">Twitter</span>
              </a>
              <a
                href="/feedbacks"
                className="inline-flex items-center gap-2 px-4 py-2 glass border border-white/20 rounded-full text-text-secondary hover:text-accent-green hover:border-accent-green hover:bg-accent-green/10 transition-all duration-300 transform hover:scale-105"
              >
                <i className="fas fa-envelope"></i>
                <span className="hidden sm:inline">Contact</span>
              </a>
            </nav>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="border-t border-border-color pt-8 text-center">
          <div className="flex flex-col items-center gap-4">
            {/* Copyright */}
            <p className="text-text-secondary">
              &copy; 2024 SAWAARI. All rights reserved. | Made with ❤️ for
              India&apos;s Streets
            </p>

            {/* Links */}
            <div className="flex flex-wrap justify-center gap-6">
              <a
                href="#"
                className="text-text-muted hover:text-accent-yellow transition-colors duration-300 text-sm"
              >
                Privacy Policy
              </a>
              <a
                href="#"
                className="text-text-muted hover:text-accent-yellow transition-colors duration-300 text-sm"
              >
                Terms of Service
              </a>
              <a
                href="#"
                className="text-text-muted hover:text-accent-yellow transition-colors duration-300 text-sm"
              >
                Support
              </a>
              <a
                href="#"
                className="text-text-muted hover:text-accent-yellow transition-colors duration-300 text-sm"
              >
                About Us
              </a>
            </div>

            {/* Cultural Touch */}
            <div className="flex items-center gap-2 text-sm text-text-muted">
              <span>🛺</span>
              <span className="font-kalam">भारत की सड़कों का साथी</span>
              <span>🛺</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
