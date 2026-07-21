import React, { useState } from "react";
import { Link } from "react-router-dom";

import MarketingLayout from "../components/marketing/MarketingLayout";
import { container, lightCard, focusRing } from "../components/marketing/ui";

type Category = "Drivers" | "Teams" | "Parents";

type Example = {
  title: string;
  category: Category;
  date: string;
  track: string;
  duration: string;
  insight: string;
};

const EXAMPLES: Example[] = [
  {
    title: "Apex speed in Turn 3",
    category: "Drivers",
    date: "12 Jun 2026",
    track: "Brands Hatch Indy",
    duration: "47.21s lap",
    insight:
      "Lost 0.14s by over-slowing into T3 — braking 0.10s too early. Roll more minimum speed for free time.",
  },
  {
    title: "Exit drive comparison",
    category: "Drivers",
    date: "09 Jun 2026",
    track: "PFI",
    duration: "52.83s lap",
    insight:
      "Strong gain on the back straight: throttle 0.55s earlier out of the hairpin than the reference lap.",
  },
  {
    title: "Session consistency",
    category: "Teams",
    date: "05 Jun 2026",
    track: "Whilton Mill",
    duration: "18 laps",
    insight:
      "Two drivers compared across sessions — Driver B is 0.3s quicker through sector 2 every lap.",
  },
  {
    title: "Cross-session progress",
    category: "Teams",
    date: "01 Jun 2026",
    track: "Brands Hatch Indy",
    duration: "3 sessions",
    insight:
      "Tracked the same corner across three test days — minimum speed up 4 km/h since the first session.",
  },
  {
    title: "Where is my child losing time?",
    category: "Parents",
    date: "28 May 2026",
    track: "Clay Pigeon",
    duration: "45.6s lap",
    insight:
      "Plain-English summary: most time is lost on corner entry — a coaching focus, not a kart problem.",
  },
  {
    title: "Is the kart set up right?",
    category: "Parents",
    date: "20 May 2026",
    track: "PFI",
    duration: "51.0s lap",
    insight:
      "RPM recovery and exit drive look healthy — the gap is driver technique, with a clear next step.",
  },
];

const FILTERS: ("All" | Category)[] = ["All", "Drivers", "Teams", "Parents"];

const ExampleOutputsPage: React.FC = () => {
  const [filter, setFilter] = useState<"All" | Category>("All");

  const shown =
    filter === "All"
      ? EXAMPLES
      : EXAMPLES.filter((e) => e.category === filter);

  return (
    <MarketingLayout>
      <section className="border-b border-white/10 bg-panel py-14 md:py-20">
        <div className={`${container} text-center`}>
          <h1 className="text-2xl font-extrabold uppercase tracking-wide text-white md:text-4xl">
            Example <span className="text-brand">Outputs</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-gray-400 md:text-base">
            A taste of the insights AthletePete produces — per-zone deltas,
            cross-session comparisons and AI coaching summaries.
          </p>
        </div>
      </section>

      <section className="py-12 md:py-20">
        <div className={container}>
          {/* Filters */}
          <div className="mb-8 flex flex-wrap justify-center gap-3">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`rounded-full px-5 py-2 text-xs font-bold uppercase tracking-wide transition-transform duration-300 hover:scale-105 ${focusRing} ${
                  filter === f
                    ? "bg-brand text-black"
                    : "border border-white/20 text-gray-300 hover:border-brand/50"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Cards */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((ex) => (
              <article key={ex.title} className={`${lightCard} flex flex-col p-5`}>
                <div className="mb-3 flex h-32 items-center justify-center rounded-md bg-gradient-to-br from-[#e8edf3] to-[#d6deea] text-xs font-bold uppercase tracking-wide text-[#94a3b8]">
                  Analysis preview
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wide text-hero-blue">
                  {ex.category}
                </span>
                <h3 className="mt-1 text-base font-extrabold text-[#1f2937]">
                  {ex.title}
                </h3>
                <p className="mt-1 text-xs text-[#6b7280]">
                  {ex.track} • {ex.date} • {ex.duration}
                </p>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-[#374151]">
                  {ex.insight}
                </p>
                <Link
                  to="/register"
                  className={`mt-4 inline-flex items-center justify-center rounded-3xl bg-steel px-5 py-2 text-xs font-bold uppercase tracking-wide text-brand transition duration-300 hover:-translate-y-0.5 hover:bg-[#2a2a2a] ${focusRing}`}
                >
                  View Details →
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
};

export default ExampleOutputsPage;
