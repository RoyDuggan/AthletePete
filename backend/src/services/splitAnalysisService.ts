import { analysisConfig } from "../config/analysisConfig";
import type { LapData } from "../types/telemetry";
import type {
  DeltaTraceSummary,
  LapComparisonMode,
  SplitAnalysisResult,
  ValidationSplit,
} from "../types/advisoryData";
import {
  alignLapToDistanceGrid,
  buildDeltaTrace,
  getTimeAtDistance,
  type AlignedPoint,
} from "./distanceAlignment";
import { addGpsCoordsToLap, addGpsDistanceToLap } from "./gpsDistanceBuilder";

export type SplitAnalysisOptions = {
  sectorCount?: number;
  /** Optional fixed sector boundaries in lap-relative metres, including 0 and finish. */
  sectorBoundariesMeters?: number[];
  distanceStepMeters?: number;
  comparisonMode?: LapComparisonMode;
  subjectLabel?: string;
  referenceLabel?: string;
};

function round(value: number, decimals = 3): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

function getLapTimeSeconds(lap: LapData): number {
  return Number((lap as any).lapTime ?? (lap as any).durationSeconds ?? 0);
}

function getTrackLength(aligned: AlignedPoint[]): number {
  if (aligned.length === 0) return 0;
  return aligned[aligned.length - 1].distanceMeters;
}

function alignForValidation(lap: LapData, distanceStepMeters: number): {
  aligned: AlignedPoint[];
  method: string;
} {
  // Align on the lap's OWN distance channel — the same basis the speed traces
  // and feature-zone boundaries use — so the delta panel lines up with them on
  // the chart and per-zone split times are looked up at the right distances.
  // GPS X/Y are projected onto the samples first (without touching distance) so
  // the delta trace still carries the coordinates the track minimap needs.
  // A GPS-integrated distance is only a fallback for laps with no usable
  // distance channel; using it as the primary basis puts the delta trace on a
  // different (progressively shifted) x-axis from the speed plot.
  try {
    return {
      aligned: alignLapToDistanceGrid(addGpsCoordsToLap(lap), distanceStepMeters),
      method: "distanceAligned",
    };
  } catch {
    const gpsLap = addGpsDistanceToLap(lap);
    return {
      aligned: alignLapToDistanceGrid(gpsLap, distanceStepMeters),
      method: "gpsDistanceAligned",
    };
  }
}

function buildDeltaTraceSummary(trace: ReturnType<typeof buildDeltaTrace>): DeltaTraceSummary {
  if (trace.length === 0) {
    return {
      pointCount: 0,
      maxGainSeconds: 0,
      maxLossSeconds: 0,
      finishDeltaSeconds: 0,
    };
  }

  const deltaValues = trace.map((point) => point.deltaSeconds);

  return {
    pointCount: trace.length,
    maxGainSeconds: round(Math.min(...deltaValues)),
    maxLossSeconds: round(Math.max(...deltaValues)),
    finishDeltaSeconds: round(trace[trace.length - 1].deltaSeconds),
  };
}

/**
 * Recreates deterministic fixed-distance splits and the cumulative delta trace.
 *
 * subjectLap is usually the faster lap, referenceLap is usually the comparison lap.
 * Split delta sign is Race Studio style: subject split time - reference split time.
 * Negative means the subject lap was faster through that fixed-distance sector.
 */
