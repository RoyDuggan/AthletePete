import React from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import { AppPage, appPanel } from "../../components/app/AppPage";
import { APP_NAV_LINKS } from "../../components/app/AppHeader";
import { getTier, hasFeature, TIER_LABEL, trialActive } from "../../lib/tiers";
import { focusRing } from "../../components/marketing/ui";

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const tier = getTier(user);
  const isSubscriber = Boolean(user && user.plan !== "FREE");

  const trialDaysLeft = user
    ? Math.max(
        0,
        Math.ceil((new Date(user.trialEndsAt).getTime() - Date.now()) / 86400000)
      )
    : 0;

  const tiles = APP_NAV_LINKS.filter(
    (l) => l.to !== "/app/dashboard" && (!l.coachOnly || user?.driverAdmin)
  );

  return (
    <AppPage
      title="Dashboard"
      subtitle={`Welcome back${user?.fullName ? `, ${user.fullName}` : ""}. Here's everything in your workspace.`}
    >
      {/* Account summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className={appPanel}>
          <p className="text-xs uppercase tracking-wide text-gray-500">Account</p>
          <p className="mt-1 truncate text-sm font-bold text-white" title={user?.email}>
            {user?.email}
          </p>
        </div>
        <div className={appPanel}>
          <p className="text-xs uppercase tracking-wide text-gray-500">Plan</p>
          <p className="mt-1 text-sm font-bold text-brand">{TIER_LABEL[tier]}</p>
        </div>
        <div className={appPanel}>
          <p className="text-xs uppercase tracking-wide text-gray-500">Access</p>
          <p className="mt-1 text-sm font-bold text-white">
            {isSubscriber ? "Full" : trialActive(user) ? "Trial" : "Limited"}
          </p>
        </div>
        <div className={appPanel}>
          <p className="text-xs uppercase tracking-wide text-gray-500">
            {isSubscriber ? "Billing" : "Trial"}
          </p>
          <p className="mt-1 text-sm font-bold text-white">
            {isSubscriber
              ? "Active"
              : trialActive(user)
              ? `${trialDaysLeft} days left`
              : "Ended"}
          </p>
        </div>
      </div>

      {(tier === "free" || tier === "trial") && (
        <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-brand/30 bg-panel px-5 py-3 text-sm text-gray-300">
          <span>
            {tier === "trial"
              ? "You're on a free trial with full access to premium features."
              : "You're on the free plan — your athlete profile is included."}
          </span>
          <Link
            to="/app/subscription"
            className="ml-auto font-bold uppercase tracking-wide text-brand hover:underline"
          >
            Upgrade
          </Link>
        </div>
      )}

      {/* Feature tiles */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((link) => {
          const locked = link.feature ? !hasFeature(user, link.feature) : false;
          return (
            <Link
              key={link.to}
              to={link.to}
              className={`group flex items-center justify-between rounded-lg border border-white/10 bg-panel p-5 transition duration-300 hover:scale-[1.02] hover:border-brand/40 ${focusRing}`}
            >
              <span className="text-sm font-extrabold uppercase tracking-wide text-white group-hover:text-brand">
                {link.label}
              </span>
              <span className="text-gray-500">{locked ? "🔒" : "→"}</span>
            </Link>
          );
        })}
      </div>
    </AppPage>
  );
};

export default DashboardPage;
