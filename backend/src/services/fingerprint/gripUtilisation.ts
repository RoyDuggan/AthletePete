/**
 * Grip Utilisation engine.
 *
 * Estimates available grip per corner from clean laps, then builds a normalised
 * 0–100% grip-utilisation timeline (~101 samples) for a single corner execution
 * and derives the aggregate timeline metrics defined in the spec.
 */
import type {
  CornerPhase,
  GripTimelineMetrics,
  GripTimelineSample,
  PhaseAreas,
} from "../../types/fingerprint";
import type { CornerWindow } from "./cornerLibrary";
import { apexIndex } from "./cornerLibrary";
import { clamp, combinedG, percentile, round } from "./channels";

const TIMELINE_SAMPLES = 101;

// Phase-classification thresholds (g). No throttle/brake channel exists, so
// phases are inferred from longitudinal g sign, lateral load and apex position.
const BRAKE_G = 0.12; // longitudinal deceleration marking braking
const ACCEL_G = 0.12; // longitudinal acceleration marking corner exit
const LAT_ACTIVE_G = 0.2; // lateral load marking the car is "in" the corner
const STRAIGHT_COMBINED_G = 0.15; // below this the car is essentially straight-line
const COAST_COMBINED_G = 0.08; // near-zero combined g mid-corner = coasting

/**
 * Available grip for a corner = a high percentile of the combined-g magnitude
 * pooled across clean laps, so a handful of spikes don't inflate the envelope.
 * Returns null when there is too little data to be meaningful.
 */
export function estimateCornerGrip(
  pooledCombinedG: number[],
  minSamples = 30
): number | null {
  const usable = pooledCombinedG.filter((g) => Number.isFinite(g) && g >= 0);
  if (usable.length < minSamples) return null;
  const grip = percentile(usable, 0.95);
  return grip > 0.05 ? round(grip, 3) : null;
}

/** Pooled combined-g samples for a windowed corner execution (for grip estimation). */
export function windowCombinedG(window: CornerWindow): number[] {
  return window.lateralG.map((lat, k) => combinedG(lat, window.longitudinalG[k]));
}

/** Linear interpolation of a value array sampled at `positions` onto `target`. */
function interpolate(
  positions: number[],
  values: (number | null)[],
  target: number
): number | null {
  const n = positions.length;
  if (n === 0) return null;
  if (target <= positions[0]) return values[0];
  if (target >= positions[n - 1]) return values[n - 1];

  for (let i = 1; i < n; i++) {
    if (target <= positions[i]) {
      const lo = values[i - 1];
      const hi = values[i];
      if (lo === null) return hi;
      if (hi === null) return lo;
      const span = positions[i] - positions[i - 1];
      if (span === 0) return hi;
      const frac = (target - positions[i - 1]) / span;
      return lo * (1 - frac) + hi * frac;
    }
  }
  return values[n - 1];
}

function classifyPhase(
  progress: number,
  apexProgress: number,
  lat: number,
  lon: number,
  combined: number
): CornerPhase {
  if (combined < STRAIGHT_COMBINED_G) return "straight";

  // A tight band around minimum speed is the apex regardless of g signs.
  if (Math.abs(progress - apexProgress) <= 6) return "apex";

  if (progress < apexProgress) {
    // Approaching the apex: braking (optionally with lateral load = trailing).
    if (lon <= -BRAKE_G) {
      return Math.abs(lat) >= LAT_ACTIVE_G ? "trail_braking" : "braking";
    }
    // Loaded but off the brakes before the apex — treat as apex approach.
    return "apex";
  }

  // After the apex the driver is unwinding onto the throttle. Default to exit
  // unless they are still trail-braking (a clear decel under lateral load).
  if (lon <= -BRAKE_G && Math.abs(lat) >= LAT_ACTIVE_G) return "trail_braking";
  return "exit";
}

/**
 * Builds the 0–100% normalised grip-utilisation timeline for one corner
 * execution. Progress is by distance through the corner window; ~101 equally
 * spaced samples are interpolated from the underlying telemetry.
 */
