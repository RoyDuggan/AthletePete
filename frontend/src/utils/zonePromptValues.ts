import type { AdvisoryData, FeatureZone } from "../types/advisoryData";

const ZONE_BASIS_LABELS: Record<string, string> = {
  fastest: "fastest lap only",
  within_2pct: "all laps within 2% of fastest",
  all: "all laps",
  custom: "custom zone map",
};

function num(value: number | null | undefined, digits: number): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "n/a";
  }
  return value.toFixed(digits);
}

function rating(subject: string, reference: string): string {
  return `${subject} (reference ${reference})`;
}

function rpmSummary(metrics: NonNullable<FeatureZone["metrics"]>): string {
  if (!metrics.rpmAvailable) {
    return "unavailable — no RPM channel in this zone";
  }

  return (
    `min Δ ${num(metrics.minRpmDelta, 0)}, max Δ ${num(metrics.maxRpmDelta, 0)}, ` +
    `drop-before-apex Δ ${num(metrics.rpmDropBeforeApexDelta, 0)}, ` +
    `recovery-after-apex Δ ${num(metrics.rpmRecoveryAfterApexDelta, 0)}; ` +
    `recovery rating ${rating(
      metrics.subjectRpmRecoveryRating,
      metrics.referenceRpmRecoveryRating
    )}`
  );
}

/**
 * Builds the `{{placeholder}}` value map for one feature zone, ready to be
 * substituted into the customisable per-zone prompt template. All deltas are
 * subject - reference (negative = subject faster).
 */
export function buildZonePromptValues(
  zone: FeatureZone,
  data: AdvisoryData
): Record<string, string | number> {
  const m = zone.metrics;
  const c = data.lapComparison;

  const subjectLap =
    data.subjectLabel ?? data.subjectLapNumber ?? c?.fastestLapNumber ?? "n/a";
  const referenceLap =
    data.referenceLabel ??
    data.referenceLapNumber ??
    c?.comparisonLapNumber ??
    "n/a";

  return {
    zoneNumber: zone.zoneNumber,
    zoneType: zone.zoneType || "unknown",
    startDistance: num(zone.startDistanceMeters, 0),
    endDistance: num(zone.endDistanceMeters, 0),

    subjectLap,
    referenceLap,
    subjectLapTime: num(c?.fastestLapTimeSeconds, 3),
    referenceLapTime: num(c?.comparisonLapTimeSeconds, 3),
    overallDelta: num(c?.deltaTimeSeconds, 3),
    zoneDelta: num(zone.deltaSeconds, 3),

    entrySpeedDelta: num(m?.entrySpeedDeltaKmh, 2),
    apexSpeedDelta: num(m?.apexSpeedDeltaKmh, 2),
    exitSpeedDelta: num(m?.exitSpeedDeltaKmh, 2),
    drivePhaseDelta: num(m?.drivePhaseDeltaKmh, 2),
    timeToAccelerationDelta: num(m?.timeToAccelerationDeltaSeconds, 3),
    exitDriveRating: m
      ? rating(m.subjectExitDriveRating, m.referenceExitDriveRating)
      : "n/a",

    maxDecelDelta: num(m?.maxDecelerationDeltaKmhPerSec, 2),
    brakingDurationDelta: num(m?.brakingDurationDeltaSeconds, 3),
    speedDropBeforeApexDelta: num(m?.speedDropBeforeApexDeltaKmh, 2),
    brakingRating: m
      ? rating(m.subjectBrakingRating, m.referenceBrakingRating)
      : "n/a",

    rpmSummary: m ? rpmSummary(m) : "n/a",
    confidence: zone.confidence,
    basis:
      ZONE_BASIS_LABELS[data.zoneBasis ?? "fastest"] ??
      data.zoneBasis ??
      "fastest lap only",
  };
}
