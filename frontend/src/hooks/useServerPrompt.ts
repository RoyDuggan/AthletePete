import { useCallback, useEffect, useRef, useState } from "react";

import {
  getUserPrompts,
  saveUserPrompt,
  type PromptKey,
} from "../api/userPrompts";

export type PromptSaveStatus = "idle" | "saving" | "saved" | "error";

/** Human-readable status text for the editor toolbar (empty when idle). */
export function promptSaveLabel(status: PromptSaveStatus): string {
  switch (status) {
    case "saving":
      return "Saving…";
    case "saved":
      return "Saved to your account";
    case "error":
      return "Couldn't save — check your connection";
    default:
      return "";
  }
}

type ServerPrompt = {
  /** Effective template: the user's override, or the server default. */
  template: string;
  /** The server default (for the editor's "Reset to default" + modified flag). */
  defaultTemplate: string;
  /** Edit handler — updates state and persists to the account (debounced). */
  setTemplate: (next: string) => void;
  status: PromptSaveStatus;
};

/**
 * Loads a customisable AI prompt for the signed-in user and persists edits to
 * their account (so they follow the driver across devices). `override === null`
 * means "use the server default"; resetting to the default clears the override.
 * Saves are debounced so typing doesn't hammer the API.
 */
export function useServerPrompt(
  key: PromptKey,
  fetchDefault: () => Promise<string>
): ServerPrompt {
  const [defaultTemplate, setDefaultTemplate] = useState("");
  const [override, setOverride] = useState<string | null>(null);
  const [status, setStatus] = useState<PromptSaveStatus>("idle");

  // Keep fetchDefault out of the load effect's deps (callers pass stable
  // module functions, but a ref makes that guarantee explicit).
  const fetchDefaultRef = useRef(fetchDefault);
  fetchDefaultRef.current = fetchDefault;

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      fetchDefaultRef.current().catch(() => ""),
      getUserPrompts().catch(() => ({})),
    ]).then(([def, prompts]) => {
      if (cancelled) return;
      setDefaultTemplate(def);
      const saved = prompts[key];
      setOverride(typeof saved === "string" ? saved : null);
    });

    return () => {
      cancelled = true;
    };
  }, [key]);

  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const setTemplate = useCallback(
    (next: string) => {
      const isDefault = next.trim() === defaultTemplate.trim();
      setOverride(isDefault ? null : next);
      setStatus("saving");

      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        // An empty template clears the override server-side.
        saveUserPrompt(key, isDefault ? "" : next)
          .then(() => setStatus("saved"))
          .catch(() => setStatus("error"));
      }, 600);
    },
    [key, defaultTemplate]
  );

  return {
    template: override ?? defaultTemplate,
    defaultTemplate,
    setTemplate,
    status,
  };
}
