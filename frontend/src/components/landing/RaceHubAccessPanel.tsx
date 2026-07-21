import React from "react";

import AccessCard from "./AccessCard";
import FeatureHighlight from "./FeatureHighlight";
import { LANDING_COPY, LANDING_FEATURES } from "./landingCopy";

/** Speedometer glyph for the "Access My Race Hub" card. */
const GaugeIcon = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.7}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-6 w-6"
  >
    <path d="M4 18a8 8 0 1 1 16 0" />
    <path d="M12 14l4-4" />
    <circle cx="12" cy="14" r="1" />
  </svg>
);

/** Person-plus glyph for the "Register Free" card. */
const RegisterIcon = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.7}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-6 w-6"
  >
    <circle cx="9" cy="8" r="3.5" />
    <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
    <path d="M19 8v6M16 11h6" />
  </svg>
);

/**
 * Right half of the split landing: the Race Hub access area. Two large cards —
 * "Access My Race Hub" (secondary) and the visually dominant "Register Free"
 * (primary) — plus reassurance text and a compact feature strip.
 */
const RaceHubAccessPanel: React.FC = () => {
  const { raceHub } = LANDING_COPY;

  return (
    <div className="flex flex-col justify-center gap-4 px-6 py-7 sm:px-10 lg:min-h-[calc(100vh-4rem)] lg:gap-5 lg:px-14 lg:py-6 xl:px-16">
      <header>
        <h2 className="text-2xl font-extrabold uppercase tracking-wide text-white sm:text-3xl xl:text-4xl">
          {raceHub.heading} <span className="text-brand">{raceHub.headingAccent}</span>
        </h2>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-white/80">
          {raceHub.subheading}
        </p>
      </header>

      <div className="flex flex-col gap-3">
        <AccessCard
          variant="secondary"
          to={raceHub.access.to}
          title={raceHub.access.title}
          helper={raceHub.access.helper}
          icon={GaugeIcon}
        />

        <div className="flex items-center gap-4" aria-hidden="true">
          <span className="h-px flex-1 bg-white/15" />
          <span className="text-xs font-bold uppercase tracking-widest text-white/50">
            or
          </span>
          <span className="h-px flex-1 bg-white/15" />
        </div>

        <AccessCard
          variant="primary"
          to={raceHub.register.to}
          title={raceHub.register.title}
          helper={raceHub.register.helper}
          icon={RegisterIcon}
        />

        <p className="text-center text-sm text-white/60">
          {raceHub.reassurance.replace(" Free to register.", " ")}
          <span className="font-semibold text-brand">Free to register.</span>
        </p>
      </div>

      {/* Compact feature strip (mirrors the reference image, desktop only). */}
      <ul className="hidden justify-between gap-2 border-t border-white/10 pt-5 lg:flex">
        {LANDING_FEATURES.map((feature) => (
          <li key={feature.key}>
            <FeatureHighlight icon={feature.key} title={feature.title} compact />
          </li>
        ))}
      </ul>
    </div>
  );
};

export default RaceHubAccessPanel;
