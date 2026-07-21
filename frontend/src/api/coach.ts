import { API_BASE as BASE, withCreds } from "./config";
import type { IntakeAnswers } from "./athlete";
import type { TrainingPlan } from "./trainingPlan";

export type CoachAthlete = {
  userId: string;
  email: string;
  fullName: string | null;
  hasProfile: boolean;
  planStatus: "generated" | "curated" | "active" | null;
  generatedAt: number | null;
};

export type CoachAthleteDetail = {
  athlete: { userId: string; email: string; fullName: string | null };
  profile: IntakeAnswers;
  plan: TrainingPlan | null;
};

export async function listAthletes(): Promise<CoachAthlete[]> {
  const res = await fetch(`${BASE}/coach/athletes`, withCreds);
  if (!res.ok) throw new Error("Could not load athletes.");
  return ((await res.json()) as { athletes: CoachAthlete[] }).athletes;
}

export async function getAthlete(userId: string): Promise<CoachAthleteDetail> {
  const res = await fetch(`${BASE}/coach/athletes/${userId}`, withCreds);
  if (!res.ok) throw new Error("Could not load the athlete.");
  return (await res.json()) as CoachAthleteDetail;
}

/** Coach-triggered AI generation from the athlete's saved questionnaire. Slow. */
export async function generateAthletePlan(userId: string): Promise<TrainingPlan> {
  const res = await fetch(`${BASE}/coach/athletes/${userId}/generate`, {
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

export async function saveAthletePlan(
  userId: string,
  plan: string,
  status: "curated" | "active" = "curated"
): Promise<TrainingPlan> {
  const res = await fetch(`${BASE}/coach/athletes/${userId}/plan`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan, status }),
    ...withCreds,
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((payload as { error?: string }).error ?? "Could not save the plan.");
  }
  return (payload as { plan: TrainingPlan }).plan;
}
