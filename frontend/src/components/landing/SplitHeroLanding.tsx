import React from "react";

import heroImg from "../../assets/hero-karting.webp";
import SiteHeader from "../marketing/SiteHeader";
import MarketingPanel from "./MarketingPanel";
import RaceHubAccessPanel from "./RaceHubAccessPanel";

/**
 * Full viewport-height split-screen hero, under the shared lime SiteHeader so
 * the home page's header matches every other page. Desktop: the hero fills the
 * exact remaining height (no page scroll) as two ~50% columns over a dramatic
 * karting photo, each with its own dark overlay. Mobile: stacks vertically
 * (marketing first, Race Hub access second) and scrolls naturally.
 */
const SplitHeroLanding: React.FC = () => (
  <div className="flex min-h-screen flex-col bg-ink text-left">
    <SiteHeader />

    <main className="relative overflow-x-hidden">
      {/* Shared dramatic background photo. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroImg})` }}
      />
      {/* Base darkening scrim across the whole page. */}
      <div aria-hidden="true" className="absolute inset-0 bg-black/55" />
      {/* Per-side overlays: subtle gradient on mobile, heavier on the access
          side on lg so the cards pop. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/70 lg:bg-gradient-to-r lg:from-black/60 lg:via-black/45 lg:to-black/85"
      />

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2">
        {/* min-w-0 stops a column being forced wider than the viewport by
            max-width child text on mobile. */}
        <div className="min-w-0">
          <MarketingPanel />
        </div>
        {/* Divider + darker backing for the access half. */}
        <div className="relative min-w-0 bg-ink/40 lg:bg-ink/55 lg:before:absolute lg:before:inset-y-0 lg:before:left-0 lg:before:w-px lg:before:bg-white/10 lg:before:content-['']">
          <RaceHubAccessPanel />
        </div>
      </div>
    </main>
  </div>
);

export default SplitHeroLanding;
