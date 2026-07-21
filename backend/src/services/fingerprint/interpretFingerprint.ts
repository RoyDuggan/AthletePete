/**
 * AI coach for the fingerprint engine. Reads the deterministic, retained-corner
 * payload and returns a driver-facing debrief. Same register and guardrails as
 * the lap-comparison interpreter: prose only, grounded strictly in the supplied
 * numbers, hard word cap.
 */
import Anthropic from "@anthropic-ai/sdk";
import type { FingerprintCoachRequest } from "../../types/fingerprint";

const MODEL = "claude-opus-4-8";
const WORD_LIMIT = 220;

const SYSTEM_PROMPT = `You are a professional motorsport data engineer coaching a kart driver from grip-usage fingerprints.

You are given, for each retained corner, deterministic metrics: entry/apex/exit speed, section time, an attack score (0-100 = how committed/representative the execution is) and a fingerprint whose values are all 0-100 (grip utilisation overall and per phase — braking, trail braking, apex, exit — plus smoothness, stability, consistency, friction path quality, entry/apex/exit commitment, grip reserve and confidence). Higher utilisation and commitment mean the driver is using more of the available grip; high grip reserve means grip was left unused.

How to reason:
- Rank corners by where the biggest, most reliable gains are (low utilisation or commitment with high confidence, or high grip reserve being left on the table).
- Explain WHY using the phase utilisations and commitments: e.g. low apex utilisation = not carrying enough mid-corner grip; low exit commitment = getting to throttle late; poor friction path quality = wasteful, non-circular inputs; low stability/smoothness = inconsistent loading.
- Group recurring tendencies across corners into one clear driver-style takeaway (the "fingerprint").

Rules:
- Hard limit: ${WORD_LIMIT} words. Stay under it.
- Output only the coaching prose. No headings, no preamble ("Here is..."), no bullet lists, no sign-off.
- Ground every claim in the supplied numbers; never invent values.
- Close with the single highest-priority change that would unlock the most time.
- Speak directly to the driver, engineer-to-driver.`;

function fmt(value: number | null, digits = 1, unit = ""): string {
  if (value === null || !Number.isFinite(value)) return "n/a";
  return `${value.toFixed(digits)}${unit}`;
}

function buildPromptInput(req: FingerprintCoachRequest): string {
  const lines: string[] = [];
  if (req.sessionLabel) lines.push(`Session: ${req.sessionLabel}`);
  lines.push(`Sensitivity threshold: ${req.sensitivity} (attack score >= this is retained)`);
  lines.push(`Retained corners: ${req.corners.length}`);
  lines.push("");

  for (const c of req.corners) {
    const fp = c.fingerprint;
    lines.push(
      `Corner ${c.cornerNumber} (${c.lapLabel}) — attack ${fmt(c.attackScore, 0)}:`
    );
    lines.push(
      `  Speed: entry ${fmt(c.entrySpeedKmh, 1, " km/h")}, apex ${fmt(
        c.apexSpeedKmh,
        1,
        " km/h"
      )}, exit ${fmt(c.exitSpeedKmh, 1, " km/h")}; section ${fmt(
        c.sectionTimeSeconds,
        3,
        "s"
      )}`
    );
    lines.push(
      `  Utilisation: overall ${fmt(fp.overallUtilisation)}, braking ${fmt(
        fp.brakingUtilisation
      )}, trail ${fmt(fp.trailBrakingUtilisation)}, apex ${fmt(
        fp.apexUtilisation
      )}, exit ${fmt(fp.exitUtilisation)}`
    );
    lines.push(
      `  Quality: smoothness ${fmt(fp.smoothness)}, stability ${fmt(
        fp.stability
      )}, consistency ${fmt(fp.consistency)}, friction-path ${fmt(
        fp.frictionPathQuality
      )}`
    );
    lines.push(
      `  Commitment: entry ${fmt(fp.entryCommitment)}, apex ${fmt(
        fp.apexCommitment
      )}, exit ${fmt(fp.exitCommitment)}; grip reserve ${fmt(
        fp.gripReserve
      )}; confidence ${fmt(fp.confidence)}`
    );
    lines.push("");
  }

  return lines.join("\n");
}

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it to the backend environment to enable AI coaching."
    );
  }
  if (!client) client = new Anthropic();
  return client;
}

export async function interpretFingerprint(
  req: FingerprintCoachRequest
): Promise<string> {
  if (!req.corners || req.corners.length === 0) {
    throw new Error("No retained corners to coach. Lower the sensitivity threshold.");
  }

  const anthropic = getClient();
  const promptInput = buildPromptInput(req);

  // Base coaching instructions are cached; the per-driver framing override (if
  // any) is appended as a separate, uncached system block.
  const system: {
    type: "text";
    text: string;
    cache_control?: { type: "ephemeral" };
  }[] = [
    { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
  ];
  if (req.framing?.trim()) {
    system.push({ type: "text", text: req.framing });
  }

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system,
    messages: [
      {
        role: "user",
        content: `Coach this driver from their retained corner fingerprints:\n\n${promptInput}`,
      },
    ],
  });

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim();

  if (!text) {
    throw new Error("The AI coaching came back empty. Please try again.");
  }

  return text;
}
