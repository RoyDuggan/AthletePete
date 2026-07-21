export type ZoneTrigger = "braking" | "lateral_g" | "lateral_g_sign_change";

/**
 * Why a feature zone was selected — the deterministic basis behind the corner.
 * Carried through so downstream consumers (and the UI) can show *why* each
 * corner exists rather than treating zone locations as opaque.
 */
export type ZoneSelectionBasis = {
    /** The telemetry feature that triggered detection at this location. */
    trigger: ZoneTrigger;
    /** Detection strength: km/h speed drop (braking) or |lateral g| (cornering). */
    strength: number;
    /** How many basis laps this zone was detected in (1 in single-lap mode). */
    supportingLaps: number;
    /** Total basis laps considered when locating zones. */
    totalLaps: number;
};

export type FeatureZone = {
    zoneNumber: number;
    centerDistanceMeters: number;
    deltaSeconds: number;
    fastestApexSpeed: number | null;
    comparisonApexSpeed: number | null;
    selectionBasis: ZoneSelectionBasis;
};

type ZoneCandidate = {
    index: number;
    apexIndex: number;
    trigger: ZoneTrigger;
    speedAtTrigger: number | null;
    apexSpeed: number | null;
    lateralG: number | null;
    distance: number;
    distanceIntoLap: number;
    strength: number;
};

const MIN_BRAKING_DROP_KMH = 1.0;
const LAT_G_THRESHOLD = 0.25;
const LAT_G_SIGN_CHANGE_THRESHOLD = 0.15;

const MIN_ZONE_SPACING_METERS = 15;
const MAX_ZONES = 12;
const APEX_SEARCH_WINDOW_SAMPLES = 45;

function toNumber(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }

    if (typeof value === "string") {
        const parsed = Number(value.trim());
        return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
}

function getSpeed(sample: any): number | null {
    return toNumber(sample.speed) ?? toNumber(sample.Speed);
}

function getDistance(sample: any): number | null {
    return toNumber(sample.distance) ?? toNumber(sample.Distance);
}

function getTime(sample: any): number | null {
    return toNumber(sample.time) ?? toNumber(sample.Time);
}

function getLateralG(sample: any): number | null {
    return (
        toNumber(sample.AccelerometerY) ??
        toNumber(sample.accelerometerY) ??
        toNumber(sample["Accelerometer Y"]) ??
        toNumber(sample["AccelerometerY"])
    );
}

function distanceIntoLap(sampleDistance: number, lapStart: number): number {
    return sampleDistance - lapStart;
}

function findApexAfterIndex(
    samples: any[],
    startIndex: number
): { apexIndex: number; apexSpeed: number | null } {
    let apexIndex = startIndex;
    let apexSpeed = getSpeed(samples[startIndex]);

    const endIndex = Math.min(
        samples.length - 1,
        startIndex + APEX_SEARCH_WINDOW_SAMPLES
    );

    for (let i = startIndex; i <= endIndex; i++) {
        const speed = getSpeed(samples[i]);

        if (
            speed !== null &&
            speed > 0 &&
            (apexSpeed === null || speed < apexSpeed)
        ) {
            apexSpeed = speed;
            apexIndex = i;
        }
    }

    return {
        apexIndex,
        apexSpeed,
    };
}

function addCandidateIfValid(
    candidates: ZoneCandidate[],
    samples: any[],
    index: number,
    lapStartDistance: number,
    trigger: ZoneTrigger,
    strength: number
): void {
    const distance = getDistance(samples[index]);

    if (distance === null) return;

    const apex = findApexAfterIndex(samples, index);

    candidates.push({
        index,
        apexIndex: apex.apexIndex,
        trigger,
        speedAtTrigger: getSpeed(samples[index]),
        apexSpeed: apex.apexSpeed,
        lateralG: getLateralG(samples[index]),
        distance,
        distanceIntoLap: distanceIntoLap(distance, lapStartDistance),
        strength,
    });
}

