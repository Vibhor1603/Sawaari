import React, { useState, useEffect, useRef } from "react";

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
    <footer ref={footerRef} className={`footer ${isVisible ? "visible" : ""}`}>
      <div className="container">
        <div className="row align-items-center">
          <div className="col-md-6">
            <div className="d-flex align-items-center mb-3 mb-md-0">
              <img src="/logo.jpg" alt="SAWAARI" className="logo-img me-3" />
              <div>
                <h5
                  className="mb-1"
                  style={{ color: "var(--accent-green)", fontWeight: "700" }}
                >
                  SAWAARI
                </h5>
                <p className="mb-0 text-muted">
                  Smart Transportation Solutions
                </p>
              </div>
            </div>
          </div>

          <div className="col-md-6">
            <div className="d-flex justify-content-md-end justify-content-center">
              <nav>
                <ul className="list-inline mb-0">
                  <li className="list-inline-item">
                    <a href="#" className="btn btn-light">
                      <i className="fab fa-facebook-f me-1"></i>
                      Facebook
                    </a>
                  </li>
                  <li className="list-inline-item">
                    <a href="#" className="btn btn-light">
                      <i className="fab fa-instagram me-1"></i>
                      Instagram
                    </a>
                  </li>
                  <li className="list-inline-item">
                    <a href="#" className="btn btn-light">
                      <i className="fab fa-twitter me-1"></i>
                      Twitter
                    </a>
                  </li>
                  <li className="list-inline-item">
                    <a href="/feedbacks" className="btn btn-light">
                      <i className="fas fa-envelope me-1"></i>
                      Contact
                    </a>
                  </li>
                </ul>
              </nav>
            </div>
          </div>
        </div>

        <div className="footer-bottom text-center">
          <p className="mb-2">&copy; 2024 SAWAARI. All rights reserved.</p>
          <div>
            <a href="#" className="me-3">
              Privacy Policy
            </a>
            <a href="#" className="me-3">
              Terms of Service
            </a>
            <a href="#" className="me-3">
              Support
            </a>
            <a href="#">About Us</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
