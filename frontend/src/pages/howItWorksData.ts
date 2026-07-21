/**
 * Example data + copy for the "How It Works" narrative. The speed trace and
 * g-circle examples are synthetic but physically plausible, built so they feed
 * the real <SpeedDistanceChart> and <ZoneGPlot> components used in the app.
 *
 * The story they tell (one right-hand corner): the benchmark lap brakes later,
 * trail-brakes into the apex using combined grip, and carries more apex speed;
 * the subject lap brakes early in a straight line and corners off the limit.
 */
import type { GTracePoint, SpeedTracePoint } from "../types/advisoryData";

export const SUBJECT_LAP = 14;
export const REFERENCE_LAP = 11;
export const MAX_G = 1.6;

const easeIn = (t: number) => t * t;
const easeOut = (t: number) => 1 - (1 - t) * (1 - t);

type SpeedParams = {
  entry: number;
  brakePoint: number;
  apexDist: number;
  apexSpeed: number;
  exitSpeed: number;
  exitLen: number;
};

function buildSpeedTrace(p: SpeedParams): SpeedTracePoint[] {
  const pts: SpeedTracePoint[] = [];
  for (let d = 0; d <= 320; d += 4) {
    let s: number;
    if (d <= p.brakePoint) {
      s = p.entry;
    } else if (d <= p.apexDist) {
      const t = (d - p.brakePoint) / (p.apexDist - p.brakePoint);
      s = p.entry + (p.apexSpeed - p.entry) * easeIn(t);
    } else if (d <= p.apexDist + p.exitLen) {
      const t = (d - p.apexDist) / p.exitLen;
      s = p.apexSpeed + (p.exitSpeed - p.apexSpeed) * easeOut(t);
    } else {
      s = p.exitSpeed;
    }
    pts.push({ distanceMeters: d, speedKmh: Math.round(s * 10) / 10 });
  }
  return pts;
}

export const REFERENCE_SPEED = buildSpeedTrace({
  entry: 112,
  brakePoint: 130,
  apexDist: 170,
  apexSpeed: 65,
  exitSpeed: 114,
  exitLen: 140,
});

export const SUBJECT_SPEED = buildSpeedTrace({
  entry: 112,
  brakePoint: 112,
  apexDist: 166,
  apexSpeed: 58,
  exitSpeed: 110,
  exitLen: 150,
});

// Deterministic scatter around a set of key (lateral, longitudinal) g states,
// so the plots look like sampled data rather than a clean line.
function scatter(base: { lat: number; lon: number }[], n = 3): GTracePoint[] {
  const out: GTracePoint[] = [];
  base.forEach((b, i) => {
    for (let k = 0; k < n; k++) {
      const ox = Math.sin(i * 12.9898 + k * 4.233) * 0.05;
      const oy = Math.cos(i * 7.357 + k * 2.91) * 0.05;
      out.push({
        distanceMeters: i * 4 + k,
        lateralG: b.lat + ox,
        longitudinalG: b.lon + oy,
      });
    }
  });
  return out;
}

// Benchmark: a continuous arc from heavy braking (bottom) through trail-braking
// (lower-right) to mid-corner lateral (right) to corner-exit drive (top-right) —
// the grip envelope is used in every phase.
export const REFERENCE_G = scatter([
  { lat: 0.05, lon: -1.52 },
  { lat: 0.3, lon: -1.45 },
  { lat: 0.6, lon: -1.28 },
  { lat: 0.9, lon: -1.02 },
  { lat: 1.15, lon: -0.7 },
  { lat: 1.34, lon: -0.35 },
  { lat: 1.46, lon: 0.0 },
  { lat: 1.5, lon: 0.2 },
  { lat: 1.38, lon: 0.5 },
  { lat: 1.15, lon: 0.8 },
  { lat: 0.85, lon: 1.05 },
  { lat: 0.5, lon: 1.25 },
  { lat: 0.22, lon: 1.36 },
]);

// Subject: braking and cornering happen in separate phases — points hug the
// axes (straight-line braking down the Y axis, then steady-state lateral along
// the X axis), leaving the combined-grip quadrants empty.
export const SUBJECT_G = scatter([
  { lat: 0.02, lon: -1.4 },
  { lat: 0.04, lon: -1.12 },
  { lat: 0.03, lon: -0.82 },
  { lat: 0.05, lon: -0.5 },
  { lat: 0.06, lon: -0.22 },
  { lat: 0.4, lon: -0.04 },
  { lat: 0.72, lon: 0.0 },
  { lat: 1.02, lon: -0.02 },
  { lat: 1.26, lon: 0.0 },
  { lat: 1.34, lon: 0.03 },
  { lat: 0.95, lon: 0.62 },
  { lat: 0.55, lon: 0.98 },
  { lat: 0.22, lon: 1.18 },
]);

export type Stage = { kicker: string; title: string; body: string };

export const STAGE_ONE: Stage = {
  kicker: "Stage 1 · Deterministic",
  title: "First, we extract the facts",
  body:
    "Before any AI is involved, your raw telemetry is turned into clean, physically-grounded features by fixed, reproducible maths — never a model's guess. Laps are aligned on a shared distance grid, the track is split into feature zones, and for every zone we compute speed traces, the friction circle, braking points and entry/apex/exit deltas against your benchmark lap.",
};

export const STAGE_TWO: Stage = {
  kicker: "Stage 2 · AI reasoning",
  title: "Then the AI reads those features",
  body:
    "Only the extracted features reach the AI — never the raw, noisy signal. It reads them the way a race engineer reads a data trace: comparing your lap to the benchmark zone by zone, spotting where time leaks, and explaining why in plain English. Because every statement traces back to a measured feature, the conclusions stay explainable and you can check the chart yourself.",
};

export const EXTRACTED_FEATURES: { title: string; text: string }[] = [
  { title: "Lap alignment", text: "Every lap placed on a shared distance grid via GPS/XY so they compare like-for-like." },
  { title: "Feature zones", text: "The lap is segmented into corners and straights that pinpoint where time is won or lost." },
  { title: "Speed traces", text: "Speed vs distance for your lap and the benchmark — braking points, apex minima, exit drive." },
  { title: "Friction circle", text: "Lateral vs longitudinal g per zone, showing how much of the grip envelope you actually use." },
  { title: "Deltas", text: "Entry, apex and exit speed, braking and drive differences measured against your reference lap." },
];

export type Finding = {
  title: string;
  gain: string;
  evidence: string;
  recommendation: string;
};

export const FINDINGS: Finding[] = [
  {
    title: "Braking 18 m too early",
    gain: "≈ 0.10 s",
    evidence:
      "Your speed trace starts dropping at ~112 m while the benchmark stays flat to ~130 m, yet both still make the apex.",
    recommendation:
      "Move your brake marker ~15 m later. The grip is there — you're simply giving up the end of the straight.",
  },
  {
    title: "Braking and steering in separate phases",
    gain: "≈ 0.12 s",
    evidence:
      "On the g-circle your points hug the axes — straight-line braking, then steady-state cornering. The benchmark fills the lower-right quadrant: it's trail-braking.",
    recommendation:
      "Bleed the brake off as you turn in. Blending the two keeps the platform loaded and lets you carry more entry speed.",
  },
  {
    title: "7 km/h slower at the apex",
    gain: "≈ 0.15 s",
    evidence:
      "Apex minimum speed is 58 km/h vs the benchmark's 65 km/h, and your exit trace stays below it all the way onto the next straight.",
    recommendation:
      "The earlier, lighter brake release carries that mid-corner speed — and it compounds down the straight that follows.",
  },
];
