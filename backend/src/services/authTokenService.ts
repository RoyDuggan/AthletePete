import crypto from "crypto";

import { prisma } from "../db";

/**
 * Single-use, expiring tokens for email verification and password reset.
 * Backed by the AuthToken model. We store only a SHA-256 hash of the token; the
 * raw value goes in the emailed link, so a leaked database row can't be used to
 * verify or reset.
 */
export type AuthTokenType = "verify_email" | "reset_password";

const hash = (raw: string) => crypto.createHash("sha256").update(raw).digest("hex");

/**
 * Creates a token for the user, returning the raw value to email. Any prior
 * unused tokens of the same type are cleared so only the newest link works.
 */
export async function createAuthToken(
  userId: string,
  type: AuthTokenType,
  ttlMs: number
): Promise<string> {
  const raw = crypto.randomBytes(32).toString("hex");

  await prisma.authToken.deleteMany({ where: { userId, type, usedAt: null } });
  await prisma.authToken.create({
    data: {
      userId,
      type,
      tokenHash: hash(raw),
      expiresAt: new Date(Date.now() + ttlMs),
    },
  });

  return raw;
}

/**
 * Validates and consumes a token. Returns the owning userId, or null when the
 * token is unknown, wrong type, already used, or expired. Marking it used is
 * guarded so a token can only be redeemed once.
 */
export async function consumeAuthToken(
  raw: string,
  type: AuthTokenType
): Promise<string | null> {
  if (typeof raw !== "string" || raw.length < 16) return null;

  const record = await prisma.authToken.findUnique({
    where: { tokenHash: hash(raw) },
  });

  if (
    !record ||
    record.type !== type ||
    record.usedAt !== null ||
    record.expiresAt.getTime() < Date.now()
  ) {
    return null;
  }

  // Guard against double-redeem: only succeed if still unused.
  const marked = await prisma.authToken.updateMany({
    where: { id: record.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  if (marked.count === 0) return null;

  return record.userId;
}
