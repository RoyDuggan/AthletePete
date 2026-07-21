import React from "react";
import { Link } from "react-router-dom";

import MarketingLayout from "../components/marketing/MarketingLayout";
import { container, lightCard, ctaButton, focusRing } from "../components/marketing/ui";

const CATEGORIES: { icon: string; title: string; text: string }[] = [
  {
    icon: "🌡️",
    title: "Weather Inputs",
    text: "Temperature, humidity, altitude and barometric pressure drive every recommendation.",
  },
  {
    icon: "⛽",
    title: "Jetting",
    text: "Algorithmic carb jetting selected for the current atmospheric conditions.",
  },
  {
    icon: "🛞",
    title: "Tyre Pressure",
    text: "Hot and cold target pressures for grip level, track temperature and compound.",
  },
  {
    icon: "⚖️",
    title: "Balance",
    text: "Front/rear and seat-position guidance to tune entry rotation versus exit grip.",
  },
  {
    icon: "📐",
    title: "Ride Height",
    text: "Axle and ride-height ranges to trade mechanical grip against responsiveness.",
  },
  {
    icon: "🎯",
    title: "Setup Confidence",
    text: "Every suggestion comes with a confidence rating and the reasoning behind it.",
  },
];

const KartSetupPage: React.FC = () => (
  <MarketingLayout>
    <section className="border-b border-white/10 bg-panel py-14 md:py-20">
      <div className={`${container} text-center`}>
        <h1 className="text-2xl font-extrabold uppercase tracking-wide text-white md:text-4xl">
          Kart <span className="text-brand">Setup</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-gray-400 md:text-base">
          Weather-aware setup and jetting recommendations, so you roll out of the
          paddock already in the window.
        </p>
      </div>
    </section>

    <section className="py-12 md:py-20">
      <div className={container}>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map((cat) => (
            <div key={cat.title} className={`${lightCard} p-6`}>
              <div className="text-3xl">{cat.icon}</div>
              <h3 className="mt-3 text-base font-extrabold uppercase tracking-wide text-[#1f2937]">
                {cat.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#374151]">
                {cat.text}
              </p>
              <Link
                to="/register"
                className={`mt-4 inline-block text-xs font-bold uppercase tracking-wide text-hero-blue hover:underline ${focusRing}`}
              >
                Learn More →
              </Link>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link to="/register" className={ctaButton}>
            Get My Setup →
          </Link>
        </div>
      </div>
    </section>
  </MarketingLayout>
);

export default KartSetupPage;
