/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        midnight: "#0b0d14",
        ink: "#070811",
        glassviolet: "#a855f7",
        glassblue: "#3b82f6",
        glasspink: "#ec4899",
      },
      fontFamily: {
        display: ["var(--font-display)", "ui-serif", "Georgia", "serif"],
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-22px)" },
        },
        drift1: {
          "0%": { transform: "translate(0, 0) scale(1)" },
          "50%": { transform: "translate(8vw, 6vh) scale(1.15)" },
          "100%": { transform: "translate(0, 0) scale(1)" },
        },
        drift2: {
          "0%": { transform: "translate(0, 0) scale(1.1)" },
          "50%": { transform: "translate(-10vw, -8vh) scale(0.9)" },
          "100%": { transform: "translate(0, 0) scale(1.1)" },
        },
        drift3: {
          "0%": { transform: "translate(0, 0) scale(1)" },
          "50%": { transform: "translate(6vw, -10vh) scale(1.2)" },
          "100%": { transform: "translate(0, 0) scale(1)" },
        },
        spincube: {
          "0%": { transform: "rotateX(0deg) rotateY(0deg)" },
          "100%": { transform: "rotateX(360deg) rotateY(360deg)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
      },
      animation: {
        float: "float 7s ease-in-out infinite",
        drift1: "drift1 26s ease-in-out infinite",
        drift2: "drift2 32s ease-in-out infinite",
        drift3: "drift3 38s ease-in-out infinite",
        spincube: "spincube 28s linear infinite",
        shimmer: "shimmer 8s ease infinite",
      },
    },
  },
  plugins: [],
};
