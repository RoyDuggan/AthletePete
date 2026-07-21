import fs from "fs";
import path from "path";

/**
 * Driver "framing" for AI coaching. A driver's Age, Experience level and
 * Coaching style each map to an instruction fragment that overrides HOW the AI
 * frames its coaching (tone, vocabulary, focus) — without changing the
 * underlying deterministic analysis. The three selected fragments are combined
 * into one override block appended to every coaching prompt.
 *
 * Each option ships with a sensible default fragment; a Driver Admin can
 * override any fragment through the editor. Overrides are global (they apply to
 * every driver) and persisted to a JSON file on the appdata volume, mirroring
 * the other file-backed stores.
 */

export type FramingDimensionKey = "age" | "experience" | "coachingStyle";

export type FramingOption = {
  value: string;
  label: string;
  /** Default instruction fragment; empty means "no framing for this option". */
  defaultPrompt: string;
};

export type FramingDimension = {
  key: FramingDimensionKey;
  label: string;
  options: FramingOption[];
};

/**
 * Canonical option lists — the single source of truth for both the Driver Setup
 * dropdowns and the admin editor. Values are stable ids; labels are display
 * text; defaultPrompt is the starting framing instruction.
 */
export const DRIVER_FRAMING_DIMENSIONS: FramingDimension[] = [
  {
    key: "age",
    label: "Age",
    options: [
      {
        value: "u12",
        label: "Under 12",
        defaultPrompt:
          "The driver is a young child. Use simple, encouraging language, short sentences, and one clear thing to try. Avoid jargon and heavy data. Do NOT quote any numbers (speeds, lap or section times, percentages, RPM) — describe what happened in plain, vivid, descriptive words instead (e.g. 'you braked a little too early' rather than any figures).",
      },
      {
        value: "12_15",
        label: "12–15",
        defaultPrompt:
          "The driver is a young teenager. Keep it clear and motivating, introduce technical terms gently, and give concrete, actionable cues.",
      },
      {
        value: "16_18",
        label: "16–18",
        defaultPrompt:
          "The driver is a older teenager. You can use standard racing terminology and moderate technical depth.",
      },
      {
        value: "19_29",
        label: "19–29",
        defaultPrompt:
          "The driver is an adult. Full technical vocabulary and detail are appropriate.",
      },
      {
        value: "30_44",
        label: "30–44",
        defaultPrompt:
          "The driver is an adult. Full technical vocabulary and detail are appropriate.",
      },
      {
        value: "45_plus",
        label: "45+",
        defaultPrompt:
          "The driver is an experienced adult. Full technical vocabulary and detail are appropriate.",
      },
    ],
  },
  {
    key: "experience",
    label: "Experience level",
    options: [
      {
        value: "novice",
        label: "Novice / first season",
        defaultPrompt:
          "The driver is new to racing. Focus on fundamentals (braking points, racing line, smooth inputs) and avoid overwhelming them with advanced concepts. Do NOT quote numeric telemetry values — explain the findings qualitatively in descriptive language rather than with figures.",
      },
      {
        value: "club",
        label: "Club racer",
        defaultPrompt:
          "The driver races at club level. Balance fundamentals with a few intermediate refinements.",
      },
      {
        value: "regional",
        label: "Regional / state",
        defaultPrompt:
          "The driver competes regionally. Assume solid fundamentals; focus on refinement and consistency.",
      },
      {
        value: "national",
        label: "National",
        defaultPrompt:
          "The driver competes nationally. Go straight to nuanced, high-level technical detail and marginal gains.",
      },
      {
        value: "elite",
        label: "Elite / professional",
        defaultPrompt:
          "The driver is elite. Be precise and data-dense; focus purely on the finest marginal gains and avoid basics.",
      },
    ],
  },
  {
    key: "coachingStyle",
    label: "Coaching style",
    options: [
      {
        value: "encouraging",
        label: "Encouraging & supportive",
        defaultPrompt:
          "Adopt a warm, encouraging tone. Lead with what went well before what to improve, and frame corrections positively. Prefer descriptive, qualitative wording over quoting raw numbers.",
      },
      {
        value: "technical",
        label: "Technical & analytical",
        defaultPrompt:
          "Adopt a precise, analytical tone. Emphasise the numbers and the cause-and-effect behind each finding.",
      },
      {
        value: "direct",
        label: "Direct & concise",
        defaultPrompt:
          "Be blunt and concise. Skip preamble and get straight to the highest-value corrections.",
      },
      {
        value: "balanced",
        label: "Balanced",
        defaultPrompt:
          "Use a balanced tone — supportive but honest, technical but accessible.",
      },
    ],
  },
];

