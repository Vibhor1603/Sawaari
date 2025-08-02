import { useEffect, useState } from "react";

const FloatingRickshaws = () => {
  const [rickshaws, setRickshaws] = useState([]);

  useEffect(() => {
    // Check screen size for responsive rickshaw count
    const isSmallScreen = window.innerWidth < 768;
    const isMediumScreen = window.innerWidth < 1024;

    // Define depth layers - consistent reduced opacity
    const depthLayers = [
      { opacity: 0.12, zIndex: 1, size: "18px" }, // Background layer
      { opacity: 0.15, zIndex: 2, size: "16px" }, // Mid-background layer
      { opacity: 0.18, zIndex: 3, size: "18px" }, // Mid-foreground layer
      { opacity: 0.15, zIndex: 4, size: "18px" }, // Foreground layer (reduced opacity)
    ];

    // Responsive rickshaw counts
    const horizontalCount = isSmallScreen ? 2 : isMediumScreen ? 3 : 4;
    const verticalCount = isSmallScreen ? 1 : isMediumScreen ? 2 : 3;
    const diagonalCount = isSmallScreen ? 1 : isMediumScreen ? 2 : 3;

    // Create horizontal floating rickshaws with responsive count
    const horizontalRickshaws = Array.from(
      { length: horizontalCount },
      (_, i) => {
        const layer = depthLayers[i % 4]; // Cycle through layers
        return {
          id: `horizontal-${i}`,
          type: "horizontal",
          emoji: "🛺",
          className: `floating-rickshaw floating-rickshaw-${i + 1}`,
          style: {
            fontSize: layer.size,
            zIndex: layer.zIndex,
          },
          layer: i % 4,
        };
      }
    );

    // Create vertical floating rickshaws with responsive count
    const verticalRickshaws = Array.from({ length: verticalCount }, (_, i) => {
      const layer = depthLayers[i % 4]; // Cycle through layers
      return {
        id: `vertical-${i}`,
        type: "vertical",
        emoji: "🛺",
        className: `floating-rickshaw-vertical floating-rickshaw-vertical-${
          i + 1
        }`,
        style: {
          fontSize: layer.size,
          zIndex: layer.zIndex,
        },
        layer: i % 4,
      };
    });

    // Create diagonal floating rickshaws with responsive count
    const diagonalRickshaws = Array.from({ length: diagonalCount }, (_, i) => {
      const layer = depthLayers[i % 4]; // Cycle through layers
      return {
        id: `diagonal-${i}`,
        type: "diagonal",
        emoji: "🛺",
        style: {
          position: "fixed",
          fontSize: layer.size,
          opacity: layer.opacity,
          pointerEvents: "none",
          zIndex: layer.zIndex,
          animation: `floatRickshawDiagonal-layer${i % 4} ${
            35 + i * 5
          }s linear infinite`,
          top: `${10 + i * 15}%`,
          left: "-50px",
        },
        layer: i % 4,
      };
    });

    setRickshaws([
      ...horizontalRickshaws,
      ...verticalRickshaws,
      ...diagonalRickshaws,
    ]);

    // Add diagonal animations for each layer to CSS
    const style = document.createElement("style");
    style.textContent = `
      @keyframes floatRickshawDiagonal-layer0 {
        0% {
          transform: translate(-100px, 0) rotate(0deg);
          opacity: 0;
        }
        10% {
          opacity: 0.12;
        }
        90% {
          opacity: 0.12;
        }
        100% {
          transform: translate(calc(100vw + 100px), -50vh) rotate(180deg);
          opacity: 0;
        }
      }
      @keyframes floatRickshawDiagonal-layer1 {
        0% {
          transform: translate(-100px, 0) rotate(0deg);
          opacity: 0;
        }
        10% {
          opacity: 0.15;
        }
        90% {
          opacity: 0.15;
        }
        100% {
          transform: translate(calc(100vw + 100px), -50vh) rotate(180deg);
          opacity: 0;
        }
      }
      @keyframes floatRickshawDiagonal-layer2 {
        0% {
          transform: translate(-100px, 0) rotate(0deg);
          opacity: 0;
        }
        10% {
          opacity: 0.18;
        }
        90% {
          opacity: 0.18;
        }
        100% {
          transform: translate(calc(100vw + 100px), -50vh) rotate(180deg);
          opacity: 0;
        }
      }
      @keyframes floatRickshawDiagonal-layer3 {
        0% {
          transform: translate(-100px, 0) rotate(0deg);
          opacity: 0;
        }
        10% {
          opacity: 0.15;
        }
        90% {
          opacity: 0.15;
        }
        100% {
          transform: translate(calc(100vw + 100px), -50vh) rotate(180deg);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 1 }}
    >
      {rickshaws.map((rickshaw) => (
        <div
          key={rickshaw.id}
          className={rickshaw.className}
          style={rickshaw.style}
        >
          {rickshaw.emoji}
        </div>
      ))}
    </div>
  );
};

export default FloatingRickshaws;