function detectZoneCandidates(
    samples: any[],
    lapStartDistance: number
): ZoneCandidate[] {
    const rawCandidates: ZoneCandidate[] = [];

    for (let i = 1; i < samples.length - 1; i++) {
        if (i === 1) {
            console.log("FEATURE ZONE SAMPLE KEYS:", Object.keys(samples[i]));
            console.log("FEATURE ZONE SAMPLE:", samples[i]);
        }
        const previousSpeed = getSpeed(samples[i - 1]);
        const currentSpeed = getSpeed(samples[i]);

        if (previousSpeed !== null && currentSpeed !== null) {
            const speedDrop = previousSpeed - currentSpeed;

            if (speedDrop >= MIN_BRAKING_DROP_KMH) {
                addCandidateIfValid(
                    rawCandidates,
                    samples,
                    i,
                    lapStartDistance,
                    "braking",
                    speedDrop
                );
            }
        }

        const previousLatG = getLateralG(samples[i - 1]);
        const currentLatG = getLateralG(samples[i]);
        const nextLatG = getLateralG(samples[i + 1]);

        if (currentLatG !== null) {
            const absLatG = Math.abs(currentLatG);

            const crossedThreshold =
                previousLatG !== null &&
                Math.abs(previousLatG) < LAT_G_THRESHOLD &&
                absLatG >= LAT_G_THRESHOLD;

            if (crossedThreshold) {
                addCandidateIfValid(
                    rawCandidates,
                    samples,
                    i,
                    lapStartDistance,
                    "lateral_g",
                    absLatG
                );
            }

            const signChange =
                previousLatG !== null &&
                nextLatG !== null &&
                Math.sign(previousLatG) !== Math.sign(nextLatG) &&
                Math.abs(previousLatG - nextLatG) >= LAT_G_SIGN_CHANGE_THRESHOLD;

            if (signChange) {
                addCandidateIfValid(
                    rawCandidates,
                    samples,
                    i,
                    lapStartDistance,
                    "lateral_g_sign_change",
                    Math.abs(previousLatG - nextLatG)
                );
            }
        }
    }

    const sortedByStrength = [...rawCandidates].sort(
        (a, b) => b.strength - a.strength
    );

    const selected: ZoneCandidate[] = [];

    for (const candidate of sortedByStrength) {
        const tooClose = selected.some(
            (existing) =>
                Math.abs(existing.distanceIntoLap - candidate.distanceIntoLap) <
                MIN_ZONE_SPACING_METERS
        );

        if (tooClose) continue;

        selected.push(candidate);

        if (selected.length >= MAX_ZONES) break;
    }

    return selected.sort((a, b) => a.distanceIntoLap - b.distanceIntoLap);
}

function findClosestCandidate(
    targetDistanceIntoLap: number,
    candidates: ZoneCandidate[]
): ZoneCandidate | null {
    let best: ZoneCandidate | null = null;
    let bestDiff = Infinity;

    for (const candidate of candidates) {
        const diff = Math.abs(candidate.distanceIntoLap - targetDistanceIntoLap);

        if (diff < bestDiff) {
            best = candidate;
            bestDiff = diff;
        }
    }

    if (bestDiff > MIN_ZONE_SPACING_METERS) {
        return null;
    }

    return best;
}

