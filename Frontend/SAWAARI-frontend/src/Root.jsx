import About from "./about";
import WhySawaari from "./WhySawaari";
import InteractiveHero from "./Carousel";
import Testimonials from "./testimonials";

export default function Root() {
  return (
    <>
      {/* Floating Auto Rickshaws Background - Consistent reduced opacity, responsive count */}
      <div
        className="fixed inset-0 pointer-events-none overflow-hidden"
        style={{ zIndex: 2 }}
      >
        {[
          ...Array(
            window.innerWidth < 768 ? 3 : window.innerWidth < 1024 ? 4 : 5
          ),
        ].map((_, i) => (
          <div
            key={i}
            className={`absolute text-lg sm:text-xl animate-rickshaw-float ${
              i >= 3 ? "hidden sm:block" : ""
            } ${i >= 4 ? "hidden lg:block" : ""}`}
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDelay: `${i * 3}s`,
              animationDuration: `${20 + Math.random() * 10}s`,
              opacity: 0.12 + i * 0.02, // Consistent reduced opacity from 0.12 to 0.20
              zIndex: 2,
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