const DATA_DIR = path.join(__dirname, "../../data");
const STORE_FILE = path.join(DATA_DIR, "driver-framing.json");

/** Fragment override map: `"dim:value"` → instruction text. */
type OverrideMap = Record<string, string>;

/** Canonical storage key for a dimension/option pair. */
export function framingKey(dim: FramingDimensionKey, value: string): string {
  return `${dim}:${value}`;
}

/** Every valid `"dim:value"` key, for validation. */
function validKeys(): Set<string> {
  const keys = new Set<string>();
  for (const d of DRIVER_FRAMING_DIMENSIONS) {
    for (const o of d.options) keys.add(framingKey(d.key, o.value));
  }
  return keys;
}

export function isFramingKey(value: unknown): value is string {
  return typeof value === "string" && validKeys().has(value);
}

function readOverrides(): OverrideMap {
  try {
    const parsed = JSON.parse(fs.readFileSync(STORE_FILE, "utf-8"));
    return parsed && typeof parsed === "object" ? (parsed as OverrideMap) : {};
  } catch {
    return {};
  }
}

function writeOverrides(map: OverrideMap): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(STORE_FILE, JSON.stringify(map, null, 2), "utf-8");
}

/** Admin-set overrides only (absent keys fall back to each option's default). */
export function getFramingOverrides(): OverrideMap {
  return readOverrides();
}

/** Upserts one fragment override; an empty string clears it back to default. */
export function setFramingOverride(key: string, text: string): void {
  const map = readOverrides();
  if (typeof text === "string" && text.trim().length > 0) {
    map[key] = text;
  } else {
    delete map[key];
  }
  writeOverrides(map);
}

/** Effective (override ?? default) fragment text for a key, or "" if none. */
function effectiveFragment(key: string, overrides: OverrideMap): string {
  if (typeof overrides[key] === "string" && overrides[key].trim()) {
    return overrides[key].trim();
  }
  for (const d of DRIVER_FRAMING_DIMENSIONS) {
    for (const o of d.options) {
      if (framingKey(d.key, o.value) === key) return o.defaultPrompt.trim();
    }
  }
  return "";
}

export type DriverFramingSelection = {
  ageBracket?: string | null;
  experience?: string | null;
  coachingStyle?: string | null;
};

/**
 * Combined framing override for a driver's selections, ready to append to a
 * coaching system prompt. Returns "" when the driver has selected nothing.
 */
export function resolveFraming(selection: DriverFramingSelection): string {
  const overrides = readOverrides();
  const pairs: [FramingDimensionKey, string | null | undefined][] = [
    ["age", selection.ageBracket],
    ["experience", selection.experience],
    ["coachingStyle", selection.coachingStyle],
  ];

  const fragments: string[] = [];
  for (const [dim, value] of pairs) {
    if (!value) continue;
    const text = effectiveFragment(framingKey(dim, value), overrides);
    if (text) fragments.push(`- ${text}`);
  }

  if (fragments.length === 0) return "";

  return [
    "DRIVER FRAMING — adapt HOW you deliver this coaching to the specific driver below (tone, vocabulary, depth, focus). These instructions override the default delivery style, but never change, invent, or omit the underlying data and findings:",
    ...fragments,
  ].join("\n");
}
