import { useEffect, useState } from "react";

const FloatingRickshaws = () => {
  const [rickshaws, setRickshaws] = useState([]);

  useEffect(() => {
    // Define depth layers - always behind components with reduced visibility
    const depthLayers = [
      { opacity: 0.12, zIndex: 1, size: "24px" }, // Background layer (least visible)
      { opacity: 0.25, zIndex: 1, size: "22px" }, // Mid-background layer
      { opacity: 0.25, zIndex: 1, size: "24px" }, // Mid-foreground layer
      { opacity: 0.25, zIndex: 1, size: "24px" }, // Foreground layer (most visible)
    ];

    // Create horizontal floating rickshaws with layered depth
    const horizontalRickshaws = Array.from({ length: 8 }, (_, i) => {
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
    });

    // Create vertical floating rickshaws with layered depth
    const verticalRickshaws = Array.from({ length: 8 }, (_, i) => {
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

    // Create diagonal floating rickshaws with layered depth
    const diagonalRickshaws = Array.from({ length: 8 }, (_, i) => {
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
          top: `${10 + i * 10}%`,
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
      @keyframes floatRickshawDiagonal-layer1 {
        0% {
          transform: translate(-100px, 0) rotate(0deg);
          opacity: 0;
        }
        10% {
          opacity: 0.25;
        }
        90% {
          opacity: 0.25;
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
          opacity: 0.35;
        }
        90% {
          opacity: 0.35;
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
          opacity: 0.45;
        }
        90% {
          opacity: 0.45;
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
    <>
      {rickshaws.map((rickshaw) => (
        <div
          key={rickshaw.id}
          className={rickshaw.className}
          style={rickshaw.style}
        >
          {rickshaw.emoji}
        </div>
      ))}
    </>
  );
};

export default FloatingRickshaws;
