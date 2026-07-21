import type { PaidPlan } from "../api/billing";

/**
 * Display metadata for the purchasable plans. The Stripe Price (its amount) is
 * the source of truth for what's actually charged — keep the `price` string
 * here in sync with the amount on the matching Stripe Price for each plan.
 *
 * TODO(pricing): replace the "£TBC" placeholders with the real monthly prices
 * once the Stripe Prices are created (STRIPE_PRICE_DRIVER/TEAM/COACH).
 */
export type BillingPlanInfo = {
  plan: PaidPlan;
  name: string;
  price: string;
  interval: string;
  blurb: string;
  features: string[];
  featured?: boolean;
};

export const BILLING_PLANS: BillingPlanInfo[] = [
  {
    plan: "DRIVER",
    name: "Driver",
    price: "£15",
    interval: "/mo",
    blurb: "Single-driver telemetry analysis.",
    features: [
      "Unlimited session uploads",
      "Per-zone deltas & metrics",
      "AI coaching summaries",
      "Kart setup & jetting tools",
    ],
  },
  {
    plan: "TEAM",
    name: "Team",
    price: "£25",
    interval: "/mo",
    blurb: "Multi-driver and cross-session comparison.",
    features: [
      "Everything in Driver",
      "Compare laps across drivers",
      "Cross-session progress tracking",
      "Shared team workspace",
    ],
    featured: true,
  },
  {
    plan: "COACH",
    name: "Coach",
    price: "£35",
    interval: "/mo",
    blurb: "Coach dashboard and shared reports.",
    features: [
      "Everything in Driver",
      "Manage multiple drivers",
      "Shareable coaching reports",
      "Custom AI coaching framing",
    ],
  },
];
