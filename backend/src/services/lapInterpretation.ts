import Anthropic from "@anthropic-ai/sdk";
import type { ZoneMetrics } from "../types/advisoryData";

/**
 * AI "race data engineer" interpretation of an overall lap-to-lap comparison.
 *
 * Takes the deterministic comparison the analysis pipeline already produced
 * (lap delta, speed/braking/drive/RPM deltas, fixed-distance splits and feature
 * zones) and asks Claude to read it the way an engineer would in a debrief.
 * The output is prose only, hard-capped at 200 words.
 */

const MODEL = "claude-opus-4-8";
const WORD_LIMIT = 200;

/**
 * Default, customisable context for the overall lap-comparison interpretation.
 * This is the instruction/persona block sent as the system prompt; the
 * deterministic comparison data is appended automatically as the user message.
 * The user can override this on the frontend (persisted to their account); the
 * default lives here so the server is the single source of truth for the
 * starting context.
 */
export const DEFAULT_LAP_PROMPT_TEMPLATE = `You are a professional motorsport data engineer analysing kart telemetry in a post-session debrief.

You are given a deterministic lap-to-lap comparison between a subject lap and a reference lap. For EVERY feature zone you are given its time gain/loss plus the full per-zone channels (entry/apex/exit speed, drive/exit, braking, RPM). Write the interpretation you would give the driver about the WHOLE lap.

How to reason:
- The zones are listed with the time the subject gained or lost in each. Rank them by the magnitude of that time impact and build the summary around the most impactful zones first — that is where the lap was won or lost.
- For those high-impact zones, use the per-zone channels to explain WHY (braking point/pressure/release, entry and apex speed, rotation, drive and exit commitment, gearing/RPM). Mention smaller zones only if they reveal a recurring pattern.
- Close with the single highest-priority thing to work on.

Rules:
- Hard limit: ${WORD_LIMIT} words. Stay under it.
- Output only the interpretation prose. No headings, no preamble ("Here is..."), no bullet lists, no sign-off.
- Be specific and ground every claim in the supplied data; do not invent numbers that aren't given.
- Sign convention for channel deltas: every speed/drive/braking/RPM delta is subject minus reference (a positive value means the subject carried more than the reference in that channel). Time gains/losses per zone are stated explicitly as "gained"/"lost" — trust those words, not the sign.
- If a zone's RPM is marked unavailable, do not use RPM for that zone.
- Speak to the driver in a direct, engineer-to-driver register.`;

export type InterpretationSplit = {
  zoneNumber: number;
  startDistanceMeters: number;
  endDistanceMeters: number;
  deltaSeconds: number;
  impactType: string;
};

export type InterpretationZone = {
  zoneNumber?: number;
  name: string;
  zoneType?: string;
  severity?: string;
  deltaSeconds: number;
  startDistanceMeters?: number;
  endDistanceMeters?: number;
  confidence?: string;
  /** Full per-zone comparison channels (subject - reference), when available. */
  metrics?: ZoneMetrics;
};

export type InterpretationRequest = {
  /** Customised context. Falls back to DEFAULT_LAP_PROMPT_TEMPLATE if absent. */
  template?: string;
  /** Driver-framing override appended to the system prompt (set server-side). */
  framing?: string;
  sessionName?: string;
  subjectLabel?: string;
  referenceLabel?: string;
  lapComparison: Record<string, unknown> | null;
  splitAnalysis?: {
    trackLengthMeters?: number;
    lapDeltaSeconds?: number;
    splits?: InterpretationSplit[];
  } | null;
  featureZones?: InterpretationZone[];
};

function fmt(value: unknown, unit = "", digits = 3): string {
  if (value === null || value === undefined || value === "") return "n/a";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "n/a";
    return `${value.toFixed(digits)}${unit}`;
  }
  return `${value}${unit}`;
}

/**
 * Renders the structured comparison into a compact, labelled text block that is
 * easy for the model to read without us pre-digesting the conclusions.
 */
