import type {
    AdvisoryData,
    CoachingInsight,
    LapComparison,
    SetupAdvisory,
} from "../types/advisoryData";

import { computeLapSpeedMetrics } from "./lapSpeedMetrics";
import { computeLapDriveMetrics } from "./lapDriveMetrics";
import { computeLapBrakingMetrics } from "./lapBrakingMetrics";
import { computeLapRpmMetrics } from "./lapRpmMetrics";
import { buildFeatureZones } from "./lapFeatureZones";
import { rankFeatureZones } from "./zoneRanking";
import { analyseZones } from "./zoneAnalysisService";
import { computeZoneMetrics } from "./zoneMetrics";
import { buildFixedDistanceSplitAnalysis } from "./splitAnalysisService";

export type ZoneBasis = "fastest" | "within_2pct" | "all" | "custom";

type BuildAdvisoryInput = {
    originalName: string;
    sizeBytes: number;
    parsed: any;
    laps: any[];
    fastestLap: any | null;
    secondFastestLap: any | null;
    zoneBasis?: ZoneBasis;
    /** Interior zone boundaries (m from lap start) when zoneBasis is "custom". */
    customBoundaries?: number[];
    /** Saved-map id echoed back to the client when a custom map drives zones. */
    customZoneMapId?: string;
    /** Session-aware labels (e.g. "S1 Lap 3"), used for cross-session compares. */
    subjectLabel?: string;
    referenceLabel?: string;
};

/**
 * Selects which laps drive feature-zone detection. In/out laps are always
 * excluded (isValidFlyingLap). "fastest" uses only the fastest lap; "within_2pct"
 * uses every lap within 2% of the fastest lap time; "all" uses all flying laps.
 */
function selectZoneBasisLaps(
    laps: any[],
    zoneBasis: ZoneBasis,
    fastestLap: any
): any[] {
    const flying = laps.filter((lap) => lap?.isValidFlyingLap);

    if (flying.length === 0) {
        return fastestLap ? [fastestLap] : [];
    }

    if (zoneBasis === "all") {
        return flying;
    }

    // "custom" maps supply their own zone geometry; the basis laps only feed the
    // speed/apex metrics, so treat the lap selection like "fastest".
    if (zoneBasis === "custom") {
        return fastestLap ? [fastestLap] : [flying[0]];
    }

    if (zoneBasis === "within_2pct") {
        const fastestTime =
            fastestLap?.lapTime ?? Math.min(...flying.map((lap) => lap.lapTime));

        return flying.filter((lap) => lap.lapTime <= fastestTime * 1.02);
    }

    // "fastest"
    return fastestLap ? [fastestLap] : [flying[0]];
}

