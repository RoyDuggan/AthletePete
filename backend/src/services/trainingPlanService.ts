import Anthropic from "@anthropic-ai/sdk";

import { TRAINING_PLAN_BRIEFING } from "../data/trainingPlanPrompt";
import { INTAKE_LABELS } from "../data/intakeLabels";
import type { IntakeAnswers } from "./athleteProfileStore";

/**
 * Generates a personalised hockey off-season program from a client's intake
 * answers. The fixed base briefing is the system prompt; the answers are the
 * user message. A human coach reviews the output before it reaches the athlete.
 */
const MODEL = "claude-opus-4-8";
const MAX_TOKENS = 8000;

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it to the backend environment to enable program generation."
    );
  }
  if (!client) client = new Anthropic();
  return client;
}

/** Renders saved answers into a readable, sectioned block for the prompt. */
function renderAnswers(answers: IntakeAnswers): string {
  let currentSection = "";
  const lines: string[] = ["CLIENT INTAKE QUESTIONNAIRE — RESPONSES", ""];

  for (const { id, label, section } of INTAKE_LABELS) {
    const raw = answers[id];
    const value = Array.isArray(raw) ? raw.join(", ") : (raw ?? "").toString().trim();
    if (!value) continue; // omit unanswered questions
    if (section !== currentSection) {
      currentSection = section;
      lines.push(`## ${section}`);
    }
    lines.push(`${label}: ${value}`);
  }

  return lines.join("\n");
}

/** True when there's enough to attempt a program (a handful of answers). */
export function hasEnoughToGenerate(answers: IntakeAnswers): boolean {
  return Object.values(answers).some((v) =>
    Array.isArray(v) ? v.length > 0 : String(v).trim() !== ""
  );
}

export async function generateTrainingPlan(
  answers: IntakeAnswers
): Promise<string> {
  const anthropic = getClient();

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: [
      {
        type: "text",
        text: TRAINING_PLAN_BRIEFING,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: `Build this athlete their personalised off-season program from the base philosophy above and the intake responses below.\n\n${renderAnswers(
          answers
        )}`,
      },
    ],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  if (!text) throw new Error("The program generation came back empty. Please try again.");
  return text;
}
