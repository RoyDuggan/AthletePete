import Anthropic from "@anthropic-ai/sdk";

/**
 * AI "race data engineer" interpretation of a SINGLE feature zone.
 *
 * The deterministic per-zone comparison the pipeline produces (zone delta plus
 * windowed speed/braking/drive/RPM channels) is rendered into a customisable
 * prompt template and sent to Claude for a concise, structured read of that one
 * zone. The template is user-editable on the frontend; the default lives here
 * so the server is the single source of truth for the starting context.
 */

const MODEL = "claude-opus-4-8";

/**
 * Default, customisable prompt context. `{{placeholders}}` are filled per zone
 * from the supplied `values` map before the request is sent to the model.
 */
export const DEFAULT_ZONE_PROMPT_TEMPLATE = `You are acting as a professional kart race data engineer.

Interpret the following telemetry-derived comparison for ONE track zone only. Do not invent facts beyond the supplied metrics. Explain the likely driver influence, but distinguish clearly between strong evidence, reasonable inference, and uncertainty.

Zone context:
- Zone number: {{zoneNumber}}
- Zone type: {{zoneType}}
  Options: braking zone / full corner / apex zone / exit zone / straight / back straight / unknown
- Start distance: {{startDistance}} m
- End distance: {{endDistance}} m
- Subject lap: {{subjectLap}}
- Reference lap: {{referenceLap}}
- Subject lap time: {{subjectLapTime}} s
- Reference lap time: {{referenceLapTime}} s
- Overall lap delta: {{overallDelta}} s
- Zone time delta: {{zoneDelta}} s

Metrics:
- Entry speed delta: {{entrySpeedDelta}} km/h
- Apex speed delta: {{apexSpeedDelta}} km/h
- Exit speed delta: {{exitSpeedDelta}} km/h
- Inferred drive phase delta: {{drivePhaseDelta}} km/h
- Time to acceleration delta: {{timeToAccelerationDelta}} s
- Exit drive rating: {{exitDriveRating}}
- Inferred max deceleration delta: {{maxDecelDelta}} km/h/s
- Braking duration delta: {{brakingDurationDelta}} s
- Speed drop before apex delta: {{speedDropBeforeApexDelta}} km/h
- Braking rating: {{brakingRating}}
- RPM deltas: {{rpmSummary}}
- Confidence: {{confidence}}
- Basis: {{basis}}

Required output format:

1. Zone summary
Give a concise explanation of what happened in this zone and whether the subject gained or lost time.

2. Driver influence
Explain what the driver most likely did differently: braking point, brake pressure, release, turn-in, rotation, apex speed, throttle timing, exit commitment, or straight-line speed.

3. Coaching interpretation
State the most useful coaching message for the driver in plain language.

4. Evidence
List the 3-5 strongest supplied metrics supporting the interpretation.

5. Uncertainty / checks
Identify any metrics that appear contradictory or require trace/GPS validation.

Rules:
- Do not claim certainty where the data only supports inference.
- Do not over-focus on one metric if others contradict it.
- If RPM data is zero or unknown, say RPM cannot be used.
- If the zone is a straight, focus on exit speed, drag, gearing, throttle commitment, and previous-corner influence.
- If the zone is a braking zone, focus on braking timing, duration, deceleration, and entry speed.
- If the zone is a full corner, balance entry, apex, rotation, and exit.
- Keep the tone like a race engineer briefing a driver after a session.
- Maximum length: 250 words.`;

const SYSTEM_PROMPT = `You are a professional kart race data engineer interpreting a single zone of a telemetry lap comparison. Follow the user's instructions and output format exactly, ground every claim in the supplied metrics, never invent numbers, and respect the stated maximum length.`;

export type ZoneInterpretationRequest = {
    /** Customised prompt context. Falls back to the default template if absent. */
    template?: string;
    /** Driver-framing override appended to the system prompt (set server-side). */
    framing?: string;
    /** Placeholder values keyed by name, e.g. { zoneNumber: "3", basis: "fastest" }. */
    values: Record<string, string | number | null | undefined>;
};

/** Replaces every `{{key}}` token; unknown tokens become "n/a". */
function fillTemplate(
    template: string,
    values: Record<string, string | number | null | undefined>
): string {
    return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_match, key: string) => {
        const value = values[key];
        if (value === null || value === undefined || value === "") return "n/a";
        return String(value);
    });
}

let client: Anthropic | null = null;

function getClient(): Anthropic {
    if (!process.env.ANTHROPIC_API_KEY) {
        throw new Error(
            "ANTHROPIC_API_KEY is not set. Add it to the backend environment to enable AI interpretation."
        );
    }
    if (!client) {
        client = new Anthropic();
    }
    return client;
}

export async function interpretZone(
    req: ZoneInterpretationRequest
): Promise<string> {
    if (!req.values || typeof req.values !== "object") {
        throw new Error("Zone values are required to interpret a zone.");
    }

    const template =
        typeof req.template === "string" && req.template.trim().length > 0
            ? req.template
            : DEFAULT_ZONE_PROMPT_TEMPLATE;

    const prompt = fillTemplate(template, req.values);

    const anthropic = getClient();

    // The system prompt is identical across every zone call, so it is marked as
    // a cache breakpoint. Note: prompt caching only actually engages once a
    // single cached segment reaches the model's minimum (~1024 tokens for Opus).
    // This system prompt is well under that today, so caching stays dormant and
    // costs nothing; it activates automatically if the cached prefix grows.
    // Base instructions are cached; the per-driver framing override (if any) is
    // appended as a separate, uncached system block.
    const system: {
        type: "text";
        text: string;
        cache_control?: { type: "ephemeral" };
    }[] = [
        { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
    ];
    if (req.framing?.trim()) {
        system.push({ type: "text", text: req.framing });
    }

    const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 1024,
        system,
        messages: [{ role: "user", content: prompt }],
    });

    const text = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === "text")
        .map((block) => block.text)
        .join("")
        .trim();

    if (!text) {
        throw new Error("The AI zone summary came back empty. Please try again.");
    }

    return text;
}
