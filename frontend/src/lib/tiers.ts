import type { AuthUser } from "../api/auth";

/**
 * Subscription-tier awareness (front-end only, placeholder for the real
 * billing system). Maps the backend `plan` + trial window onto the four
 * product tiers and the features each one unlocks.
 *
 * Free / Trial require no payment. Individual + Team are paid (Stripe, TBC).
 */

export type Feature =
  | "profile" // athlete intake questionnaire
  | "calendar" // training calendar / plan
  | "coaching" // AI coaching + plan generation
  | "team"; // team / multi-athlete workspace

export type TierKey = "free" | "trial" | "individual" | "team";

export const TIER_LABEL: Record<TierKey, string> = {
  free: "Free",
  trial: "Trial",
  individual: "Individual",
  team: "Team",
};

/** Free tier: profile only, no payment. */
const FREE_FEATURES: Feature[] = ["profile"];

/** Premium features unlocked by Trial / paid tiers. */
const PREMIUM_FEATURES: Feature[] = [...FREE_FEATURES, "calendar", "coaching"];

export const TIER_FEATURES: Record<TierKey, Feature[]> = {
  free: FREE_FEATURES,
  trial: PREMIUM_FEATURES,
  individual: PREMIUM_FEATURES,
  team: [...PREMIUM_FEATURES, "team"],
};

/** Whether the user's free trial window is still open. */
export function trialActive(user: AuthUser | null): boolean {
  if (!user) return false;
  return new Date(user.trialEndsAt).getTime() > Date.now();
}

/** Resolve the user's effective product tier. */
export function getTier(user: AuthUser | null): TierKey {
  if (!user) return "free";
  if (user.plan === "TEAM") return "team";
  if (user.plan === "DRIVER" || user.plan === "COACH") return "individual";
  // plan === "FREE": Trial while the 30-day window is open, otherwise Free.
  return trialActive(user) ? "trial" : "free";
}

/** Whether the user's tier unlocks a given feature. */
export function hasFeature(user: AuthUser | null, feature: Feature): boolean {
  return TIER_FEATURES[getTier(user)].includes(feature);
}
