import React from "react";
import { Link } from "react-router-dom";

import MarketingLayout from "../components/marketing/MarketingLayout";
import { container, focusRing } from "../components/marketing/ui";

const POINTS = [
  {
    k: "A whole roster, individualised",
    d: "Every athlete completes their own intake and gets a plan built for them — while your staff keep oversight of the group.",
  },
  {
    k: "Consistent methodology",
    d: "One coaching philosophy applied across the squad, so training is aligned from your top line to your development players.",
  },
  {
    k: "Coach oversight built in",
    d: "AI drafts each programme; your coaches review, adjust and approve — scaling their expertise across more athletes.",
  },
  {
    k: "Ready for the season",
    d: "Off-season plans that map to your calendar and camp dates, so players arrive at pre-season prepared.",
  },
];

const ForTeamsPage: React.FC = () => (
  <MarketingLayout>
    <section className={`${container} py-16 md:py-24`}>
      <div className="max-w-3xl">
        <p className="font-oswald text-xs font-semibold uppercase tracking-[0.24em] text-brand">
          For Teams &amp; Organisations
        </p>
        <h1 className="mt-4 font-display text-4xl font-bold leading-tight text-white md:text-5xl">
          Develop the whole squad.
        </h1>
        <p className="mt-6 text-base leading-relaxed text-gray-300">
          Give every athlete an individualised, coach-curated programme — with the
          oversight, consistency and reporting a team or organisation needs.
        </p>
      </div>

      <div className="mt-14 grid gap-5 sm:grid-cols-2">
        {POINTS.map((p) => (
          <div key={p.k} className="rounded-xl border border-hair bg-panel p-6">
            <h3 className="font-oswald text-sm font-bold uppercase tracking-wide text-brand">
              {p.k}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-gray-300">{p.d}</p>
          </div>
        ))}
      </div>

      <div className="mt-14 flex flex-wrap gap-4">
        <Link
          to="/register"
          className={`inline-flex rounded-xl bg-brand px-7 py-3 text-sm font-bold uppercase tracking-wide text-white transition hover:bg-hero-blue ${focusRing}`}
        >
          Get started
        </Link>
        <Link
          to="/pricing"
          className={`inline-flex rounded-xl border border-white/25 px-7 py-3 text-sm font-bold uppercase tracking-wide text-white transition hover:border-white/50 ${focusRing}`}
        >
          Team pricing
        </Link>
      </div>
    </section>
  </MarketingLayout>
);

export default ForTeamsPage;
