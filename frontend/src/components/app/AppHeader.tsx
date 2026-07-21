import React, { useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";

import { DRWordmark } from "../brand/DRLogo";
import { useAuth } from "../../context/AuthContext";
import { container, focusRing } from "../marketing/ui";
import { type Feature, getTier, hasFeature, TIER_LABEL } from "../../lib/tiers";

/** Signed-in app navigation, shown in place of the public marketing nav. */

type AppNavLink = {
  label: string;
  to: string;
  feature?: Feature;
  /** Only shown to coaches (driverAdmin flag). */
  coachOnly?: boolean;
};

export const APP_NAV_LINKS: AppNavLink[] = [
  { label: "Dashboard", to: "/app/dashboard" },
  { label: "Athlete Profile", to: "/app/profile", feature: "profile" },
  { label: "Training Calendar", to: "/app/calendar", feature: "calendar" },
  { label: "Coaching", to: "/app/coaching", feature: "coaching" },
  { label: "Coach", to: "/app/coach", coachOnly: true },
  { label: "Subscription", to: "/app/subscription" },
  { label: "Settings", to: "/app/settings" },
];

const tabClass = ({ isActive }: { isActive: boolean }) =>
  `whitespace-nowrap border-b-2 px-1 pb-2 pt-1 text-[13px] font-bold uppercase tracking-wide transition-colors duration-200 ${
    isActive
      ? "border-brand text-brand"
      : "border-transparent text-gray-400 hover:text-white"
  } ${focusRing}`;

const AppHeader: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const tier = getTier(user);
  const links = APP_NAV_LINKS.filter((l) => !l.coachOnly || user?.driverAdmin);

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    navigate("/");
  };

  // Label of the section currently in view, shown on the mobile menu toggle.
  const activeLabel =
    APP_NAV_LINKS.find((link) => location.pathname.startsWith(link.to))?.label ??
    "Menu";

  return (
    <header className="sticky top-0 z-50 bg-brand shadow-md">
      {/* Top bar: logo + account + sign out — same blue banner as the home page. */}
      <div className="border-b border-white/10 bg-brand">
        <div className={`${container} flex h-14 items-center justify-between lg:h-16`}>
          <Link
            to="/app/dashboard"
            className={`flex items-center ${focusRing}`}
            aria-label="DR Performance dashboard"
          >
            <DRWordmark inverse />
          </Link>

          <div className="flex items-center gap-3">
            <span className="hidden rounded-full border border-white/30 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white sm:inline">
              {TIER_LABEL[tier]} plan
            </span>
            {user && (
              <span
                className="hidden max-w-[180px] truncate text-xs font-bold text-white/80 md:inline"
                title={user.email}
              >
                {user.email}
              </span>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className={`rounded-md border border-white/60 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white transition-transform duration-300 hover:scale-105 ${focusRing}`}
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Secondary nav. Desktop (>= lg): horizontally scrollable tab row.
          Mobile (< lg): a hamburger that toggles a vertical dropdown, since
          nine tabs can't fit on a phone. */}
      <nav className="border-b border-white/10 bg-ink">
        {/* Desktop tab row */}
        <div className={`${container} hidden gap-5 overflow-x-auto pt-2 lg:flex xl:gap-7`}>
          {links.map((link) => {
            const locked = link.feature ? !hasFeature(user, link.feature) : false;
            return (
              <NavLink key={link.to} to={link.to} className={tabClass} end={false}>
                <span className="flex items-center gap-1">
                  {link.label}
                  {locked && (
                    <span className="text-[11px] text-muted" title="Upgrade to unlock">
                      🔒
                    </span>
                  )}
                </span>
              </NavLink>
            );
          })}
        </div>

        {/* Mobile toggle */}
        <div className={`${container} flex items-center justify-between py-2 lg:hidden`}>
          <span className="text-[13px] font-bold uppercase tracking-wide text-brand">
            {activeLabel}
          </span>
          <button
            type="button"
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            className={`flex h-9 w-9 flex-col items-center justify-center gap-[5px] rounded ${focusRing}`}
          >
            <span className="block h-0.5 w-6 bg-white" />
            <span className="block h-0.5 w-6 bg-white" />
            <span className="block h-0.5 w-6 bg-white" />
          </button>
        </div>
      </nav>

      {/* Mobile dropdown (< lg) */}
      {menuOpen && (
        <nav className="border-b border-white/10 bg-ink lg:hidden">
          {links.map((link) => {
            const locked = link.feature ? !hasFeature(user, link.feature) : false;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                end={false}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `block px-6 py-3 text-left text-sm font-bold uppercase tracking-wide transition-colors duration-200 ${
                    isActive
                      ? "bg-white/5 text-brand"
                      : "text-gray-400 hover:bg-white/5 hover:text-white"
                  } ${focusRing}`
                }
              >
                <span className="flex items-center gap-1">
                  {link.label}
                  {locked && (
                    <span className="text-[11px] text-muted" title="Upgrade to unlock">
                      🔒
                    </span>
                  )}
                </span>
              </NavLink>
            );
          })}
        </nav>
      )}
    </header>
  );
};

export default AppHeader;
