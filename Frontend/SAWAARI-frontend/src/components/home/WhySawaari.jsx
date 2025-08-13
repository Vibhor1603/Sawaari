import { useState, useEffect, useRef } from "react";

export default function WhySawaari() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef(null);

  const stories = [
    {
      title: "The Heartbeat of India",
      hindi: "भारत की धड़कन",
      description:
        "Auto rickshaws connect millions of stories across Indian streets every single day.",
      stat: "50M+",
      statLabel: "Daily Rides",
    },
    {
      title: "Every Lane, Every Story",
      hindi: "हर गली, हर कहानी",
      description:
        "From narrow bylanes to busy highways, reaching every destination that matters.",
      stat: "95%",
      statLabel: "Street Coverage",
    },
    {
      title: "Affordable for Everyone",
      hindi: "सबके लिए सुलभ",
      description:
        "Making mobility a right, not a luxury, for every Indian citizen.",
      stat: "₹15-50",
      statLabel: "Average Fare",
    },
    {
      title: "Eco-Friendly Future",
      hindi: "हरित भविष्य",
      description:
        "Leading India's green transportation revolution with CNG and electric variants.",
      stat: "60%",
      statLabel: "Less Emissions",
    },
  ];

  const insights = [
    "Turn in a 3-meter radius",
    "40% less fuel than cars",
    "Navigate 2-meter lanes",
    "5M+ drivers' livelihood",
    "Available 24/7",
    "Carry up to 6 passengers",
  ];

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className={`py-16 md:py-20 relative transition-all duration-1000 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* Subtle Background Elements */}
      <div
        className="absolute inset-0 pointer-events-none overflow-hidden"
        style={{ zIndex: 1 }}
      >
        <div
          className="absolute top-[20%] left-[8%] text-xl sm:text-2xl animate-subtle-float"
          style={{ opacity: 0.15, zIndex: 1 }}
        >
          🛺
        </div>
        <div
          className="hidden sm:block absolute top-[30%] right-[12%] text-xl sm:text-2xl animate-subtle-float"
          style={{ animationDelay: "1s", opacity: 0.18, zIndex: 1 }}
        >
          🛺
        </div>
        <div
          className="hidden lg:block absolute bottom-[25%] left-[15%] text-lg sm:text-xl animate-subtle-float"
          style={{ animationDelay: "2s", opacity: 0.15, zIndex: 1 }}
        >
          🛺
        </div>
      </div>

      <div className="container-sawaari relative z-10">
        {/* Compact Header with Attention-Grabbing Elements */}
        <div className="text-center mb-16 md:mb-20">
          <div className="mb-6 relative">
            <span className="text-5xl md:text-6xl animate-bounce-slow">🛺</span>
            {/* Subtle glow effect */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 bg-sawaari-yellow/20 rounded-full animate-pulse-slow"></div>
            </div>
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-light text-white mb-6 tracking-wide">
            Why Auto Rickshaws?
          </h2>
          <div className="w-24 h-px bg-sawaari-yellow mx-auto mb-6 animate-pulse-slow"></div>
          <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto font-light leading-relaxed">
            More than transportation. A way of life.
          </p>
        </div>

        {/* Stories Grid - Tighter Spacing */}
        <div className="grid lg:grid-cols-2 gap-8 md:gap-12 mb-16 md:mb-20">
          {stories.map((story, index) => (
            <div
              key={index}
              className={`group transition-all duration-700 ${
                isVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-8"
              }`}
              style={{ transitionDelay: `${index * 150}ms` }}
            >
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8 hover:bg-white/8 hover:border-sawaari-yellow/30 hover:scale-105 transition-all duration-500 h-full relative overflow-hidden">
                {/* Subtle animated accent */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-sawaari-yellow/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                <div className="flex items-start justify-between mb-6">
                  <div className="flex-1">
                    <h3 className="text-xl md:text-2xl font-medium text-white mb-2 group-hover:text-sawaari-yellow/90 transition-colors duration-300">
                      {story.title}
                    </h3>
                    <p className="text-sawaari-yellow/80 text-sm font-light mb-4">
                      {story.hindi}
                    </p>
                  </div>
                  <div className="text-right ml-6">
                    <div className="text-2xl md:text-3xl font-bold text-sawaari-yellow mb-1 group-hover:scale-110 transition-transform duration-300">
                      {story.stat}
                    </div>
                    <div className="text-xs text-gray-400 uppercase tracking-wider">
                      {story.statLabel}
                    </div>
                  </div>
                </div>
                <p className="text-gray-300 leading-relaxed font-light text-sm md:text-base">
                  {story.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Insights Section - Compact Design */}
        <div className="text-center mb-12">
          <h3 className="text-2xl md:text-3xl font-light text-white mb-4">
            Quick Insights
          </h3>
          <div className="w-16 h-px bg-sawaari-yellow mx-auto mb-8 animate-pulse-slow"></div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto mb-16">
          {insights.map((insight, index) => (
            <div
              key={index}
              className={`text-center transition-all duration-700 ${
                isVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-4"
              }`}
              style={{ transitionDelay: `${400 + index * 80}ms` }}
            >
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 md:p-6 hover:bg-white/8 hover:border-sawaari-yellow/30 hover:scale-105 transition-all duration-300 group relative">
                {/* Animated dot with pulse effect */}
                <div className="w-10 h-10 md:w-12 md:h-12 bg-sawaari-yellow/20 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4 group-hover:bg-sawaari-yellow/30 transition-colors duration-300 relative">
                  <div className="w-2 h-2 bg-sawaari-yellow rounded-full animate-pulse-slow"></div>
                  {/* Ripple effect on hover */}
                  <div className="absolute inset-0 bg-sawaari-yellow/20 rounded-full scale-0 group-hover:scale-150 opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
                </div>
                <p className="text-gray-300 font-light text-sm leading-relaxed group-hover:text-white transition-colors duration-300">
                  {insight}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Closing Statement - Reduced Spacing */}
        <div className="text-center">
          <div className="max-w-3xl mx-auto">
            <p className="text-xl md:text-2xl font-light text-gray-200 leading-relaxed mb-6">
              &ldquo;Every auto rickshaw tells a story. Every ride connects
              lives. Every journey shapes the soul of our cities.&rdquo;
            </p>
            <div className="w-32 h-px bg-gradient-to-r from-transparent via-sawaari-yellow to-transparent mx-auto animate-pulse-slow"></div>
          </div>
        </div>
      </div>
    </section>
  );
}
