import { Router, type Response } from "express";

import { prisma } from "../db";
import {
  registerUser,
  authenticate,
  signToken,
  publicUser,
  AuthError,
  TOKEN_MAX_AGE_MS,
  sendEmailVerification,
  verifyEmail,
  requestPasswordReset,
  resetPassword,
} from "../services/authService";
import { requireAuth, AUTH_COOKIE, type AuthedRequest } from "../middleware/requireAuth";

const router = Router();

function setAuthCookie(res: Response, token: string) {
  res.cookie(AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TOKEN_MAX_AGE_MS,
  });
}

router.post("/register", async (req, res) => {
  try {
    const { email, password, fullName } = req.body ?? {};
    const user = await registerUser(email, password, fullName);
    setAuthCookie(res, signToken(user.id));
    // Best-effort: don't fail registration if the verification email can't send.
    sendEmailVerification(user, req.headers.origin as string | undefined).catch(
      (e) => console.error("Verification email failed:", e)
    );
    return res.status(201).json({ user: publicUser(user) });
  } catch (error) {
    const status = error instanceof AuthError ? error.status : 500;
    const message =
      error instanceof Error ? error.message : "Registration failed.";
    if (status === 500) console.error("Register error:", error);
    return res.status(status).json({ error: message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body ?? {};
    const user = await authenticate(email, password);
    setAuthCookie(res, signToken(user.id));
    return res.status(200).json({ user: publicUser(user) });
  } catch (error) {
    const status = error instanceof AuthError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Login failed.";
    if (status === 500) console.error("Login error:", error);
    return res.status(status).json({ error: message });
  }
});

router.post("/logout", (_req, res) => {
  res.clearCookie(AUTH_COOKIE, { path: "/" });
  return res.json({ ok: true });
});

router.get("/me", requireAuth, async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) return res.status(401).json({ error: "Not authenticated." });
  return res.json({ user: publicUser(user) });
});

// Confirm an email address from the link's token.
router.post("/verify-email", async (req, res) => {
  const ok = await verifyEmail(String((req.body ?? {}).token ?? ""));
  if (!ok) {
    return res
      .status(400)
      .json({ error: "This verification link is invalid or has expired." });
  }
  return res.json({ verified: true });
});

// Re-send the verification email to the signed-in user.
router.post("/resend-verification", requireAuth, async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) return res.status(401).json({ error: "Not authenticated." });
  if (user.emailVerified) return res.json({ alreadyVerified: true });
  try {
    await sendEmailVerification(user, req.headers.origin as string | undefined);
  } catch (e) {
    console.error("Resend verification failed:", e);
    return res.status(502).json({ error: "Could not send the email. Try again shortly." });
  }
  return res.json({ sent: true });
});

// Start a password reset. Always 200 so we don't reveal whether the email exists.
router.post("/forgot-password", async (req, res) => {
  try {
    await requestPasswordReset(
      String((req.body ?? {}).email ?? ""),
      req.headers.origin as string | undefined
    );
  } catch (e) {
    console.error("Password reset request failed:", e);
  }
  return res.json({ ok: true });
});

// Complete a password reset from the link's token.
router.post("/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body ?? {};
    await resetPassword(String(token ?? ""), String(password ?? ""));
    return res.json({ ok: true });
  } catch (error) {
    const status = error instanceof AuthError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Reset failed.";
    if (status === 500) console.error("Reset password error:", error);
    return res.status(status).json({ error: message });
  }
});

export default router;
