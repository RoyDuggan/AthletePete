/**
 * Orchestration for the Corner Selection & Fingerprint engine.
 *
 * Loads the requested sessions (read-only), derives canonical corners, then
 * runs every corner of every lap through the grip-utilisation, fingerprint,
 * anomaly and attack-probability engines, and composes a default reference lap.
 * The sensitivity slider is applied client-side, so the full library (with
 * attack scores + anomaly flags) is returned in one deterministic payload.
 */
import fs from "fs";
import path from "path";

import { parseAimCsv } from "../aimCsvParser";
import { detectLapsFromBeacons, type Lap } from "../lapDetector";
import { userOwnsSession } from "../sessionStore";
import { getZoneMap } from "../zoneMapStore";
import type {
  CornerDefinition,
  CornerExecution,
  FingerprintLap,
  FingerprintResult,
  FingerprintSession,
} from "../../types/fingerprint";

import {
  buildCornerDefinitions,
  buildCornerDefinitionsFromBoundaries,
  buildTrackOutline,
  windowCorner,
  cornerSpeeds,
  cornerSectionTime,
  cornerGTrace,
  cornerSpeedTrace,
  type CornerWindow,
} from "./cornerLibrary";
import {
  estimateCornerGrip,
  windowCombinedG,
  buildGripTimeline,
  deriveTimelineMetrics,
} from "./gripUtilisation";
import { buildFingerprint } from "./cornerFingerprint";
import { detectAnomalies } from "./anomalyDetection";
import { computeAttackScore, DEFAULT_ATTACK_WEIGHTS } from "./attackProbability";
import {
  buildCornerStats,
  consistencyScore,
  type StatInput,
} from "./cornerStats";
import { buildReferenceLap } from "./referenceBuilder";
import { round } from "./channels";

const UPLOADS_DIR = path.join(__dirname, "../../../uploads");
const DEFAULT_SENSITIVITY = 55;

type LoadedSession = {
  sessionId: string;
  sessionNumber: number;
  label: string;
  reference: string | null;
  laps: Lap[];
};

/** Loads + parses one owned session file; null if missing/unreadable. */
function loadSession(
  sessionId: string,
  sessionNumber: number
): LoadedSession | null {
  const safeName = path.basename(sessionId);
  const filePath = path.join(UPLOADS_DIR, safeName);
  if (!fs.existsSync(filePath)) return null;

  try {
    const parsed = parseAimCsv(fs.readFileSync(filePath, "utf-8"));
    const laps = detectLapsFromBeacons(parsed.samples, parsed.beaconMarkers);
    return {
      sessionId: safeName,
      sessionNumber,
      label: `S${sessionNumber}`,
      reference: parsed.reference?.trim() || null,
      laps,
    };
  } catch {
    return null;
  }
}

/**
 * Laps eligible for corner analysis. Out laps (leaving the pits) and in laps
 * (returning to the pits) are excluded: they carry cold tyres, pit-lane speed
 * limits and partial telemetry, so their corner executions are not
 * representative and would pollute the matrix and reference builder.
 */
function analysableLaps(session: LoadedSession): Lap[] {
  return session.laps.filter(
    (lap) => lap.lapType !== "out_lap" && lap.lapType !== "in_lap"
  );
}

/** The fastest and second-fastest valid flying laps across every loaded session. */
function pickAnchorLaps(sessions: LoadedSession[]): {
  fastest: Lap | null;
  second: Lap | null;
  basis: Lap[];
} {
  const flying = sessions.flatMap((s) => s.laps.filter((l) => l.isValidFlyingLap));
  const sorted = [...flying].sort((a, b) => a.lapTime - b.lapTime);
  return {
    fastest: sorted[0] ?? null,
    second: sorted[1] ?? sorted[0] ?? null,
    basis: flying,
  };
}