export function buildFixedDistanceSplitAnalysis(
  subjectLap: LapData,
  referenceLap: LapData,
  options: SplitAnalysisOptions = {}
): SplitAnalysisResult {
  const requestedSectorCount = options.sectorCount ?? 10;
  const distanceStepMeters = options.distanceStepMeters ?? analysisConfig.distanceStepMeters;

  const subject = alignForValidation(subjectLap, distanceStepMeters);
  const reference = alignForValidation(referenceLap, distanceStepMeters);

  const trackLengthMeters = Math.min(
    getTrackLength(subject.aligned),
    getTrackLength(reference.aligned)
  );

  if (!Number.isFinite(trackLengthMeters) || trackLengthMeters <= 0) {
    throw new Error("Unable to build fixed-distance splits because track length could not be determined.");
  }

  const sectorBoundariesMeters = options.sectorBoundariesMeters?.length
    ? options.sectorBoundariesMeters
        .filter((distance) => Number.isFinite(distance))
        .map((distance) => Math.max(0, Math.min(distance, trackLengthMeters)))
        .sort((a, b) => a - b)
    : Array.from({ length: requestedSectorCount + 1 }, (_, index) =>
        (trackLengthMeters / requestedSectorCount) * index
      );

  if (sectorBoundariesMeters[0] !== 0) {
    sectorBoundariesMeters.unshift(0);
  }

  const lastBoundary = sectorBoundariesMeters[sectorBoundariesMeters.length - 1];
  if (lastBoundary < trackLengthMeters) {
    sectorBoundariesMeters.push(trackLengthMeters);
  }

  const splits: ValidationSplit[] = [];

  for (let index = 0; index < sectorBoundariesMeters.length - 1; index++) {
    const startDistanceMeters = sectorBoundariesMeters[index];
    const endDistanceMeters = sectorBoundariesMeters[index + 1];

    const subjectStart = getTimeAtDistance(subject.aligned, startDistanceMeters);
    const subjectEnd = getTimeAtDistance(subject.aligned, endDistanceMeters);
    const referenceStart = getTimeAtDistance(reference.aligned, startDistanceMeters);
    const referenceEnd = getTimeAtDistance(reference.aligned, endDistanceMeters);

    const subjectTimeSeconds = subjectEnd - subjectStart;
    const referenceTimeSeconds = referenceEnd - referenceStart;
    const deltaSeconds = subjectTimeSeconds - referenceTimeSeconds;

    splits.push({
      zoneNumber: index + 1,
      startDistanceMeters: round(startDistanceMeters, 1),
      endDistanceMeters: round(endDistanceMeters, 1),
      subjectTimeSeconds: round(subjectTimeSeconds),
      referenceTimeSeconds: round(referenceTimeSeconds),
      deltaSeconds: round(deltaSeconds),
      impactType: deltaSeconds < 0 ? "gain" : deltaSeconds > 0 ? "loss" : "neutral",
    });
  }

  const deltaTrace = buildDeltaTrace(subject.aligned, reference.aligned);
  const subjectLapTimeSeconds = getLapTimeSeconds(subjectLap);
  const referenceLapTimeSeconds = getLapTimeSeconds(referenceLap);
  const lapDeltaSeconds = subjectLapTimeSeconds - referenceLapTimeSeconds;
  const reconstructedFinishDeltaSeconds = deltaTrace.length > 0
    ? -deltaTrace[deltaTrace.length - 1].deltaSeconds
    : null;

  const finishDeltaErrorSeconds = reconstructedFinishDeltaSeconds === null
    ? null
    : reconstructedFinishDeltaSeconds - lapDeltaSeconds;

  return {
    method: subject.method === reference.method ? subject.method : `${subject.method}/${reference.method}`,
    comparisonMode: options.comparisonMode ?? "fastest_vs_second",
    subjectLapNumber: subjectLap.lapNumber,
    referenceLapNumber: referenceLap.lapNumber,
    subjectLabel: options.subjectLabel ?? `Lap ${subjectLap.lapNumber}`,
    referenceLabel: options.referenceLabel ?? `Lap ${referenceLap.lapNumber}`,
    sectorCount: splits.length,
    distanceStepMeters,
    trackLengthMeters: round(trackLengthMeters, 1),
    subjectLapTimeSeconds: round(subjectLapTimeSeconds),
    referenceLapTimeSeconds: round(referenceLapTimeSeconds),
    lapDeltaSeconds: round(lapDeltaSeconds),
    reconstructedFinishDeltaSeconds: reconstructedFinishDeltaSeconds === null
      ? null
      : round(reconstructedFinishDeltaSeconds),
    finishDeltaErrorSeconds: finishDeltaErrorSeconds === null
      ? null
      : round(finishDeltaErrorSeconds),
    splits,
    deltaTrace,
    deltaTraceSummary: buildDeltaTraceSummary(deltaTrace),
  };
}
