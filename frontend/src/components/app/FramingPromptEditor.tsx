import React, { useState } from "react";

import { appPanel } from "./AppPage";
import {
  saveDriverFraming,
  type FramingDimension,
  type FramingOption,
} from "../../api/driver";

type Props = {
  dimensions: FramingDimension[];
  initialOverrides: Record<string, string>;
};

type SaveStatus = "idle" | "saving" | "saved" | "error";

const framingKey = (dimKey: string, value: string) => `${dimKey}:${value}`;

const inputCls =
  "w-full rounded-md border border-gray-300 bg-mist px-3 py-2 text-sm text-[#374151] focus:outline-none focus:ring-2 focus:ring-brand";

/**
 * Driver-Admin-only editor for the AI coaching-framing prompts. Each Age /
 * Experience / Coaching-style option has one instruction fragment that is
 * injected into coaching output when a driver selects it. Overrides are global
 * (they apply to every driver) and saved to the server on blur; clearing back to
 * the default removes the override.
 */
const FramingPromptEditor: React.FC<Props> = ({ dimensions, initialOverrides }) => {
  const [overrides, setOverrides] = useState<Record<string, string>>(initialOverrides);
  const [drafts, setDrafts] = useState<Record<string, string>>(() => {
    const seed: Record<string, string> = {};
    for (const dim of dimensions) {
      for (const opt of dim.options) {
        const key = framingKey(dim.key, opt.value);
        seed[key] = initialOverrides[key] ?? opt.defaultPrompt;
      }
    }
    return seed;
  });
  const [status, setStatus] = useState<Record<string, SaveStatus>>({});

  const persist = async (key: string, opt: FramingOption) => {
    const draft = drafts[key] ?? "";
    const isDefault = draft.trim() === opt.defaultPrompt.trim();
    const stored = isDefault ? overrides[key] === undefined : overrides[key] === draft;
    if (stored) return; // nothing changed since last save

    setStatus((s) => ({ ...s, [key]: "saving" }));
    try {
      const updated = await saveDriverFraming(key, isDefault ? "" : draft);
      setOverrides(updated);
      setStatus((s) => ({ ...s, [key]: "saved" }));
    } catch {
      setStatus((s) => ({ ...s, [key]: "error" }));
    }
  };

  const reset = (key: string, opt: FramingOption) => {
    setDrafts((d) => ({ ...d, [key]: opt.defaultPrompt }));
    setStatus((s) => ({ ...s, [key]: "saving" }));
    saveDriverFraming(key, "")
      .then((updated) => {
        setOverrides(updated);
        setStatus((s) => ({ ...s, [key]: "saved" }));
      })
      .catch(() => setStatus((s) => ({ ...s, [key]: "error" })));
  };

  const statusLabel = (s?: SaveStatus) =>
    s === "saving" ? "Saving…" : s === "saved" ? "Saved ✓" : s === "error" ? "Save failed" : "";

  return (
    <div className={`${appPanel} mt-6 max-w-2xl`}>
      <div className="mb-2">
        <h2 className="text-sm font-bold uppercase tracking-wide text-brand">
          AI coaching framing · Driver Admin
        </h2>
        <p className="mt-1 text-xs text-gray-400">
          These instructions reframe how the AI delivers coaching for each Age,
          Experience and Coaching-style option. They apply to every driver on
          this platform. Changes save automatically when you click away.
        </p>
      </div>

      <div className="space-y-2">
        {dimensions.map((dim) => (
          <details key={dim.key} className="rounded-md border border-white/10 bg-black/20">
            <summary className="cursor-pointer px-4 py-2 text-xs font-bold uppercase tracking-wide text-gray-200">
              {dim.label} ({dim.options.length})
            </summary>
            <div className="space-y-4 px-4 pb-4 pt-1">
              {dim.options.map((opt) => {
                const key = framingKey(dim.key, opt.value);
                const draft = drafts[key] ?? "";
                const modified = draft.trim() !== opt.defaultPrompt.trim();
                return (
                  <div key={key}>
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-gray-300">
                        {opt.label}
                        {modified && (
                          <span className="ml-2 text-[10px] font-normal uppercase text-brand">
                            customised
                          </span>
                        )}
                      </span>
                      <span className="flex items-center gap-3 text-[11px] text-gray-500">
                        {statusLabel(status[key])}
                        <button
                          type="button"
                          onClick={() => reset(key, opt)}
                          disabled={!modified}
                          className="font-bold uppercase text-gray-400 hover:text-white disabled:opacity-40"
                        >
                          Reset
                        </button>
                      </span>
                    </div>
                    <textarea
                      className={`${inputCls} min-h-[68px]`}
                      value={draft}
                      spellCheck={false}
                      onChange={(e) =>
                        setDrafts((d) => ({ ...d, [key]: e.target.value }))
                      }
                      onBlur={() => persist(key, opt)}
                    />
                  </div>
                );
              })}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
};

export default FramingPromptEditor;
