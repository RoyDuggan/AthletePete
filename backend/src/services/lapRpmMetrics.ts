export type RpmBehaviourRating =
    | "strong_recovery"
    | "moderate_recovery"
    | "weak_recovery"
    | "unknown";

export type LapRpmMetrics = {
    minRpm: number;
    maxRpm: number;
    rpmDropBeforeApex: number;
    rpmRecoveryAfterApex: number;
    rpmRecoveryRating: RpmBehaviourRating;
};

const RPM_CHANNEL_CANDIDATES = [
    "RPM",
    "rpm",
    "Engine RPM",
    "Engine_RPM",
    "EngineSpeed",
    "Engine Speed",
    "Revs",
    "revs",
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

function getRpm(sample: any): number {
    for (const key of RPM_CHANNEL_CANDIDATES) {
        const value = toNumber(sample[key]);
        if (value !== null) {
            return value;
        }
    }

    return 0;
}

export function computeLapRpmMetrics(lap: any): LapRpmMetrics {
    const samples = lap.samples ?? [];

    if (samples.length < 5) {
        return {
            minRpm: 0,
            maxRpm: 0,
            rpmDropBeforeApex: 0,
            rpmRecoveryAfterApex: 0,
            rpmRecoveryRating: "unknown",
        };
    }

    const rpms = samples.map(getRpm).filter((rpm: number) => rpm > 0);

    if (rpms.length === 0) {
        return {
            minRpm: 0,
            maxRpm: 0,
            rpmDropBeforeApex: 0,
            rpmRecoveryAfterApex: 0,
            rpmRecoveryRating: "unknown",
        };
    }

    let minRpm = Number.POSITIVE_INFINITY;
    let minRpmIndex = 0;

    rpms.forEach((rpm: number, index: number) => {
        if (rpm < minRpm) {
            minRpm = rpm;
            minRpmIndex = index;
        }
    });

    const maxRpm = Math.max(...rpms);

    const preApexRpms = rpms.slice(0, minRpmIndex).filter((rpm: number) => rpm > 0);
    const postApexRpms = rpms.slice(minRpmIndex).filter((rpm: number) => rpm > 0);

    const preApexMaxRpm =
        preApexRpms.length > 0 ? Math.max(...preApexRpms) : minRpm;

    const postApexMaxRpm =
        postApexRpms.length > 0 ? Math.max(...postApexRpms) : minRpm;

    const rpmDropBeforeApex = Math.round((preApexMaxRpm - minRpm) * 100) / 100;
    const rpmRecoveryAfterApex =
        Math.round((postApexMaxRpm - minRpm) * 100) / 100;

    const rpmRecoveryRating =
        rpmRecoveryAfterApex >= 1200
            ? "strong_recovery"
            : rpmRecoveryAfterApex >= 600
                ? "moderate_recovery"
                : rpmRecoveryAfterApex > 0
                    ? "weak_recovery"
                    : "unknown";

    return {
        minRpm: Math.round(minRpm * 100) / 100,
        maxRpm: Math.round(maxRpm * 100) / 100,
        rpmDropBeforeApex,
        rpmRecoveryAfterApex,
        rpmRecoveryRating,
    };
}