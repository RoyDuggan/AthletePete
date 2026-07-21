import React from "react";

import MarketingLayout from "./MarketingLayout";
import { container } from "./ui";

/** Shared layout + typography helpers for long-form legal pages. */
const LegalPage: React.FC<{
  title: string;
  updated: string;
  intro?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, updated, intro, children }) => (
  <MarketingLayout>
    <div className={`${container} py-12`}>
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-extrabold uppercase tracking-wide text-white">
          {title}
        </h1>
        <p className="mt-2 text-xs uppercase tracking-wide text-muted">
          Last updated: {updated}
        </p>
        {intro && <p className="mt-4 text-sm leading-relaxed text-gray-400">{intro}</p>}
        <div className="mt-8 space-y-6 text-sm leading-relaxed text-gray-300">
          {children}
        </div>
      </div>
    </div>
  </MarketingLayout>
);

export const H2: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h2 className="text-lg font-bold text-white">{children}</h2>
);

export const P: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p>{children}</p>
);

export const UL: React.FC<{ items: React.ReactNode[] }> = ({ items }) => (
  <ul className="list-disc space-y-1 pl-5">
    {items.map((item, i) => (
      <li key={i}>{item}</li>
    ))}
  </ul>
);

/** A titled section with consistent spacing. */
export const Section: React.FC<{
  title: string;
  children: React.ReactNode;
}> = ({ title, children }) => (
  <section className="space-y-3">
    <H2>{title}</H2>
    {children}
  </section>
);

export default LegalPage;
