import { DeltaTracePoint, LapData } from "../types/telemetry";

export type AlignedPoint = {
  distanceMeters: number;
  sourceDistanceMeters: number;
  time: number;
  speedKmh: number;
  rpm?: number;
  gpsX?: number;
  gpsY?: number;
};

function getDistanceMeters(sample: any): number | undefined {
  if (sample.distanceMeters !== undefined && sample.distanceMeters !== null) {
    return Number(sample.distanceMeters);
  }

  if (sample.distance !== undefined && sample.distance !== null) {
    return Number(sample.distance);
  }

  return undefined;
}

function interpolate(
    x: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number
): number {
  if (x2 === x1) {
    return y1;
  }

  const ratio = (x - x1) / (x2 - x1);
  return y1 + ratio * (y2 - y1);
}

function optionalInterpolate(
    x: number,
    x1: number,
    y1: number | undefined,
    x2: number,
    y2: number | undefined
): number | undefined {
  if (y1 === undefined || y2 === undefined) return undefined;
  return interpolate(x, x1, y1, x2, y2);
}

/**
 * Align one lap onto a lap-relative distance grid.
 *
 * Important: existing AiM distance channels are often absolute session distance.
 * This function subtracts the first sample distance so that all aligned laps start at 0m.
 */
export function alignLapToDistanceGrid(
    lap: LapData,
    distanceStepMeters: number
): AlignedPoint[] {
  const samples = lap.samples
      .filter((s: any) => {
        const d = getDistanceMeters(s);
        return d !== undefined && Number.isFinite(d);
      })
      .sort(
          (a: any, b: any) =>
              (getDistanceMeters(a) ?? 0) - (getDistanceMeters(b) ?? 0)
      );

  if (samples.length < 2) {
    throw new Error(`Lap ${lap.lapNumber} has insufficient distance data.`);
  }

  const firstRawDistance = getDistanceMeters(samples[0]) ?? 0;
  const lastRawDistance = getDistanceMeters(samples[samples.length - 1]) ?? 0;
  const lapLengthMeters = lastRawDistance - firstRawDistance;

  if (!Number.isFinite(lapLengthMeters) || lapLengthMeters <= 0) {
    throw new Error(`Lap ${lap.lapNumber} has invalid distance range.`);
  }

  const aligned: AlignedPoint[] = [];
  let sampleIndex = 0;

  for (let relativeDistance = 0; relativeDistance <= lapLengthMeters; relativeDistance += distanceStepMeters) {
    const targetRawDistance = firstRawDistance + relativeDistance;

    while (
        sampleIndex < samples.length - 2 &&
        (getDistanceMeters(samples[sampleIndex + 1]) ?? 0) < targetRawDistance
        ) {
      sampleIndex++;
    }

    const s1: any = samples[sampleIndex];
    const s2: any = samples[sampleIndex + 1];

    const d1 = getDistanceMeters(s1);
    const d2 = getDistanceMeters(s2);

    if (d1 === undefined || d2 === undefined) {
      continue;
    }

    const s1Speed = s1.speedKmh ?? s1.speed ?? 0;
    const s2Speed = s2.speedKmh ?? s2.speed ?? 0;

    aligned.push({
      distanceMeters: relativeDistance,
      sourceDistanceMeters: targetRawDistance,
      time: interpolate(targetRawDistance, d1, s1.time, d2, s2.time),
      speedKmh: interpolate(targetRawDistance, d1, s1Speed, d2, s2Speed),
      rpm:
          s1.rpm !== undefined && s2.rpm !== undefined
              ? interpolate(targetRawDistance, d1, s1.rpm, d2, s2.rpm)
              : undefined,
      gpsX: optionalInterpolate(targetRawDistance, d1, s1.gpsX, d2, s2.gpsX),
      gpsY: optionalInterpolate(targetRawDistance, d1, s1.gpsY, d2, s2.gpsY),
    });
  }

  return aligned;
}

export function getTimeAtDistance(
    aligned: AlignedPoint[],
    distanceMeters: number
): number {
  if (aligned.length === 0) {
    throw new Error("Cannot get time at distance from empty aligned lap.");
  }

  if (distanceMeters <= aligned[0].distanceMeters) {
    return aligned[0].time;
  }

  const last = aligned[aligned.length - 1];
  if (distanceMeters >= last.distanceMeters) {
    return last.time;
  }

  const nextIndex = aligned.findIndex(
      (point) => point.distanceMeters >= distanceMeters
  );

  if (nextIndex <= 0) {
    return aligned[0].time;
  }

  const previous = aligned[nextIndex - 1];
  const next = aligned[nextIndex];

  return interpolate(
      distanceMeters,
      previous.distanceMeters,
      previous.time,
      next.distanceMeters,
      next.time
  );
}

export function buildDeltaTrace(
    fastestAligned: AlignedPoint[],
    comparisonAligned: AlignedPoint[]
): DeltaTracePoint[] {
  const maxPoints = Math.min(fastestAligned.length, comparisonAligned.length);
  const trace: DeltaTracePoint[] = [];

  if (maxPoints === 0) return trace;

  const rawStartDelta = comparisonAligned[0].time - fastestAligned[0].time;

  for (let i = 0; i < maxPoints; i++) {
    const fastest = fastestAligned[i];
    const comparison = comparisonAligned[i];
    const rawDeltaSeconds = comparison.time - fastest.time;

    const hasSpatialPair =
        fastest.gpsX !== undefined &&
        fastest.gpsY !== undefined &&
        comparison.gpsX !== undefined &&
        comparison.gpsY !== undefined;

    const spatialSeparationMeters = hasSpatialPair
        ? Math.sqrt(
            Math.pow((comparison.gpsX ?? 0) - (fastest.gpsX ?? 0), 2) +
            Math.pow((comparison.gpsY ?? 0) - (fastest.gpsY ?? 0), 2)
        )
        : undefined;

    trace.push({
      distanceMeters: fastest.distanceMeters,
      fastestTime: fastest.time,
      comparisonTime: comparison.time,
      rawDeltaSeconds,
      deltaSeconds: rawDeltaSeconds - rawStartDelta,
      fastestX: fastest.gpsX,
      fastestY: fastest.gpsY,
      comparisonX: comparison.gpsX,
      comparisonY: comparison.gpsY,
      spatialSeparationMeters,
    });
  }

  return trace;
}

export function getDeltaAtDistance(
    trace: DeltaTracePoint[],
    distanceMeters: number
): number {
  if (trace.length === 0) {
    throw new Error("Cannot get delta at distance from empty delta trace.");
  }

  const nearest = trace.reduce((best, point) =>
      Math.abs(point.distanceMeters - distanceMeters) <
      Math.abs(best.distanceMeters - distanceMeters)
          ? point
          : best
  );

  return nearest.deltaSeconds;
}
