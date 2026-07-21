import { API_BASE, withCreds } from "./config";
import type {
  FingerprintCoachRequest,
  FingerprintResult,
} from "../types/fingerprint";

async function errorMessage(res: Response, fallback: string): Promise<string> {
  const data = await res.json().catch(() => ({}));
  return (data as { error?: string }).error ?? fallback;
}

/** Computes the corner-fingerprint library for the given saved sessions. */
export async function computeFingerprint(
  sessionIds: string[],
  options?: { zoneBasis?: string; customZoneMapId?: string | null }
): Promise<FingerprintResult> {
  const res = await fetch(`${API_BASE}/fingerprint`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessions: sessionIds,
      zoneBasis: options?.zoneBasis,
      customZoneMapId: options?.customZoneMapId ?? null,
    }),
    ...withCreds,
  });

  if (!res.ok) {
    throw new Error(await errorMessage(res, "Failed to compute fingerprints."));
  }

  return (await res.json()) as FingerprintResult;
}

/** Generates the AI coaching debrief from the retained-corner payload. */
export async function coachFingerprint(
  body: FingerprintCoachRequest
): Promise<string> {
  const res = await fetch(`${API_BASE}/fingerprint/coach`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    ...withCreds,
  });

  if (!res.ok) {
    throw new Error(await errorMessage(res, "Failed to generate coaching."));
  }

  return ((await res.json()) as { coaching: string }).coaching;
}
