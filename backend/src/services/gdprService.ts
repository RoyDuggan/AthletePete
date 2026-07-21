import { prisma } from "../db";
import { cancelSubscriptionImmediately } from "./billingService";

/**
 * GDPR subject-access (export) and erasure (delete).
 *
 * NOTE: this covers the platform-level user data (account + subscription). As
 * the athlete-training domain is added (profiles, plans, workouts, reviews),
 * extend export/delete to include those records.
 */

/** Everything we hold about a user, in a portable JSON structure. */
export async function exportUserData(userId: string): Promise<unknown> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      fullName: true,
      emailVerified: true,
      driverAdmin: true,
      plan: true,
      trialEndsAt: true,
      creditsRemaining: true,
      createdAt: true,
      updatedAt: true,
      subscription: {
        select: { status: true, currentPeriodEnd: true, createdAt: true },
      },
    },
  });

  if (!user) throw new Error("User not found.");

  return {
    exportedAt: new Date().toISOString(),
    account: user,
  };
}

/**
 * Permanently deletes a user and all associated data. Cancels any live Stripe
 * subscription first (best-effort), then deletes the DB row (relations cascade).
 */
export async function deleteUserAccount(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscription: { select: { stripeSubscriptionId: true } } },
  });

  if (!user) throw new Error("User not found.");

  try {
    await cancelSubscriptionImmediately(user.subscription?.stripeSubscriptionId);
  } catch (e) {
    console.error("GDPR delete: Stripe cancel failed (continuing):", e);
  }

  await prisma.user.delete({ where: { id: userId } });
}