function buildPromptInput(req: InterpretationRequest): string {
  const lines: string[] = [];

  if (req.sessionName) lines.push(`Session: ${req.sessionName}`);
  lines.push(
    `Comparison: ${req.subjectLabel ?? "Subject lap"} (subject) vs ${
      req.referenceLabel ?? "Reference lap"
    } (reference)`
  );

  const c = req.lapComparison ?? {};
  lines.push("");
  lines.push("Overall lap:");
  lines.push(`  Subject lap time: ${fmt(c.fastestLapTimeSeconds, "s")}`);
  lines.push(`  Reference lap time: ${fmt(c.comparisonLapTimeSeconds, "s")}`);

  // Derive the overall gain/loss from the absolute lap times so the wording is
  // robust to the raw delta's sign convention.
  const subjectTime =
    typeof c.fastestLapTimeSeconds === "number" ? c.fastestLapTimeSeconds : null;
  const referenceTime =
    typeof c.comparisonLapTimeSeconds === "number"
      ? c.comparisonLapTimeSeconds
      : null;

  if (subjectTime !== null && referenceTime !== null) {
    const gap = Math.abs(subjectTime - referenceTime);
    const direction =
      subjectTime < referenceTime
        ? "faster than"
        : subjectTime > referenceTime
        ? "slower than"
        : "level with";
    lines.push(
      `  Overall: subject is ${fmt(gap, "s")} ${direction} the reference.`
    );
  }

  const speedLines: string[] = [];
  if (c.entrySpeedDeltaKmh !== undefined)
    speedLines.push(`  Entry speed delta: ${fmt(c.entrySpeedDeltaKmh, " km/h", 2)}`);
  if (c.apexSpeedDeltaKmh !== undefined)
    speedLines.push(`  Apex speed delta: ${fmt(c.apexSpeedDeltaKmh, " km/h", 2)}`);
  if (c.exitSpeedDeltaKmh !== undefined)
    speedLines.push(`  Exit speed delta: ${fmt(c.exitSpeedDeltaKmh, " km/h", 2)}`);
  if (speedLines.length) {
    lines.push("Speed (subject - reference):");
    lines.push(...speedLines);
  }

  if (c.drivePhaseDeltaKmh !== undefined) {
    lines.push("Drive / exit:");
    lines.push(`  Inferred drive phase delta: ${fmt(c.drivePhaseDeltaKmh, " km/h", 2)}`);
    lines.push(
      `  Time to acceleration delta: ${fmt(c.timeToAccelerationDeltaSeconds, "s")}`
    );
    lines.push(
      `  Exit drive rating: subject ${fmt(c.fastestLapExitDriveRating)}, reference ${fmt(
        c.comparisonLapExitDriveRating
      )}`
    );
  }

  if (c.maxDecelerationDeltaKmhPerSec !== undefined) {
    lines.push("Braking:");
    lines.push(
      `  Inferred max deceleration delta: ${fmt(
        c.maxDecelerationDeltaKmhPerSec,
        " km/h/s",
        2
      )}`
    );
    lines.push(`  Braking duration delta: ${fmt(c.brakingDurationDeltaSeconds, "s")}`);
    lines.push(
      `  Speed drop before apex delta: ${fmt(c.speedDropBeforeApexDeltaKmh, " km/h", 2)}`
    );
    lines.push(
      `  Braking rating: subject ${fmt(c.fastestLapBrakingRating)}, reference ${fmt(
        c.comparisonLapBrakingRating
      )}`
    );
  }

  if (c.minRpmDelta !== undefined) {
    lines.push("RPM / gearing:");
    lines.push(`  Min RPM delta: ${fmt(c.minRpmDelta, " rpm", 0)}`);
    lines.push(`  Max RPM delta: ${fmt(c.maxRpmDelta, " rpm", 0)}`);
    lines.push(`  RPM drop before apex delta: ${fmt(c.rpmDropBeforeApexDelta, " rpm", 0)}`);
    lines.push(
      `  RPM recovery after apex delta: ${fmt(c.rpmRecoveryAfterApexDelta, " rpm", 0)}`
    );
    lines.push(
      `  RPM recovery rating: subject ${fmt(c.fastestLapRpmRecoveryRating)}, reference ${fmt(
        c.comparisonLapRpmRecoveryRating
      )}`
    );
  }

  const split = req.splitAnalysis;
  if (split?.splits?.length) {
    lines.push("");
    lines.push(
      `Fixed-distance splits (track length ${fmt(
        split.trackLengthMeters,
        "m",
        1
      )}, lap delta ${fmt(split.lapDeltaSeconds, "s")}); delta = subject - reference:`
    );
    for (const s of split.splits) {
      lines.push(
        `  Zone ${s.zoneNumber} (${fmt(s.startDistanceMeters, "m", 0)}-${fmt(
          s.endDistanceMeters,
          "m",
          0
        )}): ${fmt(s.deltaSeconds, "s")} [${s.impactType}]`
      );
    }
  }

  if (req.featureZones?.length) {
    lines.push("");
    lines.push(
      "Feature zones — each with the time the subject gained/lost and the per-zone channels (deltas are subject - reference):"
    );

    for (const z of req.featureZones) {
      const impact =
        z.severity === "gain"
          ? `subject gained ${fmt(Math.abs(z.deltaSeconds), "s")}`
          : z.severity === "loss"
          ? `subject lost ${fmt(Math.abs(z.deltaSeconds), "s")}`
          : `${fmt(z.deltaSeconds, "s")}`;

      const range =
        z.startDistanceMeters !== undefined && z.endDistanceMeters !== undefined
          ? `${fmt(z.startDistanceMeters, "m", 0)}-${fmt(
              z.endDistanceMeters,
              "m",
              0
            )}`
          : "";

      lines.push("");
      lines.push(
        `  ${z.name}${z.zoneType ? ` (${z.zoneType}` : ""}${
          z.zoneType && range ? `, ${range})` : z.zoneType ? ")" : ""
        }: ${impact}${
          z.confidence ? ` [confidence ${z.confidence}]` : ""
        }`
      );

      const m = z.metrics;
      if (!m) {
        lines.push("    (per-zone channels unavailable)");
        continue;
      }

      lines.push(
        `    Speed: entry ${fmt(m.entrySpeedDeltaKmh, "", 2)}, apex ${fmt(
          m.apexSpeedDeltaKmh,
          "",
          2
        )}, exit ${fmt(m.exitSpeedDeltaKmh, "", 2)} km/h`
      );
      lines.push(
        `    Drive/exit: drive phase ${fmt(
          m.drivePhaseDeltaKmh,
          "",
          2
        )} km/h, time-to-accel ${fmt(
          m.timeToAccelerationDeltaSeconds,
          "s"
        )}, exit-drive subj ${m.subjectExitDriveRating} vs ref ${m.referenceExitDriveRating}`
      );
      lines.push(
        `    Braking: max-decel ${fmt(
          m.maxDecelerationDeltaKmhPerSec,
          " km/h/s",
          2
        )}, duration ${fmt(
          m.brakingDurationDeltaSeconds,
          "s"
        )}, drop-before-apex ${fmt(
          m.speedDropBeforeApexDeltaKmh,
          "",
          2
        )} km/h, rating subj ${m.subjectBrakingRating} vs ref ${m.referenceBrakingRating}`
      );
      lines.push(
        m.rpmAvailable
          ? `    RPM: min ${fmt(m.minRpmDelta, "", 0)}, max ${fmt(
              m.maxRpmDelta,
              "",
              0
            )}, drop-before-apex ${fmt(
              m.rpmDropBeforeApexDelta,
              "",
              0
            )}, recovery-after-apex ${fmt(
              m.rpmRecoveryAfterApexDelta,
              "",
              0
            )}, recovery subj ${m.subjectRpmRecoveryRating} vs ref ${m.referenceRpmRecoveryRating}`
          : "    RPM: unavailable in this zone"
      );
    }
  }

  return lines.join("\n");
}

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it to the backend environment to enable AI interpretation."
    );
  }
  if (!client) {
    client = new Anthropic();
  }
  return client;
}

export async function interpretLapComparison(
  req: InterpretationRequest
): Promise<string> {
  if (!req.lapComparison) {
    throw new Error("No lap comparison data available to interpret.");
  }

  const anthropic = getClient();
  const promptInput = buildPromptInput(req);

  const systemPrompt =
    typeof req.template === "string" && req.template.trim().length > 0
      ? req.template
      : DEFAULT_LAP_PROMPT_TEMPLATE;

  // The system prompt is identical across every interpretation call for a given
  // user, so it is marked as a cache breakpoint. Prompt caching only engages
  // once a single cached segment reaches the model's minimum (~1024 tokens for
  // Opus); this prompt is under that today, so caching stays dormant and costs
  // nothing, activating automatically if the cached prefix grows. The per-driver
  // framing override (if any) is appended as a separate, uncached block.
  const system: {
    type: "text";
    text: string;
    cache_control?: { type: "ephemeral" };
  }[] = [
    { type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } },
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
        content: `Interpret this overall lap comparison for the driver:\n\n${promptInput}`,
      },
    ],
  });

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim();

  if (!text) {
    throw new Error("The AI interpretation came back empty. Please try again.");
  }

  return text;
}