function buildFeatureZonesFromFastestLap(
    fastestLap: any,
    comparisonLap: any
): FeatureZone[] {
    const fastestSamples = fastestLap.samples ?? [];
    const comparisonSamples = comparisonLap.samples ?? [];

    if (fastestSamples.length === 0 || comparisonSamples.length === 0) {
        return [];
    }

    const fastestStart = getDistance(fastestSamples[0]);
    const comparisonStart = getDistance(comparisonSamples[0]);

    if (fastestStart === null || comparisonStart === null) return [];

    const fastestCandidates = detectZoneCandidates(fastestSamples, fastestStart);
    const comparisonCandidates = detectZoneCandidates(
        comparisonSamples,
        comparisonStart
    );

    const zones: FeatureZone[] = [];
    let zoneNumber = 1;

    for (const candidate of fastestCandidates) {
        const comparisonMatch = findClosestCandidate(
            candidate.distanceIntoLap,
            comparisonCandidates
        );

        if (!comparisonMatch) continue;

        const fastestTime = getTime(fastestSamples[candidate.apexIndex]) ?? 0;
        const comparisonTime =
            getTime(comparisonSamples[comparisonMatch.apexIndex]) ?? 0;

        const fastestLapStartTime = getTime(fastestSamples[0]) ?? 0;
        const comparisonLapStartTime = getTime(comparisonSamples[0]) ?? 0;

        const fastestRelativeTime = fastestTime - fastestLapStartTime;
        const comparisonRelativeTime = comparisonTime - comparisonLapStartTime;

        const deltaSeconds = comparisonRelativeTime - fastestRelativeTime;

        zones.push({
            zoneNumber: zoneNumber++,
            centerDistanceMeters:
                Math.round(candidate.distanceIntoLap * 100) / 100,
            deltaSeconds: Math.round(deltaSeconds * 1000) / 1000,
            fastestApexSpeed:
                candidate.apexSpeed !== null
                    ? Math.round(candidate.apexSpeed * 100) / 100
                    : null,
            comparisonApexSpeed:
                comparisonMatch.apexSpeed !== null
                    ? Math.round(comparisonMatch.apexSpeed * 100) / 100
                    : null,
            selectionBasis: {
                trigger: candidate.trigger,
                strength: Math.round(candidate.strength * 1000) / 1000,
                supportingLaps: 1,
                totalLaps: 1,
            },
        });
    }

    return zones;
}

/**
 * Finds the apex (minimum speed) near a target distance-into-lap within a lap,
 * returning its speed and lap-relative time. Used when zone locations come from
 * a multi-lap consensus rather than this lap's own candidates.
 */
function findApexNearDistance(
    lap: any,
    centerDistanceIntoLap: number
): { apexSpeed: number | null; relativeTime: number } {
    const samples = lap?.samples ?? [];
    if (samples.length === 0) return { apexSpeed: null, relativeTime: 0 };

    const lapStartDistance = getDistance(samples[0]) ?? 0;
    const lapStartTime = getTime(samples[0]) ?? 0;

    let nearestIndex = 0;
    let nearestDiff = Infinity;

    for (let i = 0; i < samples.length; i++) {
        const distance = getDistance(samples[i]);
        if (distance === null) continue;

        const diff = Math.abs(distance - lapStartDistance - centerDistanceIntoLap);
        if (diff < nearestDiff) {
            nearestDiff = diff;
            nearestIndex = i;
        }
    }

    const half = Math.floor(APEX_SEARCH_WINDOW_SAMPLES / 2);
    const lo = Math.max(0, nearestIndex - half);
    const hi = Math.min(samples.length - 1, nearestIndex + half);

    let apexIndex = nearestIndex;
    let apexSpeed = getSpeed(samples[nearestIndex]);

    for (let i = lo; i <= hi; i++) {
        const speed = getSpeed(samples[i]);
        if (speed !== null && speed > 0 && (apexSpeed === null || speed < apexSpeed)) {
            apexSpeed = speed;
            apexIndex = i;
        }
    }

    const apexTime = getTime(samples[apexIndex]) ?? 0;

    return {
        apexSpeed: apexSpeed !== null ? Math.round(apexSpeed * 100) / 100 : null,
        relativeTime: apexTime - lapStartTime,
    };
}

/** One detection contributing to a consensus zone cluster. */
type ClusterCandidate = {
    distance: number;
    trigger: ZoneTrigger;
    strength: number;
};

/**
 * Summarises why a consensus cluster became a zone: how many basis laps it
 * recurred across, and the trigger/strength of its strongest single detection.
 */
