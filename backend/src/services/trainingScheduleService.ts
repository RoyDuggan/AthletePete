import Anthropic from "@anthropic-ai/sdk";

import type { IntakeAnswers } from "./athleteProfileStore";
import type { ScheduleDay } from "./trainingPlanStore";

/**
 * Turns a generated program document into a dated, day-by-day schedule that the
 * calendar renders. Uses forced tool-use for reliable structured output.
 */
const MODEL = "claude-sonnet-4-6";

const SESSION_TYPES = [
  "on_ice",
  "strength",
  "conditioning",
  "recovery",
  "mobility",
  "rest",
] as const;

const SCHEDULE_TOOL: Anthropic.Tool = {
  name: "emit_schedule",
  description:
    "Emit the dated day-by-day training schedule derived from the program.",
  input_schema: {
    type: "object",
    properties: {
      startDate: { type: "string", description: "First day, YYYY-MM-DD" },
      days: {
        type: "array",
        description: "Every calendar day in the off-season window, in order.",
        items: {
          type: "object",
          properties: {
            date: { type: "string", description: "YYYY-MM-DD" },
            type: { type: "string", enum: SESSION_TYPES as unknown as string[] },
            title: { type: "string", description: "Short session name" },
            summary: { type: "string", description: "One-line focus" },
            detail: {
              type: "string",
              description:
                "Concise session outline (key exercises, sets×reps, tempo) for training days; brief for recovery; empty for rest.",
            },
          },
          required: ["date", "type", "title"],
        },
      },
    },
    required: ["startDate", "days"],
  },
};

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set.");
  }
  if (!client) client = new Anthropic();
  return client;
}

export async function generateSchedule(
  programText: string,
  answers: IntakeAnswers
): Promise<ScheduleDay[]> {
  const today = new Date().toISOString().slice(0, 10);
  const val = (id: string) => {
    const v = answers[id];
    return Array.isArray(v) ? v.join(", ") : (v ?? "").toString();
  };

  const prompt = `Today is ${today}. Convert the hockey off-season PROGRAM below into a dated, day-by-day schedule for a calendar, then call emit_schedule.

Rules:
- Anchor to the athlete's off-season window. Season/camp dates: "${val("seasonDates")}". Availability: "${val("availability")}". On-ice access: "${val("onIceAccess")}". Fixed commitments: "${val("commitments")}".
- If exact dates are given use them; if approximate, pick sensible real calendar dates (this year/next as appropriate relative to today). Cap the plan at ~12 weeks maximum.
- Emit EVERY calendar day in the window in order (training days AND rest days). Respect the stated training days per week; make the others rest or recovery.
- Keep each day's detail concise. Rest days need no detail.
- Stay faithful to the program's phases, sessions and emphasis.

PROGRAM:
${programText}`;

  const response = await getClient().messages.create({
    model: MODEL,
    max_tokens: 8000,
    tools: [SCHEDULE_TOOL],
    tool_choice: { type: "tool", name: "emit_schedule" },
    messages: [{ role: "user", content: prompt }],
  });

  const toolUse = response.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
  );
  const data = toolUse?.input as { days?: ScheduleDay[] } | undefined;
  if (!data?.days || !Array.isArray(data.days)) return [];

  // Sanitise + sort.
  return data.days
    .filter((d) => d && typeof d.date === "string" && typeof d.title === "string")
    .map((d) => ({
      date: d.date,
      type: (SESSION_TYPES as readonly string[]).includes(d.type)
        ? d.type
        : "strength",
      title: d.title,
      summary: d.summary ?? "",
      detail: d.detail ?? "",
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
