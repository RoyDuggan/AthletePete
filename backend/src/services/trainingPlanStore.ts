import fs from "fs";
import path from "path";

/** One dated session for the calendar. */
export type ScheduleDay = {
  date: string; // YYYY-MM-DD
  type: "on_ice" | "strength" | "conditioning" | "recovery" | "mobility" | "rest";
  title: string;
  summary?: string;
  detail?: string;
};

/**
 * Per-user generated training plan, persisted to the account. Status tracks the
 * coach-curation flow: "generated" (AI draft) → later "curated" / "active".
 * `schedule` is the dated day-by-day breakdown that drives the calendar.
 */
export type TrainingPlan = {
  plan: string;
  schedule: ScheduleDay[];
  status: "generated" | "curated" | "active";
  generatedAt: number;
  updatedAt: number;
};

type PlanRecord = TrainingPlan & { userId: string };

const DATA_DIR = path.join(__dirname, "../../data");
const STORE_FILE = path.join(DATA_DIR, "training-plans.json");

function readAll(): PlanRecord[] {
  try {
    const parsed = JSON.parse(fs.readFileSync(STORE_FILE, "utf-8"));
    return Array.isArray(parsed) ? (parsed as PlanRecord[]) : [];
  } catch {
    return [];
  }
}

function writeAll(records: PlanRecord[]): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(STORE_FILE, JSON.stringify(records, null, 2), "utf-8");
}

export function getTrainingPlan(userId: string): TrainingPlan | null {
  const r = readAll().find((x) => x.userId === userId);
  if (!r) return null;
  const { userId: _u, ...plan } = r;
  return { ...plan, schedule: plan.schedule ?? [] };
}

export function saveTrainingPlan(
  userId: string,
  plan: string,
  status: TrainingPlan["status"] = "generated",
  schedule?: ScheduleDay[]
): TrainingPlan {
  const now = Date.now();
  const prev = readAll().find((x) => x.userId === userId);
  const record: PlanRecord = {
    userId,
    plan,
    // Preserve the existing schedule on a prose-only edit (coach curation).
    schedule: schedule ?? prev?.schedule ?? [],
    status,
    generatedAt: status === "generated" ? now : prev?.generatedAt ?? now,
    updatedAt: now,
  };
  writeAll([...readAll().filter((x) => x.userId !== userId), record]);
  const { userId: _u, ...out } = record;
  return out;
}

export function deleteTrainingPlan(userId: string): void {
  writeAll(readAll().filter((x) => x.userId !== userId));
}

/** userId → plan status summary, for the coach roster (single read). */
export function listPlanStatuses(): Record<
  string,
  { status: TrainingPlan["status"]; generatedAt: number }
> {
  const out: Record<string, { status: TrainingPlan["status"]; generatedAt: number }> = {};
  for (const r of readAll()) out[r.userId] = { status: r.status, generatedAt: r.generatedAt };
  return out;
}
