import React from "react";
import { Link } from "react-router-dom";

import MarketingLayout from "../components/marketing/MarketingLayout";
import { container, focusRing } from "../components/marketing/ui";

/** Public home page. Generic athlete-training hero (to be expanded). */
const LandingPage: React.FC = () => (
  <MarketingLayout>
    <section className={`${container} py-20 md:py-28`}>
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-sm font-bold uppercase tracking-widest text-brand">
          AthletePete
        </p>
        <h1 className="mt-4 text-4xl font-extrabold uppercase leading-tight tracking-wide text-white md:text-6xl">
          AI training plans,{" "}
          <span className="text-brand">curated by coaches</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-gray-300">
          Built for elite athletes. Complete a short questionnaire, get an
          AI-generated training plan reviewed by a professional coach, and follow
          it week by week — adapting as you progress.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link
            to="/register"
            className={`rounded-3xl bg-brand px-7 py-3 text-sm font-bold uppercase tracking-wide text-black transition duration-300 hover:-translate-y-0.5 ${focusRing}`}
          >
            Get started
          </Link>
          <Link
            to="/sign-in"
            className={`rounded-3xl border border-white/25 px-7 py-3 text-sm font-bold uppercase tracking-wide text-white transition duration-300 hover:border-white/50 ${focusRing}`}
          >
            Sign in
          </Link>
        </div>
      </div>
    </section>
  </MarketingLayout>
);

export default LandingPage;
