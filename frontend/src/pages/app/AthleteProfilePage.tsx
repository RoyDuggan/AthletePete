import React, { useEffect, useMemo, useState } from "react";

import { AppPage } from "../../components/app/AppPage";
import {
  INTAKE_SECTIONS,
  REQUIRED_IDS,
  type IntakeFlag,
  type IntakeQuestion,
} from "../../lib/intakeQuestions";
import {
  getAthleteProfile,
  saveAthleteProfile,
  type IntakeAnswers,
} from "../../api/athlete";

const inputCls =
  "w-full rounded-lg border border-hair bg-steel px-3.5 py-2.5 text-sm text-white placeholder:text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30";
const textareaCls = `${inputCls} min-h-[84px] resize-y leading-relaxed`;

const FLAG_STYLE: Record<IntakeFlag, string> = {
  key: "text-brand border-brand/50 bg-brand/10",
  safety: "text-brand border-brand/50 bg-brand/10",
  optional: "text-muted border-white/15 bg-white/5",
};
const FLAG_LABEL: Record<IntakeFlag, string> = {
  key: "Key",
  safety: "Safety",
  optional: "Optional",
};

const isAnswered = (v: string | string[] | undefined) =>
  typeof v === "string" ? v.trim() !== "" : Array.isArray(v) && v.length > 0;

const AthleteProfilePage: React.FC = () => {
  const [answers, setAnswers] = useState<IntakeAnswers>({});
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    getAthleteProfile()
      .then(setAnswers)
      .catch(() => setAnswers({}))
      .finally(() => setLoading(false));
  }, []);

  const setText = (id: string, value: string) => {
    setAnswers((a) => ({ ...a, [id]: value }));
    setStatus("idle");
  };

  const toggle = (id: string, option: string) => {
    setAnswers((a) => {
      const cur = Array.isArray(a[id]) ? (a[id] as string[]) : [];
      const next = cur.includes(option)
        ? cur.filter((x) => x !== option)
        : [...cur, option];
      return { ...a, [id]: next };
    });
    setStatus("idle");
  };

  const save = async () => {
    setStatus("saving");
    try {
      const stored = await saveAthleteProfile(answers);
      setAnswers(stored);
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  };

  const { pct, done } = useMemo(() => {
    const d = REQUIRED_IDS.filter((id) => isAnswered(answers[id])).length;
    return { done: d, pct: Math.round((d / REQUIRED_IDS.length) * 100) };
  }, [answers]);

  const renderQ = (q: IntakeQuestion) => (
    <div key={q.id} className="border-b border-white/5 py-5 last:border-none">
      <div className="mb-1 flex flex-wrap items-baseline gap-x-2 text-sm font-semibold text-white">
        <span className="font-display text-brand">{q.n}</span>
        <span>{q.label}</span>
        {q.flag && (
          <span
            className={`rounded border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${FLAG_STYLE[q.flag]}`}
          >
            {FLAG_LABEL[q.flag]}
          </span>
        )}
      </div>
      {q.hint && <p className="mb-2 text-xs leading-relaxed text-muted">{q.hint}</p>}

      {q.type === "text" && (
        <input
          className={inputCls}
          value={(answers[q.id] as string) ?? ""}
          onChange={(e) => setText(q.id, e.target.value)}
          placeholder={q.placeholder}
        />
      )}
      {q.type === "textarea" && (
        <textarea
          className={textareaCls}
          value={(answers[q.id] as string) ?? ""}
          onChange={(e) => setText(q.id, e.target.value)}
          placeholder={q.placeholder}
        />
      )}
      {q.type === "checkbox" && (
        <div className="mt-1 flex flex-wrap gap-2">
          {q.options?.map((opt) => {
            const checked =
              Array.isArray(answers[q.id]) && (answers[q.id] as string[]).includes(opt);
            return (
              <button
                key={opt}
                type="button"
                onClick={() => toggle(q.id, opt)}
                className={`rounded-lg border px-3.5 py-2 text-xs font-semibold transition ${
                  checked
                    ? "border-brand bg-brand text-white"
                    : "border-hair bg-steel text-gray-300 hover:border-white/25"
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <AppPage
      title="Athlete"
      accent="Profile"
      subtitle="Your intake questionnaire. The more honestly and specifically you answer, the more precisely your plan is built. Answers save to your account — you can come back and finish any time."
    >
      {loading ? (
        <p className="text-sm text-muted">Loading your profile…</p>
      ) : (
        <div className="mx-auto max-w-3xl">
          {/* Progress */}
          <div className="mb-6 rounded-xl border border-hair bg-panel p-4">
            <div className="flex items-center gap-3">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-black/40">
                <div
                  className="h-full rounded-full bg-brand transition-[width] duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="font-oswald text-xs font-semibold text-brand">
                {pct}% complete
              </span>
            </div>
            <p className="mt-2 text-[11px] text-muted">
              {done} of {REQUIRED_IDS.length} core questions answered. Optional
              baselines don't count toward this.
            </p>
          </div>

          {/* Sections */}
          {INTAKE_SECTIONS.map((section) => (
            <div
              key={section.n}
              className="mb-5 overflow-hidden rounded-xl border border-hair bg-panel"
            >
              <div className="flex items-center gap-4 border-b border-hair px-5 py-4">
                <div className="font-display text-lg font-bold text-brand">{section.n}</div>
                <div>
                  <div className="font-oswald text-base font-bold uppercase tracking-wide text-white">
                    {section.title}
                  </div>
                  <div className="text-xs text-muted">{section.sub}</div>
                </div>
              </div>
              <div className="px-5 pb-4">
                {section.note && (
                  <div className="mt-4 rounded-lg border border-brand/25 bg-brand/5 px-4 py-3 text-xs leading-relaxed text-gray-300">
                    {section.note}
                  </div>
                )}
                {section.questions.map(renderQ)}
              </div>
            </div>
          ))}

          {/* Sticky save bar */}
          <div className="sticky bottom-0 z-20 -mx-6 mt-2 border-t border-hair bg-ink/95 px-6 py-3 backdrop-blur md:-mx-12 md:px-12">
            <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
              <span className="text-xs text-muted">
                {status === "saved"
                  ? "Saved to your account ✓"
                  : status === "error"
                  ? "Couldn't save — try again"
                  : status === "saving"
                  ? "Saving…"
                  : `${pct}% complete`}
              </span>
              <button
                type="button"
                onClick={save}
                disabled={status === "saving"}
                className="rounded-lg bg-brand px-6 py-2.5 text-sm font-bold uppercase tracking-wide text-white transition hover:bg-hero-blue disabled:opacity-50"
              >
                {status === "saving" ? "Saving…" : "Save profile"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppPage>
  );
};

export default AthleteProfilePage;
