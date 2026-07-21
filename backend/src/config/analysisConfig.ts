export type ZoneAnalysisMethod =
  | "legacy"
  | "distanceAligned"
  | "gpsDistanceAligned";

export const analysisConfig = {
  zoneAnalysisMethod:
    (process.env.ZONE_ANALYSIS_METHOD as ZoneAnalysisMethod) ??
    "gpsDistanceAligned",

  distanceStepMeters: 1,

  minReliableZoneDeltaSeconds: 0.15,

  lowConfidenceLapDeltaSeconds: 0.25,

  maxZoneDeltaToLapDeltaRatio: 3,
};
