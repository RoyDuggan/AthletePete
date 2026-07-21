import React from "react";
import { Link } from "react-router-dom";

import MarketingLayout from "./marketing/MarketingLayout";
import { container, ctaButtonLime, ctaButton, focusRing } from "./marketing/ui";

/**
 * Shown when an unauthenticated visitor hits a protected app route, instead of
 * a blank error or silent redirect. `from` is remembered so Sign In can return
 * the user to the page they were trying to reach.
 */
const AccessGate: React.FC<{ from?: string }> = ({ from }) => (
  <MarketingLayout>
    <section className="flex flex-1 items-center justify-center py-20 md:py-28">
      <div className={`${container} max-w-xl text-center`}>
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-brand/40 bg-panel text-2xl">
          🔒
        </div>
        <h1 className="mt-6 text-2xl font-extrabold uppercase tracking-wide text-white md:text-3xl">
          Register free to unlock your AthletePete Race Hub.
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-gray-400">
          Your Race Hub gives you access to AI telemetry analytics, kart setup
          tools, driver data and subscription options. Registration is{" "}
          <span className="font-bold text-brand">free</span> — no credit card
          required.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link to="/register" className={ctaButtonLime}>
            Register Free →
          </Link>
          <Link
            to="/sign-in"
            state={from ? { from } : undefined}
            className={ctaButton}
          >
            Access My Race Hub
          </Link>
        </div>

        <Link
          to="/"
          className={`mt-6 inline-block text-xs font-bold uppercase tracking-wide text-gray-500 hover:text-gray-300 ${focusRing}`}
        >
          ← Back to home
        </Link>
      </div>
    </section>
  </MarketingLayout>
);

export default AccessGate;
