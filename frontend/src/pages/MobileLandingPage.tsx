import React, { useState } from "react";
import { Link } from "react-router-dom";

import heroImg from "../assets/hero-karting.webp";
import MarketingLayout from "../components/marketing/MarketingLayout";
import { container, focusRing } from "../components/marketing/ui";

/**
 * Home / landing page. Dark theme (spec) with the lime sticky header + dark
 * footer shared across the site. The hero photo carries two vertical columns
 * of circle buttons (audience left, actions right) overlaid on the image.
 */

const LEFT_BUTTONS: { label: string; to: string }[] = [
  { label: "For Drivers", to: "/drivers" },
  { label: "For Parents", to: "/parents" },
  { label: "For Teams", to: "/teams" },
];

const RIGHT_BUTTONS: { label: string; to: string }[] = [
  { label: "How It Works", to: "/how-it-works" },
  { label: "Example Outputs", to: "/example-outputs" },
  { label: "Get Started", to: "/register" },
];

const MobileLandingPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [signedUp, setSignedUp] = useState(false);

  const submitNewsletter = (event: React.FormEvent) => {
    event.preventDefault();
    if (email.trim()) setSignedUp(true);
  };

  return (
    <MarketingLayout>
      {/* HERO with flanking button columns */}
      <section
        className="relative flex min-h-[440px] items-center justify-center overflow-hidden bg-ink px-[88px] py-12 text-center sm:px-28 md:min-h-[78vh] md:px-44 lg:px-64"
        style={{
          backgroundImage: `url(${heroImg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* Darkening scrim keeps the white headline legible over the photo. */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/75" />

        {/* Left column — audience */}
        <div className="absolute left-2 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-3 sm:left-4 sm:gap-4 md:left-10 md:gap-6">
          {LEFT_BUTTONS.map((item) => (
            <AudienceCircle key={item.label} {...item} tone="lime" />
          ))}
        </div>

        {/* Right column — actions */}
        <div className="absolute right-2 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-3 sm:right-4 sm:gap-4 md:right-10 md:gap-6">
          {RIGHT_BUTTONS.map((item) => (
            <AudienceCircle key={item.label} {...item} tone="dark" />
          ))}
        </div>

        <div className="relative z-10 mx-auto max-w-3xl">
          <h1 className="text-xl font-extrabold uppercase leading-tight tracking-wide text-white sm:text-2xl md:text-5xl lg:text-6xl">
            Turn telemetry into
            <br />
            <span className="text-brand">race-winning insight</span>
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-xs leading-relaxed text-white/90 sm:text-[13px] md:mt-5 md:text-lg">
            AI-powered kart telemetry analysis, driver coaching and setup
            recommendations.
          </p>
        </div>
      </section>

      {/* NEWSLETTER */}
      <section className="bg-panel py-12 md:py-16">
        <div className={`${container} max-w-xl text-center`}>
          <h2 className="mb-3 text-base font-extrabold uppercase tracking-wide text-white md:text-2xl">
            Stay in the loop
          </h2>
          <p className="mb-5 text-sm text-gray-400">
            Get product updates and coaching tips. No spam.
          </p>
          {signedUp ? (
            <p className="text-center text-sm font-semibold text-brand md:text-base">
              Thanks — you're on the list! 🏁
            </p>
          ) : (
            <form onSubmit={submitNewsletter} className="flex flex-col gap-2 sm:flex-row">
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className={`min-w-0 flex-1 rounded-md border border-gray-300 bg-mist px-3 py-3 text-sm text-[#374151] ${focusRing}`}
              />
              <button
                type="submit"
                className={`shrink-0 rounded-3xl bg-steel px-6 py-3 text-xs font-bold uppercase tracking-wide text-brand transition duration-300 hover:-translate-y-0.5 hover:bg-[#2a2a2a] md:text-sm ${focusRing}`}
              >
                Sign Me Up
              </button>
            </form>
          )}
        </div>
      </section>
    </MarketingLayout>
  );
};

const AudienceCircle: React.FC<{
  label: string;
  to: string;
  tone: "lime" | "dark";
}> = ({ label, to, tone }) => {
  // States mirror the KartingMVP circle assets (Rest / Hover / Click).
  //  - "lime" (audience):  lime fill, dark ring, dark text.
  //  - "dark" (action):    dark fill, lime ring, lime text.
  // Both hover to a lime->dark radial gradient with white text; the ring
  // colour inverts on click. The 3px ring is a box-shadow (no layout shift).
  const toneClasses =
    tone === "lime"
      ? "bg-brand text-[#1D1D1B] shadow-[0_0_0_3px_#3a3a3a] active:shadow-[0_0_0_3px_#a6e22e]"
      : "bg-steel text-brand shadow-[0_0_0_3px_#a6e22e] active:shadow-[0_0_0_3px_#3a3a3a]";

  const hoverClasses =
    "hover:scale-105 hover:text-white " +
    "hover:[background-image:radial-gradient(circle_at_center,#a6e22e,#3a3a3a)]";

  return (
    <Link
      to={to}
      className={`flex h-[72px] w-[72px] items-center justify-center rounded-full p-1.5 text-center text-[10px] font-bold uppercase leading-tight tracking-wide transition-all duration-300 sm:h-20 sm:w-20 sm:text-[11px] md:h-28 md:w-28 md:p-2 md:text-[13px] ${toneClasses} ${hoverClasses} ${focusRing}`}
    >
      {label}
    </Link>
  );
};

export default MobileLandingPage;
