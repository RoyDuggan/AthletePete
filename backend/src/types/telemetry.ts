export type TelemetrySample = {
  time: number;
  speedKmh?: number;
  speed?: number;
  rpm?: number;
  distanceMeters?: number;
  distance?: number;
  latitude?: number;
  longitude?: number;
  gpsX?: number;
  gpsY?: number;
  lapNumber?: number;
};

export type LapData = {
  lapNumber: number;
  lapTime: number;
  samples: TelemetrySample[];
};

export type FeatureZone = {
  zoneNumber: number;
  name?: string;
  startDistanceMeters: number;
  centerDistanceMeters: number;
  endDistanceMeters: number;
  zoneType?: string;
};

export type ZoneDeltaResult = {
  zoneNumber: number;
  name?: string;
  startDistanceMeters: number;
  centerDistanceMeters: number;
  endDistanceMeters: number;
  deltaSeconds: number;
  confidence: "high" | "medium" | "low";
  validity: "valid" | "low_confidence" | "invalid";
  method: string;
  reason?: string;
};

export type DeltaTracePoint = {
  distanceMeters: number;
  deltaSeconds: number;
  rawDeltaSeconds: number;
  fastestTime: number;
  comparisonTime: number;
  fastestX?: number;
  fastestY?: number;
  comparisonX?: number;
  comparisonY?: number;
  spatialSeparationMeters?: number;
};
