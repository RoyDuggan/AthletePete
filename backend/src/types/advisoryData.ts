export type CoachingInsightCategory =
    | "driver"
    | "engine"
    | "gearing"
    | "setup"
    | "consistency"
    | "lap_time"
    | "corner_performance";

export type CoachingInsightPriority = "high" | "medium" | "low";

export type CoachingInsightConfidence = "high" | "medium" | "low";

export type LapComparisonMode =
    | "fastest_vs_second"
    | "user_selected"
    | "lap_vs_best_average"
    | "consistency_candidate";

export type ValidationSplit = {
    zoneNumber: number;
    startDistanceMeters: number;
    endDistanceMeters: number;

    subjectTimeSeconds: number;
    referenceTimeSeconds: number;

    /** Race Studio style sign: subject split - reference split. Negative = subject gained time. */
    deltaSeconds: number;
    impactType: "gain" | "loss" | "neutral";
};

export type DeltaTraceSummary = {
    pointCount: number;
    maxGainSeconds: number;
    maxLossSeconds: number;
    finishDeltaSeconds: number;
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

export type SplitAnalysisResult = {
    method: string;
    comparisonMode: LapComparisonMode;

    subjectLapNumber: number;
    referenceLapNumber: number;
    subjectLabel: string;
    referenceLabel: string;

    sectorCount: number;
    distanceStepMeters: number;
    trackLengthMeters: number;

    subjectLapTimeSeconds: number;
    referenceLapTimeSeconds: number;

    /** Race Studio style sign: subject lap - reference lap. Negative = subject faster. */
    lapDeltaSeconds: number;
    reconstructedFinishDeltaSeconds: number | null;
    finishDeltaErrorSeconds: number | null;

    splits: ValidationSplit[];
    deltaTrace: DeltaTracePoint[];
    deltaTraceSummary: DeltaTraceSummary;
};

export type CoachingInsightEvidence = {
    metric: string;
    value: string | number;
    comparison?: string;
    location?: string;
    lapReference?: string;
};

export type CoachingInsight = {
    id: string;
    category: CoachingInsightCategory;
    priority: CoachingInsightPriority;
    confidence: CoachingInsightConfidence;

    /** Feature zone this insight relates to, when the insight is zone-derived. */
    zoneNumber?: number;

    title: string;
    summary: string;

    evidence: CoachingInsightEvidence[];

    recommendation: string;

    aiPromptHint?: string;
};

export type LapComparison = {
    fastestLapNumber: number;
    comparisonLapNumber: number;
    fastestLapTimeSeconds: number;
    comparisonLapTimeSeconds: number;
    deltaTimeSeconds: number;
    comparisonBasis: string;

    entrySpeedDeltaKmh?: number;
    apexSpeedDeltaKmh?: number;
    exitSpeedDeltaKmh?: number;

    drivePhaseDeltaKmh?: number | null;
    timeToAccelerationDeltaSeconds?: number | null;
    fastestLapExitDriveRating?: string;
    comparisonLapExitDriveRating?: string;

    maxDecelerationDeltaKmhPerSec?: number;
    brakingDurationDeltaSeconds?: number | null;
    speedDropBeforeApexDeltaKmh?: number;
    fastestLapBrakingRating?: string;
    comparisonLapBrakingRating?: string;

    minRpmDelta?: number;
    maxRpmDelta?: number;
    rpmDropBeforeApexDelta?: number;
    rpmRecoveryAfterApexDelta?: number;
    fastestLapRpmRecoveryRating?: string;
    comparisonLapRpmRecoveryRating?: string;
};

export type FeatureZone = {
    zoneNumber: number;

    name: string;

    startDistanceMeters: number;
    centerDistanceMeters: number;
    endDistanceMeters: number;

    zoneType: string;
    severity: "gain" | "loss";
    primaryMetric: string;

    deltaSeconds: number;

    description: string;
    evidence: string;

    confidence: "high" | "medium" | "low";

    /** Per-zone comparison channels (subject - reference), when both laps exist. */
    metrics?: ZoneMetrics;
};

/**
 * Per-zone version of the whole-lap comparison channels. Each delta is
 * subject - reference (negative = subject faster / gained in that channel).
 */
export type ZoneMetrics = {
    entrySpeedDeltaKmh: number;
    apexSpeedDeltaKmh: number;
    exitSpeedDeltaKmh: number;

    drivePhaseDeltaKmh: number;
    timeToAccelerationDeltaSeconds: number | null;
    subjectExitDriveRating: string;
    referenceExitDriveRating: string;

    maxDecelerationDeltaKmhPerSec: number;
    brakingDurationDeltaSeconds: number | null;
    speedDropBeforeApexDeltaKmh: number;
    subjectBrakingRating: string;
    referenceBrakingRating: string;

    minRpmDelta: number;
    maxRpmDelta: number;
    rpmDropBeforeApexDelta: number;
    rpmRecoveryAfterApexDelta: number;
    subjectRpmRecoveryRating: string;
    referenceRpmRecoveryRating: string;
    rpmAvailable: boolean;

    subjectSampleCount: number;
    referenceSampleCount: number;
};

export type RankedZone = FeatureZone & {
    rank: number;
    impactType: "gain" | "loss";
    impactSeconds: number;
};

export type ZoneRankingResult = {
    topGainZones: RankedZone[];
    topLossZones: RankedZone[];
};

export type SetupAdvisory = {
    id: string;
    category: string;
    title: string;
    advice: string;
    evidence: string;
    confidence: "high" | "medium" | "low";
};

export type AvailableLap = {
    lapNumber: number;
    lapTimeSeconds: number;
    lapType: "out_lap" | "flying" | "in_lap" | "unknown";
    isValidFlyingLap: boolean;
};

/** One sample's lateral/longitudinal g, for friction-circle plots. */
export type GTracePoint = {
    distanceMeters: number;
    lateralG: number;
    longitudinalG: number;
};

/** One sample's speed at a distance, for speed-vs-distance charts. */
export type SpeedTracePoint = {
    distanceMeters: number;
    speedKmh: number;
};

export type AdvisoryData = {
    sessionName: string;
    date: string;

    sampleRateHz: number | null;
    durationSeconds: number | null;

    lapCount: number;
    trackLengthMeters: number | null;

    lapComparison: LapComparison | null;

    /** Deterministic fixed-distance sector and cumulative-delta verification layer. */
    splitAnalysis: SplitAnalysisResult | null;

    featureZones: any[];
    zoneRanking: any;

    zoneAnalysis?: {
        method?: string;
        validity?: string;
        reason?: string;

        totalLapDeltaSeconds?: number;
        reconstructedFinishDeltaSeconds?: number;
        finishDeltaErrorSeconds?: number;

        sumZoneDeltasSeconds?: number;

        deltaTracePointCount?: number;
    } | null;

    coachingInsights: CoachingInsight[];
    setupAdvisory: SetupAdvisory[];

    originalName: string;
    sizeBytes: number;

    telemetrySampleCount: number;

    beaconCount: number;

    gpsSampleCount?: number;
    hasGps?: boolean;

    /** Token (saved upload filename) used to re-run analysis on other laps. */
    sessionId?: string;

    /** All detected laps, so the user can choose which two to compare. */
    availableLaps?: AvailableLap[];

    /** Lap numbers currently being compared (subject vs reference). */
    subjectLapNumber?: number | null;
    referenceLapNumber?: number | null;

    /** Per-sample lateral/longitudinal g for the subject lap (friction circle). */
    gTrace?: GTracePoint[];

    /** Per-sample lateral/longitudinal g for the reference lap (friction circle). */
    referenceGTrace?: GTracePoint[];

    /** Per-sample speed vs distance for the subject lap. */
    speedTrace?: SpeedTracePoint[];

    /** Per-sample speed vs distance for the reference lap. */
    referenceSpeedTrace?: SpeedTracePoint[];

    /** Fastest valid lap of the session (for "Fastest Lap" vs "Subject Lap" labels). */
    fastestLapNumber?: number | null;

    /** Which laps (or custom map) drove feature-zone detection. */
    zoneBasis?: "fastest" | "within_2pct" | "all" | "custom";

    /** Saved custom zone-map id when zoneBasis is "custom" (else null). */
    customZoneMapId?: string | null;
};