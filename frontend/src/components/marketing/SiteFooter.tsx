import React from "react";
import { Link } from "react-router-dom";

import { container, focusRing } from "./ui";

const FOOTER_LINKS: { label: string; to: string }[] = [
  { label: "About", to: "/about" },
  { label: "For Athletes", to: "/athletes" },
  { label: "For Teams", to: "/teams" },
  { label: "Pricing", to: "/pricing" },
  { label: "Terms", to: "/terms" },
  { label: "Privacy", to: "/privacy" },
];

/** Shared dark footer with lime links, used on every page. */
const SiteFooter: React.FC = () => (
  <footer className="border-t border-white/10 bg-ink py-6">
    <div className={`${container} flex flex-wrap items-center justify-center gap-x-8 gap-y-3`}>
      {FOOTER_LINKS.map((link) => (
        <Link
          key={link.label}
          to={link.to}
          className={`text-[11px] font-bold uppercase tracking-wide text-brand transition-opacity duration-300 hover:opacity-70 md:text-xs ${focusRing}`}
        >
          {link.label}
        </Link>
      ))}
      <span className="text-[11px] uppercase tracking-wide text-gray-500">
        © D+R Athletic Development
      </span>
    </div>
  </footer>
);

export default SiteFooter;
