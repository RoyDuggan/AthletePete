import React from "react";
import { Link } from "react-router-dom";

import { focusRing } from "../marketing/ui";

/**
 * A large tappable access card (link) for the Race Hub panel. Two variants:
 *  - "primary": solid lime fill, black text — the strongest CTA (Register Free).
 *  - "secondary": dark glass card with a lime hover border (Access My Race Hub).
 */

const AccessCard: React.FC<{
  to: string;
  title: string;
  helper: string;
  variant: "primary" | "secondary";
  icon: React.ReactNode;
}> = ({ to, title, helper, variant, icon }) => {
  const isPrimary = variant === "primary";

  const base =
    "group flex items-center gap-4 rounded-2xl p-4 no-underline transition duration-300 hover:-translate-y-0.5 md:p-5 " +
    focusRing;

  const tone = isPrimary
    ? "bg-brand text-black shadow-lg shadow-brand/20 hover:shadow-xl hover:shadow-brand/30"
    : "border border-white/15 bg-white/[0.04] text-white backdrop-blur-sm hover:border-brand/60 hover:bg-white/[0.06]";

  return (
    <Link to={to} className={`${base} ${tone}`}>
      <span
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${
          isPrimary ? "bg-black/10 text-black" : "border border-brand/40 text-brand"
        }`}
        aria-hidden="true"
      >
        {icon}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-lg font-extrabold uppercase tracking-wide md:text-xl">
          {title}
        </span>
        <span
          className={`mt-1 block text-sm leading-snug ${
            isPrimary ? "text-black/75" : "text-white/65"
          }`}
        >
          {helper}
        </span>
      </span>

      <span
        aria-hidden="true"
        className={`shrink-0 text-2xl transition-transform duration-300 group-hover:translate-x-1 ${
          isPrimary ? "text-black" : "text-white/70"
        }`}
      >
        →
      </span>
    </Link>
  );
};

export default AccessCard;
