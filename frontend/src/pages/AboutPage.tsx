import React from "react";
import { Link } from "react-router-dom";

import MarketingLayout from "../components/marketing/MarketingLayout";
import { container, focusRing } from "../components/marketing/ui";

const AboutPage: React.FC = () => (
  <MarketingLayout>
    <section className={`${container} py-16 md:py-24`}>
      <div className="max-w-3xl">
        <p className="font-oswald text-xs font-semibold uppercase tracking-[0.24em] text-brand">
          About
        </p>
        <h1 className="mt-4 font-display text-4xl font-bold leading-tight text-white md:text-5xl">
          Athletic development, done properly.
        </h1>
        <p className="mt-6 text-base leading-relaxed text-gray-300">
          D+R Athletic Development builds individualised training programmes for
          serious athletes. We pair AI-generated planning with the judgement of
          professional coaches — so every athlete gets a plan built around their
          sport, their body, their goals and their real-world schedule, not a
          template.
        </p>
        <p className="mt-4 text-base leading-relaxed text-gray-300">
          It starts with a detailed intake questionnaire. From your answers we
          generate a structured off-season programme, a coach reviews and refines
          it, and it's laid out for you week by week — then adapted as you train
          and review your progress.
        </p>
      </div>

      <div className="mt-14 grid gap-5 sm:grid-cols-3">
        {[
          {
            k: "Individualised",
            d: "Every plan is built from your questionnaire — position, level, history, equipment and availability.",
          },
          {
            k: "Coach-led",
            d: "AI does the heavy lifting; a professional coach curates and signs off every programme.",
          },
          {
            k: "Adaptive",
            d: "Weekly reviews keep the plan honest — it changes as you progress, travel or pick up niggles.",
          },
        ].map((c) => (
          <div key={c.k} className="rounded-xl border border-hair bg-panel p-6">
            <h3 className="font-oswald text-sm font-bold uppercase tracking-wide text-brand">
              {c.k}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-gray-300">{c.d}</p>
          </div>
        ))}
      </div>

      <div className="mt-14">
        <Link
          to="/register"
          className={`inline-flex rounded-xl bg-brand px-7 py-3 text-sm font-bold uppercase tracking-wide text-white transition hover:bg-hero-blue ${focusRing}`}
        >
          Get started
        </Link>
      </div>
    </section>
  </MarketingLayout>
);

export default AboutPage;
