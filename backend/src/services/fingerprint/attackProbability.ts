/**
 * Attack Probability engine. Produces a 0–100 score for how strongly a corner
 * execution represents a genuine attack lap, from existing extracted metrics
 * plus fingerprint metrics. Weightings are configurable per the spec.
 */
import type { AttackWeights, CornerFingerprint } from "../../types/fingerprint";
import type { CornerStat } from "./cornerStats";
import { clamp, round } from "./channels";

export const DEFAULT_ATTACK_WEIGHTS: AttackWeights = {
  entrySpeed: 1.0,
  apexSpeed: 1.5,
  exitSpeed: 1.5,
  sectionTime: 2.0,
  utilisation: 1.5,
  smoothness: 0.75,
  stability: 0.75,
  consistency: 1.0,
  frictionPathQuality: 1.0,
  confidence: 1.0,
};

type AttackInput = {
  entrySpeedKmh: number | null;
  apexSpeedKmh: number | null;
  exitSpeedKmh: number | null;
  sectionTimeSeconds: number | null;
  fingerprint: CornerFingerprint;
};

/** Ratio of value to the corner's best (max) for that channel, 0–1. */
function speedRatio(value: number | null, best: number | null): number | null {
  if (value === null || best === null || best <= 0) return null;
  return clamp(value / best, 0, 1);
}

/**
 * Attack score for one execution. Speed channels are normalised against the
 * corner's best; section time against the corner's fastest; fingerprint metrics
 * are already 0–100. Only the components with data contribute, and the weights
 * are renormalised over those present so a missing channel doesn't drag the
 * score down.
 */
export function computeAttackScore(
  input: AttackInput,
  stat: CornerStat | undefined,
  weights: AttackWeights = DEFAULT_ATTACK_WEIGHTS
): number {
  const fp = input.fingerprint;

  const sectionRatio =
    input.sectionTimeSeconds !== null &&
    stat?.sectionTimeMin != null &&
    input.sectionTimeSeconds > 0
      ? clamp(stat.sectionTimeMin / input.sectionTimeSeconds, 0, 1)
      : null;

  // Each component: [normalised 0–1 value, weight]. Null value = skipped.
  const components: [number | null, number][] = [
    [speedRatio(input.entrySpeedKmh, stat?.entrySpeedMax ?? null), weights.entrySpeed],
    [speedRatio(input.apexSpeedKmh, stat?.apexSpeedMax ?? null), weights.apexSpeed],
    [speedRatio(input.exitSpeedKmh, stat?.exitSpeedMax ?? null), weights.exitSpeed],
    [sectionRatio, weights.sectionTime],
    [fp.overallUtilisation / 100, weights.utilisation],
    [fp.smoothness / 100, weights.smoothness],
    [fp.stability / 100, weights.stability],
    [fp.consistency / 100, weights.consistency],
    [fp.frictionPathQuality / 100, weights.frictionPathQuality],
    [fp.confidence / 100, weights.confidence],
  ];

  let weighted = 0;
  let totalWeight = 0;
  for (const [value, weight] of components) {
    if (value === null || weight <= 0) continue;
    weighted += value * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) return 0;
  return round(clamp((weighted / totalWeight) * 100, 0, 100), 1);
}
