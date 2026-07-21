import type { AdvisoryData, ZoneMap } from "../types/advisoryData";
import { API_BASE as BASE, withCreds } from "./config";

export type AnalyseSessionRequest = {
  /** Subject lap's file (kept for single-session back-compat). */
  sessionId: string;
  subjectLapNumber: number | null;
  referenceLapNumber: number | null;
  zoneBasis: string;
  customZoneMapId?: string;

  /** All files in the uploaded group, so the zone basis can pool across them. */
  sessions?: string[];
  /** Which file each compared lap is from (cross-session). */
  subjectSessionId?: string | null;
  referenceSessionId?: string | null;
};

/** Re-runs the analysis for a session against the given lap/basis selection. */
export async function analyseSession(
  body: AnalyseSessionRequest
): Promise<AdvisoryData> {
  const response = await fetch(`${BASE}/analyse-session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    ...withCreds,
  });

  if (!response.ok) {
    const message = await response
      .json()
      .then((d: { error?: string }) => d.error)
      .catch(() => undefined);
    throw new Error(message ?? "Failed to analyse the selected laps.");
  }

  return (await response.json()) as AdvisoryData;
}

/** Lists all saved custom zone maps. */
export async function listZoneMaps(): Promise<ZoneMap[]> {
  const response = await fetch(`${BASE}/zone-maps`, withCreds);

  if (!response.ok) {
    throw new Error("Failed to load saved zone maps.");
  }

  const data = (await response.json()) as { zoneMaps?: ZoneMap[] };

  return data.zoneMaps ?? [];
}

/** Creates (or updates, when `id` is given) a named custom zone map. */
export async function createZoneMap(input: {
  id?: string;
  name: string;
  boundaries: number[];
  trackLengthMeters: number | null;
}): Promise<ZoneMap> {
  const response = await fetch(`${BASE}/zone-maps`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    ...withCreds,
  });

  if (!response.ok) {
    const message = await response
      .json()
      .then((d: { error?: string }) => d.error)
      .catch(() => undefined);

    throw new Error(message ?? "Failed to save the zone map.");
  }

  const data = (await response.json()) as { zoneMap: ZoneMap };

  return data.zoneMap;
}

/** Deletes a saved custom zone map. */
export async function deleteZoneMap(id: string): Promise<void> {
  const response = await fetch(`${BASE}/zone-maps/${id}`, {
    method: "DELETE",
    ...withCreds,
  });

  if (!response.ok) {
    throw new Error("Failed to delete the zone map.");
  }
}
