/**
 * Corner library: turns the existing feature-zone detection into canonical
 * corner definitions (windows), then extracts how each corner was executed on
 * every lap. Consumes buildFeatureZones read-only — corner LOCATIONS come from
 * the existing engine; this module only tiles them into windows and windows the
 * samples.
 */
import type { Lap } from "../lapDetector";
import { buildFeatureZones } from "../lapFeatureZones";
import type {
  CornerDefinition,
  GPoint,
  SpeedPoint,
  TrackPoint,
} from "../../types/fingerprint";
import { latLonToLocalXY } from "../../utils/gpsProjection";
import {
  finite,
  getDistanceMeters,
  getSpeedKmh,
  getTime,
  getLateralG,
  longitudinalGAt,
  round,
} from "./channels";

/** Assumed braking distance ahead of a corner's apex, used to place zone edges. */
const BRAKING_LEAD_METERS = 40;

/**
 * Builds canonical corners from the existing feature-zone centres, tiling the
 * midpoints between adjacent centres so each corner is a contiguous window. The
 * fastest lap anchors detection; all flying laps form the consensus basis.
 */
export function buildCornerDefinitions(
  fastestLap: Lap,
  secondLap: Lap,
  basisLaps: Lap[]
): CornerDefinition[] {
  const zones = buildFeatureZones(fastestLap, secondLap, basisLaps);

  // Sort zones by centre while keeping each zone's selection basis attached, so
  // corners carry through *why* their zone was selected.
  const sorted = zones
    .filter((z) => Number.isFinite(z.centerDistanceMeters))
    .sort((a, b) => a.centerDistanceMeters - b.centerDistanceMeters);

  if (sorted.length === 0) return [];

  const centres = sorted.map((z) => z.centerDistanceMeters);
  const lapLength = lapDistanceSpan(fastestLap) ?? centres[centres.length - 1] + 40;

  // Each corner "zone" runs from its own braking point through the apex, exit
  // and the FOLLOWING STRAIGHT, up to the next corner's braking point — so the
  // zones tile the whole lap [0 … lapLength] with no gaps. The boundary before a
  // corner sits ~BRAKING_LEAD_METERS ahead of its centre (falling back to the
  // midpoint when two corners are closer than that), which keeps every apex
  // safely inside its own window.
  const boundaryBefore = (i: number): number => {
    const centre = centres[i];
    const prev = centres[i - 1];
    if (prev === undefined) return 0; // first corner reaches the lap start
    const lead = Math.min(BRAKING_LEAD_METERS, (centre - prev) / 2);
    return centre - lead;
  };

  return sorted.map((zone, i) => {
    const start = boundaryBefore(i);
    const end = i === sorted.length - 1 ? lapLength : boundaryBefore(i + 1);

    return {
      cornerNumber: i + 1,
      startDistanceMeters: round(start, 2),
      centerDistanceMeters: round(centres[i], 2),
      endDistanceMeters: round(end, 2),
      selectionBasis: zone.selectionBasis,
    };
  });
}

/**
 * Builds corner definitions from a user-defined zone map. The boundary list
 * partitions the lap into contiguous zones tiling [0 … lapLength]; `n`
 * boundaries yield `n + 1` corners, each a corner-plus-following-straight
 * sector. Apex/entry/exit are still detected per lap from the windowed samples,
 * so the centre here is simply the zone midpoint and no auto-detection basis
 * applies.
 */
export function buildCornerDefinitionsFromBoundaries(
  fastestLap: Lap,
  boundaries: number[]
): CornerDefinition[] {
  const lapLength =
    lapDistanceSpan(fastestLap) ??
    (boundaries.length ? Math.max(...boundaries) + 40 : 1000);

  const interior = boundaries
    .filter((b) => Number.isFinite(b) && b > 0 && b < lapLength)
    .sort((a, b) => a - b);

  const edges = [0, ...interior, lapLength];
  const defs: CornerDefinition[] = [];

  for (let i = 0; i < edges.length - 1; i++) {
    const start = edges[i];
    const end = edges[i + 1];
    if (end - start < 1) continue; // skip degenerate slivers

    defs.push({
      cornerNumber: defs.length + 1,
      startDistanceMeters: round(start, 2),
      centerDistanceMeters: round((start + end) / 2, 2),
      endDistanceMeters: round(end, 2),
    });
  }

  return defs;
}

/**
 * Builds a GPS track outline from a lap: lap-relative distance paired with a
 * local X/Y position (using the pre-projected gpsX/gpsY channels, or projecting
 * lat/lon relative to the first fixed sample). Evenly downsampled to keep the
 * payload small. Returns [] when the lap has no positional data.
 */
