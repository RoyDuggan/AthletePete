import { prisma } from "../db";

/**
 * Free-tier entitlement logic.
 *
 * Access model:
 *  - A *subscription* (status "active") grants unlimited analysis, no credits.
 *  - Otherwise the user is on the 30-day free trial: analysis is allowed while
 *    the trial is live; each UPLOAD (loading a dataset) consumes one credit.
 *  - Trial expiry blocks all analysis; running out of credits blocks new
 *    uploads (already-loaded sessions can still be analysed during the trial).
 */
export type Entitlement = {
  subscriptionActive: boolean;
  withinTrial: boolean;
  credits: number;
};

export async function getEntitlement(
  userId: string
): Promise<Entitlement | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { subscription: true },
  });
  if (!user) return null;

  return {
    subscriptionActive: user.subscription?.status === "active",
    withinTrial: user.trialEndsAt.getTime() > Date.now(),
    credits: user.creditsRemaining,
  };
}

/** Whether the user may run analysis on already-loaded data. */
export function canAnalyse(e: Entitlement): boolean {
  return e.subscriptionActive || e.withinTrial;
}

/** Whether the user may load a new dataset (consumes a credit on the trial). */
export function canUpload(e: Entitlement): boolean {
  return e.subscriptionActive || (e.withinTrial && e.credits > 0);
}

/**
 * Consumes one credit for an upload, unless the user is a subscriber. Safe to
 * call after canUpload() has passed; the decrement is atomic and guarded.
 */
export async function consumeUploadCredit(userId: string): Promise<void> {
  const e = await getEntitlement(userId);
  if (!e || e.subscriptionActive) return; // subscribers are not charged

  const result = await prisma.user.updateMany({
    where: { id: userId, creditsRemaining: { gt: 0 } },
    data: { creditsRemaining: { decrement: 1 } },
  });

  if (result.count > 0) {
    await prisma.creditEvent.create({
      data: { userId, delta: -1, reason: "upload" },
    });
  }
}
