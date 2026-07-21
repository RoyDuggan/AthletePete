import type { FeatureZone } from "../types/advisoryData";

export type RankedZone = FeatureZone & {
  rank: number;
  impactType: "gain" | "loss";
  impactSeconds: number;
};

export type ZoneRankingResult = {
  topGainZones: RankedZone[];
  topLossZones: RankedZone[];
};

export function rankFeatureZones(
  featureZones: FeatureZone[],
  limit = 3
): ZoneRankingResult {
  const ranked = featureZones
    .filter((zone) => Number.isFinite(zone.deltaSeconds))
    .map((zone) => ({
      ...zone,
      impactSeconds: Math.abs(zone.deltaSeconds),
      impactType: zone.deltaSeconds < 0 ? "gain" : "loss",
    }))
    .filter((zone) => zone.impactSeconds > 0.005);

  const topGainZones = ranked
    .filter((zone) => zone.impactType === "gain")
    .sort((a, b) => b.impactSeconds - a.impactSeconds)
    .slice(0, limit)
    .map((zone, index) => ({
      ...zone,
      rank: index + 1,
    })) as RankedZone[];

  const topLossZones = ranked
    .filter((zone) => zone.impactType === "loss")
    .sort((a, b) => b.impactSeconds - a.impactSeconds)
    .slice(0, limit)
    .map((zone, index) => ({
      ...zone,
      rank: index + 1,
    })) as RankedZone[];

  return {
    topGainZones,
    topLossZones,
  };
}