import type { TelemetrySample } from "./aimCsvParser";

export type Lap = {
    lapNumber: number;
    startTime: number;
    endTime: number;
    lapTime: number;
    sampleCount: number;
    samples: TelemetrySample[];
    lapType: "out_lap" | "flying" | "in_lap" | "unknown";
    isValidFlyingLap: boolean;
};

export function detectLapsFromBeacons(
    samples: TelemetrySample[],
    beaconMarkers: number[]
): Lap[] {
    if (samples.length === 0 || beaconMarkers.length < 2) {
        return [];
    }

    const laps: Lap[] = [];

    for (let i = 0; i < beaconMarkers.length - 1; i++) {
        const startTime = beaconMarkers[i];
        const endTime = beaconMarkers[i + 1];
        const lapTime = endTime - startTime;

        const lapSamples = samples.filter(
            (sample) => sample.time >= startTime && sample.time < endTime
        );

        const sampleCount = lapSamples.length;

        const isFirstLap = i === 0;
        const isLastLap = i === beaconMarkers.length - 2;

        const isReasonableLapTime = lapTime > 20 && lapTime < 60;
        const hasEnoughSamples = sampleCount > 20;

        const lapType = isFirstLap
            ? "out_lap"
            : isLastLap
                ? "in_lap"
                : "flying";

        laps.push({
            lapNumber: i + 1,
            startTime,
            endTime,
            lapTime,
            sampleCount,
            samples: lapSamples,
            lapType,
            isValidFlyingLap:
                !isFirstLap &&
                !isLastLap &&
                isReasonableLapTime &&
                hasEnoughSamples,
        });
    }

    return laps;
}

export function findFastestLaps(laps: Lap[]) {
    const validFlyingLaps = laps.filter((lap) => lap.isValidFlyingLap);

    const sorted = [...validFlyingLaps].sort((a, b) => a.lapTime - b.lapTime);

    return {
        fastestLap: sorted[0] ?? null,
        secondFastestLap: sorted[1] ?? null,
    };
}