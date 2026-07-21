import { API_BASE as BASE, withCreds } from "./config";

export type ScheduleDay = {
  date: string; // YYYY-MM-DD
  type: "on_ice" | "strength" | "conditioning" | "recovery" | "mobility" | "rest";
  title: string;
  summary?: string;
  detail?: string;
};

export type TrainingPlan = {
  plan: string;
  schedule: ScheduleDay[];
  status: "generated" | "curated" | "active";
  generatedAt: number;
  updatedAt: number;
};

export async function getTrainingPlan(): Promise<TrainingPlan | null> {
  const res = await fetch(`${BASE}/training-plan`, withCreds);
  if (!res.ok) throw new Error("Could not load your program.");
  return ((await res.json()) as { plan: TrainingPlan | null }).plan;
}

/** Generates (and stores) a program from the saved questionnaire. Slow call. */
export async function generateTrainingPlan(): Promise<TrainingPlan> {
  const res = await fetch(`${BASE}/training-plan/generate`, {
    method: "POST",
    ...withCreds,
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      (payload as { error?: string }).error ?? "Could not generate the program."
    );
  }
  return (payload as { plan: TrainingPlan }).plan;
}
