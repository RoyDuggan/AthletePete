import fs from "fs";
import path from "path";

/**
 * Per-user AI prompt customisations, persisted to the account (server-side) so
 * they follow the driver across devices and browsers — unlike the previous
 * per-device localStorage approach.
 *
 * Two prompts are customisable, keyed by `PromptKey`:
 * - "lap"  → the overall lap-comparison interpretation context.
 * - "zone" → the per-zone AI summary context.
 *
 * Only user *overrides* are stored. If a saved override matches (or is cleared
 * back to) the server default, we drop it so the default always wins going
 * forward. Mirrors the JSON-file pattern used by zoneMapStore, persisted in the
 * same `appdata` volume.
 */
export type PromptKey = "lap" | "zone";

export const PROMPT_KEYS: readonly PromptKey[] = ["lap", "zone"];

export function isPromptKey(value: unknown): value is PromptKey {
    return value === "lap" || value === "zone";
}

type UserPromptRecord = {
    userId: string;
    key: PromptKey;
    template: string;
    updatedAt: number;
};

const DATA_DIR = path.join(__dirname, "../../data");
const STORE_FILE = path.join(DATA_DIR, "user-prompts.json");

/** Reads the whole store. Returns [] if the file is missing or corrupt. */
function readAll(): UserPromptRecord[] {
    try {
        const parsed = JSON.parse(fs.readFileSync(STORE_FILE, "utf-8"));
        return Array.isArray(parsed) ? (parsed as UserPromptRecord[]) : [];
    } catch {
        return [];
    }
}

function writeAll(records: UserPromptRecord[]): void {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(STORE_FILE, JSON.stringify(records, null, 2), "utf-8");
}

/** All of a user's saved overrides, as a `{ key: template }` map. */
export function getUserPrompts(userId: string): Partial<Record<PromptKey, string>> {
    const out: Partial<Record<PromptKey, string>> = {};
    for (const r of readAll()) {
        if (r.userId === userId && isPromptKey(r.key)) out[r.key] = r.template;
    }
    return out;
}

/** A single saved override, or null when the user has none for this key. */
export function getUserPrompt(userId: string, key: PromptKey): string | null {
    const record = readAll().find((r) => r.userId === userId && r.key === key);
    return record ? record.template : null;
}

/**
 * Upserts a user's override for one prompt. An empty template clears the
 * override (the caller should pass "" to reset to the server default).
 */
export function setUserPrompt(
    userId: string,
    key: PromptKey,
    template: string
): void {
    const trimmed = typeof template === "string" ? template.trim() : "";
    const records = readAll().filter(
        (r) => !(r.userId === userId && r.key === key)
    );

    if (trimmed.length > 0) {
        records.push({ userId, key, template, updatedAt: Date.now() });
    }

    writeAll(records);
}

/** Removes all of a user's prompt overrides (for account deletion). */
export function deleteUserPrompts(userId: string): void {
    writeAll(readAll().filter((r) => r.userId !== userId));
}
