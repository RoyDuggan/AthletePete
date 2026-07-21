/**
 * Types for the Corner Selection & Fingerprint engine (see
 * docs/fingerprint-coaching-spec.md).
 *
 * This is an additive analysis layer: it consumes the existing lap/feature
 * outputs read-only and produces deterministic corner fingerprints, grip
 * utilisation timelines, attack probabilities and anomaly flags. Nothing here
 * feeds back into the existing feature-extraction pipeline.
 *
 * Convention: all "utilisation", "quality", "commitment", "stability",
 * "smoothness", "consistency", "confidence" and "attack" scalars are expressed
 * on a 0–100 scale unless the field name ends in `Seconds`, `Kmh`, `Meters` or
 * `G`.
 */

/** A g-sample used by the friction-circle plot (mirrors advisoryData GTracePoint). */
export type GPoint = {
  distanceMeters: number;
  lateralG: number;
  longitudinalG: number;
};

/** A speed-vs-distance sample (mirrors advisoryData SpeedTracePoint). */
export type SpeedPoint = {
  distanceMeters: number;
  speedKmh: number;
};

/** One point of the GPS track outline, ordered by lap-relative distance. */
export type TrackPoint = {
  distanceMeters: number;
  x: number;
  y: number;
};

/** The five phases a corner is segmented into (inferred from g + speed). */
export type CornerPhase =
  | "braking"
  | "trail_braking"
  | "apex"
  | "exit"
  | "straight";

/** What telemetry feature caused a corner's zone to be selected. */
export type ZoneSelectionTrigger =
  | "braking"
  | "lateral_g"
  | "lateral_g_sign_change";

/**
 * The deterministic basis behind a corner's zone selection — surfaced so the
 * UI and AI can see *why* each corner exists, not just where it is.
 */
export type ZoneSelectionBasis = {
  trigger: ZoneSelectionTrigger;
  /** km/h speed drop (braking) or |lateral g| (cornering) at detection. */
  strength: number;
  /** How many basis laps this zone was detected in (1 in single-lap mode). */
  supportingLaps: number;
  /** Total basis laps considered when locating zones. */
  totalLaps: number;
};

/** One canonical corner on the circuit, defined once and applied to every lap. */
export type CornerDefinition = {
  cornerNumber: number;
  startDistanceMeters: number;
  centerDistanceMeters: number;
  endDistanceMeters: number;
  /** Why this corner's zone was auto-detected. Absent for user-defined maps. */
  selectionBasis?: ZoneSelectionBasis;
};

/** One equally-spaced sample of the 0–100% normalised grip timeline. */
export type GripTimelineSample = {
  /** Corner progress, 0–100 (%). */
  progress: number;
  /** Lap-relative time at this progress point (seconds). */
  timeSeconds: number;
  /** Distance into the corner (m). */
  distanceMeters: number;
  /** Combined lateral+longitudinal acceleration (g). */
  combinedG: number;
  /** Combined G as a percentage of the corner's available grip (0–100+). */
  utilisationPct: number;
  /** Remaining grip headroom (0–100 %). */
  gripReservePct: number;
  phase: CornerPhase;
};

/** Aggregate utilisation area per phase (utilisation integral restricted to phase). */
export type PhaseAreas = Record<CornerPhase, number>;

/** Derived scalars for a single corner execution's grip timeline. */
export type GripTimelineMetrics = {
  peakUtilisation: number;
  averageUtilisation: number;
  /** Trapezoidal area of utilisation over 0–100% progress (0–100). */
  utilisationIntegral: number;
  phaseAreas: PhaseAreas;
  /** How continuous grip use is (100 = no drops), 0–100. */
  gripContinuity: number;
  /** Where grip is biased across the corner (entry/apex/exit shares, 0–100). */
  gripBias: { entry: number; apex: number; exit: number };
  /** Count of coasting samples (near-zero combined G mid-corner). */
  coastingEvents: number;
  /** Count of sudden utilisation drops (grip released then reapplied). */
  utilisationDropEvents: number;
};