export function buildGripTimeline(
  window: CornerWindow,
  availableGrip: number
): GripTimelineSample[] {
  const n = window.distance.length;
  if (n < 2 || availableGrip <= 0) return [];

  const start = window.distance[0];
  const end = window.distance[n - 1];
  const span = end - start;
  if (span <= 0) return [];

  const apexProgress = (window.distance[apexIndex(window)] - start) / span * 100;
  const samples: GripTimelineSample[] = [];

  for (let i = 0; i < TIMELINE_SAMPLES; i++) {
    const progress = (i / (TIMELINE_SAMPLES - 1)) * 100;
    const targetDist = start + (progress / 100) * span;

    const lat = interpolate(window.distance, window.lateralG, targetDist) ?? 0;
    const lon = interpolate(window.distance, window.longitudinalG, targetDist) ?? 0;
    const time = interpolate(window.distance, window.time, targetDist) ?? 0;
    const combined = combinedG(lat, lon);
    const utilisationPct = clamp((combined / availableGrip) * 100, 0, 150);

    samples.push({
      progress: round(progress, 1),
      timeSeconds: round(time, 3),
      distanceMeters: round(targetDist, 2),
      combinedG: round(combined, 3),
      utilisationPct: round(utilisationPct, 1),
      gripReservePct: round(clamp(100 - utilisationPct, 0, 100), 1),
      phase: classifyPhase(progress, apexProgress, lat, lon, combined),
    });
  }

  return samples;
}

const PHASES: CornerPhase[] = [
  "braking",
  "trail_braking",
  "apex",
  "exit",
  "straight",
];

/** Trapezoidal area of a per-sample series over 0–100% progress, scaled to 0–100. */
function trapezoidArea(samples: GripTimelineSample[], value: (s: GripTimelineSample) => number): number {
  if (samples.length < 2) return 0;
  let area = 0;
  for (let i = 1; i < samples.length; i++) {
    const dp = (samples[i].progress - samples[i - 1].progress) / 100;
    area += ((value(samples[i]) + value(samples[i - 1])) / 2) * dp;
  }
  return area;
}

/** Derives the aggregate metrics for one corner's grip timeline. */
export function deriveTimelineMetrics(
  timeline: GripTimelineSample[]
): GripTimelineMetrics {
  const emptyAreas: PhaseAreas = {
    braking: 0,
    trail_braking: 0,
    apex: 0,
    exit: 0,
    straight: 0,
  };

  if (timeline.length === 0) {
    return {
      peakUtilisation: 0,
      averageUtilisation: 0,
      utilisationIntegral: 0,
      phaseAreas: emptyAreas,
      gripContinuity: 0,
      gripBias: { entry: 0, apex: 0, exit: 0 },
      coastingEvents: 0,
      utilisationDropEvents: 0,
    };
  }

  const utils = timeline.map((s) => s.utilisationPct);
  const peak = Math.max(...utils);
  const avg = utils.reduce((sum, u) => sum + u, 0) / utils.length;
  const integral = trapezoidArea(timeline, (s) => s.utilisationPct);

  // Per-phase utilisation area.
  const phaseAreas = { ...emptyAreas };
  for (const phase of PHASES) {
    phaseAreas[phase] = round(
      trapezoidArea(timeline, (s) => (s.phase === phase ? s.utilisationPct : 0)),
      2
    );
  }

  // Grip continuity: 100 minus the average sample-to-sample utilisation swing
  // (sudden drops/spikes lower continuity).
  let swing = 0;
  for (let i = 1; i < timeline.length; i++) {
    swing += Math.abs(timeline[i].utilisationPct - timeline[i - 1].utilisationPct);
  }
  const avgSwing = swing / Math.max(1, timeline.length - 1);
  const gripContinuity = clamp(100 - avgSwing * 2, 0, 100);

  // Grip bias across entry (0–33%), apex (33–66%), exit (66–100%).
  const third = (lo: number, hi: number) =>
    timeline
      .filter((s) => s.progress >= lo && s.progress < hi)
      .reduce((sum, s) => sum + s.utilisationPct, 0);
  const entrySum = third(0, 33.34);
  const apexSum = third(33.34, 66.67);
  const exitSum = third(66.67, 100.01);
  const biasTotal = entrySum + apexSum + exitSum || 1;

  // Coasting: near-zero combined g while notionally still in the corner.
  const coastingEvents = timeline.filter(
    (s) => s.combinedG < COAST_COMBINED_G && s.phase !== "straight"
  ).length;

  // Utilisation drop events: a fall of >20 points that then recovers.
  let dropEvents = 0;
  for (let i = 1; i < timeline.length - 1; i++) {
    const prev = timeline[i - 1].utilisationPct;
    const cur = timeline[i].utilisationPct;
    const next = timeline[i + 1].utilisationPct;
    if (prev - cur > 20 && next - cur > 10) dropEvents++;
  }

  return {
    peakUtilisation: round(peak, 1),
    averageUtilisation: round(avg, 1),
    utilisationIntegral: round(integral, 2),
    phaseAreas,
    gripContinuity: round(gripContinuity, 1),
    gripBias: {
      entry: round((entrySum / biasTotal) * 100, 1),
      apex: round((apexSum / biasTotal) * 100, 1),
      exit: round((exitSum / biasTotal) * 100, 1),
    },
    coastingEvents,
    utilisationDropEvents: dropEvents,
  };
}
