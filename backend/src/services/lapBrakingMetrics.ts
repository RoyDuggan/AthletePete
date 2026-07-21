export type LapBrakingMetrics = {
    maxDecelerationKmhPerSec: number;
    brakingStartTimeSeconds: number | null;
    brakingDurationSeconds: number | null;
    speedDropBeforeApexKmh: number;
    brakingRating: "hard" | "moderate" | "light" | "unknown";
};

const SPEED_CHANNEL_CANDIDATES = [
    "Speed",
    "speed",
    "GPS Speed",
    "GPS_Speed",
    "Vehicle Speed",
    "VehicleSpeed",
    "Speed GPS",
    "GPS Speed km/h",
    "km/h",
];

function toNumber(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }

    if (typeof value === "string") {
        const parsed = Number(value.trim());
        if (Number.isFinite(parsed)) {
            return parsed;
        }
    }

    return null;
}

function getSpeed(sample: any): number {
    for (const key of SPEED_CHANNEL_CANDIDATES) {
        const value = toNumber(sample[key]);
        if (value !== null) {
            return value;
        }
    }

    return 0;
}

function getTimeSeconds(sample: any, fallbackIndex: number): number {
    return (
        toNumber(sample.time) ??
        toNumber(sample.Time) ??
        toNumber(sample.seconds) ??
        toNumber(sample.timestamp) ??
        fallbackIndex
    );
}

export function computeLapBrakingMetrics(lap: any): LapBrakingMetrics {
    const samples = lap.samples ?? [];

    if (samples.length < 5) {
        return {
            maxDecelerationKmhPerSec: 0,
            brakingStartTimeSeconds: null,
            brakingDurationSeconds: null,
            speedDropBeforeApexKmh: 0,
            brakingRating: "unknown",
        };
    }

    const speeds = samples.map(getSpeed);
    const times = samples.map((s: any, i: number) => getTimeSeconds(s, i));

    // --- Find apex (minimum speed) ---
    let apexIndex = 0;
    let apexSpeed = Number.POSITIVE_INFINITY;

    speeds.forEach((speed: number, index: number) => {
        if (speed > 0 && speed < apexSpeed) {
            apexSpeed = speed;
            apexIndex = index;
        }
    });

    if (!Number.isFinite(apexSpeed)) {
        return {
            maxDecelerationKmhPerSec: 0,
            brakingStartTimeSeconds: null,
            brakingDurationSeconds: null,
            speedDropBeforeApexKmh: 0,
            brakingRating: "unknown",
        };
    }

    // --- Compute deceleration ---
    let maxDeceleration = 0;
    let brakingStartIndex: number | null = null;

    const DECEL_THRESHOLD = -1.0; // km/h per second (proxy threshold)

    for (let i = 1; i <= apexIndex; i++) {
        const dt = times[i] - times[i - 1];

        if (dt <= 0) continue;

        const speedDelta = speeds[i] - speeds[i - 1];
        const rate = speedDelta / dt;

        // Track max deceleration
        if (rate < maxDeceleration) {
            maxDeceleration = rate;
        }

        // Detect braking start (first meaningful deceleration)
        if (brakingStartIndex === null && rate <= DECEL_THRESHOLD) {
            brakingStartIndex = i - 1;
        }
    }

    const brakingStartTimeSeconds =
        brakingStartIndex !== null ? times[brakingStartIndex] : null;

    const apexTimeSeconds = times[apexIndex];

    const brakingDurationSeconds =
        brakingStartTimeSeconds !== null
            ? Math.round((apexTimeSeconds - brakingStartTimeSeconds) * 1000) / 1000
            : null;

    // --- Speed drop before apex ---
    const preApexSpeeds = speeds.slice(0, apexIndex).filter((s: number) => s > 0);

    const preApexMaxSpeed =
        preApexSpeeds.length > 0
            ? Math.max(...preApexSpeeds)
            : apexSpeed;

    const speedDropBeforeApexKmh =
        Math.round((preApexMaxSpeed - apexSpeed) * 100) / 100;

    // --- Braking rating ---
    const absMaxDecel = Math.abs(maxDeceleration);

    const brakingRating =
        absMaxDecel >= 12
            ? "hard"
            : absMaxDecel >= 6
                ? "moderate"
                : absMaxDecel > 0
                    ? "light"
                    : "unknown";

    return {
        maxDecelerationKmhPerSec:
            Math.round(absMaxDecel * 100) / 100,
        brakingStartTimeSeconds,
        brakingDurationSeconds,
        speedDropBeforeApexKmh,
        brakingRating,
    };
}