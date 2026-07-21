/**
 * Per-corner cross-lap statistics, used by anomaly detection (outlier tests),
 * fingerprint consistency and attack-probability normalisation. Built from all
 * executions that are not sensor-invalid/incomplete, so garbage laps don't skew
 * the distributions.
 */
import { median, stdDev } from "./channels";

export type CornerStat = {
  cornerNumber: number;
  apexSpeedMedian: number | null;
  apexSpeedStd: number;
  sectionTimeMedian: number | null;
  sectionTimeStd: number;
  utilisationIntegralMedian: number;
  utilisationIntegralStd: number;
  entrySpeedMax: number | null;
  apexSpeedMax: number | null;
  exitSpeedMax: number | null;
  sectionTimeMin: number | null;
};

export type StatInput = {
  cornerNumber: number;
  entrySpeedKmh: number | null;
  apexSpeedKmh: number | null;
  exitSpeedKmh: number | null;
  sectionTimeSeconds: number | null;
  utilisationIntegral: number;
};

function maxOf(values: (number | null)[]): number | null {
  const clean = values.filter((v): v is number => v !== null && Number.isFinite(v));
  return clean.length ? Math.max(...clean) : null;
}

function minOf(values: (number | null)[]): number | null {
  const clean = values.filter((v): v is number => v !== null && Number.isFinite(v));
  return clean.length ? Math.min(...clean) : null;
}

/** Builds a stats map keyed by corner number from the supplied executions. */
export function buildCornerStats(inputs: StatInput[]): Map<number, CornerStat> {
  const byCorner = new Map<number, StatInput[]>();
  for (const input of inputs) {
    const list = byCorner.get(input.cornerNumber) ?? [];
    list.push(input);
    byCorner.set(input.cornerNumber, list);
  }

  const stats = new Map<number, CornerStat>();

  for (const [cornerNumber, list] of byCorner) {
    const apexSpeeds = list
      .map((l) => l.apexSpeedKmh)
      .filter((v): v is number => v !== null);
    const sectionTimes = list
      .map((l) => l.sectionTimeSeconds)
      .filter((v): v is number => v !== null);
    const integrals = list.map((l) => l.utilisationIntegral);

    stats.set(cornerNumber, {
      cornerNumber,
      apexSpeedMedian: apexSpeeds.length ? median(apexSpeeds) : null,
      apexSpeedStd: stdDev(apexSpeeds),
      sectionTimeMedian: sectionTimes.length ? median(sectionTimes) : null,
      sectionTimeStd: stdDev(sectionTimes),
      utilisationIntegralMedian: median(integrals),
      utilisationIntegralStd: stdDev(integrals),
      entrySpeedMax: maxOf(list.map((l) => l.entrySpeedKmh)),
      apexSpeedMax: maxOf(list.map((l) => l.apexSpeedKmh)),
      exitSpeedMax: maxOf(list.map((l) => l.exitSpeedKmh)),
      sectionTimeMin: minOf(list.map((l) => l.sectionTimeSeconds)),
    });
  }

  return stats;
}

/**
 * Consistency (0–100) of one execution's utilisation integral against its
 * corner's distribution: on-median = 100, falling off with standard deviations
 * of departure. A single-sample corner returns a neutral 75.
 */
export function consistencyScore(
  utilisationIntegral: number,
  stat: CornerStat | undefined
): number {
  if (!stat || stat.utilisationIntegralStd <= 0.0001) return 75;
  const z = Math.abs(utilisationIntegral - stat.utilisationIntegralMedian) /
    stat.utilisationIntegralStd;
  return Math.max(0, Math.min(100, 100 - z * 25));
}
