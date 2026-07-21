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
        // DR Performance brand — deep dark ground + performance blue accent.
        brand: "#1672CB", // performance blue accent
        ink: "#0A0C10", // deep dark page background
        panel: "#0F1319", // dark sections / cards
        steel: "#161b22", // button background
        muted: "#E1E8F1", // muted secondary text (lightened for contrast on dark)
        hair: "#20252D", // hairline borders
        mist: "#F4F3EF", // light form inputs / light cards
        "hero-blue": "#32A8FF", // bright blue (hover / links)
      },
      // Match VirtualPete: a plain system font stack, no web-font downloads.
      // The three keys are kept so existing font-display / font-oswald classes
      // still resolve — they all point at the same system stack now.
      fontFamily: {
        sans: ["system-ui", "'Segoe UI'", "Roboto", "sans-serif"], // body
        display: ["system-ui", "'Segoe UI'", "Roboto", "sans-serif"], // headlines
        oswald: ["system-ui", "'Segoe UI'", "Roboto", "sans-serif"], // labels
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