export function buildTrackOutline(lap: Lap, maxPoints = 400): TrackPoint[] {
  const samples = (lap.samples ?? []) as any[];
  if (samples.length < 2) return [];

  const lapStartDistance = getDistanceMeters(samples[0]) ?? 0;

  // Origin for lat/lon projection = first sample carrying a fix.
  const origin = samples.find(
    (s) => finite(s?.latitude) !== null && finite(s?.longitude) !== null
  );
  const originLat = origin ? finite(origin.latitude) : null;
  const originLon = origin ? finite(origin.longitude) : null;

  const points: TrackPoint[] = [];
  for (const s of samples) {
    const dist = getDistanceMeters(s);
    if (dist === null) continue;

    let x = finite(s?.gpsX);
    let y = finite(s?.gpsY);
    if ((x === null || y === null) && originLat !== null && originLon !== null) {
      const lat = finite(s?.latitude);
      const lon = finite(s?.longitude);
      if (lat !== null && lon !== null) {
        const xy = latLonToLocalXY(lat, lon, originLat, originLon);
        x = xy.x;
        y = xy.y;
      }
    }
    if (x === null || y === null) continue;

    points.push({
      distanceMeters: round(dist - lapStartDistance, 2),
      x: round(x, 2),
      y: round(y, 2),
    });
  }

  if (points.length <= maxPoints) return points;

  // Even downsample, always keeping the last point so the outline closes.
  const step = points.length / maxPoints;
  const out: TrackPoint[] = [];
  for (let i = 0; i < maxPoints; i++) out.push(points[Math.floor(i * step)]);
  const last = points[points.length - 1];
  if (out[out.length - 1] !== last) out.push(last);
  return out;
}

/** Distance covered within a lap (last - first sample distance). */
function lapDistanceSpan(lap: Lap): number | null {
  const samples = lap.samples ?? [];
  if (samples.length < 2) return null;
  const first = getDistanceMeters(samples[0]);
  const last = getDistanceMeters(samples[samples.length - 1]);
  if (first === null || last === null) return null;
  const span = last - first;
  return span > 0 ? span : null;
}

/** A windowed slice of a lap covering one corner, with per-sample channels ready. */
export type CornerWindow = {
  cornerNumber: number;
  /** Samples within the corner window, in order. */
  indices: number[];
  /** Lap-relative distance (m) per windowed sample. */
  distance: number[];
  /** Lap-relative time (s) per windowed sample. */
  time: number[];
  speedKmh: (number | null)[];
  lateralG: (number | null)[];
  longitudinalG: (number | null)[];
  /** True where longitudinal g was derived from speed rather than measured. */
  longitudinalDerived: boolean[];
};

/**
 * Slices a lap to a corner's distance window and pre-reads every channel used
 * downstream. Distances/times are lap-relative so corners line up across laps.
 */
export function windowCorner(lap: Lap, corner: CornerDefinition): CornerWindow {
  const samples = lap.samples ?? [];
  const lapStartDistance = getDistanceMeters(samples[0]) ?? 0;
  const lapStartTime = getTime(samples[0]) ?? 0;

  const window: CornerWindow = {
    cornerNumber: corner.cornerNumber,
    indices: [],
    distance: [],
    time: [],
    speedKmh: [],
    lateralG: [],
    longitudinalG: [],
    longitudinalDerived: [],
  };

  for (let i = 0; i < samples.length; i++) {
    const dist = getDistanceMeters(samples[i]);
    if (dist === null) continue;

    const rel = dist - lapStartDistance;
    if (rel < corner.startDistanceMeters || rel > corner.endDistanceMeters) continue;

    const t = getTime(samples[i]);
    const lon = longitudinalGAt(samples, i);

    window.indices.push(i);
    window.distance.push(round(rel, 2));
    window.time.push(t !== null ? round(t - lapStartTime, 3) : window.time[window.time.length - 1] ?? 0);
    window.speedKmh.push(getSpeedKmh(samples[i]));
    window.lateralG.push(getLateralG(samples[i]));
    window.longitudinalG.push(lon.value);
    window.longitudinalDerived.push(lon.derived);
  }

  return window;
}

/** Index (within the window) of the minimum-speed sample — the apex. */
export function apexIndex(window: CornerWindow): number {
  let idx = 0;
  let min = Infinity;
  window.speedKmh.forEach((s, i) => {
    if (s !== null && s > 0 && s < min) {
      min = s;
      idx = i;
    }
  });
  return idx;
}

/** Entry / apex / exit speeds (km/h) for a corner window. */
export function cornerSpeeds(window: CornerWindow): {
  entry: number | null;
  apex: number | null;
  exit: number | null;
} {
  const speeds = window.speedKmh;
  if (speeds.length === 0) return { entry: null, apex: null, exit: null };

  const firstValid = speeds.find((s) => s !== null) ?? null;
  const lastValid = [...speeds].reverse().find((s) => s !== null) ?? null;
  const apex = window.speedKmh[apexIndex(window)] ?? null;

  return { entry: firstValid, apex, exit: lastValid };
}

/** Section time (s) spent in the corner window. */
export function cornerSectionTime(window: CornerWindow): number | null {
  if (window.time.length < 2) return null;
  const t = window.time[window.time.length - 1] - window.time[0];
  return t > 0 ? round(t, 3) : null;
}

/** Friction-circle points for the corner window. */
export function cornerGTrace(window: CornerWindow): GPoint[] {
  const points: GPoint[] = [];
  window.indices.forEach((_, k) => {
    const lat = window.lateralG[k];
    const lon = window.longitudinalG[k];
    if (lat === null && lon === null) return;
    points.push({
      distanceMeters: window.distance[k],
      lateralG: round(lat ?? 0, 3),
      longitudinalG: round(lon ?? 0, 3),
    });
  });
  return points;
}

/** Speed-vs-distance points for the corner window. */
export function cornerSpeedTrace(window: CornerWindow): SpeedPoint[] {
  const points: SpeedPoint[] = [];
  window.indices.forEach((_, k) => {
    const speed = window.speedKmh[k];
    if (speed === null) return;
    points.push({ distanceMeters: window.distance[k], speedKmh: round(speed, 2) });
  });
  return points;
}
