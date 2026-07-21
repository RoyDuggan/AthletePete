import { API_BASE as BASE, withCreds } from "./config";

export type IntakeAnswers = Record<string, string | string[]>;

export async function getAthleteProfile(): Promise<IntakeAnswers> {
  const res = await fetch(`${BASE}/athlete-profile`, withCreds);
  if (!res.ok) throw new Error("Could not load your athlete profile.");
  return ((await res.json()) as { answers: IntakeAnswers }).answers ?? {};
}

export async function saveAthleteProfile(
  answers: IntakeAnswers
): Promise<IntakeAnswers> {
  const res = await fetch(`${BASE}/athlete-profile`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ answers }),
    ...withCreds,
  });
  if (!res.ok) throw new Error("Could not save your athlete profile.");
  return ((await res.json()) as { answers: IntakeAnswers }).answers ?? {};
}
