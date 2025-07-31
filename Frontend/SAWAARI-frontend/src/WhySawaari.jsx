import { useState, useEffect, useRef } from "react";

export default function WhySawaari() {
  const [isVisible, setIsVisible] = useState(false);
  const [activeStory, setActiveStory] = useState(0);
  const [activeFact, setActiveFact] = useState(0);
  const sectionRef = useRef(null);

  const rickshawStories = [
    {
      id: 0,
      title: "The Heartbeat of India",
      hindi: "भारत की धड़कन",
      description:
        "Auto rickshaws aren't just vehicles - they're the pulse of Indian streets, connecting millions of stories every day.",
      icon: "❤️",
      stat: "50M+",
      statLabel: "Daily Rides",
      color: "#ff6b35",
    },
    {
      id: 1,
      title: "Every Lane, Every Story",
      hindi: "हर गली, हर कहानी",
      description:
        "From narrow bylanes to busy highways, auto rickshaws navigate where others can't, making every destination reachable.",
      icon: "🛣️",
      stat: "95%",
      statLabel: "Street Coverage",
      color: "#ffeb3b",
    },
    {
      id: 2,
      title: "Affordable for Everyone",
      hindi: "सबके लिए सुलभ",
      description:
        "The most democratic form of transport, auto rickshaws ensure mobility is never a luxury but a right for all Indians.",
      icon: "💰",
      stat: "₹15-50",
      statLabel: "Average Fare",
      color: "#00ff88",
    },
    {
      id: 3,
      title: "Eco-Friendly Future",
      hindi: "हरित भविष्य",
      description:
        "With CNG and electric variants, auto rickshaws are leading India's green transportation revolution.",
      icon: "🌱",
      stat: "60%",
      statLabel: "Less Emissions",
      color: "#2ed573",
    },
  ];

  const rickshawFacts = [
    { fact: "Auto rickshaws can turn in a 3-meter radius", icon: "🔄" },
    { fact: "They consume 40% less fuel than cars", icon: "⛽" },
    { fact: "Can navigate lanes as narrow as 2 meters", icon: "📏" },
    { fact: "Provide livelihood to 5M+ drivers in India", icon: "👨‍💼" },
    { fact: "Available 24/7 in most Indian cities", icon: "🕐" },
    { fact: "Can carry up to 6 passengers legally", icon: "👥" },
  ];

  // Intersection Observer
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

  // Auto-rotate stories
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStory((prev) => (prev + 1) % rickshawStories.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [rickshawStories.length]);

  // Auto-rotate facts (separate from stories)
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFact((prev) => (prev + 1) % rickshawFacts.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [rickshawFacts.length]);

  const currentStory = rickshawStories[activeStory];
  const currentFact = rickshawFacts[activeFact];

  // Safety check to prevent errors
  if (!currentStory || !currentFact) {
    return null;
  }

  return (
    <section
      ref={sectionRef}
      className={`section section-dark transition-all duration-700 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
      }`}
    >
      {/* Street Background Elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-[20%] left-[8%] text-2xl opacity-10 animate-subtle-float">
            🛺
          </div>
          <div
            className="absolute top-[30%] right-[12%] text-2xl opacity-10 animate-subtle-float"
            style={{ animationDelay: "1s" }}
          >
            🛺
          </div>
          <div
            className="absolute bottom-[25%] left-[15%] text-2xl opacity-10 animate-subtle-float"
            style={{ animationDelay: "2s" }}
          >
            🛺
          </div>
          <div
            className="absolute bottom-[35%] right-[20%] text-2xl opacity-10 animate-subtle-float"
            style={{ animationDelay: "3s" }}
          >
            🛺
          </div>
        </div>
      </div>

      <div className="container-sawaari relative z-10">
        {/* Hero Section */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-3 bg-sawaari-yellow-muted border border-sawaari-yellow-border rounded-full px-6 py-3 mb-6">
            <span className="text-2xl">🛺</span>
            <span className="text-sm font-medium text-sawaari-yellow text-readable">
              Why Auto Rickshaws?
            </span>
          </div>
          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6 text-readable">
            The Soul of Indian Streets
          </h2>
          <p className="text-xl text-gray-200 max-w-4xl mx-auto leading-relaxed text-readable-secondary">
            Discover why auto rickshaws are more than just transportation -
            they're the heartbeat of India's urban mobility, connecting
            communities and stories across every corner of our cities.
          </p>
        </div>

        {/* Interactive Story Showcase */}
        <div className="grid lg:grid-cols-2 gap-16 items-center mb-20">
          {/* Story Navigation */}
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-white mb-8 text-readable">
              The Auto Rickshaw Story
            </h3>
            <div className="space-y-4">
              {rickshawStories.map((story, index) => (
                <button
                  key={story.id}
                  onClick={() => setActiveStory(index)}
                  className={`w-full flex items-center gap-4 p-6 rounded-xl border transition-all duration-300 hover:shadow-lg ${
                    index === activeStory
                      ? "border-sawaari-yellow bg-sawaari-yellow-muted"
                      : "border-white/20 bg-black/40 hover:border-sawaari-yellow/50"
                  }`}
                >
                  <div className="text-3xl">{story.icon}</div>
                  <div className="flex-1 text-left">
                    <div className="text-lg font-bold text-white text-readable">
                      {story.title}
                    </div>
                    <div className="text-sm text-gray-300 text-readable-secondary">
                      {story.hindi}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Active Story Display */}
          <div className="card p-8">
            <div className="flex items-start gap-6 mb-6">
              <div className="w-16 h-16 bg-sawaari-yellow-muted border border-sawaari-yellow-border rounded-2xl flex items-center justify-center text-3xl">
                {currentStory.icon}
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-white mb-2 text-readable">
                  {currentStory.title}
                </h3>
                <p className="text-gray-200 leading-relaxed text-readable-secondary">
                  {currentStory.description}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-center">
                <div className="text-3xl font-black text-sawaari-yellow mb-1">
                  {currentStory.stat}
                </div>
                <div className="text-gray-300 text-readable-secondary">
                  {currentStory.statLabel}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-400 text-readable-secondary">
                  {currentStory.hindi}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Fun Facts */}
        <div className="mb-20">
          <h3 className="text-3xl font-bold text-white mb-12 text-center text-readable">
            Did You Know?
          </h3>

          {/* Interactive Facts Display */}
          <div className="max-w-4xl mx-auto mb-8">
            <div className="card p-8 relative overflow-hidden">
              {/* Background Pattern */}
              <div className="absolute top-0 right-0 text-6xl opacity-5 transform rotate-12">
                💡
              </div>

              <div className="relative z-10 text-center">
                {/* Fact Icon */}
                <div className="w-20 h-20 bg-gradient-to-br from-sawaari-yellow/30 to-sawaari-yellow/10 border-2 border-sawaari-yellow/50 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse-slow">
                  <span className="text-3xl">{currentFact.icon}</span>
                </div>

                {/* Fact Text */}
                <p className="text-2xl lg:text-3xl text-white mb-6 leading-relaxed text-readable">
                  {currentFact.fact}
                </p>

                {/* Progress Indicator */}
                <div className="flex justify-center gap-2 mb-6">
                  {rickshawFacts.map((_, index) => (
                    <div
                      key={index}
                      className={`w-2 h-2 rounded-full transition-all duration-500 ${
                        index === activeFact
                          ? "bg-sawaari-yellow scale-150"
                          : "bg-white/30"
                      }`}
                    />
                  ))}
                </div>

                {/* Navigation Buttons */}
                <div className="flex justify-center gap-4">
                  <button
                    onClick={() =>
                      setActiveFact(
                        (prev) =>
                          (prev - 1 + rickshawFacts.length) %
                          rickshawFacts.length
                      )
                    }
                    className="w-12 h-12 bg-sawaari-yellow/20 border border-sawaari-yellow/40 rounded-full flex items-center justify-center hover:bg-sawaari-yellow/30 transition-all duration-300"
                  >
                    <span className="text-sawaari-yellow text-xl">←</span>
                  </button>
                  <button
                    onClick={() =>
                      setActiveFact((prev) => (prev + 1) % rickshawFacts.length)
                    }
                    className="w-12 h-12 bg-sawaari-yellow/20 border border-sawaari-yellow/40 rounded-full flex items-center justify-center hover:bg-sawaari-yellow/30 transition-all duration-300"
                  >
                    <span className="text-sawaari-yellow text-xl">→</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Facts Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rickshawFacts.map((fact, index) => (
              <button
                key={index}
                onClick={() => setActiveFact(index)}
                className={`card group transition-all duration-500 hover:scale-105 ${
                  index === activeFact
                    ? "border-sawaari-yellow/50 bg-sawaari-yellow/5"
                    : "hover:border-sawaari-yellow/30"
                }`}
              >
                <div className="p-6 text-center">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 transition-all duration-300 ${
                      index === activeFact
                        ? "bg-gradient-to-br from-sawaari-yellow/40 to-sawaari-yellow/20 border-2 border-sawaari-yellow/60 scale-110"
                        : "bg-sawaari-yellow-muted border border-sawaari-yellow-border group-hover:scale-110"
                    }`}
                  >
                    <span className="text-xl">{fact.icon}</span>
                  </div>
                  <p
                    className={`text-sm transition-all duration-300 ${
                      index === activeFact
                        ? "text-white font-semibold"
                        : "text-gray-200 text-readable-secondary"
                    }`}
                  >
                    {fact.fact}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
