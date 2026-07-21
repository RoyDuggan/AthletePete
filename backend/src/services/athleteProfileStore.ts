import fs from "fs";
import path from "path";

/**
 * Per-user athlete intake questionnaire answers, persisted to the account.
 * Answers are a flat map of question id → response (string, or string[] for the
 * multi-select "what to include" question). Mirrors the other JSON file stores
 * on the appdata volume. Feeds AI training-plan generation + coach curation.
 */
export type IntakeAnswers = Record<string, string | string[]>;

type ProfileRecord = { userId: string; answers: IntakeAnswers; updatedAt: number };

const DATA_DIR = path.join(__dirname, "../../data");
const STORE_FILE = path.join(DATA_DIR, "athlete-profiles.json");

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

/** Sanitises arbitrary input into an IntakeAnswers map (strings / string[]). */
function coerce(input: unknown): IntakeAnswers {
  if (!input || typeof input !== "object") return {};
  const out: IntakeAnswers = {};
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (typeof v === "string") out[k] = v;
    else if (Array.isArray(v)) out[k] = v.filter((x): x is string => typeof x === "string");
  }
  return out;
}

export function getAthleteProfile(userId: string): IntakeAnswers {
  return readAll().find((r) => r.userId === userId)?.answers ?? {};
}

export function setAthleteProfile(userId: string, input: unknown): IntakeAnswers {
  const answers = coerce(input);
  const records = readAll().filter((r) => r.userId !== userId);
  records.push({ userId, answers, updatedAt: Date.now() });
  writeAll(records);
  return answers;
}

/** For account deletion (GDPR). */
export function deleteAthleteProfile(userId: string): void {
  writeAll(readAll().filter((r) => r.userId !== userId));
}
