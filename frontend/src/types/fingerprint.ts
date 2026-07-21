/**
 * Frontend mirror of the backend fingerprint types
 * (backend/src/types/fingerprint.ts). Kept in sync by hand. All score scalars
 * are 0–100 unless the field name ends in Seconds/Kmh/Meters/G.
 */
import type { GTracePoint, SpeedTracePoint } from "./advisoryData";

export type CornerPhase =
  | "braking"
  | "trail_braking"
  | "apex"
  | "exit"
  | "straight";

export type ZoneSelectionTrigger =
  | "braking"
  | "lateral_g"
  | "lateral_g_sign_change";

export type ZoneSelectionBasis = {
  trigger: ZoneSelectionTrigger;
  strength: number;
  supportingLaps: number;
  totalLaps: number;
};

export type CornerDefinition = {
  cornerNumber: number;
  startDistanceMeters: number;
  centerDistanceMeters: number;
  endDistanceMeters: number;
  /** Why this corner's zone was auto-detected. Absent for user-defined maps. */
  selectionBasis?: ZoneSelectionBasis;
};

export type GripTimelineSample = {
  progress: number;
  timeSeconds: number;
  distanceMeters: number;
  combinedG: number;
  utilisationPct: number;
  gripReservePct: number;
  phase: CornerPhase;
};

export type PhaseAreas = Record<CornerPhase, number>;

export type GripTimelineMetrics = {
  peakUtilisation: number;
  averageUtilisation: number;
  utilisationIntegral: number;
  phaseAreas: PhaseAreas;
  gripContinuity: number;
  gripBias: { entry: number; apex: number; exit: number };
  coastingEvents: number;
  utilisationDropEvents: number;
};

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

export type RejectionReason =
  | "sensor_invalid"
  | "double_braking"
  | "traffic_avoidance"
  | "lift_off"
  | "incomplete";

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
  attackScore: number;
  rejected: boolean;
  rejectionReasons: RejectionReason[];
  gTrace: GTracePoint[];
  speedTrace: SpeedTracePoint[];
};

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

export type FingerprintSession = {
  sessionId: string;
  label: string;
  reference: string | null;
};

export type FingerprintLap = {
  sessionId: string;
  lapNumber: number;
  label: string;
  lapTimeSeconds: number;
};

export type TrackPoint = {
  distanceMeters: number;
  x: number;
  y: number;
};

export type FingerprintResult = {
  sessions: FingerprintSession[];
  laps: FingerprintLap[];
  corners: CornerDefinition[];
  trackOutline: TrackPoint[];
  executions: CornerExecution[];
  cornerGripG: Record<number, number>;
  reference: ReferenceCorner[];
  attackWeights: AttackWeights;
  defaultSensitivity: number;
  warnings: string[];
};

export type FingerprintCoachRequest = {
  sessionLabel?: string;
  sensitivity: number;
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

export const REJECTION_LABELS: Record<RejectionReason, string> = {
  sensor_invalid: "Invalid telemetry",
  double_braking: "Double braking",
  traffic_avoidance: "Traffic / avoidance",
  lift_off: "Mid-corner lift",
  incomplete: "Incomplete data",
};

export const ZONE_TRIGGER_LABELS: Record<ZoneSelectionTrigger, string> = {
  braking: "Braking",
  lateral_g: "Lateral g",
  lateral_g_sign_change: "Direction change",
};

/** Human-readable summary of why a corner's zone was selected. */
export function describeSelectionBasis(basis: ZoneSelectionBasis): string {
  const label = ZONE_TRIGGER_LABELS[basis.trigger];
  const detail =
    basis.trigger === "braking"
      ? `${basis.strength.toFixed(1)} km/h drop`
      : `${basis.strength.toFixed(2)} g`;
  const support =
    basis.totalLaps > 1
      ? ` · seen in ${basis.supportingLaps}/${basis.totalLaps} laps`
      : "";
  return `${label} · ${detail}${support}`;
}
