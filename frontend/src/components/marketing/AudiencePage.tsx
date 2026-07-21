import React from "react";
import { Link } from "react-router-dom";

import MarketingLayout from "./MarketingLayout";
import { container, ctaButton, focusRing } from "./ui";

/** Content model for the audience (For Drivers / Parents / Teams) pages. */
export type CopyBlock = { p: string; emphasis?: boolean } | { bullets: string[] };

export type CopySection = { title?: string; blocks: CopyBlock[] };

export type AudiencePageData = {
  eyebrow: string;
  title: string;
  /** Optional trailing fragment of the title rendered in the brand colour. */
  titleAccent?: string;
  intro: CopyBlock[];
  sections: CopySection[];
  closing?: { title: string; titleAccent?: string; paragraphs: string[]; taglines?: string[] };
};

const Blocks: React.FC<{ blocks: CopyBlock[] }> = ({ blocks }) => (
  <div className="space-y-4 text-sm leading-relaxed text-gray-300 md:text-base">
    {blocks.map((block, i) =>
      "bullets" in block ? (
        <ul key={i} className="space-y-2">
          {block.bullets.map((item) => (
            <li key={item} className="flex gap-2">
              <span className="mt-0.5 shrink-0 text-brand">▸</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p key={i} className={block.emphasis ? "text-lg font-bold text-white md:text-xl" : ""}>
          {block.p}
        </p>
      )
    )}
  </div>
);

const AudiencePage: React.FC<{ data: AudiencePageData }> = ({ data }) => (
  <MarketingLayout>
    {/* Hero */}
    <section className="bg-panel py-16 md:py-24">
      <div className={`${container} max-w-3xl`}>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand">
          {data.eyebrow}
        </p>
        <h1 className="mt-2 text-3xl font-extrabold uppercase tracking-wide text-white md:text-5xl">
          {data.title}
          {data.titleAccent && <span className="text-brand"> {data.titleAccent}</span>}
        </h1>
        <div className="mt-6">
          <Blocks blocks={data.intro} />
        </div>
      </div>
    </section>

    {/* Sections (alternating backgrounds) */}
    {data.sections.map((s, index) => (
      <section
        key={s.title ?? index}
        className={`${index % 2 === 0 ? "bg-ink" : "bg-panel"} border-t border-white/10 py-12 md:py-16`}
      >
        <div className={`${container} max-w-3xl`}>
          {s.title && (
            <h2 className="mb-5 text-xl font-extrabold uppercase tracking-wide text-white md:text-3xl">
              {s.title}
            </h2>
          )}
          <Blocks blocks={s.blocks} />
        </div>
      </section>
    ))}

    {/* Closing CTA */}
    <section className="border-t border-white/10 bg-panel py-16 md:py-24">
      <div className={`${container} max-w-3xl text-center`}>
        {data.closing && (
          <>
            <h2 className="text-2xl font-extrabold uppercase tracking-wide text-white md:text-4xl">
              {data.closing.title}
              {data.closing.titleAccent && (
                <span className="text-brand"> {data.closing.titleAccent}</span>
              )}
            </h2>
            <div className="mx-auto mt-6 max-w-2xl space-y-4 text-sm leading-relaxed text-gray-300 md:text-base">
              {data.closing.paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
            {data.closing.taglines && (
              <div className="mt-8 space-y-1 text-lg font-bold uppercase tracking-wide text-brand md:text-xl">
                {data.closing.taglines.map((t) => (
                  <p key={t}>{t}</p>
                ))}
              </div>
            )}
          </>
        )}

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link to="/register" className={ctaButton}>
            Get Started →
          </Link>
          <Link
            to="/how-it-works"
            className={`inline-flex items-center justify-center rounded-3xl border border-white/30 px-7 py-3 text-sm font-bold uppercase tracking-wide text-white transition duration-300 hover:-translate-y-0.5 hover:border-brand ${focusRing}`}
          >
            See How It Works
          </Link>
        </div>
      </div>
    </section>
  </MarketingLayout>
);

export default AudiencePage;