function summariseClusterBasis(
    cluster: ClusterCandidate[],
    totalLaps: number
): ZoneSelectionBasis {
    const strongest = cluster.reduce(
        (best, c) => (c.strength > best.strength ? c : best),
        cluster[0]
    );

    return {
        trigger: strongest.trigger,
        strength: Math.round(strongest.strength * 1000) / 1000,
        // A cluster can, in rare cases, hold two detections from one lap; never
        // report more supporting laps than were actually considered.
        supportingLaps: Math.min(cluster.length, totalLaps),
        totalLaps,
    };
}

/**
 * Detects zone locations by clustering candidate apexes across multiple basis
 * laps, then evaluates each consensus zone against the subject and reference
 * laps. More robust than relying on a single lap's detections.
 */
function buildFeatureZonesFromConsensus(
    subjectLap: any,
    referenceLap: any,
    basisLaps: any[]
): FeatureZone[] {
    const candidates: ClusterCandidate[] = [];

    for (const lap of basisLaps) {
        const samples = lap?.samples ?? [];
        if (samples.length === 0) continue;

        const start = getDistance(samples[0]);
        if (start === null) continue;

        for (const candidate of detectZoneCandidates(samples, start)) {
            candidates.push({
                distance: candidate.distanceIntoLap,
                trigger: candidate.trigger,
                strength: candidate.strength,
            });
        }
    }

    if (candidates.length === 0) return [];

    // Cluster nearby candidates (across laps) into consensus zones.
    candidates.sort((a, b) => a.distance - b.distance);

    const clusters: ClusterCandidate[][] = [];
    for (const candidate of candidates) {
        const lastCluster = clusters[clusters.length - 1];
        const lastDistance = lastCluster
            ? lastCluster[lastCluster.length - 1].distance
            : null;

        if (
            lastCluster &&
            lastDistance !== null &&
            candidate.distance - lastDistance < MIN_ZONE_SPACING_METERS
        ) {
            lastCluster.push(candidate);
        } else {
            clusters.push([candidate]);
        }
    }

    // Keep zones that recur across a reasonable share of the basis laps.
    const minCount = Math.max(1, Math.ceil(basisLaps.length * 0.4));

    const kept = clusters
        .filter((cluster) => cluster.length >= minCount)
        .map((cluster) => ({
            center:
                cluster.reduce((sum, c) => sum + c.distance, 0) / cluster.length,
            basis: summariseClusterBasis(cluster, basisLaps.length),
        }))
        .sort((a, b) => a.center - b.center)
        .slice(0, MAX_ZONES);

    const zones: FeatureZone[] = [];
    let zoneNumber = 1;

    for (const { center, basis } of kept) {
        const subjectApex = findApexNearDistance(subjectLap, center);
        const referenceApex = findApexNearDistance(referenceLap, center);

        zones.push({
            zoneNumber: zoneNumber++,
            centerDistanceMeters: Math.round(center * 100) / 100,
            deltaSeconds:
                Math.round(
                    (referenceApex.relativeTime - subjectApex.relativeTime) * 1000
                ) / 1000,
            fastestApexSpeed: subjectApex.apexSpeed,
            comparisonApexSpeed: referenceApex.apexSpeed,
            selectionBasis: basis,
        });
    }

    return zones;
}

/**
 * Builds feature zones, optionally locating them from a consensus of multiple
 * basis laps. With one (or no) basis lap, the subject lap's own candidates are
 * used; with several, zone locations are clustered across them.
 */
export function buildFeatureZones(
    fastestLap: any,
    comparisonLap: any,
    basisLaps?: any[]
): FeatureZone[] {
    if (!fastestLap || !comparisonLap) return [];

    const laps =
        basisLaps && basisLaps.length > 0 ? basisLaps : [fastestLap];

    if (laps.length <= 1) {
        return buildFeatureZonesFromFastestLap(fastestLap, comparisonLap);
    }

    return buildFeatureZonesFromConsensus(fastestLap, comparisonLap, laps);
}