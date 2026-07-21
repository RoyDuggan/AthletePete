import { LapData, TelemetrySample } from "../types/telemetry";
import { latLonToLocalXY } from "../utils/gpsProjection";

function distanceBetween(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

function hasLatLon(sample: TelemetrySample): boolean {
  return sample.latitude !== undefined && sample.longitude !== undefined;
}

function hasXY(sample: TelemetrySample): boolean {
  return sample.gpsX !== undefined && sample.gpsY !== undefined;
}

/**
 * Projects each sample's latitude/longitude to lap-relative X/Y metres
 * (`gpsX`/`gpsY`) WITHOUT touching the distance channel. Used so the delta trace
 * carries the coordinates the track minimap needs while the alignment still runs
 * on the lap's own distance basis (keeping the delta panel in step with the
 * speed traces and zones). Samples that already have X/Y, or lack lat/lon — and
 * laps with no GPS at all — are returned unchanged.
 */
export function addGpsCoordsToLap(lap: LapData): LapData {
  const firstLatLon = lap.samples.find(hasLatLon);
  const originLatitude = firstLatLon?.latitude;
  const originLongitude = firstLatLon?.longitude;

  if (originLatitude === undefined || originLongitude === undefined) {
    return lap;
  }

  const samples: TelemetrySample[] = lap.samples.map((sample) => {
    if (
      hasXY(sample) ||
      sample.latitude === undefined ||
      sample.longitude === undefined
    ) {
      return sample;
    }

    const xy = latLonToLocalXY(
      sample.latitude,
      sample.longitude,
      originLatitude,
      originLongitude
    );

    return { ...sample, gpsX: xy.x, gpsY: xy.y };
  });

  return { ...lap, samples };
}

/**
 * Converts GPS lat/lon or pre-existing X/Y samples into lap-relative cumulative distance.
 *
 * This is deliberately simple for the MVP validation phase. The next refinement is to project
 * each sample onto a shared reference racing line rather than using each lap's own cumulative path.
 */
export function addGpsDistanceToLap(lap: LapData): LapData {
  const firstLatLon = lap.samples.find(hasLatLon);
  const firstXY = lap.samples.find(hasXY);

  if (!firstLatLon && !firstXY) {
    throw new Error(`Lap ${lap.lapNumber} has no GPS/X-Y data.`);
  }

  const originLatitude = firstLatLon?.latitude;
  const originLongitude = firstLatLon?.longitude;

  let cumulativeDistance = 0;
  let previousX: number | undefined;
  let previousY: number | undefined;

  const gpsSamples: TelemetrySample[] = lap.samples.map((sample) => {
    let x = sample.gpsX;
    let y = sample.gpsY;

    if (
        (x === undefined || y === undefined) &&
        sample.latitude !== undefined &&
        sample.longitude !== undefined &&
        originLatitude !== undefined &&
        originLongitude !== undefined
    ) {
      const xy = latLonToLocalXY(
          sample.latitude,
          sample.longitude,
          originLatitude,
          originLongitude
      );

      x = xy.x;
      y = xy.y;
    }

    if (x === undefined || y === undefined) {
      return sample;
    }

    if (previousX !== undefined && previousY !== undefined) {
      cumulativeDistance += distanceBetween(previousX, previousY, x, y);
    }

    previousX = x;
    previousY = y;

    return {
      ...sample,
      gpsX: x,
      gpsY: y,
      distanceMeters: cumulativeDistance,
      distance: cumulativeDistance,
    };
  });

  return {
    ...lap,
    samples: gpsSamples,
  };
}
