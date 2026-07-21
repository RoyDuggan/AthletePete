export type LapDriveMetrics = {
    apexIndex: number;
    apexTimeSeconds: number | null;
    accelerationOnsetTimeSeconds: number | null;
    timeFromApexToAccelerationSeconds: number | null;
    exitDriveGainKmh: number;
    exitDriveRating: "strong" | "moderate" | "weak" | "unknown";
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

export function computeLapDriveMetrics(lap: any): LapDriveMetrics {
    const samples = lap.samples ?? [];

    if (samples.length < 5) {
        return {
            apexIndex: -1,
            apexTimeSeconds: null,
            accelerationOnsetTimeSeconds: null,
            timeFromApexToAccelerationSeconds: null,
            exitDriveGainKmh: 0,
            exitDriveRating: "unknown",
        };
    }

    const speeds = samples.map(getSpeed);
    const times = samples.map(getTimeSeconds);

    const validSpeeds = speeds.filter((speed: number) => speed > 0);

    if (validSpeeds.length === 0) {
        return {
            apexIndex: -1,
            apexTimeSeconds: null,
            accelerationOnsetTimeSeconds: null,
            timeFromApexToAccelerationSeconds: null,
            exitDriveGainKmh: 0,
            exitDriveRating: "unknown",
        };
    }

    let apexIndex = 0;
    let apexSpeed = Number.POSITIVE_INFINITY;

    speeds.forEach((speed: number, index: number) => {
        if (speed > 0 && speed < apexSpeed) {
            apexSpeed = speed;
            apexIndex = index;
        }
    });

    const apexTimeSeconds = times[apexIndex] ?? null;

    let accelerationOnsetIndex: number | null = null;

    for (let i = apexIndex + 1; i < speeds.length - 2; i++) {
        const current = speeds[i];
        const next = speeds[i + 1];
        const next2 = speeds[i + 2];
        const MIN_ACCEL_DELTA = 0.5; // km/h change to count as real acceleration

        for (let i = apexIndex + 1; i < speeds.length - 2; i++) {
            const current = speeds[i];
            const next = speeds[i + 1];
            const next2 = speeds[i + 2];

            const delta1 = next - current;
            const delta2 = next2 - next;

            if (delta1 > MIN_ACCEL_DELTA && delta2 > MIN_ACCEL_DELTA) {
                accelerationOnsetIndex = i;
                break;
            }
        }

    }

    const accelerationOnsetTimeSeconds =
        accelerationOnsetIndex !== null ? times[accelerationOnsetIndex] : null;

    const timeFromApexToAccelerationSeconds =
        accelerationOnsetTimeSeconds !== null && apexTimeSeconds !== null
            ? Math.round((accelerationOnsetTimeSeconds - apexTimeSeconds) * 1000) /
            1000
            : null;

    const exitWindowStart = Math.floor(samples.length * 0.75);

    const exitWindowSpeeds = speeds
        .slice(exitWindowStart)
        .filter((s: number) => s > 0);

    const exitSpeed =
        exitWindowSpeeds.length > 0 ? exitWindowSpeeds[exitWindowSpeeds.length - 1] : apexSpeed;

    const exitDriveGainKmh =
        Math.round((exitSpeed - apexSpeed) * 100) / 100;

    const exitDriveRating =
        exitDriveGainKmh >= 10
            ? "strong"
            : exitDriveGainKmh >= 5
                ? "moderate"
                : exitDriveGainKmh > 0
                    ? "weak"
                    : "unknown";

    return {
        apexIndex,
        apexTimeSeconds,
        accelerationOnsetTimeSeconds,
        timeFromApexToAccelerationSeconds,
        exitDriveGainKmh,
        exitDriveRating,
    };
}