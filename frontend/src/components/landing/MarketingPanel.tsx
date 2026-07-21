import React from "react";
import { Link } from "react-router-dom";

import { focusRing } from "../marketing/ui";
import FeatureHighlight from "./FeatureHighlight";
import { LANDING_COPY, LANDING_FEATURES } from "./landingCopy";

/**
 * Left half of the split landing: the headline, supporting copy, feature
 * highlights and the tertiary "Find Out More" CTA. The brand mark + nav live in
 * the shared SiteHeader above, so they're not repeated here. Sized to fit the
 * viewport (no page scroll) on desktop.
 */
const MarketingPanel: React.FC = () => {
  const { marketing } = LANDING_COPY;

  return (
    <div className="flex flex-col justify-center gap-4 px-6 py-7 sm:px-10 lg:min-h-[calc(100vh-4rem)] lg:gap-5 lg:px-14 lg:py-6 xl:px-16">
      {/* Headline */}
      <div>
        <h1 className="text-2xl font-extrabold uppercase leading-[1.08] tracking-wide text-white sm:text-3xl xl:text-4xl">
          {marketing.headline}
          <br />
          <span className="text-brand">{marketing.accentHeadline}</span>
        </h1>
        <span className="mt-3 block h-1 w-12 rounded bg-brand" aria-hidden="true" />
        <p className="mt-3 max-w-md text-sm leading-relaxed text-white/80">
          {marketing.body}
        </p>
      </div>

      {/* Feature highlights */}
      <ul className="grid max-w-xl gap-x-5 gap-y-3 sm:grid-cols-2">
        {LANDING_FEATURES.map((feature) => (
          <li key={feature.key}>
            <FeatureHighlight
              icon={feature.key}
              title={feature.title}
              desc={feature.desc}
            />
          </li>
        ))}
      </ul>

      {/* Tertiary CTA */}
      <div>
        <Link
          to={marketing.cta.to}
          className={`inline-flex items-center gap-2 rounded-2xl border border-white/30 px-6 py-2.5 text-sm font-bold uppercase tracking-wide text-white no-underline transition duration-300 hover:-translate-y-0.5 hover:border-brand hover:text-brand ${focusRing}`}
        >
          {marketing.cta.label}
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </div>
  );
};

export default MarketingPanel;
