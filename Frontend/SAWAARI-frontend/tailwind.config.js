/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // SAWAARI Brand Colors (Apple-like minimalism)
        sawaari: {
          yellow: "#F4B942", // Primary auto yellow
          green: "#2D5016", // Dark green
          "light-yellow": "#FFF4E6", // Light yellow tint
          "light-green": "#F0F7ED", // Light green tint
          // New subtle variations
          "yellow-subtle": "#FEF7E6", // Very light yellow for backgrounds
          "green-subtle": "#F8FBF7", // Very light green for backgrounds
          "yellow-muted": "#F4B94220", // 20% opacity yellow
          "green-muted": "#2D501620", // 20% opacity green
          "yellow-border": "#F4B94240", // 40% opacity for borders
          "green-border": "#2D501640", // 40% opacity for borders
        },
        // Clean neutrals for modern look
        neutral: {
          50: "#FAFAFA",
          100: "#F5F5F5",
          200: "#E5E5E5",
          300: "#D4D4D4",
          400: "#A3A3A3",
          500: "#737373",
          600: "#525252",
          700: "#404040",
          800: "#262626",
          900: "#171717",
        },
        // Legacy colors for backward compatibility
        "primary-dark": "#FFFFFF",
        "secondary-dark": "#F5F5F5",
        "tertiary-dark": "#E5E5E5",
        "accent-yellow": "#F4B942",
        "accent-green": "#2D5016",
        "accent-orange": "#F97316",
        "text-primary": "#171717",
        "text-secondary": "#525252",
        "text-muted": "#737373",
        "border-color": "#E5E5E5",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        poppins: ["Poppins", "system-ui", "sans-serif"],
        kalam: ["Kalam", "cursive"], // Keep for cultural elements
      },
      fontSize: {
        xs: ["0.75rem", { lineHeight: "1rem" }],
        sm: ["0.875rem", { lineHeight: "1.25rem" }],
        base: ["1rem", { lineHeight: "1.5rem" }],
        lg: ["1.125rem", { lineHeight: "1.75rem" }],
        xl: ["1.25rem", { lineHeight: "1.75rem" }],
        "2xl": ["1.5rem", { lineHeight: "2rem" }],
        "3xl": ["1.875rem", { lineHeight: "2.25rem" }],
        "4xl": ["2.25rem", { lineHeight: "2.5rem" }],
        "5xl": ["3rem", { lineHeight: "1" }],
        "6xl": ["3.75rem", { lineHeight: "1" }],
      },
      spacing: {
        18: "4.5rem",
        88: "22rem",
        128: "32rem",
      },
      borderRadius: {
        sawaari: "8px", // Standard button radius per guidelines
      },
      boxShadow: {
        sawaari:
          "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
        "sawaari-lg":
          "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
        "sawaari-xl":
          "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
        // New subtle shadows
        "sawaari-subtle": "0 2px 8px rgba(244, 185, 66, 0.15)",
        "sawaari-glow": "0 0 20px rgba(244, 185, 66, 0.3)",
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-in-out",
        "slide-up": "slideUp 0.5s ease-out",
        "rickshaw-spin": "spin 2s linear infinite",
        "subtle-float": "subtleFloat 6s ease-in-out infinite",
        // New animations for the rickshaw
        "rickshaw-drive": "rickshawDrive 8s ease-in-out infinite",
        "rickshaw-bounce": "rickshawBounce 2s ease-in-out infinite",
        "wheel-rotate": "wheelRotate 3s linear infinite",
        "map-trail": "mapTrail 4s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        subtleFloat: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-5px)" },
        },
        // New keyframes for rickshaw animation
        rickshawDrive: {
          "0%": { transform: "translateX(-100px) translateY(0px)" },
          "25%": { transform: "translateX(-50px) translateY(-10px)" },
          "50%": { transform: "translateX(0px) translateY(0px)" },
          "75%": { transform: "translateX(50px) translateY(-5px)" },
          "100%": { transform: "translateX(100px) translateY(0px)" },
        },
        rickshawBounce: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
        wheelRotate: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        mapTrail: {
          "0%": {
            transform: "scaleX(0) scaleY(1)",
            opacity: "0.8",
          },
          "50%": {
            transform: "scaleX(1) scaleY(1)",
            opacity: "0.4",
          },
          "100%": {
            transform: "scaleX(0) scaleY(1)",
            opacity: "0",
          },
        },
      },
    },
  },
  plugins: [],
};
