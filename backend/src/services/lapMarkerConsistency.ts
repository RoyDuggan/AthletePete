export type LapMarkerRow = {
    lapNumber: number;
    lapTimeSeconds: number;
    sampleCount: number;

    lapStartDistanceMeters: number | null;
    lapEndDistanceMeters: number | null;
    lapDistanceMeters: number | null;

    highestSpeedKmh: number | null;
    highestSpeedDistanceMeters: number | null;
    highestSpeedDistanceIntoLapMeters: number | null;

    turnInProxyDistanceMeters: number | null;
    turnInProxyDistanceIntoLapMeters: number | null;
    turnInProxyReason: string;

    apexProxySpeedKmh: number | null;
    apexProxyDistanceMeters: number | null;
    apexProxyDistanceIntoLapMeters: number | null;
};

export type MarkerStats = {
    markerName: string;
    lapCount: number;
    meanDistanceMeters: number | null;
    standardDeviationMeters: number | null;
    rangeMeters: number | null;
    maxDeviationMeters: number | null;
    coefficientOfVariationPercent: number | null;
    status: "Excellent" | "Acceptable" | "Investigate" | "No Data";
};

export type LapMarkerConsistencyReport = {
    lapMarkers: LapMarkerRow[];
    markerStats: MarkerStats[];
};

function toNumber(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value)) return value;

    if (typeof value === "string") {
        const parsed = Number(value.trim());
        return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
}

function getSpeed(sample: any): number | null {
    return (
        toNumber(sample.speed) ??
        toNumber(sample.Speed) ??
        toNumber(sample["GPS Speed"]) ??
        toNumber(sample["Vehicle Speed"])
    );
}

function getDistance(sample: any): number | null {
    return (
        toNumber(sample.distance) ??
        toNumber(sample.Distance) ??
        toNumber(sample["GPS Distance"])
    );
}

function distanceIntoLap(
    absoluteDistance: number | null,
    lapStartDistance: number | null
): number | null {
    if (absoluteDistance === null || lapStartDistance === null) {
        return null;
    }

    return Math.round((absoluteDistance - lapStartDistance) * 100) / 100;
}

function mean(values: number[]): number | null {
    if (values.length === 0) return null;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values: number[]): number | null {
    if (values.length < 2) return null;

    const avg = mean(values);
    if (avg === null) return null;

    const variance =
        values.reduce((sum, value) => sum + Math.pow(value - avg, 2), 0) /
        (values.length - 1);

    return Math.sqrt(variance);
}

function buildStats(markerName: string, values: Array<number | null>): MarkerStats {
    const numericValues = values.filter(
        (value): value is number => value !== null && Number.isFinite(value)
    );

    if (numericValues.length === 0) {
        return {
            markerName,
            lapCount: 0,
            meanDistanceMeters: null,
            standardDeviationMeters: null,
            rangeMeters: null,
            maxDeviationMeters: null,
            coefficientOfVariationPercent: null,
            status: "No Data",
        };
    }

    const avg = mean(numericValues);
    const sd = standardDeviation(numericValues);
    const min = Math.min(...numericValues);
    const max = Math.max(...numericValues);
    const range = max - min;

    const maxDeviation =
        avg !== null
            ? Math.max(...numericValues.map((value) => Math.abs(value - avg)))
            : null;

    const coefficientOfVariationPercent =
        avg !== null && avg !== 0 && sd !== null ? (sd / avg) * 100 : null;

    let status: MarkerStats["status"] = "Investigate";

    if (sd !== null && sd <= 2) {
        status = "Excellent";
    } else if (sd !== null && sd <= 5) {
        status = "Acceptable";
    }

    return {
        markerName,
        lapCount: numericValues.length,
        meanDistanceMeters: avg !== null ? Math.round(avg * 100) / 100 : null,
        standardDeviationMeters: sd !== null ? Math.round(sd * 100) / 100 : null,
        rangeMeters: Math.round(range * 100) / 100,
        maxDeviationMeters:
            maxDeviation !== null ? Math.round(maxDeviation * 100) / 100 : null,
        coefficientOfVariationPercent:
            coefficientOfVariationPercent !== null
                ? Math.round(coefficientOfVariationPercent * 1000) / 1000
                : null,
        status,
    };
}

