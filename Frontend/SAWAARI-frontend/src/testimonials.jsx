import { useState, useEffect, useRef } from "react";

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
      className={`relative bg-gradient-to-br from-primary-dark via-secondary-dark to-tertiary-dark py-20 overflow-hidden transition-all duration-700 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      }`}
    >
      {/* Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[10%] left-[5%] text-2xl opacity-20 animate-float">
          💬
        </div>
        <div
          className="absolute top-[20%] right-[8%] text-2xl opacity-20 animate-float"
          style={{ animationDelay: "1s" }}
        >
          ⭐
        </div>
        <div
          className="absolute bottom-[15%] left-[12%] text-2xl opacity-20 animate-float"
          style={{ animationDelay: "2s" }}
        >
          👥
        </div>
        <div
          className="absolute bottom-[25%] right-[15%] text-2xl opacity-20 animate-float"
          style={{ animationDelay: "3s" }}
        >
          🛺
        </div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-3 glass border-2 border-accent-green rounded-full px-6 py-3 mb-8">
            <span className="text-2xl animate-bounce-slow">💬</span>
            <span className="text-lg font-semibold text-text-primary">
              User Stories
            </span>
          </div>
          <h2 className="text-4xl lg:text-5xl font-bold text-text-primary mb-6">
            What Our <span className="gradient-text">Users Say</span>
          </h2>
          <p className="text-lg lg:text-xl text-text-secondary max-w-3xl mx-auto leading-relaxed">
            Discover how SAWAARI is transforming urban transportation through
            the experiences of our valued users.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials &&
            testimonials.map((testimonial, index) => (
              <div
                key={index}
                className={`glass-strong rounded-2xl p-8 border border-border-color transition-all duration-700 hover:scale-105 hover:shadow-2xl ${
                  isVisible
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-8"
                }`}
                style={{ animationDelay: `${index * 0.2}s` }}
              >
                {/* Quote Icon */}
                <div className="mb-6">
                  <i className="fas fa-quote-left text-3xl text-accent-yellow drop-shadow-lg"></i>
                </div>

                {/* Testimonial Text */}
                <p className="text-lg text-text-primary leading-relaxed mb-6 italic">
                  &quot;{testimonial.text}&quot;
                </p>

                {/* Author Info */}
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <img
                      src={testimonial.imageSrc}
                      alt={testimonial.name}
                      className="w-16 h-16 rounded-full object-cover border-2 border-accent-green shadow-lg"
                    />
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-accent-green rounded-full flex items-center justify-center">
                      <i className="fas fa-check text-primary-dark text-xs"></i>
                    </div>
                  </div>
                  <div>
                    <h5 className="text-lg font-bold text-accent-green">
                      {testimonial.name}
                    </h5>
                    <p className="text-sm text-text-secondary">
                      {testimonial.role || "SAWAARI User"}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      {[...Array(5)].map((_, i) => (
                        <i
                          key={i}
                          className="fas fa-star text-accent-yellow text-xs"
                        ></i>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Decorative Element */}
                <div className="absolute top-4 right-4 w-8 h-8 bg-accent-yellow/20 rounded-full flex items-center justify-center">
                  <span className="text-lg">🛺</span>
                </div>
              </div>
            ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <div className="glass rounded-2xl p-8 max-w-2xl mx-auto">
            <h3 className="text-2xl font-bold text-text-primary mb-4">
              Join Thousands of Happy Users!
            </h3>
            <p className="text-text-secondary mb-6">
              Experience the convenience and reliability that our users love.
              Start your SAWAARI journey today.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="px-8 py-4 bg-gradient-to-r from-accent-green to-accent-yellow text-primary-dark font-bold rounded-full hover:shadow-lg transition-all duration-300 transform hover:scale-105">
                Get Started Now
              </button>
              <button className="px-8 py-4 border-2 border-border-color text-text-secondary rounded-full hover:border-accent-yellow hover:text-accent-yellow transition-all duration-300">
                Read More Reviews
              </button>
            </div>
          </div>

          {/* Demo Note */}
          <div className="mt-8">
            <div className="glass border-2 border-accent-yellow rounded-2xl p-4 max-w-2xl mx-auto">
              <div className="flex items-center justify-center gap-2 text-accent-yellow">
                <i className="fas fa-info-circle"></i>
                <span className="font-semibold">Demo Note:</span>
              </div>
              <p className="text-text-secondary text-sm mt-2">
                These are sample testimonials for demonstration purposes and do
                not represent actual user feedback.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
