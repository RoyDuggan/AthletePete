import React from "react";
import { Link } from "react-router-dom";

import { focusRing } from "../marketing/ui";

/** Dark panel card reused across the app pages. */
export const appPanel = "rounded-lg border border-white/10 bg-panel p-5";

/** Standard padded page body for a signed-in app page. */
export const AppPage: React.FC<{
  title: string;
  accent?: string;
  subtitle?: string;
  children: React.ReactNode;
}> = ({ title, accent, subtitle, children }) => (
  <div className="mx-auto w-full max-w-6xl px-6 py-10 md:px-12">
    <h1 className="text-2xl font-extrabold uppercase tracking-wide text-white md:text-3xl">
      {title} {accent && <span className="text-brand">{accent}</span>}
    </h1>
    {subtitle && (
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-400">
        {subtitle}
      </p>
    )}
    <div className="mt-8">{children}</div>
  </div>
);

/** Shown in place of a premium feature the current tier doesn't unlock. */
export const UpgradeNotice: React.FC<{ feature: string }> = ({ feature }) => (
  <div className="rounded-lg border border-brand/40 bg-panel p-8 text-center">
    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-brand/40 text-xl">
      🔒
    </div>
    <h2 className="mt-4 text-lg font-extrabold uppercase tracking-wide text-white">
      {feature} is a premium feature
    </h2>
    <p className="mx-auto mt-2 max-w-md text-sm text-gray-400">
      Your current plan doesn't include {feature.toLowerCase()}. Upgrade to a
      paid plan — or start your free trial — to unlock it.
    </p>
    <Link
      to="/app/subscription"
      className={`mt-5 inline-flex items-center justify-center rounded-3xl bg-brand px-6 py-3 text-sm font-bold uppercase tracking-wide text-black transition duration-300 hover:-translate-y-0.5 ${focusRing}`}
    >
      View plans →
    </Link>
  </div>
);

/** Lightweight "coming soon" placeholder body for not-yet-built tools. */
export const ComingSoon: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <div className="rounded-lg border border-dashed border-white/15 bg-panel/60 p-6 text-sm leading-relaxed text-gray-400">
    {children}
  </div>
);
