import { API_BASE as BASE, withCreds } from "./config";

/** Per-user driver profile, incl. the AI-framing selections. */
export type DriverProfile = {
  name: string;
  raceNumber: string;
  kartClass: string;
  homeTrack: string;
  ageBracket: string;
  experience: string;
  coachingStyle: string;
};

export type FramingDimensionKey = "age" | "experience" | "coachingStyle";

export type FramingOption = {
  value: string;
  label: string;
  defaultPrompt: string;
};

export type FramingDimension = {
  key: FramingDimensionKey;
  label: string;
  options: FramingOption[];
};

export type DriverFraming = {
  dimensions: FramingDimension[];
  /** Admin overrides keyed by `"dim:value"`; absent keys use the default. */
  overrides: Record<string, string>;
};

export async function getDriverProfile(): Promise<DriverProfile> {
  const res = await fetch(`${BASE}/driver-profile`, withCreds);
  if (!res.ok) throw new Error("Could not load your driver profile.");
  return ((await res.json()) as { profile: DriverProfile }).profile;
}

export async function saveDriverProfile(
  profile: DriverProfile
): Promise<DriverProfile> {
  const res = await fetch(`${BASE}/driver-profile`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profile }),
    ...withCreds,
  });
  if (!res.ok) throw new Error("Could not save your driver profile.");
  return ((await res.json()) as { profile: DriverProfile }).profile;
}

export async function getDriverFraming(): Promise<DriverFraming> {
  const res = await fetch(`${BASE}/driver-framing`, withCreds);
  if (!res.ok) throw new Error("Could not load the driver framing options.");
  return (await res.json()) as DriverFraming;
}

/** Driver Admin only. Empty text resets that fragment to its default. */
export async function saveDriverFraming(
  key: string,
  text: string
): Promise<Record<string, string>> {
  const res = await fetch(`${BASE}/driver-framing`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, text }),
    ...withCreds,
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      (payload as { error?: string }).error ?? "Could not save the framing prompt."
    );
  }
  return (payload as { overrides: Record<string, string> }).overrides;
}
