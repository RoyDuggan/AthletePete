/**
 * Reference Builder. Composes an "ideal" reference lap by choosing, for each
 * corner, the highest-confidence retained execution (tie-broken by attack
 * score). Retained = not anomaly-rejected and attack score at/above the given
 * threshold; if no execution clears the threshold, the best non-rejected one is
 * used so every corner is still represented.
 */
import type {
  CornerDefinition,
  CornerExecution,
  ReferenceCorner,
} from "../../types/fingerprint";

export function buildReferenceLap(
  corners: CornerDefinition[],
  executions: CornerExecution[],
  threshold: number
): ReferenceCorner[] {
  const byCorner = new Map<number, CornerExecution[]>();
  for (const exec of executions) {
    if (exec.rejected) continue;
    const list = byCorner.get(exec.cornerNumber) ?? [];
    list.push(exec);
    byCorner.set(exec.cornerNumber, list);
  }

  const reference: ReferenceCorner[] = [];

  for (const corner of corners) {
    const candidates = byCorner.get(corner.cornerNumber) ?? [];
    if (candidates.length === 0) continue;

    const atThreshold = candidates.filter((c) => c.attackScore >= threshold);
    const pool = atThreshold.length > 0 ? atThreshold : candidates;

    const best = pool.reduce((winner, c) => {
      if (c.fingerprint.confidence !== winner.fingerprint.confidence) {
        return c.fingerprint.confidence > winner.fingerprint.confidence ? c : winner;
      }
      return c.attackScore > winner.attackScore ? c : winner;
    });

    reference.push({
      cornerNumber: corner.cornerNumber,
      sessionId: best.sessionId,
      lapNumber: best.lapNumber,
      lapLabel: best.lapLabel,
      attackScore: best.attackScore,
      confidence: best.fingerprint.confidence,
      fingerprint: best.fingerprint,
      timeline: best.timeline,
    });
  }

  return reference;
}
