import React, { useState, useEffect, useRef } from "react";

export default function Testimonials({ testimonials }) {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef(null);

  // Intersection Observer for fade-in animation
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className={`testimonials-section ${isVisible ? "visible" : ""}`}
    >
      <div className="container">
        <div className="text-center mb-5">
          <h2 className="headings mb-3">What Our Users Say</h2>
          <p
            className="lead"
            style={{
              color: "var(--text-secondary)",
              maxWidth: "600px",
              margin: "0 auto",
            }}
          >
            Discover how SAWAARI is transforming urban transportation through
            the experiences of our valued users.
          </p>
        </div>

        <div className="test-box">
          {testimonials.map((testimonial, index) => (
            <div
              className={`testimonial ${isVisible ? "visible" : ""}`}
              key={index}
              style={{ animationDelay: `${index * 0.2}s` }}
            >
              <div className="testimonial-content">
                <div className="quote-icon mb-3">
                  <i
                    className="fas fa-quote-left"
                    style={{
                      color: "var(--accent-yellow)",
                      fontSize: "2rem",
                      textShadow: "0 0 10px rgba(255, 235, 59, 0.3)",
                    }}
                  ></i>
                </div>

                <p
                  className="testimonial-text mb-4"
                  style={{
                    color: "var(--text-primary)",
                    lineHeight: "1.7",
                    fontSize: "1.1rem",
                  }}
                >
                  &quot;{testimonial.text}&quot;
                </p>

                <div className="testimonial-author d-flex align-items-center">
                  <div className="author-image me-3">
                    <img
                      src={testimonial.imageSrc}
                      alt={testimonial.name}
                      className="rounded-circle"
                      style={{
                        width: "60px",
                        height: "60px",
                        objectFit: "cover",
                      }}
                    />
                  </div>
                  <div className="author-info">
                    <h5
                      className="mb-1"
                      style={{
                        color: "var(--accent-green)",
                        fontWeight: "600",
                      }}
                    >
                      {testimonial.name}
                    </h5>
                    <p
                      className="mb-0"
                      style={{
                        color: "var(--text-secondary)",
                        fontSize: "0.9rem",
                      }}
                    >
                      Verified User
                    </p>
                  </div>
                </div>

                <div className="rating mt-3">
                  {[...Array(5)].map((_, i) => (
                    <i
                      key={i}
                      className="fas fa-star"
                      style={{
                        color: "var(--accent-yellow)",
                        fontSize: "0.9rem",
                        marginRight: "0.2rem",
                      }}
                    ></i>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-5">
          <div
            className="alert alert-info"
            style={{
              background: "var(--tertiary-dark)",
              border: "1px solid var(--accent-yellow)",
              color: "var(--text-secondary)",
              maxWidth: "600px",
              margin: "0 auto",
              borderRadius: "16px",
            }}
          >
            <i
              className="fas fa-info-circle me-2"
              style={{ color: "var(--accent-yellow)" }}
            ></i>
            <strong>Note:</strong> These are sample testimonials for
            demonstration purposes and do not represent actual user feedback.
          </div>
        </div>
      </div>
    </section>
  );
}
