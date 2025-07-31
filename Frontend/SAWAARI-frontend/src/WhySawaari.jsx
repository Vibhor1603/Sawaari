import { useState, useEffect, useRef } from "react";

export default function WhySawaari() {
  const [isVisible, setIsVisible] = useState(false);
  const [activeStory, setActiveStory] = useState(0);
  const sectionRef = useRef(null);

  const rickshawStories = [
    {
      id: 0,
      title: "The Heartbeat of India",
      hindi: "भारत की धड़कन",
      description:
        "Auto rickshaws aren&apos;t just vehicles - they&apos;re the pulse of Indian streets, connecting millions of stories every day.",
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
        "From narrow bylanes to busy highways, auto rickshaws navigate where others can&apos;t, making every destination reachable.",
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
        "With CNG and electric variants, auto rickshaws are leading India&apos;s green transportation revolution.",
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

  const currentStory = rickshawStories[activeStory];

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
            🛒
          </div>
          <div className="absolute top-[15%] right-[12%] text-3xl opacity-40 animate-signal-blink">
            🚦
          </div>
          <div
            className="absolute bottom-[30%] left-[15%] text-lg opacity-30 animate-float"
            style={{ animationDelay: "2s" }}
          >
            🐕
          </div>
          <div
            className="absolute bottom-[25%] right-[20%] text-2xl opacity-40 animate-float"
            style={{ animationDelay: "1s" }}
          >
            🌸
          </div>
        </div>

        {/* Moving Rickshaws */}
        <div className="absolute inset-0">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className={`absolute text-lg opacity-20 animate-parade-move`}
              style={{
                top: `${55 + i * 3}%`,
                animationDelay: `${i * 2.5}s`,
              }}
            >
              🛺
            </div>
          ))}
        </div>
      </div>

      <div className="container-sawaari relative z-20">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-4 bg-sawaari-light-yellow border border-sawaari-yellow/20 rounded-full px-6 py-3 mb-8">
            <span className="text-3xl animate-subtle-float">🛺</span>
            <div className="flex flex-col">
              <span className="text-lg font-bold text-sawaari-green font-kalam">
                क्यों सवारी?
              </span>
              <span className="text-sm text-text-secondary">
                Why Choose the Rickshaw Way?
              </span>
            </div>
          </div>

          <h2 className="text-4xl lg:text-5xl font-bold text-text-primary mb-6">
            <span className="gradient-text-sawaari">The Soul</span> of Indian
            Streets
          </h2>

          <p className="text-lg lg:text-xl text-text-secondary max-w-4xl mx-auto leading-relaxed">
            Auto rickshaws are more than transportation - they are India&apos;s
            cultural ambassadors, weaving through the fabric of our cities with
            stories, dreams, and endless possibilities.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-16 items-center mb-16">
          {/* Interactive Story Section */}
          <div className="flex flex-col gap-8">
            <div className="card p-8 border-2 border-sawaari-yellow transition-all duration-500">
              <div className="flex items-center gap-8 mb-6">
                <div className="w-20 h-20 bg-sawaari-light-yellow rounded-full flex items-center justify-center text-4xl border border-sawaari-yellow">
                  {currentStory.icon}
                </div>
                <div className="text-center">
                  <div className="text-4xl font-black leading-none text-sawaari-green">
                    {currentStory.stat}
                  </div>
                  <div className="text-sm text-text-secondary font-medium">
                    {currentStory.statLabel}
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-2xl font-bold text-text-primary mb-2">
                  {currentStory.title}
                </h3>
                <h4 className="text-lg text-sawaari-yellow font-kalam mb-4">
                  {currentStory.hindi}
                </h4>
                <p className="text-text-secondary leading-relaxed">
                  {currentStory.description}
                </p>
              </div>
            </div>

            {/* Story Navigation */}
            <div className="flex justify-center gap-4">
              {rickshawStories.map((story, index) => (
                <button
                  key={story.id}
                  className={`w-12 h-12 rounded-full border-2 transition-all duration-300 flex items-center justify-center text-lg hover:scale-110 ${
                    index === activeStory
                      ? "scale-125 bg-sawaari-yellow border-sawaari-yellow shadow-sawaari-lg"
                      : "border-sawaari-yellow hover:bg-sawaari-light-yellow"
                  }`}
                  onClick={() => setActiveStory(index)}
                >
                  <span>{story.icon}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Rickshaw Facts Grid */}
          <div className="flex flex-col gap-8">
            <h3 className="flex flex-col items-center gap-2 text-2xl font-bold text-text-primary">
              <span className="text-3xl">📊</span>
              Amazing Rickshaw Facts
              <span className="text-lg text-sawaari-yellow font-kalam">
                रोचक तथ्य
              </span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {rickshawFacts.map((fact, index) => (
                <div
                  key={index}
                  className="card p-6 text-center transition-all duration-300 hover:shadow-sawaari-lg hover:-translate-y-1 animate-subtle-fade"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="text-3xl mb-4">{fact.icon}</div>
                  <p className="text-text-secondary leading-relaxed text-sm">
                    {fact.fact}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Cultural Connection */}
        <div className="grid lg:grid-cols-3 gap-8 items-center card p-8 lg:p-12 mb-12">
          <div className="flex justify-center">
            <div className="relative flex flex-col items-center gap-4">
              <div className="text-6xl animate-pulse-slow">🛺</div>
              <div className="flex gap-2">
                <span className="text-2xl animate-heart-beat">❤️</span>
                <span
                  className="text-2xl animate-heart-beat"
                  style={{ animationDelay: "0.5s" }}
                >
                  💛
                </span>
                <span
                  className="text-2xl animate-heart-beat"
                  style={{ animationDelay: "1s" }}
                >
                  💚
                </span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <h3 className="text-3xl font-bold text-text-primary">
                More Than Transport
              </h3>
              <span className="text-lg text-sawaari-yellow font-kalam">
                परिवहन से कहीं अधिक
              </span>
            </div>
            <p className="text-lg text-text-secondary leading-relaxed">
              Every auto rickshaw ride is a journey through India&apos;s heart -
              where strangers become friends, where every driver has a story,
              and where the real India comes alive in conversations, laughter,
              and shared experiences.
            </p>

            <div className="flex flex-col sm:flex-row gap-8">
              <div className="flex items-center gap-4">
                <div className="text-3xl">🤝</div>
                <div>
                  <div className="text-2xl font-bold text-sawaari-green">
                    1M+
                  </div>
                  <div className="text-sm text-text-muted">
                    Daily Connections
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-3xl">💬</div>
                <div>
                  <div className="text-2xl font-bold text-sawaari-green">∞</div>
                  <div className="text-sm text-text-muted">Stories Shared</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-3xl">🌟</div>
                <div>
                  <div className="text-2xl font-bold text-sawaari-green">
                    100%
                  </div>
                  <div className="text-sm text-text-muted">Pure Experience</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <div className="max-w-4xl mx-auto">
            <h3 className="flex flex-col items-center gap-4 text-3xl font-bold text-text-primary mb-6">
              <span className="text-4xl animate-subtle-float">🛺</span>
              Ready to Experience the Real India?
              <span className="text-lg text-sawaari-yellow font-kalam">
                असली भारत का अनुभव करने के लिए तैयार हैं?
              </span>
            </h3>
            <p className="text-lg text-text-secondary leading-relaxed mb-8">
              Join millions who choose the rickshaw way - where every journey is
              an adventure, every ride tells a story, and every destination
              feels like home.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="btn-primary inline-flex items-center gap-2">
                <span>Start Your Journey</span>
                <span className="text-xl">🚀</span>
              </button>
              <button className="btn-secondary inline-flex items-center gap-2 group">
                <span>Learn More</span>
                <span className="text-lg transition-transform duration-300 group-hover:translate-x-1">
                  →
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
