/**
 * All user-facing copy + routes for the split-screen landing page, kept in one
 * place so wording can be edited without touching layout/markup.
 *
 * Visual note: the site accent stays lime (`brand` token); this page follows the
 * reference image's split-screen *layout*, not its red colour.
 */

/** Icon keys map to the inline SVGs in FeatureHighlight. */
export type FeatureKey = "analytics" | "setup" | "library" | "free";

export const LANDING_FEATURES: {
  key: FeatureKey;
  title: string;
  desc: string;
}[] = [
  {
    key: "analytics",
    title: "AI Telemetry Analytics",
    desc: "Understand your data. Find lap time.",
  },
  {
    key: "setup",
    title: "Kart Setup & Jetting",
    desc: "AI guidance for any track, any condition.",
  },
  {
    key: "library",
    title: "Driver & Kart Library",
    desc: "Store and manage your setups and data.",
  },
  {
    key: "free",
    title: "Free Forever Plan",
    desc: "Full access to powerful free features.",
  },
];

export const LANDING_COPY = {
  marketing: {
    headline: "AI-Powered Karting Insights.",
    accentHeadline: "Faster. Smarter.",
    body:
      "AthletePete gives you AI telemetry analytics and kart setup guidance to help you make smarter decisions on and off track.",
    cta: { label: "Find Out More", to: "/how-it-works" },
  },
  raceHub: {
    heading: "Your",
    headingAccent: "Race Hub.",
    subheading: "Access your data, setups and AI insights in one place.",
    access: {
      title: "Access My Race Hub",
      helper: "Open your personal telemetry, setup and driver workspace.",
      to: "/sign-in",
    },
    register: {
      title: "Register Free",
      helper:
        "Create your free account and unlock AI telemetry analytics, kart setup and driver tools.",
      to: "/register",
    },
    reassurance: "No credit card required. Free to register.",
  },
} as const;