function findHighestSpeedPoint(samples: any[]) {
    let bestSample: any | null = null;
    let bestSpeed = -Infinity;

    for (const sample of samples) {
        const speed = getSpeed(sample);
        if (speed !== null && speed > bestSpeed) {
            bestSpeed = speed;
            bestSample = sample;
        }
    }

    return {
        sample: bestSample,
        speed: bestSample ? bestSpeed : null,
        distance: bestSample ? getDistance(bestSample) : null,
    };
}

function findApexProxyPoint(samples: any[]) {
    let bestSample: any | null = null;
    let lowestSpeed = Infinity;

    for (const sample of samples) {
        const speed = getSpeed(sample);
        if (speed !== null && speed > 0 && speed < lowestSpeed) {
            lowestSpeed = speed;
            bestSample = sample;
        }
    }

    return {
        sample: bestSample,
        speed: bestSample ? lowestSpeed : null,
        distance: bestSample ? getDistance(bestSample) : null,
    };
}

function findTurnInProxyPoint(samples: any[], highestSpeedIndex: number) {
    const SPEED_DROP_THRESHOLD_KMH = 1.0;

    for (let i = highestSpeedIndex + 1; i < samples.length - 1; i++) {
        const currentSpeed = getSpeed(samples[i]);
        const nextSpeed = getSpeed(samples[i + 1]);

        if (currentSpeed === null || nextSpeed === null) continue;

        if (currentSpeed - nextSpeed >= SPEED_DROP_THRESHOLD_KMH) {
            return {
                sample: samples[i + 1],
                distance: getDistance(samples[i + 1]),
                reason: `First speed drop >= ${SPEED_DROP_THRESHOLD_KMH} km/h after highest speed`,
            };
        }
    }

    return {
        sample: null,
        distance: null,
        reason: "No meaningful post-maximum speed drop detected",
    };
}

export function buildLapMarkerConsistencyReport(
    laps: any[]
): LapMarkerConsistencyReport {
    const flyingLaps = laps.filter((lap) => lap.isValidFlyingLap);

    const lapMarkers: LapMarkerRow[] = flyingLaps.map((lap) => {
        const samples = lap.samples ?? [];

        const firstSample = samples[0];
        const lastSample = samples[samples.length - 1];

        const startDistance = firstSample ? getDistance(firstSample) : null;
        const endDistance = lastSample ? getDistance(lastSample) : null;

        const lapDistance =
            startDistance !== null && endDistance !== null
                ? Math.round((endDistance - startDistance) * 100) / 100
                : null;

        const highest = findHighestSpeedPoint(samples);
        const highestSpeedIndex = highest.sample
            ? samples.findIndex((sample: any) => sample === highest.sample)
            : -1;

        const turnIn =
            highestSpeedIndex >= 0
                ? findTurnInProxyPoint(samples, highestSpeedIndex)
                : {
                    sample: null,
                    distance: null,
                    reason: "Highest speed point unavailable",
                };

        const apex = findApexProxyPoint(samples);

        return {
            lapNumber: lap.lapNumber,
            lapTimeSeconds: lap.lapTime ?? 0,
            sampleCount: samples.length,

            lapStartDistanceMeters: startDistance,
            lapEndDistanceMeters: endDistance,
            lapDistanceMeters: lapDistance,

            highestSpeedKmh: highest.speed,
            highestSpeedDistanceMeters: highest.distance,
            highestSpeedDistanceIntoLapMeters: distanceIntoLap(
                highest.distance,
                startDistance
            ),

            turnInProxyDistanceMeters: turnIn.distance,
            turnInProxyDistanceIntoLapMeters: distanceIntoLap(
                turnIn.distance,
                startDistance
            ),
            turnInProxyReason: turnIn.reason,

            apexProxySpeedKmh: apex.speed,
            apexProxyDistanceMeters: apex.distance,
            apexProxyDistanceIntoLapMeters: distanceIntoLap(
                apex.distance,
                startDistance
            ),
        };
    });

    return {
        lapMarkers,
        markerStats: [
            buildStats(
                "Lap Distance",
                lapMarkers.map((row) => row.lapDistanceMeters)
            ),
            buildStats(
                "Highest Speed Distance Into Lap",
                lapMarkers.map((row) => row.highestSpeedDistanceIntoLapMeters)
            ),
            buildStats(
                "Turn-In Proxy Distance Into Lap",
                lapMarkers.map((row) => row.turnInProxyDistanceIntoLapMeters)
            ),
            buildStats(
                "Apex Proxy Distance Into Lap",
                lapMarkers.map((row) => row.apexProxyDistanceIntoLapMeters)
            ),
        ],
    };
}