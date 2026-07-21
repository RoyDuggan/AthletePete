import React from "react";
import { Link } from "react-router-dom";

import MarketingLayout from "../components/marketing/MarketingLayout";
import { container, focusRing } from "../components/marketing/ui";

const PLANS: {
  name: string;
  price: string;
  blurb: string;
  features: string[];
  featured?: boolean;
}[] = [
  {
    name: "Driver",
    price: "£TBC",
    blurb: "Single-driver telemetry analysis.",
    features: [
      "Unlimited session uploads",
      "Per-zone deltas & metrics",
      "AI coaching summaries",
      "Kart setup recommendations",
    ],
  },
  {
    name: "Team",
    price: "£TBC",
    blurb: "Multi-driver and cross-session comparison.",
    features: [
      "Everything in Driver",
      "Compare laps across drivers",
      "Cross-session progress tracking",
      "Shared team workspace",
    ],
    featured: true,
  },
  {
    name: "Coach",
    price: "£TBC",
    blurb: "Coach dashboard and shared reports.",
    features: [
      "Everything in Team",
      "Branded shareable reports",
      "Custom prompt templates",
      "Priority support",
    ],
  },
];

const PricingPage: React.FC = () => (
  <MarketingLayout>
    <section className="border-b border-white/10 bg-panel py-14 md:py-20">
      <div className={`${container} text-center`}>
        <h1 className="text-2xl font-extrabold uppercase tracking-wide text-white md:text-4xl">
          <span className="text-brand">Pricing</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-gray-400 md:text-base">
          Simple plans for drivers, teams and coaches. Pricing is being finalised
          for the beta.
        </p>
      </div>
    </section>

    <section className="py-12 md:py-20">
      <div className={container}>
        <div className="grid gap-6 md:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`flex flex-col rounded-lg border bg-panel p-7 transition duration-300 hover:scale-[1.02] ${
                plan.featured
                  ? "border-brand shadow-[0_0_0_1px_#1672CB]"
                  : "border-white/10 hover:border-brand/40"
              }`}
            >
              {plan.featured && (
                <span className="mb-3 inline-block w-fit rounded-full bg-brand px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-black">
                  Most popular
                </span>
              )}
              <h3 className="text-lg font-extrabold uppercase tracking-wide text-white">
                {plan.name}
              </h3>
              <p className="mt-1 text-sm text-gray-400">{plan.blurb}</p>
              <p className="mt-4 text-3xl font-extrabold text-brand">
                {plan.price}
              </p>
              <ul className="mt-5 flex-1 space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2 text-sm text-gray-300">
                    <span className="text-brand">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                to="/register"
                className={`mt-6 inline-flex items-center justify-center rounded-3xl px-6 py-3 text-sm font-bold uppercase tracking-wide transition duration-300 hover:-translate-y-0.5 ${focusRing} ${
                  plan.featured
                    ? "bg-brand text-black"
                    : "bg-steel text-brand hover:bg-[#2a2a2a]"
                }`}
              >
                Choose {plan.name}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  </MarketingLayout>
);

export default PricingPage;
