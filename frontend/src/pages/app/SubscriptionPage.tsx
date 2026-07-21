import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import { AppPage } from "../../components/app/AppPage";
import { getTier, TIER_LABEL, trialActive } from "../../lib/tiers";
import { focusRing } from "../../components/marketing/ui";
import { BILLING_PLANS } from "../../lib/billingPlans";
import {
  getBillingConfig,
  startCheckout,
  openBillingPortal,
  type BillingConfig,
  type PaidPlan,
} from "../../api/billing";

const SubscriptionPage: React.FC = () => {
  const { user, refresh } = useAuth();
  const [params, setParams] = useSearchParams();
  const [config, setConfig] = useState<BillingConfig | null>(null);
  const [busy, setBusy] = useState<PaidPlan | "portal" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentPlan = user?.plan ?? "FREE";
  const isSubscriber = currentPlan !== "FREE";
  const tier = getTier(user);

  useEffect(() => {
    getBillingConfig()
      .then(setConfig)
      .catch(() => setConfig({ enabled: false, plans: { DRIVER: false, TEAM: false, COACH: false } }));
  }, []);

  // Returning from Stripe Checkout: refresh the user so the new plan shows. The
  // webhook may land a beat after redirect, so re-check shortly after too.
  const checkout = params.get("checkout");
  useEffect(() => {
    if (checkout !== "success") return;
    refresh().catch(() => {});
    const t = window.setTimeout(() => refresh().catch(() => {}), 4000);
    return () => window.clearTimeout(t);
  }, [checkout, refresh]);

  const dismissBanner = () => {
    params.delete("checkout");
    setParams(params, { replace: true });
  };

  const subscribe = async (plan: PaidPlan) => {
    setBusy(plan);
    setError(null);
    try {
      await startCheckout(plan); // redirects away on success
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start checkout.");
      setBusy(null);
    }
  };

  const manage = async () => {
    setBusy("portal");
    setError(null);
    try {
      await openBillingPortal(); // redirects away on success
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open the billing portal.");
      setBusy(null);
    }
  };

  const statusLine = isSubscriber
    ? `You're on the ${TIER_LABEL[tier]} plan.`
    : trialActive(user)
    ? "You're on the free trial — subscribe any time to keep full access."
    : "You're on the Free plan.";

  return (
    <AppPage
      title="Subscription"
      subtitle="Choose a plan or manage your billing."
    >
      {checkout === "success" && (
        <div className="mb-4 flex items-center justify-between gap-4 rounded-lg border border-brand/40 bg-brand/10 px-4 py-3 text-sm text-brand">
          <span>Payment received — activating your plan. This can take a few seconds.</span>
          <button type="button" onClick={dismissBanner} className="text-xs font-bold uppercase">
            Dismiss
          </button>
        </div>
      )}
      {checkout === "cancel" && (
        <div className="mb-4 flex items-center justify-between gap-4 rounded-lg border border-white/15 bg-white/5 px-4 py-3 text-sm text-gray-300">
          <span>Checkout cancelled — no charge was made.</span>
          <button type="button" onClick={dismissBanner} className="text-xs font-bold uppercase">
            Dismiss
          </button>
        </div>
      )}

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-300">{statusLine}</p>
        {isSubscriber && (
          <button
            type="button"
            onClick={manage}
            disabled={busy !== null}
            className={`rounded-3xl border border-white/20 px-5 py-2 text-xs font-bold uppercase tracking-wide text-gray-100 transition hover:border-white/40 disabled:opacity-50 ${focusRing}`}
          >
            {busy === "portal" ? "Opening…" : "Manage billing"}
          </button>
        )}
      </div>

      {error && <p className="mb-4 text-sm text-[#ef4444]">{error}</p>}

      {config && !config.enabled && (
        <p className="mb-4 rounded-lg border border-amber-400/30 bg-amber-400/5 px-4 py-3 text-sm text-amber-300">
          Billing isn't live yet. Plans are shown for reference; the Subscribe
          buttons activate once payments are switched on.
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {BILLING_PLANS.map((p) => {
          const isCurrent = currentPlan === p.plan;
          const planReady = Boolean(config?.enabled && config.plans[p.plan]);
          return (
            <div
              key={p.plan}
              className={`flex flex-col rounded-lg border bg-panel p-6 ${
                p.featured ? "border-brand/60" : "border-white/10"
              } ${isCurrent ? "shadow-[0_0_0_1px_#1672CB]" : ""}`}
            >
              {isCurrent && (
                <span className="mb-3 inline-block w-fit rounded-full bg-brand px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-black">
                  Current plan
                </span>
              )}
              <h3 className="text-lg font-extrabold uppercase tracking-wide text-white">
                {p.name}
              </h3>
              <p className="mt-1 text-sm text-gray-400">{p.blurb}</p>
              <p className="mt-3 text-2xl font-extrabold text-brand">
                {p.price}
                <span className="text-sm font-bold text-muted">{p.interval}</span>
              </p>

              <ul className="mt-4 flex-1 space-y-2">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2 text-sm text-gray-300">
                    <span className="text-brand">✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <button
                  type="button"
                  onClick={manage}
                  disabled={busy !== null}
                  className={`mt-5 inline-flex items-center justify-center rounded-3xl border border-white/20 px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-gray-100 transition hover:border-white/40 disabled:opacity-50 ${focusRing}`}
                >
                  {busy === "portal" ? "Opening…" : "Manage billing"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => subscribe(p.plan)}
                  disabled={!planReady || busy !== null}
                  title={planReady ? undefined : "Billing not enabled yet"}
                  className={`mt-5 inline-flex items-center justify-center rounded-3xl bg-steel px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-brand transition duration-300 hover:-translate-y-0.5 hover:bg-[#2a2a2a] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 ${focusRing}`}
                >
                  {busy === p.plan
                    ? "Redirecting…"
                    : planReady
                    ? `Subscribe to ${p.name}`
                    : "Coming soon"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </AppPage>
  );
};

export default SubscriptionPage;
