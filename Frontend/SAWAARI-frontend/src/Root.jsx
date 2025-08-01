import About from "./about";
import WhySawaari from "./WhySawaari";
import InteractiveHero from "./Carousel";
import Testimonials from "./testimonials";

export default function Root() {
  return (
    <>
      {/* Floating Auto Rickshaws Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute text-2xl opacity-5 animate-rickshaw-float"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDelay: `${i * 2}s`,
              animationDuration: `${15 + Math.random() * 10}s`,
            }}
          >
            🛺
          </div>
        ))}
      </div>

      <InteractiveHero />
      <WhySawaari />
      <About />
      <Testimonials />
    </>
  );
}
