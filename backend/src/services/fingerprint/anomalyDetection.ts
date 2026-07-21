/**
 * Anomaly rejection. Flags corner executions that shouldn't be learned from:
 * invalid/sparse telemetry, double-braking, mid-exit lift-offs and
 * traffic/avoidance outliers. Rejection here is HARD — independent of the
 * sensitivity slider, which only adjusts the attack-score threshold.
 *
 * With no throttle/brake channel, braking and lift-off are inferred from the
 * longitudinal-g trace.
 */
import type { RejectionReason } from "../../types/fingerprint";
import type { CornerWindow } from "./cornerLibrary";
import { apexIndex } from "./cornerLibrary";
import { combinedG } from "./channels";
import type { CornerStat } from "./cornerStats";

const MAX_PLAUSIBLE_G = 3.0; // a kart can't sustain more than ~3g combined
const BRAKE_ON_G = 0.2; // longitudinal g marking a braking event begins
const BRAKE_OFF_G = 0.05; // returns above this = braking event ended
const LIFT_G = 0.15; // negative longitudinal g mid-exit = throttle lift
const OUTLIER_SIGMA = 2.5;
const MIN_WINDOW_SAMPLES = 10;

type AnomalyInput = {
  window: CornerWindow;
  apexSpeedKmh: number | null;
  sectionTimeSeconds: number | null;
  entrySpeedKmh: number | null;
  exitSpeedKmh: number | null;
};

/** Returns all rejection reasons for an execution (empty = clean). */
export function detectAnomalies(
  input: AnomalyInput,
  stat: CornerStat | undefined
): RejectionReason[] {
  const reasons: RejectionReason[] = [];
  const { window } = input;
  const n = window.distance.length;

  // Incomplete: too few samples or missing headline metrics.
  if (
    n < MIN_WINDOW_SAMPLES ||
    input.entrySpeedKmh === null ||
    input.apexSpeedKmh === null ||
    input.exitSpeedKmh === null ||
    input.sectionTimeSeconds === null
  ) {
    reasons.push("incomplete");
  }

  // Sensor / invalid telemetry.
  if (isSensorInvalid(window)) reasons.push("sensor_invalid");

  // Double braking: two distinct braking events separated by an accel.
  if (countBrakingEvents(window) >= 2) reasons.push("double_braking");

  // Mid-exit lift-off.
  if (hasLiftOff(window)) reasons.push("lift_off");

  // Traffic / avoidance: apex speed abnormally low or section time abnormally
  // high vs this corner's own distribution.
  if (isPaceOutlier(input, stat)) reasons.push("traffic_avoidance");

  return reasons;
}

function isSensorInvalid(window: CornerWindow): boolean {
  const n = window.distance.length;
  if (n === 0) return true;

  // Too much missing lateral g.
  const latMissing = window.lateralG.filter((v) => v === null).length / n;
  if (latMissing > 0.5) return true;

  // Physically impossible combined g.
  for (let i = 0; i < n; i++) {
    if (combinedG(window.lateralG[i], window.longitudinalG[i]) > MAX_PLAUSIBLE_G) {
      return true;
    }
  }

  // Distance must be monotonically increasing through the window.
  for (let i = 1; i < n; i++) {
    if (window.distance[i] < window.distance[i - 1] - 0.01) return true;
  }

  return false;
}

function countBrakingEvents(window: CornerWindow): number {
  let events = 0;
  let braking = false;
  let sawAccelSince = true;

  for (const lon of window.longitudinalG) {
    if (lon === null) continue;

    if (!braking && lon <= -BRAKE_ON_G && sawAccelSince) {
      braking = true;
      sawAccelSince = false;
      events++;
    } else if (braking && lon >= -BRAKE_OFF_G) {
      braking = false;
    }

    if (lon >= 0.1) sawAccelSince = true;
  }

  return events;
}

function hasLiftOff(window: CornerWindow): boolean {
  const apex = apexIndex(window);
  let sawAccel = false;

  for (let i = apex; i < window.longitudinalG.length; i++) {
    const lon = window.longitudinalG[i];
    if (lon === null) continue;
    if (lon >= 0.1) sawAccel = true;
    // After getting on the power, a clear negative longitudinal g = a lift.
    if (sawAccel && lon <= -LIFT_G) return true;
  }

  return false;
}

function isPaceOutlier(input: AnomalyInput, stat: CornerStat | undefined): boolean {
  if (!stat) return false;

  if (
    input.apexSpeedKmh !== null &&
    stat.apexSpeedMedian !== null &&
    stat.apexSpeedStd > 0.5 &&
    input.apexSpeedKmh < stat.apexSpeedMedian - OUTLIER_SIGMA * stat.apexSpeedStd
  ) {
    return true;
  }

  if (
    input.sectionTimeSeconds !== null &&
    stat.sectionTimeMedian !== null &&
    stat.sectionTimeStd > 0.02 &&
    input.sectionTimeSeconds >
      stat.sectionTimeMedian + OUTLIER_SIGMA * stat.sectionTimeStd
  ) {
    return true;
  }

  return false;
}
