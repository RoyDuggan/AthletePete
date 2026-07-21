import { API_BASE, withCreds } from "./config";

export type AuthUser = {
  id: string;
  email: string;
  fullName: string | null;
  emailVerified: boolean;
  /** Grants the Driver Setup AI-framing editor. Set by a site admin only. */
  driverAdmin: boolean;
  plan: "FREE" | "DRIVER" | "TEAM" | "COACH";
  trialEndsAt: string;
  creditsRemaining: number;
};

async function parseError(response: Response, fallback: string): Promise<string> {
  const data = await response.json().catch(() => ({}));
  return (data as { error?: string }).error ?? fallback;
}

export async function register(input: {
  email: string;
  password: string;
  fullName?: string;
}): Promise<AuthUser> {
  const response = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    ...withCreds,
  });
  if (!response.ok) throw new Error(await parseError(response, "Registration failed."));
  return ((await response.json()) as { user: AuthUser }).user;
}

export async function login(input: {
  email: string;
  password: string;
}): Promise<AuthUser> {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    ...withCreds,
  });
  if (!response.ok) throw new Error(await parseError(response, "Login failed."));
  return ((await response.json()) as { user: AuthUser }).user;
}

export async function logout(): Promise<void> {
  await fetch(`${API_BASE}/auth/logout`, { method: "POST", ...withCreds });
}

/** Returns the current user, or null if not authenticated. */
export async function fetchMe(): Promise<AuthUser | null> {
  const response = await fetch(`${API_BASE}/auth/me`, withCreds);
  if (!response.ok) return null;
  return ((await response.json()) as { user: AuthUser }).user;
}

/** Requests a password-reset email. Always resolves (never reveals if the email exists). */
export async function forgotPassword(email: string): Promise<void> {
  await fetch(`${API_BASE}/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
    ...withCreds,
  });
}

/** Sets a new password from a reset-link token. */
export async function resetPassword(token: string, password: string): Promise<void> {
  const res = await fetch(`${API_BASE}/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, password }),
    ...withCreds,
  });
  if (!res.ok) throw new Error(await parseError(res, "Reset failed."));
}

/** Confirms an email address from a verification-link token. */
export async function verifyEmailToken(token: string): Promise<void> {
  const res = await fetch(`${API_BASE}/auth/verify-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
    ...withCreds,
  });
  if (!res.ok) throw new Error(await parseError(res, "Verification failed."));
}

/** Re-sends the verification email to the signed-in user. */
export async function resendVerification(): Promise<void> {
  const res = await fetch(`${API_BASE}/auth/resend-verification`, {
    method: "POST",
    ...withCreds,
  });
  if (!res.ok) throw new Error(await parseError(res, "Could not resend the email."));
}
