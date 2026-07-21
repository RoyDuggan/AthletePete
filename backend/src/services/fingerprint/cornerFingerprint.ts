/**
 * Corner Fingerprint engine.
 *
 * Reduces one corner execution's grip timeline into a deterministic signature.
 * All scalars are 0–100. `consistency` is cross-lap and is supplied by the
 * service once per-corner statistics are known; everything else is intrinsic to
 * the single execution.
 */
import type {
  CornerFingerprint,
  CornerPhase,
  GripTimelineMetrics,
  GripTimelineSample,
} from "../../types/fingerprint";
import type { CornerWindow } from "./cornerLibrary";
import { clamp, round, stdDev } from "./channels";

/** Mean utilisation of the timeline samples in a given phase (0 if none). */
function phaseMeanUtilisation(
  timeline: GripTimelineSample[],
  phase: CornerPhase
): number {
  const inPhase = timeline.filter((s) => s.phase === phase);
  if (inPhase.length === 0) return 0;
  return inPhase.reduce((sum, s) => sum + s.utilisationPct, 0) / inPhase.length;
}

/** Peak utilisation of the timeline samples across the given phases (0 if none). */
function phasePeakUtilisation(
  timeline: GripTimelineSample[],
  phases: CornerPhase[]
): number {
  const inPhase = timeline.filter((s) => phases.includes(s.phase));
  if (inPhase.length === 0) return 0;
  return Math.max(...inPhase.map((s) => s.utilisationPct));
}

/** Fraction (0–100) of loaded samples whose utilisation sits in the efficient band. */
function frictionPathQuality(timeline: GripTimelineSample[]): number {
  const loaded = timeline.filter((s) => s.phase !== "straight");
  if (loaded.length === 0) return 0;
  const inBand = loaded.filter(
    (s) => s.utilisationPct >= 80 && s.utilisationPct <= 105
  ).length;
  return (inBand / loaded.length) * 100;
}

/** Smoothness from the combined-g jerk: less sample-to-sample change = smoother. */
function smoothness(timeline: GripTimelineSample[]): number {
  if (timeline.length < 2) return 0;
  let delta = 0;
  for (let i = 1; i < timeline.length; i++) {
    delta += Math.abs(timeline[i].combinedG - timeline[i - 1].combinedG);
  }
  const avg = delta / (timeline.length - 1); // g per 1% progress
  return clamp(100 - avg * 400, 0, 100);
}

/** Stability from utilisation variability through the loaded (non-straight) phases. */
function stability(timeline: GripTimelineSample[]): number {
  const loaded = timeline.filter((s) => s.phase !== "straight");
  if (loaded.length < 2) return 0;
  const variability = stdDev(loaded.map((s) => s.utilisationPct));
  return clamp(100 - variability * 2, 0, 100);
}

/** Mean grip reserve over loaded samples (0–100). */
function gripReserve(timeline: GripTimelineSample[]): number {
  const loaded = timeline.filter((s) => s.phase !== "straight");
  if (loaded.length === 0) return 0;
  return loaded.reduce((sum, s) => sum + s.gripReservePct, 0) / loaded.length;
}

/**
 * Confidence in the fingerprint from data completeness: measured (not derived)
 * longitudinal g, present lateral channel, and enough loaded samples.
 */
function confidence(
  window: CornerWindow,
  timeline: GripTimelineSample[]
): number {
  const n = window.longitudinalDerived.length;
  if (n === 0) return 0;

  const derivedFraction =
    window.longitudinalDerived.filter(Boolean).length / n;
  const latPresentFraction =
    window.lateralG.filter((v) => v !== null).length / n;
  const loaded = timeline.filter((s) => s.phase !== "straight").length;

  let score = 100;
  score -= derivedFraction * 35; // inferred longitudinal g is less trustworthy
  score -= (1 - latPresentFraction) * 40; // missing lateral g is a big hit
  if (loaded < 10) score -= (10 - loaded) * 3; // too little in-corner data
  if (n < 15) score -= (15 - n) * 2; // sparse window

  return clamp(score, 0, 100);
}

/** Builds the full fingerprint. `consistency` is supplied by the service. */
export function buildFingerprint(params: {
  timeline: GripTimelineSample[];
  metrics: GripTimelineMetrics;
  window: CornerWindow;
  consistency: number;
}): CornerFingerprint {
  const { timeline, metrics, window, consistency } = params;

  // Utilisation/commitment fields cap at 100: a sample can exceed the p95 grip
  // envelope (timeline utilisation runs to 150), but the fingerprint contract is
  // 0–100, so "at or beyond the envelope" reads as 100.
  const pct = (value: number) => round(clamp(value, 0, 100), 1);

  return {
    overallUtilisation: pct(metrics.averageUtilisation),
    brakingUtilisation: pct(phaseMeanUtilisation(timeline, "braking")),
    trailBrakingUtilisation: pct(phaseMeanUtilisation(timeline, "trail_braking")),
    apexUtilisation: pct(phaseMeanUtilisation(timeline, "apex")),
    exitUtilisation: pct(phaseMeanUtilisation(timeline, "exit")),
    smoothness: round(smoothness(timeline), 1),
    stability: round(stability(timeline), 1),
    consistency: round(clamp(consistency, 0, 100), 1),
    frictionPathQuality: round(frictionPathQuality(timeline), 1),
    entryCommitment: pct(
      phasePeakUtilisation(timeline, ["braking", "trail_braking"])
    ),
    apexCommitment: pct(phasePeakUtilisation(timeline, ["apex"])),
    exitCommitment: pct(phasePeakUtilisation(timeline, ["exit"])),
    gripReserve: round(gripReserve(timeline), 1),
    confidence: round(confidence(window, timeline), 1),
  };
}
