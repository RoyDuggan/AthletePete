/**
 * Pure, client-side corner selection. The sensitivity slider only adjusts the
 * attack-score acceptance threshold — no telemetry or feature recalculation —
 * so all of this runs instantly in the browser over the payload the backend
 * already returned.
 */
import type { CornerExecution } from "../types/fingerprint";

export type SelectionStats = {
  threshold: number;
  selectedCount: number;
  rejectedCount: number;
  /** Executions dropped purely by the threshold (not anomaly-rejected). */
  belowThresholdCount: number;
  includedLapCount: number;
  minLapTimeSeconds: number | null;
  maxLapTimeSeconds: number | null;
  /** Retained execution count per corner number. */
  perCornerCounts: Record<number, number>;
  /** `sessionId#lapNumber` of the fastest lap, whose corners are always kept. */
  fastestLapKey: string | null;
};

/** Stable identity for the lap an execution belongs to. */
export const lapKey = (exec: {
  sessionId: string;
  lapNumber: number;
}): string => `${exec.sessionId}#${exec.lapNumber}`;

/**
 * `sessionId#lapNumber` of the fastest lap across the given executions, or null
 * when none carry a lap time. The fastest lap is our anchor: every corner on it
 * is retained regardless of the sensitivity slider.
 */
export function fastestLapKey(executions: CornerExecution[]): string | null {
  let bestKey: string | null = null;
  let bestTime = Infinity;
  for (const exec of executions) {
    if (exec.lapTimeSeconds < bestTime) {
      bestTime = exec.lapTimeSeconds;
      bestKey = lapKey(exec);
    }
  }
  return bestKey;
}

/**
 * An execution is retained when it is not anomaly-rejected and either sits on
 * the fastest lap (always kept, so the benchmark lap is never hidden by the
 * slider) or clears the attack-score threshold.
 */
export function isRetained(
  exec: CornerExecution,
  threshold: number,
  fastestKey?: string | null
): boolean {
  if (exec.rejected) return false;
  if (fastestKey && lapKey(exec) === fastestKey) return true;
  return exec.attackScore >= threshold;
}

export function selectCorners(
  executions: CornerExecution[],
  threshold: number
): { selected: CornerExecution[]; stats: SelectionStats } {
  const selected: CornerExecution[] = [];
  const perCornerCounts: Record<number, number> = {};
  const includedLaps = new Set<string>();
  const fastestKey = fastestLapKey(executions);
  let rejectedCount = 0;
  let belowThresholdCount = 0;
  let minLap: number | null = null;
  let maxLap: number | null = null;

  for (const exec of executions) {
    if (exec.rejected) {
      rejectedCount++;
      continue;
    }
    if (!isRetained(exec, threshold, fastestKey)) {
      belowThresholdCount++;
      continue;
    }

    selected.push(exec);
    perCornerCounts[exec.cornerNumber] =
      (perCornerCounts[exec.cornerNumber] ?? 0) + 1;
    includedLaps.add(lapKey(exec));

    if (minLap === null || exec.lapTimeSeconds < minLap) minLap = exec.lapTimeSeconds;
    if (maxLap === null || exec.lapTimeSeconds > maxLap) maxLap = exec.lapTimeSeconds;
  }

  return {
    selected,
    stats: {
      threshold,
      selectedCount: selected.length,
      rejectedCount,
      belowThresholdCount,
      includedLapCount: includedLaps.size,
      minLapTimeSeconds: minLap,
      maxLapTimeSeconds: maxLap,
      perCornerCounts,
      fastestLapKey: fastestKey,
    },
  };
}
