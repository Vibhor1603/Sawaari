import { useState, useEffect, useRef } from "react";

export default function Testimonials() {
  const [isVisible, setIsVisible] = useState(false);
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const sectionRef = useRef(null);

  const testimonials = [
    {
      id: 1,
      name: "Priya Sharma",
      role: "Daily Commuter",
      location: "Mumbai",
      avatar: "👩‍💼",
      text: "SAWAARI has completely transformed my daily commute! The real-time hotspots help me find autos instantly, and the fare estimates are always accurate.",
      highlight: "No more haggling!",
    },
    {
      id: 2,
      name: "Rajesh Kumar",
      role: "Business Professional",
      location: "Delhi",
      avatar: "👨‍💼",
      text: "As someone who travels frequently for work, SAWAARI's route planning is a game-changer. I save both time and money with their smart recommendations.",
      highlight: "Saves time & money",
    },
    {
      id: 3,
      name: "Anjali Patel",
      role: "Student",
      location: "Bangalore",
      avatar: "👩‍🎓",
      text: "The ride sharing feature is amazing! I've met so many fellow students and we split the fare. It's eco-friendly and budget-friendly.",
      highlight: "Eco-friendly",
    },
  ];

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
      <div className="container-sawaari">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-3 bg-sawaari-yellow-muted border border-sawaari-yellow-border rounded-full px-6 py-3 mb-6">
            <span className="text-2xl">💬</span>
            <span className="text-sm font-medium text-sawaari-yellow text-readable">
              What Our Users Say
            </span>
          </div>
          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6 text-readable">
            Real Stories, Real Impact
          </h2>
          <p className="text-xl text-gray-200 max-w-3xl mx-auto leading-relaxed text-readable-secondary">
            Discover how SAWAARI is transforming daily commutes across India
          </p>
        </div>

        {/* Main Testimonial Display */}
        <div className="max-w-4xl mx-auto mb-12">
          <div className="card p-8 lg:p-12 text-center">
            {/* Rating Stars */}
            <div className="flex justify-center mb-6">
              {[...Array(5)].map((_, i) => (
                <span key={i} className="text-2xl text-sawaari-yellow mx-1">
                  ⭐
                </span>
              ))}
            </div>

            {/* Testimonial Text */}
            <blockquote className="text-2xl lg:text-3xl text-white mb-8 leading-relaxed text-readable">
              "{currentTestimonial.text}"
            </blockquote>

            {/* Highlight Badge */}
            <div className="mb-8">
              <span className="inline-block bg-gradient-to-r from-sawaari-yellow to-sawaari-yellow/80 text-black font-bold px-4 py-2 rounded-full text-sm">
                {currentTestimonial.highlight}
              </span>
            </div>

            {/* Author Info */}
            <div className="flex items-center justify-center gap-4">
              <div className="w-16 h-16 bg-sawaari-yellow-muted border border-sawaari-yellow-border rounded-full flex items-center justify-center text-2xl">
                {currentTestimonial.avatar}
              </div>
              <div className="text-left">
                <h4 className="text-xl font-bold text-white text-readable">
                  {currentTestimonial.name}
                </h4>
                <p className="text-sawaari-yellow text-readable-secondary">
                  {currentTestimonial.role}
                </p>
                <p className="text-gray-400 text-sm text-readable-secondary">
                  {currentTestimonial.location}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Testimonial Navigation */}
        <div className="flex justify-center gap-3 mb-12">
          {testimonials.map((_, index) => (
            <button
              key={index}
              onClick={() => setActiveTestimonial(index)}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                index === activeTestimonial
                  ? "bg-sawaari-yellow scale-125"
                  : "bg-white/30 hover:bg-white/50"
              }`}
            />
          ))}
        </div>

        {/* Quick Stats */}
        <div className="grid md:grid-cols-3 gap-8 max-w-2xl mx-auto">
          <div className="text-center">
            <div className="text-4xl font-bold text-sawaari-yellow mb-2">
              50K+
            </div>
            <div className="text-gray-300 text-readable-secondary">
              Happy Users
            </div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-sawaari-yellow mb-2">
              4.9★
            </div>
            <div className="text-gray-300 text-readable-secondary">
              Average Rating
            </div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-sawaari-yellow mb-2">
              25+
            </div>
            <div className="text-gray-300 text-readable-secondary">
              Cities Covered
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
