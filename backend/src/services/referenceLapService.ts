import type { LapData } from "../types/telemetry";
import type { LapComparisonMode } from "../types/advisoryData";

export type LapSelectionRequest = {
  mode: LapComparisonMode;
  subjectLapNumber?: number;
  referenceLapNumber?: number;
  bestLapCount?: number;
};

export type LapSelectionResult = {
  mode: LapComparisonMode;
  subjectLap: LapData | null;
  referenceLap: LapData | null;
  referenceLapNumbers: number[];
  label: string;
};

function getLapTime(lap: LapData): number {
  return Number((lap as any).lapTime ?? (lap as any).durationSeconds ?? Number.POSITIVE_INFINITY);
}

export function selectFastestVsSecond(laps: LapData[]): LapSelectionResult {
  const validLaps = laps
    .filter((lap: any) => lap.isValidFlyingLap !== false)
    .sort((a, b) => getLapTime(a) - getLapTime(b));

  return {
    mode: "fastest_vs_second",
    subjectLap: validLaps[0] ?? null,
    referenceLap: validLaps[1] ?? null,
    referenceLapNumbers: validLaps[1] ? [validLaps[1].lapNumber] : [],
    label: "Fastest lap vs second fastest lap",
  };
}

export function selectUserSpecifiedLaps(
  laps: LapData[],
  subjectLapNumber: number,
  referenceLapNumber: number
): LapSelectionResult {
  return {
    mode: "user_selected",
    subjectLap: laps.find((lap) => lap.lapNumber === subjectLapNumber) ?? null,
    referenceLap: laps.find((lap) => lap.lapNumber === referenceLapNumber) ?? null,
    referenceLapNumbers: [referenceLapNumber],
    label: `Lap ${subjectLapNumber} vs Lap ${referenceLapNumber}`,
  };
}

/**
 * Future hook: this intentionally returns lap numbers only for now.
 * The synthetic average reference profile should be built after all candidate laps
 * are resampled onto the same fixed-distance grid.
 */
export function selectBestLapAverageCandidates(
  laps: LapData[],
  bestLapCount = 2
): LapSelectionResult {
  const validLaps = laps
    .filter((lap: any) => lap.isValidFlyingLap !== false)
    .sort((a, b) => getLapTime(a) - getLapTime(b));

  const referenceLapNumbers = validLaps.slice(0, bestLapCount).map((lap) => lap.lapNumber);

  return {
    mode: "lap_vs_best_average",
    subjectLap: null,
    referenceLap: null,
    referenceLapNumbers,
    label: `Normalised average of best ${referenceLapNumbers.length} laps`,
  };
}
