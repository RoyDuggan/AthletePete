/**
 * Read-only telemetry channel accessors for the fingerprint engine.
 *
 * These mirror the extraction conventions already used across the app
 * (advisoryBuilder / lapFeatureZones) but are kept local so this module is a
 * self-contained, replaceable dependency per the spec. They only READ samples;
 * they never mutate telemetry.
 */

export function finite(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function getTime(sample: any): number | null {
  return finite(sample?.time) ?? finite(sample?.Time);
}

export function getSpeedKmh(sample: any): number | null {
  return finite(sample?.speedKmh) ?? finite(sample?.speed) ?? finite(sample?.Speed);
}

export function getDistanceMeters(sample: any): number | null {
  return (
    finite(sample?.distanceMeters) ??
    finite(sample?.distance) ??
    finite(sample?.Distance)
  );
}

/** Lateral acceleration in g, preferring the GPS vehicle-frame channel. */
export function getLateralG(sample: any): number | null {
  return (
    finite(sample?.latAccG) ??
    finite(sample?.AccelerometerY) ??
    finite(sample?.accelerometerY)
  );
}

/** Longitudinal acceleration in g, preferring the GPS vehicle-frame channel. */
export function getLongitudinalG(sample: any): number | null {
  return (
    finite(sample?.lonAccG) ??
    finite(sample?.AccelerometerX) ??
    finite(sample?.accelerometerX)
  );
}

/**
 * Longitudinal g derived from the speed gradient, used when no measured
 * longitudinal channel is present. Sign is preserved (positive = accelerating).
 */
export function deriveLongitudinalGFromSpeed(
  samples: any[],
  i: number
): number | null {
  const j = i > 0 ? i - 1 : i + 1;
  if (j < 0 || j >= samples.length) return null;

  const speedI = getSpeedKmh(samples[i]);
  const speedJ = getSpeedKmh(samples[j]);
  const timeI = getTime(samples[i]);
  const timeJ = getTime(samples[j]);

  if (speedI === null || speedJ === null || timeI === null || timeJ === null) {
    return null;
  }

  const dt = timeI - timeJ;
  if (dt === 0) return null;

  const accelMs2 = (speedI - speedJ) / 3.6 / dt;
  return accelMs2 / 9.81;
}

/**
 * Longitudinal g at index i: the measured channel when available, otherwise the
 * speed-gradient fallback. The `derived` flag lets callers dock confidence when
 * the value is inferred rather than measured.
 */
export function longitudinalGAt(
  samples: any[],
  i: number
): { value: number | null; derived: boolean } {
  const measured = getLongitudinalG(samples[i]);
  if (measured !== null) return { value: measured, derived: false };
  return { value: deriveLongitudinalGFromSpeed(samples, i), derived: true };
}

/** Combined (vector-magnitude) g from lateral and longitudinal components. */
export function combinedG(lateralG: number | null, longitudinalG: number | null): number {
  const lat = lateralG ?? 0;
  const lon = longitudinalG ?? 0;
  return Math.sqrt(lat * lat + lon * lon);
}

/** Clamp a value into [min, max]. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Percentile (0–1) of a numeric array via linear interpolation. */
export function percentile(values: number[], p: number): number {
  const clean = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (clean.length === 0) return 0;
  if (clean.length === 1) return clean[0];

  const rank = clamp(p, 0, 1) * (clean.length - 1);
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  if (lo === hi) return clean[lo];

  const frac = rank - lo;
  return clean[lo] * (1 - frac) + clean[hi] * frac;
}

export function mean(values: number[]): number {
  const clean = values.filter((v) => Number.isFinite(v));
  if (clean.length === 0) return 0;
  return clean.reduce((sum, v) => sum + v, 0) / clean.length;
}

export function median(values: number[]): number {
  return percentile(values, 0.5);
}

export function stdDev(values: number[]): number {
  const clean = values.filter((v) => Number.isFinite(v));
  if (clean.length < 2) return 0;
  const m = mean(clean);
  const variance =
    clean.reduce((sum, v) => sum + (v - m) * (v - m), 0) / clean.length;
  return Math.sqrt(variance);
}

export function round(value: number, digits = 2): number {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}
