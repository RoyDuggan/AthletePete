import React from "react";
import { Link } from "react-router-dom";

import MarketingLayout from "../components/marketing/MarketingLayout";
import { container, focusRing } from "../components/marketing/ui";

const POINTS = [
  {
    k: "A plan built around you",
    d: "Answer the intake questionnaire once. Your programme is built from your position, level, training history, equipment and honest weekly availability.",
  },
  {
    k: "Approved by a real coach",
    d: "The AI drafts it; a professional coach reviews, adjusts and approves it before it reaches you. You get expertise, faster.",
  },
  {
    k: "Week-by-week clarity",
    d: "Your programme is laid out as a calendar — strength, on-ice, conditioning, recovery — so you always know what today's session is.",
  },
  {
    k: "Adapts as you go",
    d: "Regular check-ins adjust the plan around progress, travel, camps and the odd niggle — so it stays realistic and effective.",
  },
];

const ForAthletesPage: React.FC = () => (
  <MarketingLayout>
    <section className={`${container} py-16 md:py-24`}>
      <div className="max-w-3xl">
        <p className="font-oswald text-xs font-semibold uppercase tracking-[0.24em] text-brand">
          For Athletes
        </p>
        <h1 className="mt-4 font-display text-4xl font-bold leading-tight text-white md:text-5xl">
          Your off-season, <span className="text-brand">engineered.</span>
        </h1>
        <p className="mt-6 text-base leading-relaxed text-gray-300">
          Stop guessing. Get an individualised, coach-approved training programme
          that's built around your game and your life — and adapts as you train.
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
          See pricing
        </Link>
      </div>
    </section>
  </MarketingLayout>
);

export default ForAthletesPage;
