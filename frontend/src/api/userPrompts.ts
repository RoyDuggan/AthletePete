import { API_BASE as BASE, withCreds } from "./config";

/** Which AI prompt a customisation applies to. */
export type PromptKey = "lap" | "zone";

/** The caller's saved prompt overrides, keyed by prompt. */
export type UserPrompts = Partial<Record<PromptKey, string>>;

/** Fetches the default overall lap-interpretation prompt template. */
export async function getLapPromptTemplate(): Promise<string> {
  const response = await fetch(`${BASE}/lap-prompt-template`, withCreds);
  if (!response.ok) {
    throw new Error("Could not load the default lap prompt template.");
  }
  const payload = (await response.json()) as { template?: string };
  return payload.template ?? "";
}

/** Loads the caller's saved prompt overrides (empty object when none). */
export async function getUserPrompts(): Promise<UserPrompts> {
  const response = await fetch(`${BASE}/user-prompts`, withCreds);
  if (!response.ok) {
    throw new Error("Could not load your saved prompts.");
  }
  const payload = (await response.json()) as { prompts?: UserPrompts };
  return payload.prompts ?? {};
}

/**
 * Saves (or, with an empty string, clears) the caller's override for one
 * prompt. Returns the full updated override set.
 */
export async function saveUserPrompt(
  key: PromptKey,
  template: string
): Promise<UserPrompts> {
  const response = await fetch(`${BASE}/user-prompts`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, template }),
    ...withCreds,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      (payload as { error?: string }).error ?? "Failed to save your prompt."
    );
  }
  return (payload as { prompts?: UserPrompts }).prompts ?? {};
}
