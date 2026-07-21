import { analysisConfig } from "../config/analysisConfig";
import { DeltaTracePoint, FeatureZone, LapData, ZoneDeltaResult } from "../types/telemetry";
import {
  alignLapToDistanceGrid,
  buildDeltaTrace,
  getDeltaAtDistance,
} from "./distanceAlignment";
import { addGpsDistanceToLap } from "./gpsDistanceBuilder";

export type ZoneAnalysisOutput = {
  method: string;
  totalLapDeltaSeconds: number;
  reconstructedFinishDeltaSeconds: number | null;
  finishDeltaErrorSeconds: number | null;
  sumZoneDeltasSeconds: number;
  deltaTrace: DeltaTracePoint[];
  zones: ZoneDeltaResult[];
  validity: "valid" | "low_confidence" | "invalid";
  reason?: string;
};

function applyConfidenceRules(
    zoneDelta: number,
    totalLapDelta: number,
    method: string
): Pick<ZoneDeltaResult, "confidence" | "validity" | "reason"> {
  if (Math.abs(totalLapDelta) < analysisConfig.lowConfidenceLapDeltaSeconds) {
    return {
      confidence: "low",
      validity: "low_confidence",
      reason: "Total lap delta is below reliable threshold for zone attribution.",
    };
  }

  if (Math.abs(zoneDelta) < analysisConfig.minReliableZoneDeltaSeconds) {
    return {
      confidence: "low",
      validity: "low_confidence",
      reason: "Zone delta is below minimum reliable timing threshold.",
    };
  }

  return {
    confidence: method === "legacy" ? "medium" : "high",
    validity: "valid",
  };
}

function getReconstructedFinishDelta(deltaTrace: DeltaTracePoint[]): number | null {
  if (deltaTrace.length === 0) return null;
  return deltaTrace[deltaTrace.length - 1].deltaSeconds;
}

function analyseZonesDistanceAligned(
    fastestLap: LapData,
    comparisonLap: LapData,
    zones: FeatureZone[],
    method: string
): ZoneAnalysisOutput {
  const fastestAligned = alignLapToDistanceGrid(
      fastestLap,
      analysisConfig.distanceStepMeters
  );

  const comparisonAligned = alignLapToDistanceGrid(
      comparisonLap,
      analysisConfig.distanceStepMeters
  );

  const totalLapDelta = comparisonLap.lapTime - fastestLap.lapTime;
  const deltaTrace = buildDeltaTrace(fastestAligned, comparisonAligned);

  const results = zones.map((zone) => {
    const startDelta = getDeltaAtDistance(deltaTrace, zone.startDistanceMeters);
    const endDelta = getDeltaAtDistance(deltaTrace, zone.endDistanceMeters);
    const deltaSeconds = endDelta - startDelta;

    const confidence = applyConfidenceRules(
        deltaSeconds,
        totalLapDelta,
        method
    );

    return {
      zoneNumber: zone.zoneNumber,
      name: zone.name,
      startDistanceMeters: zone.startDistanceMeters,
      centerDistanceMeters: zone.centerDistanceMeters,
      endDistanceMeters: zone.endDistanceMeters,
      deltaSeconds,
      method,
      ...confidence,
    };
  });

  const sumZoneDeltas = results.reduce((sum, z) => sum + z.deltaSeconds, 0);
  const reconstructedFinishDelta = getReconstructedFinishDelta(deltaTrace);
  const finishDeltaError =
      reconstructedFinishDelta === null ? null : reconstructedFinishDelta - totalLapDelta;

  if (
      Math.abs(sumZoneDeltas) >
      Math.abs(totalLapDelta) * analysisConfig.maxZoneDeltaToLapDeltaRatio &&
      Math.abs(totalLapDelta) < analysisConfig.lowConfidenceLapDeltaSeconds
  ) {
    return {
      method,
      totalLapDeltaSeconds: totalLapDelta,
      reconstructedFinishDeltaSeconds: reconstructedFinishDelta,
      finishDeltaErrorSeconds: finishDeltaError,
      sumZoneDeltasSeconds: sumZoneDeltas,
      deltaTrace,
      validity: "invalid",
      reason:
          "Zone deltas do not reconcile with total lap delta. Analysis retained for validation, but coaching claims should be treated as suspect.",
      zones: results.map((zone) => ({
        ...zone,
        confidence: "low",
        validity: "invalid",
        reason:
            "Zone deltas do not reconcile with total lap delta. Analysis retained for validation, but coaching claims should be treated as suspect.",
      })),
    };
  }

  return {
    method,
    totalLapDeltaSeconds: totalLapDelta,
    reconstructedFinishDeltaSeconds: reconstructedFinishDelta,
    finishDeltaErrorSeconds: finishDeltaError,
    sumZoneDeltasSeconds: sumZoneDeltas,
    deltaTrace,
    zones: results,
    validity:
        Math.abs(totalLapDelta) < analysisConfig.lowConfidenceLapDeltaSeconds
            ? "low_confidence"
            : "valid",
    reason:
        Math.abs(totalLapDelta) < analysisConfig.lowConfidenceLapDeltaSeconds
            ? "Total lap delta is below reliable threshold for zone attribution. Analysis retained for validation."
            : undefined,
  };
}

function analyseZonesLegacy(
    fastestLap: LapData,
    comparisonLap: LapData,
    zones: FeatureZone[]
): ZoneAnalysisOutput {
  const totalLapDelta = comparisonLap.lapTime - fastestLap.lapTime;
  const estimatedDelta = zones.length > 0 ? totalLapDelta / zones.length : 0;

  const zoneResults = zones.map((zone) => {
    const confidence = applyConfidenceRules(
        estimatedDelta,
        totalLapDelta,
        "legacy"
    );

    return {
      zoneNumber: zone.zoneNumber,
      name: zone.name,
      startDistanceMeters: zone.startDistanceMeters,
      centerDistanceMeters: zone.centerDistanceMeters,
      endDistanceMeters: zone.endDistanceMeters,
      deltaSeconds: estimatedDelta,
      method: "legacy",
      ...confidence,
    };
  });

  const sumZoneDeltas = zoneResults.reduce((sum, zone) => sum + zone.deltaSeconds, 0);

  return {
    method: "legacy",
    totalLapDeltaSeconds: totalLapDelta,
    reconstructedFinishDeltaSeconds: null,
    finishDeltaErrorSeconds: null,
    sumZoneDeltasSeconds: sumZoneDeltas,
    deltaTrace: [],
    zones: zoneResults,
    validity: "low_confidence",
    reason: "Legacy mode does not produce a cumulative delta trace.",
  };
}

export function analyseZones(
    fastestLap: LapData,
    comparisonLap: LapData,
    zones: FeatureZone[]
): ZoneAnalysisOutput {
  switch (analysisConfig.zoneAnalysisMethod) {
    case "legacy":
      return analyseZonesLegacy(fastestLap, comparisonLap, zones);

    case "distanceAligned":
      return analyseZonesDistanceAligned(
          fastestLap,
          comparisonLap,
          zones,
          "distanceAligned"
      );

    case "gpsDistanceAligned": {
      const gpsFastestLap = addGpsDistanceToLap(fastestLap);
      const gpsComparisonLap = addGpsDistanceToLap(comparisonLap);

      return analyseZonesDistanceAligned(
          gpsFastestLap,
          gpsComparisonLap,
          zones,
          "gpsDistanceAligned"
      );
    }

    default:
      return analyseZonesDistanceAligned(
          fastestLap,
          comparisonLap,
          zones,
          "distanceAligned"
      );
  }
}
