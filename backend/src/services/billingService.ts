import Stripe from "stripe";
import type { Plan } from "@prisma/client";

import { prisma } from "../db";

/**
 * Stripe billing via hosted Checkout + Customer Portal (no card data touches our
 * app). Everything is env-driven and inert until STRIPE_SECRET_KEY is set:
 * - createCheckoutSession → subscribe to a plan (redirect to Stripe Checkout)
 * - createPortalSession   → manage/cancel (redirect to the Customer Portal)
 * - handleWebhookEvent    → sync the Subscription row + user.plan on Stripe events
 */

/** Paid plans that map to a Stripe recurring price. FREE is not purchasable. */
export type PaidPlan = "DRIVER" | "TEAM" | "COACH";

const PLAN_ENV: Record<PaidPlan, string> = {
  DRIVER: "STRIPE_PRICE_DRIVER",
  TEAM: "STRIPE_PRICE_TEAM",
  COACH: "STRIPE_PRICE_COACH",
};

export function isPaidPlan(value: unknown): value is PaidPlan {
  return value === "DRIVER" || value === "TEAM" || value === "COACH";
}

/** Price ID configured for a plan, or "" when unset. */
function priceIdFor(plan: PaidPlan): string {
  return process.env[PLAN_ENV[plan]] ?? "";
}

/** Reverse lookup: which plan a Stripe price ID belongs to (null if unknown). */
function planForPriceId(priceId: string | undefined): PaidPlan | null {
  if (!priceId) return null;
  for (const plan of ["DRIVER", "TEAM", "COACH"] as PaidPlan[]) {
    if (priceIdFor(plan) === priceId) return plan;
  }
  return null;
}

/** Billing is enabled once a secret key is present. */
export function billingEnabled(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

/** Which plans are fully configured (secret key + a price id). */
export function configuredPlans(): Record<PaidPlan, boolean> {
  const on = billingEnabled();
  return {
    DRIVER: on && Boolean(priceIdFor("DRIVER")),
    TEAM: on && Boolean(priceIdFor("TEAM")),
    COACH: on && Boolean(priceIdFor("COACH")),
  };
}

let client: Stripe | null = null;

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("Billing is not configured (STRIPE_SECRET_KEY is not set).");
  }
  if (!client) client = new Stripe(key);
  return client;
}

/**
 * Ensures the user has a Stripe customer, returning its id. Reuses the stored
 * customer when present; otherwise creates one and persists it on the
 * Subscription row.
 */
async function ensureCustomer(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { subscription: true },
  });
  if (!user) throw new Error("User not found.");

  const existing = user.subscription?.stripeCustomerId;
  if (existing) return existing;

  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email: user.email,
    metadata: { userId },
  });

  await prisma.subscription.upsert({
    where: { userId },
    create: { userId, stripeCustomerId: customer.id },
    update: { stripeCustomerId: customer.id },
  });

  return customer.id;
}

/** Creates a subscription Checkout session and returns its redirect URL. */
export async function createCheckoutSession(
  userId: string,
  plan: PaidPlan,
  origin: string
): Promise<string> {
  const priceId = priceIdFor(plan);
  if (!priceId) {
    throw new Error(`No Stripe price configured for the ${plan} plan.`);
  }

  const stripe = getStripe();
  const customerId = await ensureCustomer(userId);

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    client_reference_id: userId,
    subscription_data: { metadata: { userId, plan } },
    success_url: `${origin}/app/subscription?checkout=success`,
    cancel_url: `${origin}/app/subscription?checkout=cancel`,
    allow_promotion_codes: true,
  });

  if (!session.url) throw new Error("Stripe did not return a checkout URL.");
  return session.url;
}

/**
 * Cancels a subscription immediately (used on account deletion so the user is
 * not billed again). No-op when billing is disabled or no id is given; errors
 * are swallowed by the caller so deletion still proceeds.
 */
export async function cancelSubscriptionImmediately(
  subscriptionId: string | null | undefined
): Promise<void> {
  if (!billingEnabled() || !subscriptionId) return;
  await getStripe().subscriptions.cancel(subscriptionId);
}

/** Creates a Customer Portal session (manage/cancel) and returns its URL. */
export async function createPortalSession(
  userId: string,
  origin: string
): Promise<string> {
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  if (!sub?.stripeCustomerId) {
    throw new Error("No billing account yet — subscribe to a plan first.");
  }

  const stripe = getStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: `${origin}/app/subscription`,
  });
  return session.url;
}

/**
 * Applies a Stripe Subscription object to our data model: updates the
 * Subscription row and the user's plan. "active"/"trialing" grant access;
 * terminal states drop the user back to FREE.
 */
async function syncSubscription(sub: Stripe.Subscription): Promise<void> {
  const userId =
    (sub.metadata?.userId as string | undefined) ??
    (
      await prisma.subscription.findFirst({
        where: { stripeCustomerId: String(sub.customer) },
        select: { userId: true },
      })
    )?.userId;

  if (!userId) {
    console.warn("Stripe webhook: no user for subscription", sub.id);
    return;
  }

  const item = sub.items.data[0];
  const priceId = item?.price?.id;
  const plan = planForPriceId(priceId);
  const active = sub.status === "active" || sub.status === "trialing";
  const ended =
    sub.status === "canceled" ||
    sub.status === "unpaid" ||
    sub.status === "incomplete_expired";

  // Newer Stripe API versions expose the billing period per item.
  const periodEndUnix = item?.current_period_end;
  const currentPeriodEnd = periodEndUnix ? new Date(periodEndUnix * 1000) : null;

  await prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
      stripeCustomerId: String(sub.customer),
      stripeSubscriptionId: sub.id,
      status: active ? "active" : sub.status,
      currentPeriodEnd,
    },
    update: {
      stripeCustomerId: String(sub.customer),
      stripeSubscriptionId: sub.id,
      status: active ? "active" : sub.status,
      currentPeriodEnd,
    },
  });

  // Reflect the plan on the user: their subscribed plan while live, else FREE.
  const nextPlan: Plan = ended || !plan ? "FREE" : plan;
  await prisma.user.update({
    where: { id: userId },
    data: { plan: nextPlan },
  });
}

/**
 * Verifies and dispatches a Stripe webhook. `rawBody` must be the exact bytes
 * Stripe sent (the route uses express.raw), not parsed JSON.
 */
export async function handleWebhookEvent(
  rawBody: Buffer,
  signature: string | undefined
): Promise<void> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not set.");
  if (!signature) throw new Error("Missing Stripe-Signature header.");

  const stripe = getStripe();
  const event = stripe.webhooks.constructEvent(rawBody, signature, secret);

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.subscription) {
        const sub = await stripe.subscriptions.retrieve(
          String(session.subscription)
        );
        await syncSubscription(sub);
      }
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await syncSubscription(event.data.object as Stripe.Subscription);
      break;
    default:
      // Ignore unrelated events.
      break;
  }
}
