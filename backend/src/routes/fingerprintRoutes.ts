import { Router } from "express";

import { computeFingerprint } from "../services/fingerprint/fingerprintService";
import { interpretFingerprint } from "../services/fingerprint/interpretFingerprint";
import type { FingerprintCoachRequest } from "../types/fingerprint";
import type { AuthedRequest } from "../middleware/requireAuth";
import { getDriverProfile } from "../services/driverProfileStore";
import { resolveFraming } from "../services/driverFramingStore";

const router = Router();

/**
 * Computes the full corner-fingerprint library for a group of the user's saved
 * sessions. Re-analysis of already-uploaded data, so no upload credit is spent.
 * Body: { sessions: string[] } (storage keys), or legacy { sessionId }.
 */
router.post("/", async (req: AuthedRequest, res) => {
  try {
    const { sessions, sessionId, zoneBasis, customZoneMapId } = req.body ?? {};

    const sessionIds: string[] = Array.isArray(sessions)
      ? sessions.map((id: unknown) => String(id))
      : typeof sessionId === "string"
      ? [sessionId]
      : [];

    if (sessionIds.length === 0) {
      return res
        .status(400)
        .json({ error: "sessions[] (or sessionId) is required." });
    }

    const result = await computeFingerprint(req.userId!, sessionIds, {
      zoneBasis: typeof zoneBasis === "string" ? zoneBasis : undefined,
      customZoneMapId:
        typeof customZoneMapId === "string" ? customZoneMapId : null,
    });
    return res.status(200).json(result);
  } catch (error) {
    console.error("Fingerprint compute error:", error);
    return res.status(400).json({
      error:
        error instanceof Error
          ? error.message
          : "Failed to compute the corner fingerprints.",
    });
  }
});

/** Generates the AI coaching debrief from the retained-corner payload. */
router.post("/coach", async (req: AuthedRequest, res) => {
  try {
    const body = (req.body ?? {}) as FingerprintCoachRequest;

    if (!Array.isArray(body.corners) || body.corners.length === 0) {
      return res
        .status(400)
        .json({ error: "corners[] is required to generate coaching." });
    }

    const profile = getDriverProfile(req.userId!);
    const framing = resolveFraming({
      ageBracket: profile.ageBracket,
      experience: profile.experience,
      coachingStyle: profile.coachingStyle,
    });

    const coaching = await interpretFingerprint({ ...body, framing });
    return res.status(200).json({ coaching });
  } catch (error) {
    console.error("Fingerprint coach error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Failed to generate the AI coaching.";
    const status = message.includes("ANTHROPIC_API_KEY") ? 503 : 500;
    return res.status(status).json({ error: message });
  }
});

export default router;
