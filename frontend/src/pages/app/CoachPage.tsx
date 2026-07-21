import React, { useEffect, useMemo, useState } from "react";

import { useAuth } from "../../context/AuthContext";
import { AppPage } from "../../components/app/AppPage";
import { INTAKE_SECTIONS } from "../../lib/intakeQuestions";
import {
  listAthletes,
  getAthlete,
  generateAthletePlan,
  saveAthletePlan,
  type CoachAthlete,
  type CoachAthleteDetail,
} from "../../api/coach";

const LABELS: Record<string, string> = Object.fromEntries(
  INTAKE_SECTIONS.flatMap((s) => s.questions.map((q) => [q.id, q.label]))
);

const StatusBadge: React.FC<{ status: string | null }> = ({ status }) => {
  const map: Record<string, string> = {
    generated: "border-amber-400/40 bg-amber-400/10 text-amber-300",
    curated: "border-brand/50 bg-brand/10 text-brand",
    active: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300",
  };
  const labels: Record<string, string> = {
    generated: "Needs review",
    curated: "Approved",
    active: "Active",
  };
  const label = status ? labels[status] ?? status : "No plan";
  return (
    <span
      className={`rounded border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
        status ? map[status] : "border-white/15 bg-white/5 text-muted"
      }`}
    >
      {label}
    </span>
  );
};

const CoachPage: React.FC = () => {
  const { user } = useAuth();
  const [athletes, setAthletes] = useState<CoachAthlete[]>([]);
  const [detail, setDetail] = useState<CoachAthleteDetail | null>(null);
  const [planText, setPlanText] = useState("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const reload = () =>
    listAthletes()
      .then(setAthletes)
      .catch(() => setAthletes([]))
      .finally(() => setLoading(false));

  useEffect(() => {
    if (user?.driverAdmin) reload();
    else setLoading(false);
  }, [user?.driverAdmin]);

  const open = async (userId: string) => {
    setStatus("idle");
    setError(null);
    const d = await getAthlete(userId);
    setDetail(d);
    setPlanText(d.plan?.plan ?? "");
  };

  const generate = async () => {
    if (!detail) return;
    setGenerating(true);
    setError(null);
    setStatus("idle");
    try {
      const p = await generateAthletePlan(detail.athlete.userId);
      setDetail({ ...detail, plan: p });
      setPlanText(p.plan);
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed.");
    } finally {
      setGenerating(false);
    }
  };

  const save = async () => {
    if (!detail) return;
    setStatus("saving");
    try {
      const saved = await saveAthletePlan(detail.athlete.userId, planText);
      setDetail({ ...detail, plan: saved });
      setStatus("saved");
      reload();
    } catch {
      setStatus("error");
    }
  };

  const profileEntries = useMemo(() => {
    if (!detail) return [];
    return Object.entries(detail.profile)
      .filter(([, v]) => (Array.isArray(v) ? v.length : String(v).trim()))
      .map(([id, v]) => ({
        label: LABELS[id] ?? id,
        value: Array.isArray(v) ? v.join(", ") : String(v),
      }));
  }, [detail]);

  if (!user?.driverAdmin) {
    return (
      <AppPage title="Coach" subtitle="Coach access only.">
        <p className="text-sm text-muted">
          This area is for coaches. If you should have access, ask the site admin.
        </p>
      </AppPage>
    );
  }

  return (
    <AppPage
      title="Coach"
      accent="Review"
      subtitle="Review and approve athletes' AI-generated programs before they're finalised."
    >
      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : detail ? (
        <div className="mx-auto max-w-3xl">
          <button
            type="button"
            onClick={() => setDetail(null)}
            className="mb-4 text-xs font-bold uppercase tracking-wide text-brand hover:underline"
          >
            ← Back to athletes
          </button>

          <div className="mb-5 rounded-xl border border-hair bg-panel p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-display text-lg font-bold text-white">
                  {detail.athlete.fullName || detail.athlete.email}
                </div>
                <div className="text-xs text-muted">{detail.athlete.email}</div>
              </div>
              <StatusBadge status={detail.plan?.status ?? null} />
            </div>
          </div>

          {/* Intake summary */}
          <details className="mb-5 rounded-xl border border-hair bg-panel">
            <summary className="cursor-pointer px-5 py-3 font-oswald text-sm font-bold uppercase tracking-wide text-gray-200">
              Intake questionnaire ({profileEntries.length} answered)
            </summary>
            <div className="space-y-3 px-5 pb-5">
              {profileEntries.map((e) => (
                <div key={e.label}>
                  <div className="text-xs font-semibold text-brand">{e.label}</div>
                  <div className="whitespace-pre-wrap text-sm text-gray-300">{e.value}</div>
                </div>
              ))}
            </div>
          </details>

          {/* Editable plan */}
          <div className="rounded-xl border border-hair bg-panel p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="font-oswald text-sm font-bold uppercase tracking-wide text-white">
                Training program
              </h3>
              <button
                type="button"
                onClick={generate}
                disabled={generating}
                className="shrink-0 rounded-lg bg-brand px-4 py-2 text-xs font-bold uppercase tracking-wide text-white transition hover:bg-hero-blue disabled:opacity-50"
              >
                {generating
                  ? "Building…"
                  : detail.plan
                  ? "Regenerate"
                  : "Generate program"}
              </button>
            </div>
            {generating && (
              <p className="mb-3 text-sm text-muted">
                Building the program from the questionnaire — this can take up to a
                minute.
              </p>
            )}
            {error && <p className="mb-3 text-sm text-[#ef4444]">{error}</p>}
            {detail.plan ? (
              <>
                <textarea
                  className="min-h-[420px] w-full rounded-lg border border-hair bg-steel px-4 py-3 font-mono text-xs leading-relaxed text-gray-200 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                  value={planText}
                  onChange={(e) => {
                    setPlanText(e.target.value);
                    setStatus("idle");
                  }}
                  spellCheck={false}
                />
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="text-xs text-muted">
                    {status === "saved"
                      ? "Saved & marked approved ✓"
                      : status === "error"
                      ? "Couldn't save"
                      : status === "saving"
                      ? "Saving…"
                      : "Edit the plan, then save to mark it reviewed."}
                  </span>
                  <button
                    type="button"
                    onClick={save}
                    disabled={status === "saving"}
                    className="rounded-lg bg-brand px-6 py-2.5 text-sm font-bold uppercase tracking-wide text-white transition hover:bg-hero-blue disabled:opacity-50"
                  >
                    {status === "saving" ? "Saving…" : "Save & mark approved"}
                  </button>
                </div>
              </>
            ) : (
              !generating && (
                <p className="text-sm text-muted">
                  No program yet — click <strong>Generate program</strong> to build
                  one from this athlete's questionnaire.
                </p>
              )
            )}
          </div>
        </div>
      ) : (
        <div className="mx-auto max-w-3xl">
          {athletes.length === 0 ? (
            <p className="text-sm text-muted">
              No athletes have started a profile or program yet.
            </p>
          ) : (
            <div className="divide-y divide-white/5 overflow-hidden rounded-xl border border-hair bg-panel">
              {athletes.map((a) => (
                <button
                  key={a.userId}
                  type="button"
                  onClick={() => open(a.userId)}
                  className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition hover:bg-white/5"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-white">
                      {a.fullName || a.email}
                    </div>
                    <div className="truncate text-xs text-muted">{a.email}</div>
                  </div>
                  <StatusBadge status={a.planStatus} />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </AppPage>
  );
};

export default CoachPage;
