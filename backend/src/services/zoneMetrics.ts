import { computeLapSpeedMetrics } from "./lapSpeedMetrics";
import { computeLapDriveMetrics } from "./lapDriveMetrics";
import { computeLapBrakingMetrics } from "./lapBrakingMetrics";
import { computeLapRpmMetrics } from "./lapRpmMetrics";

/**
 * Per-zone version of the whole-lap comparison metrics. Each delta is
 * subject - reference, matching the sign convention in `buildLapComparison`
 * (a negative delta means the subject is faster / gained in that channel).
 *
 * These are produced by running the same speed/drive/braking/RPM metric
 * functions the overall comparison uses, but over each lap's samples
 * restricted to the zone's distance window. They give an AI interpretation
 * the same channels per corner that it gets for the whole lap.
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
    /** True when neither lap carried a usable RPM channel in this zone. */
    rpmAvailable: boolean;

    /** Number of subject samples inside the window (low counts = low confidence). */
    subjectSampleCount: number;
    referenceSampleCount: number;
};

function getSampleDistanceMeters(sample: any): number | null {
    const value =
        sample?.distanceMeters ?? sample?.distance ?? sample?.Distance;

    return typeof value === "number" && Number.isFinite(value) ? value : null;
}

const RPM_CHANNEL_KEYS = [
    "RPM",
    "rpm",
    "Engine RPM",
    "Engine_RPM",
    "EngineSpeed",
    "Engine Speed",
    "Revs",
    "revs",
];

function sampleHasRpm(sample: any): boolean {
    return RPM_CHANNEL_KEYS.some((key) => {
        const value = sample?.[key];
        if (typeof value === "number") return Number.isFinite(value) && value > 0;
        if (typeof value === "string") {
            const parsed = Number(value.trim());
            return Number.isFinite(parsed) && parsed > 0;
        }
        return false;
    });
}

/**
 * Returns a shallow copy of the lap with its samples restricted to the
 * [start, end] window, measured in metres from the lap start (the same frame
 * feature-zone distances use). Boundaries are inclusive.
 */
function windowLapToZone(
    lap: any,
    startMetersFromLapStart: number,
    endMetersFromLapStart: number
): any {
    const samples = lap?.samples ?? [];
    if (samples.length === 0) {
        return { ...lap, samples: [] };
    }

    const lapStart = getSampleDistanceMeters(samples[0]) ?? 0;

    const windowed = samples.filter((sample: any) => {
        const distance = getSampleDistanceMeters(sample);
        if (distance === null) return false;

        const relative = distance - lapStart;
        return (
            relative >= startMetersFromLapStart &&
            relative <= endMetersFromLapStart
        );
    });

    return { ...lap, samples: windowed };
}

const round2 = (value: number) => Math.round(value * 100) / 100;
const round3 = (value: number) => Math.round(value * 1000) / 1000;

/**
 * Computes per-zone comparison metrics for a subject (faster) and reference
 * lap over a single feature zone's distance window. Mirrors the channels and
 * sign convention of the whole-lap `buildLapComparison`.
 */
export function computeZoneMetrics(
    subjectLap: any,
    referenceLap: any,
    startMetersFromLapStart: number,
    endMetersFromLapStart: number
): ZoneMetrics {
    const subject = windowLapToZone(
        subjectLap,
        startMetersFromLapStart,
        endMetersFromLapStart
    );
    const reference = windowLapToZone(
        referenceLap,
        startMetersFromLapStart,
        endMetersFromLapStart
    );

    const subjectSpeed = computeLapSpeedMetrics(subject);
    const referenceSpeed = computeLapSpeedMetrics(reference);

    const subjectDrive = computeLapDriveMetrics(subject);
    const referenceDrive = computeLapDriveMetrics(reference);

    const subjectBraking = computeLapBrakingMetrics(subject);
    const referenceBraking = computeLapBrakingMetrics(reference);

    const subjectRpm = computeLapRpmMetrics(subject);
    const referenceRpm = computeLapRpmMetrics(reference);

    const rpmAvailable =
        (subject.samples ?? []).some(sampleHasRpm) ||
        (reference.samples ?? []).some(sampleHasRpm);

    const bothDriveTimes =
        subjectDrive.timeFromApexToAccelerationSeconds !== null &&
        referenceDrive.timeFromApexToAccelerationSeconds !== null;

    const bothBrakingDurations =
        subjectBraking.brakingDurationSeconds !== null &&
        referenceBraking.brakingDurationSeconds !== null;

    return {
        entrySpeedDeltaKmh: round2(
            subjectSpeed.entrySpeed - referenceSpeed.entrySpeed
        ),
        apexSpeedDeltaKmh: round2(
            subjectSpeed.apexSpeed - referenceSpeed.apexSpeed
        ),
        exitSpeedDeltaKmh: round2(
            subjectSpeed.exitSpeed - referenceSpeed.exitSpeed
        ),

        drivePhaseDeltaKmh: round2(
            subjectDrive.exitDriveGainKmh - referenceDrive.exitDriveGainKmh
        ),
        timeToAccelerationDeltaSeconds: bothDriveTimes
            ? round3(
                  (subjectDrive.timeFromApexToAccelerationSeconds as number) -
                      (referenceDrive.timeFromApexToAccelerationSeconds as number)
              )
            : null,
        subjectExitDriveRating: subjectDrive.exitDriveRating,
        referenceExitDriveRating: referenceDrive.exitDriveRating,

        maxDecelerationDeltaKmhPerSec: round2(
            subjectBraking.maxDecelerationKmhPerSec -
                referenceBraking.maxDecelerationKmhPerSec
        ),
        brakingDurationDeltaSeconds: bothBrakingDurations
            ? round3(
                  (subjectBraking.brakingDurationSeconds as number) -
                      (referenceBraking.brakingDurationSeconds as number)
              )
            : null,
        speedDropBeforeApexDeltaKmh: round2(
            subjectBraking.speedDropBeforeApexKmh -
                referenceBraking.speedDropBeforeApexKmh
        ),
        subjectBrakingRating: subjectBraking.brakingRating,
        referenceBrakingRating: referenceBraking.brakingRating,

        minRpmDelta: round2(subjectRpm.minRpm - referenceRpm.minRpm),
        maxRpmDelta: round2(subjectRpm.maxRpm - referenceRpm.maxRpm),
        rpmDropBeforeApexDelta: round2(
            subjectRpm.rpmDropBeforeApex - referenceRpm.rpmDropBeforeApex
        ),
        rpmRecoveryAfterApexDelta: round2(
            subjectRpm.rpmRecoveryAfterApex - referenceRpm.rpmRecoveryAfterApex
        ),
        subjectRpmRecoveryRating: subjectRpm.rpmRecoveryRating,
        referenceRpmRecoveryRating: referenceRpm.rpmRecoveryRating,
        rpmAvailable,

        subjectSampleCount: (subject.samples ?? []).length,
        referenceSampleCount: (reference.samples ?? []).length,
    };
}
