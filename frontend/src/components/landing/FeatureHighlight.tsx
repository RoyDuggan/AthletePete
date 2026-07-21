import React from "react";

import type { FeatureKey } from "./landingCopy";

/**
 * A single icon + title (+ optional description) feature item used on the
 * landing page. `compact` drops the description for the small icon strip.
 */

const iconPaths: Record<FeatureKey, React.ReactNode> = {
  analytics: (
    <>
      <path d="M3 3v18h18" />
      <path d="M7 15l3-4 3 2 4-6" />
    </>
  ),
  setup: (
    <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-2.7 2.7-2-2 2.7-2.7z" />
  ),
  library: (
    <>
      <path d="M4 5a2 2 0 0 1 2-2h4v18H6a2 2 0 0 1-2-2V5z" />
      <path d="M14 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4V3z" />
    </>
  ),
  free: (
    <>
      <path d="M7 18a4 4 0 0 1-.7-7.94 5 5 0 0 1 9.58-1.56A3.5 3.5 0 0 1 18 18H7z" />
    </>
  ),
};

const FeatureHighlight: React.FC<{
  icon: FeatureKey;
  title: string;
  desc?: string;
  compact?: boolean;
}> = ({ icon, title, desc, compact = false }) => {
  if (compact) {
    return (
      <div className="flex w-20 flex-col items-center gap-2 text-center">
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-7 w-7 text-brand"
        >
          {iconPaths[icon]}
        </svg>
        <span className="text-[10px] font-bold uppercase leading-tight tracking-wide text-white/80">
          {title}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-brand/40 bg-white/5">
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.7}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5 text-brand"
        >
          {iconPaths[icon]}
        </svg>
      </span>
      <div>
        <h3 className="text-sm font-extrabold uppercase tracking-wide text-white">
          {title}
        </h3>
        {desc && <p className="mt-0.5 text-xs leading-snug text-white/70">{desc}</p>}
      </div>
    </div>
  );
};

export default FeatureHighlight;
