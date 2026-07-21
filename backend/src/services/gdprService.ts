import fs from "fs";
import path from "path";

import { prisma } from "../db";
import { getDriverProfile, deleteDriverProfile } from "./driverProfileStore";
import { getUserPrompts, deleteUserPrompts } from "./userPromptStore";
import { listZoneMaps, deleteZoneMapsForUser } from "./zoneMapStore";
import { cancelSubscriptionImmediately } from "./billingService";

/**
 * GDPR subject-access (export) and erasure (delete) for a user's account.
 *
 * A user's data spans Postgres (User + cascading relations), the JSON file
 * stores (zone maps, prompts, driver profile) and uploaded telemetry files on
 * the volume. Export gathers all of it (minus secrets); delete removes all of
 * it and cancels any live Stripe subscription first.
 */

const UPLOADS_DIR = path.join(__dirname, "../../uploads");

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
      karts: {
        select: {
          id: true,
          name: true,
          chassis: true,
          engine: true,
          notes: true,
          createdAt: true,
          configurations: true,
        },
      },
      sessions: {
        select: {
          id: true,
          name: true,
          track: true,
          originalName: true,
          sizeBytes: true,
          lapCount: true,
          trackLengthM: true,
          uploadedAt: true,
        },
      },
      creditEvents: {
        select: { delta: true, reason: true, createdAt: true },
      },
      subscription: {
        select: { status: true, currentPeriodEnd: true, createdAt: true },
      },
    },
  });

  if (!user) throw new Error("User not found.");

  return {
    exportedAt: new Date().toISOString(),
    account: user,
    driverProfile: getDriverProfile(userId),
    aiPromptOverrides: getUserPrompts(userId),
    zoneMaps: listZoneMaps(userId),
  };
}

/**
 * Permanently deletes a user and all associated data. Order: cancel Stripe →
 * delete uploaded files → purge file stores → delete DB row (cascades the rest).
 * External steps are best-effort so a provider hiccup can't block erasure.
 */
export async function deleteUserAccount(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      subscription: { select: { stripeSubscriptionId: true } },
      sessions: { select: { storageKey: true } },
    },
  });

  if (!user) throw new Error("User not found.");

  // 1. Stop any future billing.
  try {
    await cancelSubscriptionImmediately(user.subscription?.stripeSubscriptionId);
  } catch (e) {
    console.error("GDPR delete: Stripe cancel failed (continuing):", e);
  }

  // 2. Remove uploaded telemetry files from the volume.
  for (const s of user.sessions) {
    try {
      fs.unlinkSync(path.join(UPLOADS_DIR, s.storageKey));
    } catch {
      /* file already gone — ignore */
    }
  }

  // 3. Purge the per-user JSON file stores.
  deleteZoneMapsForUser(userId);
  deleteUserPrompts(userId);
  deleteDriverProfile(userId);

  // 4. Delete the DB row; relations cascade (karts, configs, sessions, credit
  //    events, subscription, auth tokens).
  await prisma.user.delete({ where: { id: userId } });
}
