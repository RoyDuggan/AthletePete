import React from "react";
import { Link } from "react-router-dom";

import MarketingLayout from "../components/marketing/MarketingLayout";
import { container, ctaButton, focusRing } from "../components/marketing/ui";
import SpeedDistanceChart from "../components/SpeedDistanceChart";
import ZoneGPlot from "../components/ZoneGPlot";
import "../styles/advisory.css";
import {
  EXTRACTED_FEATURES,
  FINDINGS,
  MAX_G,
  REFERENCE_G,
  REFERENCE_LAP,
  REFERENCE_SPEED,
  STAGE_ONE,
  STAGE_TWO,
  SUBJECT_G,
  SUBJECT_LAP,
  SUBJECT_SPEED,
} from "./howItWorksData";

/** A pale "screenshot" card that hosts the app's (light-themed) chart SVGs. */
const ChartCard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="rounded-xl border border-white/10 bg-mist p-4 shadow-[0_10px_30px_rgba(0,0,0,0.35)] md:p-6">
    {children}
  </div>
);

const Legend: React.FC = () => (
  <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs font-semibold text-[#475569]">
    <span className="flex items-center gap-2">
      <span className="inline-block h-2.5 w-4 rounded-sm bg-[#2563eb]" /> Your lap {SUBJECT_LAP}
    </span>
    <span className="flex items-center gap-2">
      <span className="inline-block h-2.5 w-4 rounded-sm bg-[#f59e0b]" /> Benchmark lap {REFERENCE_LAP}
    </span>
  </div>
);

const StageHeading: React.FC<{ kicker: string; title: string }> = ({ kicker, title }) => (
  <>
    <span className="text-xs font-bold uppercase tracking-widest text-brand">{kicker}</span>
    <h2 className="mt-2 text-xl font-extrabold uppercase tracking-wide text-white md:text-2xl">
      {title}
    </h2>
  </>
);

const HowItWorksPage: React.FC = () => (
  <MarketingLayout>
    {/* Hero */}
    <section className="border-b border-white/10 bg-panel py-14 md:py-20">
      <div className={`${container} max-w-3xl text-center`}>
        <span className="text-xs font-bold uppercase tracking-widest text-brand">
          How It Works
        </span>
        <h1 className="mt-3 text-2xl font-extrabold uppercase leading-tight tracking-wide text-white md:text-4xl">
          Deterministic features first.
          <br />
          <span className="text-brand">AI insight second.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-gray-400 md:text-base">
          Virtual Pete doesn't hand raw, noisy telemetry to an AI and hope. It
          first extracts clean, physically-grounded features from your data —
          then lets the AI reason over them like a race engineer. Here's the
          walk-through, with real examples.
        </p>
      </div>
    </section>

    {/* The two-stage pipeline */}
    <section className="py-12 md:py-16">
      <div className={container}>
        <div className="grid items-stretch gap-4 text-center md:grid-cols-[1fr_auto_1fr_auto_1fr]">
          {[
            { label: "Raw telemetry", sub: "AiM / RaceStudio CSV" },
            { label: "Deterministic features", sub: "traces · g-circle · zone deltas", accent: true },
            { label: "Conclusions & fixes", sub: "ranked, plain-English" },
          ].map((node, i) => (
            <React.Fragment key={node.label}>
              {i > 0 && (
                <div className="hidden items-center justify-center text-2xl text-brand md:flex">→</div>
              )}
              <div
                className={`rounded-xl border p-5 ${
                  node.accent
                    ? "border-brand/50 bg-brand/10"
                    : "border-white/10 bg-panel"
                }`}
              >
                <p className="text-sm font-extrabold uppercase tracking-wide text-white">
                  {node.label}
                </p>
                <p className="mt-1 text-xs text-gray-400">{node.sub}</p>
              </div>
            </React.Fragment>
          ))}
        </div>
        <p className="mx-auto mt-6 max-w-2xl text-center text-xs leading-relaxed text-gray-500">
          The AI sits at the <span className="text-gray-300">end</span> of the
          pipeline, not the start — so every recommendation is anchored to a
          measured number you can verify.
        </p>
      </div>
    </section>

    {/* Stage 1 — feature extraction */}
    <section className="border-t border-white/10 bg-panel py-12 md:py-16">
      <div className={container}>
        <StageHeading kicker={STAGE_ONE.kicker} title={STAGE_ONE.title} />
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-gray-300 md:text-base">
          {STAGE_ONE.body}
        </p>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {EXTRACTED_FEATURES.map((f) => (
            <li
              key={f.title}
              className="rounded-lg border border-white/10 bg-ink p-5 transition duration-300 hover:border-brand/40"
            >
              <h3 className="text-sm font-extrabold uppercase tracking-wide text-brand">
                {f.title}
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-gray-400">{f.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>

    {/* Example 1 — speed trace */}
    <section className="py-12 md:py-16">
      <div className={`${container} grid gap-8 lg:grid-cols-2 lg:items-center`}>
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-brand">
            Example feature · Speed trace
          </span>
          <h2 className="mt-2 text-xl font-extrabold uppercase tracking-wide text-white md:text-2xl">
            Where the speed actually goes
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-gray-300 md:text-base">
            Speed plotted against distance through one corner. Read it
            left-to-right: the flat top is the straight, the dip is the corner.
            The benchmark (amber) holds speed later into the braking zone and the
            trough sits higher — that's a later brake point and more apex speed.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-gray-400">
            <li>• <span className="text-gray-200">Brake point:</span> where each line starts to fall.</li>
            <li>• <span className="text-gray-200">Apex speed:</span> the lowest point of the trough.</li>
            <li>• <span className="text-gray-200">Exit drive:</span> how quickly the line climbs back up.</li>
          </ul>
        </div>
        <ChartCard>
          <SpeedDistanceChart
            subject={SUBJECT_SPEED}
            reference={REFERENCE_SPEED}
            subjectLapNumber={SUBJECT_LAP}
            referenceLapNumber={REFERENCE_LAP}
          />
        </ChartCard>
      </div>
    </section>

    {/* Example 2 — friction circle */}
    <section className="border-t border-white/10 bg-panel py-12 md:py-16">
      <div className={`${container} grid gap-8 lg:grid-cols-2 lg:items-center`}>
        <ChartCard>
          <div className="flex justify-center">
            <ZoneGPlot
              points={SUBJECT_G}
              referencePoints={REFERENCE_G}
              maxG={MAX_G}
              size={260}
            />
          </div>
          <Legend />
        </ChartCard>
        <div className="lg:order-first">
          <span className="text-xs font-bold uppercase tracking-widest text-brand">
            Example feature · Friction circle
          </span>
          <h2 className="mt-2 text-xl font-extrabold uppercase tracking-wide text-white md:text-2xl">
            How much grip you're really using
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-gray-300 md:text-base">
            Each dot is one sample's grip: braking and acceleration on the
            vertical axis, cornering on the horizontal. The outer ring is the
            tyre's limit. The benchmark sweeps a smooth arc around the edge —
            braking blends into cornering blends into drive. Your lap hugs the
            axes: braking <em>then</em> turning, with the combined-grip corners
            left empty.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-gray-400">
            That empty space is free lap time — grip the tyre has that isn't
            being asked for.
          </p>
        </div>
      </div>
    </section>

    {/* Stage 2 — AI reasoning */}
    <section className="py-12 md:py-16">
      <div className={container}>
        <StageHeading kicker={STAGE_TWO.kicker} title={STAGE_TWO.title} />
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-gray-300 md:text-base">
          {STAGE_TWO.body}
        </p>
      </div>
    </section>

    {/* Conclusions & recommendations */}
    <section className="border-t border-white/10 bg-panel py-12 md:py-16">
      <div className={container}>
        <h2 className="text-xl font-extrabold uppercase tracking-wide text-white md:text-2xl">
          The conclusions it draws
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gray-400">
          From exactly the two features above, for this one corner — each finding
          paired with the fix and the time it's worth.
        </p>
        <div className="mt-8 space-y-4">
          {FINDINGS.map((f, i) => (
            <div
              key={f.title}
              className="rounded-xl border border-white/10 bg-ink p-5 md:p-6"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="flex items-center gap-3 text-base font-extrabold uppercase tracking-wide text-white">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-sm text-black">
                    {i + 1}
                  </span>
                  {f.title}
                </h3>
                <span className="rounded-full border border-brand/40 px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand">
                  {f.gain}
                </span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-gray-400">
                <span className="font-bold uppercase tracking-wide text-gray-200">Evidence — </span>
                {f.evidence}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-gray-300">
                <span className="font-bold uppercase tracking-wide text-brand">Recommendation — </span>
                {f.recommendation}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* CTA */}
    <section className="py-14 md:py-20">
      <div className={`${container} text-center`}>
        <h2 className="text-xl font-extrabold uppercase tracking-wide text-white md:text-3xl">
          See it on <span className="text-brand">your</span> data
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-gray-400">
          Upload a session and Virtual Pete extracts the features and writes the
          coaching plan. Registration is free — no credit card required.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link to="/register" className={ctaButton}>
            Register Free →
          </Link>
          <Link
            to="/race-hub"
            className={`text-sm font-bold uppercase tracking-wide text-gray-300 hover:text-white ${focusRing}`}
          >
            Access My Race Hub
          </Link>
        </div>
      </div>
    </section>
  </MarketingLayout>
);

export default HowItWorksPage;
