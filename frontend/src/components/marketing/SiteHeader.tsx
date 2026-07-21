import React, { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";

import logoUrl from "../../assets/logo.svg";
import { useAuth } from "../../context/AuthContext";
import { container, focusRing } from "./ui";

/** Shared sticky header used by the home page and every marketing page. */

export const NAV_LINKS: { label: string; to: string }[] = [
  { label: "Home", to: "/" },
  { label: "For Drivers", to: "/drivers" },
  { label: "For Parents", to: "/parents" },
  { label: "For Teams", to: "/teams" },
  { label: "Pricing", to: "/pricing" },
];

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `text-[13px] font-bold uppercase tracking-wide transition-colors duration-300 ${
    isActive ? "text-black underline underline-offset-4" : "text-black/80 hover:text-black"
  } ${focusRing}`;

const SiteHeader: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-50 bg-brand shadow-md">
      <div className={`${container} flex h-14 items-center justify-between lg:h-16`}>
        <Link
          to="/"
          className={`flex items-center ${focusRing}`}
          aria-label="AthletePete home"
        >
          <img src={logoUrl} alt="AthletePete" className="h-9 w-auto lg:h-11" />
        </Link>

        {/* Desktop nav (>= lg) */}
        <nav className="hidden items-center gap-5 lg:flex xl:gap-6">
          {NAV_LINKS.map((link) => (
            <NavLink key={link.label} to={link.to} end={link.to === "/"} className={navLinkClass}>
              {link.label}
            </NavLink>
          ))}
        </nav>

        {/* Right side: account controls + mobile menu toggle. Signed in shows
            Dashboard + Sign Out (desktop); signed out shows a Sign In button in
            the same top-right slot the dashboard header uses for Sign Out, so
            the control stays consistently placed across the app. */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="hidden items-center gap-3 lg:flex">
              <Link
                to="/app/dashboard"
                className={`text-xs font-bold uppercase tracking-wide text-black/80 hover:text-black ${focusRing}`}
              >
                Dashboard
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className={`rounded-md border border-black px-4 py-2 text-xs font-bold uppercase tracking-wide text-black transition-transform duration-300 hover:scale-105 ${focusRing}`}
              >
                Sign Out
              </button>
            </div>
          ) : (
            <Link
              to="/sign-in"
              className={`rounded-md border border-black px-4 py-2 text-xs font-bold uppercase tracking-wide text-black transition-transform duration-300 hover:scale-105 ${focusRing}`}
            >
              Sign In
            </Link>
          )}

          {/* Mobile / tablet hamburger (< lg) */}
          <button
            type="button"
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            className={`flex h-9 w-9 flex-col items-center justify-center gap-[5px] rounded transition-transform duration-300 hover:scale-105 lg:hidden ${focusRing}`}
          >
            <span className="block h-0.5 w-6 bg-black" />
            <span className="block h-0.5 w-6 bg-black" />
            <span className="block h-0.5 w-6 bg-black" />
          </button>
        </div>
      </div>

      {/* Mobile / tablet dropdown (< lg) */}
      {menuOpen && (
        <nav className="absolute left-0 right-0 top-full z-40 border-t border-black/10 bg-brand shadow-lg lg:hidden">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.label}
              to={link.to}
              end={link.to === "/"}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `block px-6 py-3 text-left text-sm font-bold uppercase tracking-wide text-black transition-colors duration-300 hover:bg-black/10 ${
                  isActive ? "bg-black/5" : ""
                } ${focusRing}`
              }
            >
              {link.label}
            </NavLink>
          ))}
          {user && (
            <div className="flex gap-2 border-t border-black/10 px-6 py-3">
              <Link
                to="/app/dashboard"
                onClick={() => setMenuOpen(false)}
                className={`flex-1 rounded-md bg-black px-4 py-2 text-center text-xs font-bold uppercase tracking-wide text-white ${focusRing}`}
              >
                Dashboard
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className={`flex-1 rounded-md border border-black px-4 py-2 text-center text-xs font-bold uppercase tracking-wide text-black ${focusRing}`}
              >
                Sign Out
              </button>
            </div>
          )}
        </nav>
      )}
    </header>
  );
};

export default SiteHeader;
