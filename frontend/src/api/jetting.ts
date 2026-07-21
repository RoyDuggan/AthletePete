import { API_BASE, withCreds } from "./config";

/** Mirrors the backend jetting types (kept in sync by hand, as elsewhere). */

export type JettingProfileSummary = {
  id: string;
  name: string;
  manufacturer: string;
  engineFamily: string;
  carburettor: string;
  fuelAssumption: string;
  placeholder: boolean;
};

export type JettingInputs = {
  engineProfileId: string;
  temperatureC: number;
  humidityPercent: number;
  pressureHpa: number;
  pressureType: "seaLevel" | "station";
  altitudeM: number;
  fuelType?: string;
  oilRatio?: string;
  trackCondition?: "dry" | "damp" | "wet";
  userCorrectionSteps?: number;
};

export type JettingRecommendation = {
  engineProfileId: string;
  mainJetRecommendation: number | string;
  nearestAvailableJet?: number;
  needleClip: number;
  airScrewTurns: number;
  mixtureDirection: "leaner" | "baseline" | "richer";
  airDensityKgM3: number;
  relativeAirDensityPercent: number;
  densityAltitudeM?: number;
  correctionSummary: string[];
  warnings: string[];
  confidence: "low" | "medium" | "high";
};

export async function fetchJettingProfiles(): Promise<JettingProfileSummary[]> {
  const res = await fetch(`${API_BASE}/jetting/profiles`, withCreds);
  if (!res.ok) throw new Error("Failed to load engine profiles.");
  return ((await res.json()) as { profiles: JettingProfileSummary[] }).profiles;
}

export async function postJettingRecommendation(
  inputs: JettingInputs
): Promise<JettingRecommendation> {
  const res = await fetch(`${API_BASE}/jetting/recommendation`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(inputs),
    ...withCreds,
  });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error(
      (d as { error?: string }).error ?? "Failed to calculate recommendation."
    );
  }
  return ((await res.json()) as { recommendation: JettingRecommendation })
    .recommendation;
}