function getSampleDistanceMeters(sample: any): number | null {
    const value =
        sample?.distanceMeters ?? sample?.distance ?? sample?.Distance;

    return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function getFiniteNumber(value: unknown): number | null {
    return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** Lateral acceleration in g, preferring the GPS vehicle-frame channel. */
function getLateralG(sample: any): number | null {
    return (
        getFiniteNumber(sample?.latAccG) ??
        getFiniteNumber(sample?.AccelerometerY) ??
        getFiniteNumber(sample?.accelerometerY)
    );
}

/** Longitudinal acceleration in g, preferring the GPS vehicle-frame channel. */
function getLongitudinalG(sample: any): number | null {
    return (
        getFiniteNumber(sample?.lonAccG) ??
        getFiniteNumber(sample?.AccelerometerX) ??
        getFiniteNumber(sample?.accelerometerX)
    );
}

/** Falls back to deriving longitudinal g from the speed gradient. */
function deriveLongitudinalGFromSpeed(samples: any[], i: number): number | null {
    const j = i > 0 ? i - 1 : i + 1;
    if (j < 0 || j >= samples.length) return null;

    const speedI = getFiniteNumber(samples[i]?.speedKmh ?? samples[i]?.speed);
    const speedJ = getFiniteNumber(samples[j]?.speedKmh ?? samples[j]?.speed);
    const timeI = getFiniteNumber(samples[i]?.time);
    const timeJ = getFiniteNumber(samples[j]?.time);

    if (speedI === null || speedJ === null || timeI === null || timeJ === null) {
        return null;
    }

    const dt = timeI - timeJ;
    if (dt === 0) return null;

    // km/h -> m/s, then m/s^2 -> g. Sign is correct either direction in time.
    const accelMs2 = (speedI - speedJ) / 3.6 / dt;
    return accelMs2 / 9.81;
}

/**
 * Builds a per-sample lateral/longitudinal g trace for a lap, used to draw a
 * friction-circle ("g-g") plot per feature zone. Distance is relative to the
 * lap start so it lines up with feature-zone distance ranges.
 */
function buildGTrace(lap: any): {
    distanceMeters: number;
    lateralG: number;
    longitudinalG: number;
}[] {
    const samples = lap?.samples ?? [];
    if (samples.length < 2) return [];

    const lapStart = getSampleDistanceMeters(samples[0]) ?? 0;
    const round3 = (value: number) => Math.round(value * 1000) / 1000;

    const points: {
        distanceMeters: number;
        lateralG: number;
        longitudinalG: number;
    }[] = [];

    for (let i = 0; i < samples.length; i++) {
        const distance = getSampleDistanceMeters(samples[i]);
        if (distance === null) continue;

        const lateralG = getLateralG(samples[i]);
        const longitudinalG =
            getLongitudinalG(samples[i]) ??
            deriveLongitudinalGFromSpeed(samples, i);

        if (lateralG === null && longitudinalG === null) continue;

        points.push({
            distanceMeters: Math.round((distance - lapStart) * 100) / 100,
            lateralG: round3(lateralG ?? 0),
            longitudinalG: round3(longitudinalG ?? 0),
        });
    }

    return points;
}

/**
 * Builds a per-sample speed-vs-distance trace for a lap. Distance is relative to
 * the lap start so subject and reference laps line up on the same axis.
 */
function buildSpeedTrace(lap: any): {
    distanceMeters: number;
    speedKmh: number;
}[] {
    const samples = lap?.samples ?? [];
    if (samples.length < 2) return [];

    const lapStart = getSampleDistanceMeters(samples[0]) ?? 0;

    const points: { distanceMeters: number; speedKmh: number }[] = [];

    for (let i = 0; i < samples.length; i++) {
        const distance = getSampleDistanceMeters(samples[i]);
        const speed = getFiniteNumber(samples[i]?.speedKmh ?? samples[i]?.speed);

        if (distance === null || speed === null) continue;

        points.push({
            distanceMeters: Math.round((distance - lapStart) * 100) / 100,
            speedKmh: Math.round(speed * 100) / 100,
        });
    }

    return points;
}

/** Total distance covered within a lap (last sample distance - first). */
function getLapDistanceMeters(lap: any): number | null {
    const samples = lap?.samples ?? [];

    if (samples.length < 2) return null;

    const first = getSampleDistanceMeters(samples[0]);
    const last = getSampleDistanceMeters(samples[samples.length - 1]);

    if (first === null || last === null) return null;

    const length = last - first;

    return length > 0 ? length : null;
}

/**
 * Cleans a set of user-supplied interior boundaries: keeps only finite values
 * strictly inside (0, lapLength), sorts ascending, and collapses near-duplicates
 * so no zero-width zone is produced.
 */
function sanitiseBoundaries(
    raw: number[],
    lapLengthMeters: number | null
): number[] {
    const max = lapLengthMeters ?? Infinity;

    const cleaned = raw
        .filter((b) => typeof b === "number" && Number.isFinite(b))
        .filter((b) => b > 0 && b < max)
        .sort((a, b) => a - b);

    const out: number[] = [];

    for (const b of cleaned) {
        if (out.length === 0 || b - out[out.length - 1] > 0.01) {
            out.push(b);
        }
    }

    return out;
}

/**
 * Builds contiguous feature zones directly from user-defined boundaries. `n`
 * boundaries produce `n + 1` zones tiling [0 … lapLength]; an empty set yields a
 * single whole-lap zone. Delta/severity/confidence are placeholders here — they
 * are overwritten downstream by analyseZones once both laps are available.
 */
function buildCustomFeatureZones(
    rawBoundaries: number[],
    lapLengthMeters: number | null,
    round2: (value: number) => number
): any[] {
    const end =
        lapLengthMeters ??
        (rawBoundaries.length ? Math.max(...rawBoundaries) + 20 : 1000);

    const boundaries = sanitiseBoundaries(rawBoundaries, lapLengthMeters);
    const edges = [0, ...boundaries, end];

    const zones: any[] = [];

    for (let i = 0; i < edges.length - 1; i++) {
        const start = edges[i];
        const finish = edges[i + 1];
        const center = (start + finish) / 2;

        zones.push({
            zoneNumber: i + 1,
            name: `Zone ${i + 1}`,
            startDistanceMeters: round2(start),
            centerDistanceMeters: round2(center),
            endDistanceMeters: round2(finish),
            zoneType: "corner",
            severity: "loss" as "gain" | "loss",
            primaryMetric: "apex_speed",
            deltaSeconds: 0,
            description: `Custom zone ${i + 1} from ${round2(start)}m to ${round2(
                finish
            )}m.`,
            evidence: "User-defined zone boundaries.",
            confidence: "medium" as const,
        });
    }

    return zones;
}

/** Lap number of the fastest valid flying lap (falls back to overall fastest). */
function getFastestLapNumber(laps: any[]): number | null {
    const valid = laps.filter((lap) => lap?.isValidFlyingLap);
    const pool = valid.length > 0 ? valid : laps;

    if (pool.length === 0) return null;

    return pool.reduce((best, lap) =>
        lap.lapTime < best.lapTime ? lap : best
    ).lapNumber;
}

/**
 * Labels a lap by its role. The fastest lap keeps the "Fastest Lap" wording; any
 * other lap is shown as "Subject Lap" / "Reference Lap" so the comparison stays
 * accurate when the user picks laps other than the fastest.
 */
function lapRoleLabel(
    lapNumber: number,
    fastestLapNumber: number | null,
    role: "subject" | "reference"
): string {
    if (fastestLapNumber !== null && lapNumber === fastestLapNumber) {
        return `Fastest Lap ${lapNumber}`;
    }

    return role === "subject"
        ? `Subject Lap ${lapNumber}`
        : `Reference Lap ${lapNumber}`;
}

function getLapTimeSeconds(lap: any): number {
    if (lap.durationSeconds !== undefined && lap.durationSeconds !== null) {
        return lap.durationSeconds;
    }

    if (lap.lapTimeSeconds !== undefined && lap.lapTimeSeconds !== null) {
        return lap.lapTimeSeconds;
    }

    if (lap.lapTime !== undefined && lap.lapTime !== null) {
        return lap.lapTime;
    }

    if (lap.duration !== undefined && lap.duration !== null) {
        return lap.duration;
    }

    if (lap.timeSeconds !== undefined && lap.timeSeconds !== null) {
        return lap.timeSeconds;
    }

    if (lap.elapsedSeconds !== undefined && lap.elapsedSeconds !== null) {
        return lap.elapsedSeconds;
    }

    if (
        lap.endTimeSeconds !== undefined &&
        lap.endTimeSeconds !== null &&
        lap.startTimeSeconds !== undefined &&
        lap.startTimeSeconds !== null
    ) {
        return lap.endTimeSeconds - lap.startTimeSeconds;
    }

    return 0;
}

function buildLapComparison(
    fastestLap: any | null,
    secondFastestLap: any | null
): LapComparison | null {
    if (!fastestLap || !secondFastestLap) {
        return null;
    }

    const fastestLapTimeSeconds = getLapTimeSeconds(fastestLap);
    const comparisonLapTimeSeconds = getLapTimeSeconds(secondFastestLap);

    const fastestMetrics = computeLapSpeedMetrics(fastestLap);
    const comparisonMetrics = computeLapSpeedMetrics(secondFastestLap);

    const fastestDriveMetrics = computeLapDriveMetrics(fastestLap);
    const comparisonDriveMetrics = computeLapDriveMetrics(secondFastestLap);

    const fastestBrakingMetrics = computeLapBrakingMetrics(fastestLap);
    const comparisonBrakingMetrics = computeLapBrakingMetrics(secondFastestLap);

    const fastestRpmMetrics = computeLapRpmMetrics(fastestLap);
    const comparisonRpmMetrics = computeLapRpmMetrics(secondFastestLap);

    return {
        fastestLapNumber: fastestLap.lapNumber,
        comparisonLapNumber: secondFastestLap.lapNumber,
        fastestLapTimeSeconds,
        comparisonLapTimeSeconds,
        // Subject - reference, matching the split + zone convention: a positive
        // delta is time lost by the subject, a negative delta is time gained.
        deltaTimeSeconds:
            Math.round((fastestLapTimeSeconds - comparisonLapTimeSeconds) * 1000) /
            1000,
        comparisonBasis: "second_fastest",

        entrySpeedDeltaKmh:
            Math.round(
                (fastestMetrics.entrySpeed - comparisonMetrics.entrySpeed) * 100
            ) / 100,

        apexSpeedDeltaKmh:
            Math.round(
                (fastestMetrics.apexSpeed - comparisonMetrics.apexSpeed) * 100
            ) / 100,

        exitSpeedDeltaKmh:
            Math.round(
                (fastestMetrics.exitSpeed - comparisonMetrics.exitSpeed) * 100
            ) / 100,

        drivePhaseDeltaKmh:
            Math.round(
                (fastestDriveMetrics.exitDriveGainKmh -
                    comparisonDriveMetrics.exitDriveGainKmh) *
                100
            ) / 100,

        timeToAccelerationDeltaSeconds:
            fastestDriveMetrics.timeFromApexToAccelerationSeconds !== null &&
            comparisonDriveMetrics.timeFromApexToAccelerationSeconds !== null
                ? Math.round(
                (fastestDriveMetrics.timeFromApexToAccelerationSeconds -
                    comparisonDriveMetrics.timeFromApexToAccelerationSeconds) *
                1000
            ) / 1000
                : null,

        fastestLapExitDriveRating: fastestDriveMetrics.exitDriveRating,
        comparisonLapExitDriveRating: comparisonDriveMetrics.exitDriveRating,

        maxDecelerationDeltaKmhPerSec:
            Math.round(
                (fastestBrakingMetrics.maxDecelerationKmhPerSec -
                    comparisonBrakingMetrics.maxDecelerationKmhPerSec) *
                100
            ) / 100,

        brakingDurationDeltaSeconds:
            fastestBrakingMetrics.brakingDurationSeconds !== null &&
            comparisonBrakingMetrics.brakingDurationSeconds !== null
                ? Math.round(
                (fastestBrakingMetrics.brakingDurationSeconds -
                    comparisonBrakingMetrics.brakingDurationSeconds) *
                1000
            ) / 1000
                : null,

        speedDropBeforeApexDeltaKmh:
            Math.round(
                (fastestBrakingMetrics.speedDropBeforeApexKmh -
                    comparisonBrakingMetrics.speedDropBeforeApexKmh) *
                100
            ) / 100,

        fastestLapBrakingRating: fastestBrakingMetrics.brakingRating,
        comparisonLapBrakingRating: comparisonBrakingMetrics.brakingRating,

        minRpmDelta:
            Math.round((fastestRpmMetrics.minRpm - comparisonRpmMetrics.minRpm) * 100) /
            100,

        maxRpmDelta:
            Math.round((fastestRpmMetrics.maxRpm - comparisonRpmMetrics.maxRpm) * 100) /
            100,

        rpmDropBeforeApexDelta:
            Math.round(
                (fastestRpmMetrics.rpmDropBeforeApex -
                    comparisonRpmMetrics.rpmDropBeforeApex) *
                100
            ) / 100,

        rpmRecoveryAfterApexDelta:
            Math.round(
                (fastestRpmMetrics.rpmRecoveryAfterApex -
                    comparisonRpmMetrics.rpmRecoveryAfterApex) *
                100
            ) / 100,

        fastestLapRpmRecoveryRating: fastestRpmMetrics.rpmRecoveryRating,
        comparisonLapRpmRecoveryRating: comparisonRpmMetrics.rpmRecoveryRating,
    };
}

function buildCoachingInsights(
    input: BuildAdvisoryInput,
    zoneRanking: any
): CoachingInsight[] {
    const insights: CoachingInsight[] = [];

    zoneRanking.topLossZones.forEach((zone: any, index: number) => {
        insights.push({
            id: `ci-loss-${index}`,
            category: "driver",
            priority: index === 0 ? "high" : "medium",
            confidence: zone.confidence ?? "medium",
            zoneNumber: zone.zoneNumber,

            title: `Time loss in ${zone.name}`,

            summary:
                zone.confidence === "low"
                    ? `${zone.name} shows a possible difference, but the timing confidence is low.`
                    : `You are losing approximately ${zone.impactSeconds.toFixed(
                        3
                    )}s in ${zone.name} (${zone.centerDistanceMeters.toFixed(
                        0
                    )}m into the lap).`,

            evidence: [
                {
                    metric: "Time loss",
                    value: `${zone.impactSeconds.toFixed(3)}s`,
                    location: `${zone.centerDistanceMeters.toFixed(0)}m`,
                },
                {
                    metric: "Zone type",
                    value: zone.zoneType,
                },
                {
                    metric: "Primary metric",
                    value: zone.primaryMetric,
                },
            ],

            recommendation:
                zone.confidence === "low"
                    ? "Treat this as a possible pattern only. The lap delta may be too small for reliable zone-time attribution."
                    : "Focus on improving entry stability and carrying more speed through the apex. Review braking release and steering smoothness in this section.",
        });
    });

    zoneRanking.topGainZones.forEach((zone: any, index: number) => {
        insights.push({
            id: `ci-gain-${index}`,
            category: "corner_performance",
            priority: "low",
            confidence: zone.confidence ?? "medium",
            zoneNumber: zone.zoneNumber,

            title: `Strong performance in ${zone.name}`,

            summary:
                zone.confidence === "low"
                    ? `${zone.name} shows a possible gain, but the timing confidence is low.`
                    : `You gain approximately ${zone.impactSeconds.toFixed(
                        3
                    )}s in ${zone.name}.`,

            evidence: [
                {
                    metric: "Time gain",
                    value: `${zone.impactSeconds.toFixed(3)}s`,
                    location: `${zone.centerDistanceMeters.toFixed(0)}m`,
                },
            ],

            recommendation:
                zone.confidence === "low"
                    ? "Maintain the observed technique, but avoid over-interpreting this zone until more laps confirm the pattern."
                    : "Maintain this technique. This section shows effective line, rotation, and exit drive.",
        });
    });

    return insights;
}

function buildSetupAdvisory(): SetupAdvisory[] {
    return [
        {
            id: "sa-upload-001",
            category: "setup",
            title: "Setup advisory not yet generated",
            advice:
                "Setup advice will require additional derived metrics such as RPM behaviour, speed traces, gearing assumptions, weather, and engine condition.",
            evidence:
                "The upload response currently includes parsed telemetry, laps, and beacon markers, but not enough setup-specific derived analysis.",
            confidence: "low",
        },
    ];
}

export function buildAdvisoryDataFromUpload(
    input: BuildAdvisoryInput
): AdvisoryData {
    const { originalName, sizeBytes, parsed, laps, fastestLap, secondFastestLap } =
        input;

    // The true fastest lap of the session — used to decide whether the compared
    // laps should be labelled "Fastest Lap" or "Subject"/"Reference Lap".
    const fastestLapNumber = getFastestLapNumber(laps);

    const zoneBasis: ZoneBasis = input.zoneBasis ?? "fastest";
    const lapLengthMeters = getLapDistanceMeters(fastestLap);
    const round2 = (value: number) => Math.round(value * 100) / 100;

    const useCustom =
        zoneBasis === "custom" && Array.isArray(input.customBoundaries);

    // When a custom map drives detection, build contiguous zones straight from
    // the user's boundaries. Otherwise detect apex-centred zones from the basis
    // laps and tile them (midpoint-to-midpoint, first from 0m, last to the lap
    // length) so the zones cover the whole lap with no gaps.
    let featureZones: any[];

    if (useCustom) {
        featureZones = buildCustomFeatureZones(
            input.customBoundaries as number[],
            lapLengthMeters,
            round2
        );
    } else {
        const basisLaps = selectZoneBasisLaps(laps, zoneBasis, fastestLap);

        const rawFeatureZones = buildFeatureZones(
            fastestLap,
            secondFastestLap,
            basisLaps
        );

        const sortedRawZones = [...rawFeatureZones].sort(
            (a, b) => a.centerDistanceMeters - b.centerDistanceMeters
        );

        featureZones = sortedRawZones.map((zone, index) => {
        const previous = sortedRawZones[index - 1];
        const next = sortedRawZones[index + 1];

        const startDistanceMeters = previous
            ? (previous.centerDistanceMeters + zone.centerDistanceMeters) / 2
            : 0;

        const endDistanceMeters = next
            ? (zone.centerDistanceMeters + next.centerDistanceMeters) / 2
            : lapLengthMeters !== null
              ? Math.max(lapLengthMeters, zone.centerDistanceMeters)
              : zone.centerDistanceMeters + 20;

        return {
        zoneNumber: zone.zoneNumber,

        name: `Zone ${zone.zoneNumber}`,

        startDistanceMeters: round2(Math.max(0, startDistanceMeters)),
        centerDistanceMeters: zone.centerDistanceMeters,
        endDistanceMeters: round2(endDistanceMeters),

        zoneType: "corner",

        severity: (zone.deltaSeconds < 0 ? "gain" : "loss") as "gain" | "loss",

        primaryMetric: "apex_speed",

        deltaSeconds: zone.deltaSeconds,

        description: `Apex-centred zone at ${zone.centerDistanceMeters.toFixed(
            1
        )}m into the lap.`,

        evidence: `Fastest lap apex speed ${
            zone.fastestApexSpeed !== null
                ? zone.fastestApexSpeed.toFixed(2)
                : "n/a"
        } km/h vs comparison lap ${
            zone.comparisonApexSpeed !== null
                ? zone.comparisonApexSpeed.toFixed(2)
                : "n/a"
        } km/h.`,

        confidence: "medium" as const,
        };
        });
    }

    let analysedFeatureZones = featureZones;
    let zoneAnalysisOutput: any = null;
    let splitAnalysis: any = null;

    if (fastestLap && secondFastestLap) {
        try {
            splitAnalysis = buildFixedDistanceSplitAnalysis(fastestLap, secondFastestLap, {
                sectorCount: 10,
                comparisonMode: "fastest_vs_second",
                subjectLabel:
                    input.subjectLabel ??
                    lapRoleLabel(
                        fastestLap.lapNumber,
                        fastestLapNumber,
                        "subject"
                    ),
                referenceLabel:
                    input.referenceLabel ??
                    lapRoleLabel(
                        secondFastestLap.lapNumber,
                        fastestLapNumber,
                        "reference"
                    ),
            });
        } catch (error) {
            console.error(
                "Fixed-distance split analysis failed; continuing with coaching analysis:",
                error
            );
        }

        let zoneResults: any[] = [];

        try {
            zoneAnalysisOutput = analyseZones(
                fastestLap,
                secondFastestLap,
                featureZones
            );

            zoneResults = Array.isArray(zoneAnalysisOutput)
                ? zoneAnalysisOutput
                : zoneAnalysisOutput.zones ?? zoneAnalysisOutput.zoneResults ?? [];
        } catch (error) {
            console.error(
                "Zone analysis failed; falling back to original feature zones:",
                error
            );
        }

        analysedFeatureZones = featureZones.map((zone) => {
            // Per-zone comparison channels (subject = fastestLap, reference =
            // secondFastestLap), windowed to this zone's distance range. Gives
            // the AI interpretation the same metrics per corner as the whole lap.
            let metrics;
            try {
                metrics = computeZoneMetrics(
                    fastestLap,
                    secondFastestLap,
                    zone.startDistanceMeters,
                    zone.endDistanceMeters
                );
            } catch (error) {
                console.error(
                    `Per-zone metrics failed for zone ${zone.zoneNumber}:`,
                    error
                );
            }

            const analysedZone = zoneResults.find(
                (result: any) => result.zoneNumber === zone.zoneNumber
            );

            if (!analysedZone) {
                return { ...zone, metrics };
            }

            // The delta trace is (reference - subject); flip it so the reported
            // zone delta is (subject - reference), matching the fixed-distance
            // split convention: a positive delta is time LOST (subject spent
            // more time here), a negative delta is time GAINED.
            const zoneDeltaSeconds = -analysedZone.deltaSeconds;

            return {
                ...zone,
                metrics,
                deltaSeconds: zoneDeltaSeconds,
                severity:
                    zoneDeltaSeconds < 0
                        ? ("gain" as const)
                        : ("loss" as const),
                confidence: analysedZone.confidence ?? zone.confidence,
                evidence:
                    analysedZone.reason ??
                    `Zone timing calculated using ${analysedZone.method}.`,
            };
        });
    }

    const zoneRanking = rankFeatureZones(analysedFeatureZones);

    const zoneAnalysis = zoneAnalysisOutput
        ? {
              method: zoneAnalysisOutput.method,
              validity: zoneAnalysisOutput.validity,
              reason: zoneAnalysisOutput.reason,
              totalLapDeltaSeconds: zoneAnalysisOutput.totalLapDeltaSeconds,
              reconstructedFinishDeltaSeconds:
                  zoneAnalysisOutput.reconstructedFinishDeltaSeconds,
              finishDeltaErrorSeconds: zoneAnalysisOutput.finishDeltaErrorSeconds,
              sumZoneDeltasSeconds: zoneAnalysisOutput.sumZoneDeltasSeconds,
              deltaTracePointCount: zoneAnalysisOutput.deltaTrace?.length ?? 0,
          }
        : null;

    return {
        sessionName: parsed.sessionName ?? originalName,
        date: parsed.sessionDate ?? "",
        sampleRateHz: parsed.sampleRate ?? null,
        durationSeconds: parsed.duration ?? null,
        lapCount: laps.length,
        trackLengthMeters: splitAnalysis?.trackLengthMeters ?? null,

        lapComparison: buildLapComparison(fastestLap, secondFastestLap),
        splitAnalysis,
        featureZones: analysedFeatureZones,
        zoneRanking,
        zoneAnalysis,

        coachingInsights: buildCoachingInsights(input, zoneRanking),
        setupAdvisory: buildSetupAdvisory(),

        originalName,
        sizeBytes,
        telemetrySampleCount: parsed.telemetrySampleCount,
        beaconCount: parsed.beaconMarkers?.length ?? 0,
        gpsSampleCount: parsed.gpsSampleCount ?? 0,
        hasGps: parsed.hasGps ?? false,

        gTrace: buildGTrace(fastestLap),
        referenceGTrace: buildGTrace(secondFastestLap),

        speedTrace: buildSpeedTrace(fastestLap),
        referenceSpeedTrace: buildSpeedTrace(secondFastestLap),

        fastestLapNumber,
        zoneBasis,
        customZoneMapId: input.customZoneMapId ?? null,
    };
}
