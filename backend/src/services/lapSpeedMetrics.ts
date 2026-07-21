export type LapSpeedMetrics = {
    entrySpeed: number;
    apexSpeed: number;
    exitSpeed: number;
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

/**
 * Fraction of the window (measured by distance) averaged for the entry and exit
 * speeds. Averaging the outer slice — rather than reading one sample at a fixed
 * index — makes entry/exit robust to GPS speed spikes, and keying it off
 * DISTANCE (not sample count) means the subject and reference laps are always
 * compared over the same stretch of track even though a slower lap logs more
 * samples in the same window.
 */
const EDGE_FRACTION = 0.15;

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

function getDistanceMeters(sample: any): number | null {
    const value =
        sample?.distanceMeters ?? sample?.distance ?? sample?.Distance;

    return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function mean(values: number[]): number {
    return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function computeLapSpeedMetrics(lap: any): LapSpeedMetrics {
    const samples = lap?.samples ?? [];
    const zero: LapSpeedMetrics = { entrySpeed: 0, apexSpeed: 0, exitSpeed: 0 };

    if (samples.length === 0) return zero;

    // Pair each usable speed reading with its distance (when present).
    const points = samples
        .map((sample: any) => ({
            distance: getDistanceMeters(sample),
            speed: getSpeed(sample),
        }))
        .filter((point: { speed: number }) => point.speed > 0);

    if (points.length === 0) return zero;

    const speeds = points.map((point: { speed: number }) => point.speed);
    const apexSpeed = Math.min(...speeds);

    // Preferred path: average entry/exit over the outer EDGE_FRACTION of the
    // window by DISTANCE, so both laps are measured over the same track stretch.
    const located = points.filter(
        (point: { distance: number | null }) => point.distance !== null
    ) as { distance: number; speed: number }[];

    if (located.length >= 2) {
        const distances = located.map((point) => point.distance);
        const dMin = Math.min(...distances);
        const dMax = Math.max(...distances);
        const span = dMax - dMin;

        if (span > 0) {
            const entryCut = dMin + span * EDGE_FRACTION;
            const exitCut = dMax - span * EDGE_FRACTION;

            const entryVals = located
                .filter((point) => point.distance <= entryCut)
                .map((point) => point.speed);
            const exitVals = located
                .filter((point) => point.distance >= exitCut)
                .map((point) => point.speed);

            return {
                entrySpeed: entryVals.length
                    ? mean(entryVals)
                    : located[0].speed,
                apexSpeed,
                exitSpeed: exitVals.length
                    ? mean(exitVals)
                    : located[located.length - 1].speed,
            };
        }
    }

    // Fallback (no distance channel): average the outer EDGE_FRACTION of samples
    // by index. Still noise-resistant, just not distance-aligned.
    const n = speeds.length;
    const edge = Math.max(1, Math.round(n * EDGE_FRACTION));

    return {
        entrySpeed: mean(speeds.slice(0, edge)),
        apexSpeed,
        exitSpeed: mean(speeds.slice(n - edge)),
    };
}
