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
        // DR Performance dark theme palette (near-black + performance blue).
        brand: "#1672CB", // performance blue accent
        ink: "#11151A", // near-black page background
        panel: "#171c23", // dark sections / cards
        steel: "#232a33", // button background
        mist: "#f5f7fa", // light form inputs / light cards
        "hero-blue": "#32A8FF", // bright blue (hover / secondary accent)
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
