import fs from "fs";
import path from "path";

/**
 * Per-user driver profile, persisted to the account (server-side) so it follows
 * the driver across devices. The AI-framing selections (ageBracket, experience,
 * coachingStyle) are used server-side to reframe coaching output; the rest are
 * plain profile details. Mirrors the other JSON file stores on the appdata
 * volume.
 */
export type DriverProfile = {
  name: string;
  raceNumber: string;
  kartClass: string;
  homeTrack: string;
  ageBracket: string;
  experience: string;
  coachingStyle: string;
};

const EMPTY_PROFILE: DriverProfile = {
  name: "",
  raceNumber: "",
  kartClass: "",
  homeTrack: "",
  ageBracket: "",
  experience: "",
  coachingStyle: "",
};

type ProfileRecord = DriverProfile & { userId: string; updatedAt: number };

const DATA_DIR = path.join(__dirname, "../../data");
const STORE_FILE = path.join(DATA_DIR, "driver-profiles.json");

function readAll(): ProfileRecord[] {
  try {
    const parsed = JSON.parse(fs.readFileSync(STORE_FILE, "utf-8"));
    return Array.isArray(parsed) ? (parsed as ProfileRecord[]) : [];
  } catch {
    return [];
  }
}

function writeAll(records: ProfileRecord[]): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(STORE_FILE, JSON.stringify(records, null, 2), "utf-8");
}

/** Normalises arbitrary input into a full DriverProfile (string fields only). */
function coerce(input: unknown): DriverProfile {
  const src = (input ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  return {
    name: str(src.name),
    raceNumber: str(src.raceNumber),
    kartClass: str(src.kartClass),
    homeTrack: str(src.homeTrack),
    ageBracket: str(src.ageBracket),
    experience: str(src.experience),
    coachingStyle: str(src.coachingStyle),
  };
}

/** The user's saved profile, or an empty profile when none exists yet. */
export function getDriverProfile(userId: string): DriverProfile {
  const record = readAll().find((r) => r.userId === userId);
  return record ? coerce(record) : { ...EMPTY_PROFILE };
}

/** Upserts the user's profile and returns the stored value. */
export function setDriverProfile(userId: string, input: unknown): DriverProfile {
  const profile = coerce(input);
  const records = readAll().filter((r) => r.userId !== userId);
  records.push({ userId, ...profile, updatedAt: Date.now() });
  writeAll(records);
  return profile;
}

/** Removes the user's profile (for account deletion). */
export function deleteDriverProfile(userId: string): void {
  writeAll(readAll().filter((r) => r.userId !== userId));
}
