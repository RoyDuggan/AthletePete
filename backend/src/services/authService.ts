import jwt from "jsonwebtoken";
import type { User } from "@prisma/client";

import { prisma } from "../db";
import { hashPassword, verifyPassword } from "./passwordService";
import { createAuthToken, consumeAuthToken } from "./authTokenService";
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  linkBase,
} from "./emailService";

const VERIFY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const RESET_TTL_MS = 60 * 60 * 1000; // 1 hour

const JWT_SECRET = process.env.JWT_SECRET || "dev-insecure-secret-change-me";

// In production, refuse to start with a missing/weak/default signing secret —
// a guessable secret means anyone can forge auth tokens. Fail fast at boot.
if (process.env.NODE_ENV === "production") {
  const secret = process.env.JWT_SECRET ?? "";
  const weak = secret.length < 32 || /change-me|insecure|dev-/i.test(secret);
  if (weak) {
    throw new Error(
      "Refusing to start: JWT_SECRET is missing, too short, or a default value. " +
        "Set a strong (32+ character) random JWT_SECRET in the production environment."
    );
  }
}

const TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days
const TRIAL_DAYS = 30;
const FREE_CREDITS = 20;

/** Error carrying an HTTP status for the route layer to surface. */
export class AuthError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function registerUser(
  emailRaw: string,
  password: string,
  fullName?: string
): Promise<User> {
  const email = String(emailRaw || "").trim().toLowerCase();

  if (!EMAIL_RE.test(email)) throw new AuthError("Enter a valid email address.");
  if (typeof password !== "string" || password.length < 8) {
    throw new AuthError("Password must be at least 8 characters.");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new AuthError("That email is already registered.", 409);

  const passwordHash = await hashPassword(password);
  const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

  return prisma.user.create({
    data: {
      email,
      passwordHash,
      fullName: fullName?.trim() || null,
      trialEndsAt,
      creditsRemaining: FREE_CREDITS,
    },
  });
}

export async function authenticate(
  emailRaw: string,
  password: string
): Promise<User> {
  const email = String(emailRaw || "").trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });

  // Always run a hash comparison to avoid leaking which emails exist via timing.
  const ok = user
    ? await verifyPassword(password, user.passwordHash)
    : await verifyPassword(password, "scrypt$0$0");

  if (!user || !ok) throw new AuthError("Invalid email or password.", 401);
  return user;
}

/**
 * Sends (or re-sends) the email-verification link. Best-effort: callers should
 * not fail their own operation if this throws.
 */
export async function sendEmailVerification(
  user: Pick<User, "id" | "email" | "fullName">,
  reqOrigin?: string
): Promise<void> {
  const token = await createAuthToken(user.id, "verify_email", VERIFY_TTL_MS);
  const url = `${linkBase(reqOrigin)}/verify-email?token=${token}`;
  await sendVerificationEmail(user.email, user.fullName, url);
}

/** Marks a user's email verified from a token. Returns false if invalid. */
export async function verifyEmail(token: string): Promise<boolean> {
  const userId = await consumeAuthToken(token, "verify_email");
  if (!userId) return false;
  await prisma.user.update({
    where: { id: userId },
    data: { emailVerified: true },
  });
  return true;
}

/**
 * Starts a password reset. Always resolves (never reveals whether the email
 * exists); only sends an email when a matching account is found.
 */
export async function requestPasswordReset(
  emailRaw: string,
  reqOrigin?: string
): Promise<void> {
  const email = String(emailRaw || "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return;

  const token = await createAuthToken(user.id, "reset_password", RESET_TTL_MS);
  const url = `${linkBase(reqOrigin)}/reset-password?token=${token}`;
  await sendPasswordResetEmail(user.email, user.fullName, url);
}

/** Completes a password reset from a token. Throws AuthError on failure. */
export async function resetPassword(
  token: string,
  newPassword: string
): Promise<void> {
  if (typeof newPassword !== "string" || newPassword.length < 8) {
    throw new AuthError("Password must be at least 8 characters.");
  }
  const userId = await consumeAuthToken(token, "reset_password");
  if (!userId) {
    throw new AuthError("This reset link is invalid or has expired.", 400);
  }
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(newPassword) },
  });
}

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, JWT_SECRET, {
    expiresIn: TOKEN_TTL_SECONDS,
  });
}

export function verifyToken(token: string): { sub: string } {
  return jwt.verify(token, JWT_SECRET) as { sub: string };
}

export const TOKEN_MAX_AGE_MS = TOKEN_TTL_SECONDS * 1000;

/** The user shape safe to return to the client (no password hash). */
export function publicUser(u: User) {
  return {
    id: u.id,
    email: u.email,
    fullName: u.fullName,
    emailVerified: u.emailVerified,
    driverAdmin: u.driverAdmin,
    plan: u.plan,
    trialEndsAt: u.trialEndsAt,
    creditsRemaining: u.creditsRemaining,
  };
}
