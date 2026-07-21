import { API_BASE as BASE, withCreds } from "./config";

/** Fetches the default, customisable per-zone prompt template from the server. */
export async function getZonePromptTemplate(): Promise<string> {
  const response = await fetch(`${BASE}/zone-prompt-template`, withCreds);

  if (!response.ok) {
    throw new Error("Could not load the default zone prompt template.");
  }

  const payload = (await response.json()) as { template?: string };
  return payload.template ?? "";
}

export type ZoneInterpretationInput = {
  template: string;
  values: Record<string, string | number | null | undefined>;
};

/** Sends a filled per-zone prompt to Claude and returns the summary text. */
export async function interpretZone(
  input: ZoneInterpretationInput
): Promise<string> {
  const response = await fetch(`${BASE}/interpret-zone`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    ...withCreds,
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      (payload as { error?: string }).error ??
        "Failed to generate the AI zone summary."
    );
  }

  return (payload as { summary?: string }).summary ?? "";
}