/** The corner fingerprint — a deterministic signature of how a corner was driven. */
export type CornerFingerprint = {
  overallUtilisation: number;
  brakingUtilisation: number;
  trailBrakingUtilisation: number;
  apexUtilisation: number;
  exitUtilisation: number;
  smoothness: number;
  stability: number;
  consistency: number;
  frictionPathQuality: number;
  entryCommitment: number;
  apexCommitment: number;
  exitCommitment: number;
  gripReserve: number;
  confidence: number;
};

/** Why a corner execution was rejected as anomalous. */
export type RejectionReason =
  | "sensor_invalid"
  | "double_braking"
  | "traffic_avoidance"
  | "lift_off"
  | "incomplete";

/** One corner as executed on one specific lap — the atomic unit of the library. */
export type CornerExecution = {
  cornerNumber: number;
  lapNumber: number;
  sessionId: string;
  sessionLabel: string;
  lapLabel: string;
  lapTimeSeconds: number;

  entrySpeedKmh: number | null;
  apexSpeedKmh: number | null;
  exitSpeedKmh: number | null;
  sectionTimeSeconds: number | null;

  timeline: GripTimelineSample[];
  timelineMetrics: GripTimelineMetrics;
  fingerprint: CornerFingerprint;

  /** 0–100 likelihood this is a genuine attack execution worth learning from. */
  attackScore: number;

  /** Hard anomaly rejection (independent of the sensitivity threshold). */
  rejected: boolean;
  rejectionReasons: RejectionReason[];

  /** Plot data for the corner-detail view. */
  gTrace: GPoint[];
  speedTrace: SpeedPoint[];
};

/** Configurable weightings for the attack-probability score (sum is normalised). */
export type AttackWeights = {
  entrySpeed: number;
  apexSpeed: number;
  exitSpeed: number;
  sectionTime: number;
  utilisation: number;
  smoothness: number;
  stability: number;
  consistency: number;
  frictionPathQuality: number;
  confidence: number;
};

/** The best retained execution chosen for each corner of the reference lap. */
export type ReferenceCorner = {
  cornerNumber: number;
  sessionId: string;
  lapNumber: number;
  lapLabel: string;
  attackScore: number;
  confidence: number;
  fingerprint: CornerFingerprint;
  timeline: GripTimelineSample[];
};

/** A session that contributed laps to the analysis. */
export type FingerprintSession = {
  sessionId: string;
  label: string;
  reference: string | null;
};

/** A lap that contributed corner executions. */
export type FingerprintLap = {
  sessionId: string;
  lapNumber: number;
  label: string;
  lapTimeSeconds: number;
};

/** The complete, deterministic payload returned by POST /api/fingerprint. */
export type FingerprintResult = {
  sessions: FingerprintSession[];
  laps: FingerprintLap[];
  corners: CornerDefinition[];
  /** GPS track outline (fastest lap) for the corner-zone minimap; [] if no GPS. */
  trackOutline: TrackPoint[];
  /** Every corner on every lap (rejected ones flagged, not removed). */
  executions: CornerExecution[];
  /** Per-corner available grip (p95 combined-G from clean laps), for reference. */
  cornerGripG: Record<number, number>;
  reference: ReferenceCorner[];
  attackWeights: AttackWeights;
  /** Suggested initial sensitivity threshold (0–100) for the UI slider. */
  defaultSensitivity: number;
  warnings: string[];
};

/** Payload sent to the AI coach — retained corners only. */
export type FingerprintCoachRequest = {
  sessionLabel?: string;
  sensitivity: number;
  /** Driver-framing override appended to the system prompt (set server-side). */
  framing?: string;
  corners: {
    cornerNumber: number;
    lapLabel: string;
    entrySpeedKmh: number | null;
    apexSpeedKmh: number | null;
    exitSpeedKmh: number | null;
    sectionTimeSeconds: number | null;
    attackScore: number;
    fingerprint: CornerFingerprint;
    timelineMetrics: GripTimelineMetrics;
  }[];
};
