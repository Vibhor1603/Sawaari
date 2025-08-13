import { useState, useEffect, useRef } from "react";
import { testimonials } from "../../data";

export default function Testimonials() {
  const [isVisible, setIsVisible] = useState(false);
  const [activeTestimonial, setActiveTestimonial] = useState(0);
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

  // Auto-rotate testimonials
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [testimonials.length]);

  const currentTestimonial = testimonials[activeTestimonial];

  return (
    <section
      ref={sectionRef}
      className={`section section-dark transition-all duration-700 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      }`}
    >
      {/* Background Elements */}
      <div
        className="absolute inset-0 pointer-events-none overflow-hidden"
        style={{ zIndex: 1 }}
      >
        <div
          className="absolute top-[15%] left-[10%] text-lg sm:text-xl animate-subtle-float"
          style={{ opacity: 0.15, zIndex: 1 }}
        >
          🛺
        </div>
        <div
          className="hidden sm:block absolute top-[25%] right-[15%] text-lg sm:text-xl animate-subtle-float"
          style={{ animationDelay: "1s", opacity: 0.18, zIndex: 1 }}
        >
          🛺
        </div>
        <div
          className="hidden lg:block absolute bottom-[20%] left-[20%] text-sm sm:text-lg animate-subtle-float"
          style={{ animationDelay: "2s", opacity: 0.15, zIndex: 1 }}
        >
          🛺
        </div>
        <div
          className="hidden lg:block absolute bottom-[30%] right-[25%] text-sm sm:text-lg animate-subtle-float"
          style={{ animationDelay: "3s", opacity: 0.15, zIndex: 1 }}
        >
          🛺
        </div>
      </div>

      <div className="container-sawaari">
        {/* Header - Responsive */}
        <div className="text-center mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 sm:gap-3 bg-sawaari-yellow-muted border border-sawaari-yellow-border rounded-full px-4 sm:px-6 py-2 sm:py-3 mb-4 sm:mb-6">
            <span className="text-lg sm:text-xl lg:text-2xl">💬</span>
            <span className="text-xs sm:text-sm font-medium text-sawaari-yellow text-readable">
              What Our Users Say
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 sm:mb-6 text-readable px-4">
            Real Stories, Real Impact
          </h2>
          <p className="text-base sm:text-lg lg:text-xl text-gray-200 max-w-3xl mx-auto leading-relaxed text-readable-secondary px-4">
            Discover how SAWAARI is transforming daily commutes across India
          </p>
        </div>

        {/* Main Testimonial Display - Responsive */}
        <div className="max-w-4xl mx-auto mb-8 sm:mb-12">
          <div className="card p-4 sm:p-6 lg:p-8 xl:p-12 text-center">
            {/* Rating Stars - Responsive */}
            <div className="flex justify-center mb-4 sm:mb-6">
              {[...Array(5)].map((_, i) => (
                <span
                  key={i}
                  className="text-lg sm:text-xl lg:text-2xl text-sawaari-yellow mx-0.5 sm:mx-1"
                >
                  ⭐
                </span>
              ))}
            </div>

            {/* Testimonial Text - Responsive */}
            <blockquote className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-white mb-6 sm:mb-8 leading-relaxed text-readable px-2">
              &quot;{currentTestimonial.text}&quot;
            </blockquote>

            {/* Highlight Badge - Responsive */}
            <div className="mb-6 sm:mb-8">
              <span className="inline-block bg-gradient-to-r from-sawaari-yellow to-sawaari-yellow/80 text-black font-bold px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm">
                {currentTestimonial.highlight}
              </span>
            </div>

            {/* Author Info - Responsive */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-sawaari-yellow-muted border border-sawaari-yellow-border rounded-full flex items-center justify-center text-lg sm:text-xl lg:text-2xl">
                {currentTestimonial.avatar}
              </div>
              <div className="text-center sm:text-left">
                <h4 className="text-lg sm:text-xl font-bold text-white text-readable">
                  {currentTestimonial.name}
                </h4>
                <p className="text-sm sm:text-base text-sawaari-yellow text-readable-secondary">
                  {currentTestimonial.role}
                </p>
                <p className="text-xs sm:text-sm text-gray-400 text-readable-secondary">
                  {currentTestimonial.location}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Testimonial Navigation - Responsive */}
        <div className="flex justify-center gap-2 sm:gap-3 mb-8 sm:mb-12">
          {testimonials.map((_, index) => (
            <button
              key={index}
              onClick={() => setActiveTestimonial(index)}
              className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full transition-all duration-300 ${
                index === activeTestimonial
                  ? "bg-sawaari-yellow scale-125"
                  : "bg-white/30 hover:bg-white/50"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
