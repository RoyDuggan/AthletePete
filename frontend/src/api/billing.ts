import { API_BASE as BASE, withCreds } from "./config";

export type PaidPlan = "DRIVER" | "TEAM" | "COACH";

export type BillingConfig = {
  /** True once the server has a Stripe secret key configured. */
  enabled: boolean;
  /** Which plans have a Stripe price wired up. */
  plans: Record<PaidPlan, boolean>;
};

export async function getBillingConfig(): Promise<BillingConfig> {
  const res = await fetch(`${BASE}/billing/config`, withCreds);
  if (!res.ok) throw new Error("Could not load billing status.");
  return (await res.json()) as BillingConfig;
}

async function redirectTo(path: string, body?: unknown): Promise<never> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
    ...withCreds,
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok || !(payload as { url?: string }).url) {
    throw new Error(
      (payload as { error?: string }).error ?? "Billing request failed."
    );
  }
  // Hand off to Stripe's hosted page.
  window.location.href = (payload as { url: string }).url;
  return new Promise<never>(() => {});
}

/** Redirects the browser to Stripe Checkout for the given plan. */
export function startCheckout(plan: PaidPlan): Promise<never> {
  return redirectTo("/billing/checkout", { plan });
}

/** Redirects the browser to the Stripe Customer Portal. */
export function openBillingPortal(): Promise<never> {
  return redirectTo("/billing/portal");
}
