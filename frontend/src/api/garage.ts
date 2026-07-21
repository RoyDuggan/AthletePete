import { API_BASE, withCreds } from "./config";

export type Kart = {
  id: string;
  name: string;
  chassis: string | null;
  engine: string | null;
  notes: string | null;
  createdAt: string;
};

export type KartConfiguration = {
  id: string;
  kartId: string;
  name: string;
  chassis: string | null;
  axle: string | null;
  rideHeight: string | null;
  tyres: string | null;
  engine: string | null;
  trackWidthFront: number | null;
  trackWidthRear: number | null;
  gearFront: number | null;
  gearRear: number | null;
  airTempC: number | null;
  trackTempC: number | null;
  weatherCondition: string | null;
  notes: string | null;
  createdAt: string;
};

/** Fields accepted when creating/updating a configuration. */
export type KartConfigInput = {
  name: string;
  chassis?: string | null;
  axle?: string | null;
  rideHeight?: string | null;
  tyres?: string | null;
  engine?: string | null;
  trackWidthFront?: number | null;
  trackWidthRear?: number | null;
  gearFront?: number | null;
  gearRear?: number | null;
  airTempC?: number | null;
  trackTempC?: number | null;
  weatherCondition?: string | null;
  notes?: string | null;
};

export type StoredSession = {
  id: string;
  name: string;
  storageKey: string;
  originalName: string | null;
  sizeBytes: number | null;
  uploadedAt: string;
};

async function err(res: Response, fallback: string): Promise<string> {
  const d = await res.json().catch(() => ({}));
  return (d as { error?: string }).error ?? fallback;
}

/* ---- Karts ---- */

export async function listKarts(): Promise<{
  karts: Kart[];
  limit: number;
  used: number;
}> {
  const res = await fetch(`${API_BASE}/karts`, withCreds);
  if (!res.ok) throw new Error(await err(res, "Failed to load karts."));
  return res.json();
}

export async function createKart(input: {
  name: string;
  chassis?: string;
  engine?: string;
  notes?: string;
}): Promise<Kart> {
  const res = await fetch(`${API_BASE}/karts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    ...withCreds,
  });
  if (!res.ok) throw new Error(await err(res, "Failed to add kart."));
  return ((await res.json()) as { kart: Kart }).kart;
}

export async function deleteKart(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/karts/${id}`, {
    method: "DELETE",
    ...withCreds,
  });
  if (!res.ok) throw new Error(await err(res, "Failed to delete kart."));
}

/* ---- Kart configurations (setup snapshots) ---- */

export async function listKartConfigs(
  kartId: string
): Promise<{ configs: KartConfiguration[] }> {
  const res = await fetch(`${API_BASE}/karts/${kartId}/configs`, withCreds);
  if (!res.ok) throw new Error(await err(res, "Failed to load configurations."));
  return res.json();
}

export async function createKartConfig(
  kartId: string,
  input: KartConfigInput
): Promise<KartConfiguration> {
  const res = await fetch(`${API_BASE}/karts/${kartId}/configs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    ...withCreds,
  });
  if (!res.ok) throw new Error(await err(res, "Failed to save configuration."));
  return ((await res.json()) as { config: KartConfiguration }).config;
}

export async function deleteKartConfig(
  kartId: string,
  id: string
): Promise<void> {
  const res = await fetch(`${API_BASE}/karts/${kartId}/configs/${id}`, {
    method: "DELETE",
    ...withCreds,
  });
  if (!res.ok) throw new Error(await err(res, "Failed to delete configuration."));
}

/* ---- Sessions ---- */

export async function listSessions(): Promise<{
  sessions: StoredSession[];
  limit: number;
  used: number;
}> {
  const res = await fetch(`${API_BASE}/sessions`, withCreds);
  if (!res.ok) throw new Error(await err(res, "Failed to load sessions."));
  return res.json();
}

export async function deleteSession(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/sessions/${id}`, {
    method: "DELETE",
    ...withCreds,
  });
  if (!res.ok) throw new Error(await err(res, "Failed to delete session."));
}
