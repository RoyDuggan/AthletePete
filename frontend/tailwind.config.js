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
        // D+R Athletic Development brand — deep dark ground + signal red.
        brand: "#FF3B2E", // signal red accent (the "D+R" +)
        ink: "#0A0C10", // deep dark page background
        panel: "#0F1319", // dark sections / cards
        steel: "#161b22", // button background
        muted: "#79818C", // muted secondary text
        hair: "#20252D", // hairline borders
        mist: "#F4F3EF", // light form inputs / light cards
        "hero-blue": "#FF5A4E", // lighter red (hover / links)
      },
      fontFamily: {
        sans: ["Manrope", "system-ui", "sans-serif"], // body
        display: ["Fredoka", "system-ui", "sans-serif"], // mark / headlines
        oswald: ["Oswald", "system-ui", "sans-serif"], // labels / eyebrows
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
