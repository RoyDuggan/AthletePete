/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  // Preflight (Tailwind's global reset) is OFF so utilities can be used on the
  // new landing page without altering the existing inline-styled dashboard /
  // content pages, which rely on default element styling.
  corePlugins: { preflight: false },
  theme: {
    extend: {
      colors: {
        // Spec dark theme palette.
        brand: "#a6e22e", // lime accent
        ink: "#030303", // page background
        panel: "#151515", // dark sections / cards
        steel: "#3a3a3a", // button background
        mist: "#f5f7fa", // light form inputs / light cards
        "hero-blue": "#4b7cc4",
      },
      keyframes: {
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "20%, 60%": { transform: "translateX(-6px)" },
          "40%, 80%": { transform: "translateX(6px)" },
        },
      },
      animation: {
        shake: "shake 0.35s ease-in-out",
      },
    },
  },
  plugins: [],
};