/** Pre-computed per (lap, corner) window and headline metrics (pass A). */
type PendingExecution = {
  session: LoadedSession;
  lap: Lap;
  cornerNumber: number;
  window: CornerWindow;
  entrySpeedKmh: number | null;
  apexSpeedKmh: number | null;
  exitSpeedKmh: number | null;
  sectionTimeSeconds: number | null;
  lapLabel: string;
};

/** Optional zone-selection overrides (mirrors the telemetry analyser). */
export type FingerprintOptions = {
  /** "custom" to use a saved zone map; anything else auto-detects corners. */
  zoneBasis?: string;
  /** Which saved zone map to use when zoneBasis is "custom". */
  customZoneMapId?: string | null;
};

/**
 * Computes the complete fingerprint library for the given owned sessions.
 * Throws with a user-facing message when there isn't enough data.
 */
export async function computeFingerprint(
  userId: string,
  sessionIds: string[],
  options: FingerprintOptions = {}
): Promise<FingerprintResult> {
  const warnings: string[] = [];

  // Load every owned session.
  const sessions: LoadedSession[] = [];
  for (const id of sessionIds) {
    const safe = path.basename(id);
    if (!(await userOwnsSession(userId, safe))) continue;
    const loaded = loadSession(safe, sessions.length + 1);
    if (loaded) sessions.push(loaded);
  }

  if (sessions.length === 0) {
    throw new Error("No telemetry found. Please upload or select a session first.");
  }

  const { fastest, second, basis } = pickAnchorLaps(sessions);
  if (!fastest || basis.length === 0) {
    throw new Error(
      "No valid flying laps were found in the selected session(s)."
    );
  }

  // Corner zones come either from a user-defined zone map (same saved markers
  // as the telemetry analyser) or from auto-detection. Either way the zones now
  // tile the whole lap (corner + following straight).
  let corners: CornerDefinition[];
  if (options.zoneBasis === "custom" && options.customZoneMapId) {
    const map = getZoneMap(options.customZoneMapId, userId);
    if (map && map.boundaries.length > 0) {
      corners = buildCornerDefinitionsFromBoundaries(fastest, map.boundaries);
    } else {
      warnings.push(
        "Saved zone map was not found — corners were auto-detected instead."
      );
      corners = buildCornerDefinitions(fastest, second ?? fastest, basis);
    }
  } else {
    corners = buildCornerDefinitions(fastest, second ?? fastest, basis);
  }

  if (corners.length === 0) {
    throw new Error("Could not detect any corners in the selected session(s).");
  }

  // Pass A: window every corner of every lap, gather headline metrics, and pool
  // clean-lap combined-g per corner for grip estimation.
  const pending: PendingExecution[] = [];
  const cleanGByCorner = new Map<number, number[]>();

  for (const session of sessions) {
    for (const lap of analysableLaps(session)) {
      const lapLabel = `${session.label} Lap ${lap.lapNumber}`;
      for (const corner of corners) {
        const window = windowCorner(lap, corner);
        if (window.distance.length === 0) continue;

        const speeds = cornerSpeeds(window);
        pending.push({
          session,
          lap,
          cornerNumber: corner.cornerNumber,
          window,
          entrySpeedKmh: speeds.entry,
          apexSpeedKmh: speeds.apex,
          exitSpeedKmh: speeds.exit,
          sectionTimeSeconds: cornerSectionTime(window),
          lapLabel,
        });

        if (lap.isValidFlyingLap) {
          const pool = cleanGByCorner.get(corner.cornerNumber) ?? [];
          pool.push(...windowCombinedG(window));
          cleanGByCorner.set(corner.cornerNumber, pool);
        }
      }
    }
  }

  // Per-corner available grip (p95 combined-g), with a global fallback.
  const globalGrip = estimateCornerGrip(
    Array.from(cleanGByCorner.values()).flat(),
    50
  );
  const cornerGripG: Record<number, number> = {};
  for (const corner of corners) {
    const grip =
      estimateCornerGrip(cleanGByCorner.get(corner.cornerNumber) ?? []) ??
      globalGrip ??
      1.0;
    cornerGripG[corner.cornerNumber] = round(grip, 3);
  }
  if (globalGrip === null) {
    warnings.push(
      "Grip envelope estimated from limited data — utilisation values are approximate."
    );
  }

  // Pass B1: grip timeline + metrics for every execution; gather stat inputs.
  const timelines = pending.map((p) =>
    buildGripTimeline(p.window, cornerGripG[p.cornerNumber])
  );
  const metricsList = timelines.map((t) => deriveTimelineMetrics(t));

  const statInputs: StatInput[] = pending.map((p, i) => ({
    cornerNumber: p.cornerNumber,
    entrySpeedKmh: p.entrySpeedKmh,
    apexSpeedKmh: p.apexSpeedKmh,
    exitSpeedKmh: p.exitSpeedKmh,
    sectionTimeSeconds: p.sectionTimeSeconds,
    utilisationIntegral: metricsList[i].utilisationIntegral,
  }));
  const cornerStats = buildCornerStats(statInputs);

  // Pass B2: fingerprint, anomalies and attack score per execution.
  const executions: CornerExecution[] = pending.map((p, i) => {
    const timeline = timelines[i];
    const metrics = metricsList[i];
    const stat = cornerStats.get(p.cornerNumber);

    const consistency = consistencyScore(metrics.utilisationIntegral, stat);
    const fingerprint = buildFingerprint({
      timeline,
      metrics,
      window: p.window,
      consistency,
    });

    const rejectionReasons = detectAnomalies(
      {
        window: p.window,
        apexSpeedKmh: p.apexSpeedKmh,
        sectionTimeSeconds: p.sectionTimeSeconds,
        entrySpeedKmh: p.entrySpeedKmh,
        exitSpeedKmh: p.exitSpeedKmh,
      },
      stat
    );

    const attackScore = computeAttackScore(
      {
        entrySpeedKmh: p.entrySpeedKmh,
        apexSpeedKmh: p.apexSpeedKmh,
        exitSpeedKmh: p.exitSpeedKmh,
        sectionTimeSeconds: p.sectionTimeSeconds,
        fingerprint,
      },
      stat
    );

    return {
      cornerNumber: p.cornerNumber,
      lapNumber: p.lap.lapNumber,
      sessionId: p.session.sessionId,
      sessionLabel: p.session.label,
      lapLabel: p.lapLabel,
      lapTimeSeconds: round(p.lap.lapTime, 3),
      entrySpeedKmh: p.entrySpeedKmh !== null ? round(p.entrySpeedKmh, 2) : null,
      apexSpeedKmh: p.apexSpeedKmh !== null ? round(p.apexSpeedKmh, 2) : null,
      exitSpeedKmh: p.exitSpeedKmh !== null ? round(p.exitSpeedKmh, 2) : null,
      sectionTimeSeconds: p.sectionTimeSeconds,
      timeline,
      timelineMetrics: metrics,
      fingerprint,
      attackScore,
      rejected: rejectionReasons.length > 0,
      rejectionReasons,
      gTrace: cornerGTrace(p.window),
      speedTrace: cornerSpeedTrace(p.window),
    };
  });

  const reference = buildReferenceLap(corners, executions, DEFAULT_SENSITIVITY);

  const fingerprintSessions: FingerprintSession[] = sessions.map((s) => ({
    sessionId: s.sessionId,
    label: s.label,
    reference: s.reference,
  }));

  const laps: FingerprintLap[] = sessions.flatMap((s) =>
    analysableLaps(s).map((lap) => ({
      sessionId: s.sessionId,
      lapNumber: lap.lapNumber,
      label: `${s.label} Lap ${lap.lapNumber}`,
      lapTimeSeconds: round(lap.lapTime, 3),
    }))
  );

  return {
    sessions: fingerprintSessions,
    laps,
    corners,
    trackOutline: buildTrackOutline(fastest),
    executions,
    cornerGripG,
    reference,
    attackWeights: DEFAULT_ATTACK_WEIGHTS,
    defaultSensitivity: DEFAULT_SENSITIVITY,
    warnings,
  };
}
