import React, { useEffect, useMemo, useState } from "react";

import { AppPage, appPanel } from "../../components/app/AppPage";
import { focusRing } from "../../components/marketing/ui";
import { listKarts, type Kart } from "../../api/garage";
import {
  fetchJettingProfiles,
  postJettingRecommendation,
  type JettingInputs,
  type JettingProfileSummary,
  type JettingRecommendation,
} from "../../api/jetting";

const DISCLAIMER =
  "Jetting advice is a baseline recommendation only. Always verify using plug " +
  "colour, EGT, engine response, manufacturer guidance, and race regulations.";

const HISTORY_KEY = "vp.jetting.history";
const HISTORY_LIMIT = 10;

const inputClass =
  "w-full rounded-md border border-white/15 bg-ink px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand";
const labelClass = "mb-1 block text-xs font-bold uppercase tracking-wide text-gray-400";

/** Numeric fields are held as strings so the inputs can be cleared while typing. */
type FormState = {
  engineProfileId: string;
  temperatureC: string;
  humidityPercent: string;
  pressureHpa: string;
  pressureType: "seaLevel" | "station";
  altitudeM: string;
  fuelType: string;
  oilRatio: string;
  trackCondition: "dry" | "damp" | "wet";
  userCorrectionSteps: number;
  kartId: string;
};

const DEFAULTS: FormState = {
  engineProfileId: "",
  temperatureC: "20",
  humidityPercent: "50",
  pressureHpa: "1013",
  pressureType: "seaLevel",
  altitudeM: "0",
  fuelType: "",
  oilRatio: "",
  trackCondition: "dry",
  userCorrectionSteps: 0,
  kartId: "",
};

type HistoryEntry = {
  id: string;
  at: number;
  engineName: string;
  kartName?: string;
  inputs: JettingInputs;
  recommendation: JettingRecommendation;
};

function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

function saveHistory(entries: HistoryEntry[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, HISTORY_LIMIT)));
  } catch {
    /* storage full / unavailable — non-fatal */
  }
}

const Field: React.FC<{
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}> = ({ label, htmlFor, hint, children }) => (
  <div>
    <label className={labelClass} htmlFor={htmlFor}>
      {label}
    </label>
    {children}
    {hint && <p className="mt-1 text-[11px] leading-snug text-gray-500">{hint}</p>}
  </div>
);

const JettingPage: React.FC = () => {
  const [profiles, setProfiles] = useState<JettingProfileSummary[]>([]);
  const [karts, setKarts] = useState<Kart[]>([]);
  const [form, setForm] = useState<FormState>(DEFAULTS);
  const [recommendation, setRecommendation] = useState<JettingRecommendation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory());

  // Load engine profiles (required) and karts (optional).
  useEffect(() => {
    fetchJettingProfiles()
      .then((list) => {
        setProfiles(list);
        setForm((f) => (f.engineProfileId ? f : { ...f, engineProfileId: list[0]?.id ?? "" }));
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load engines."));
    listKarts()
      .then((r) => setKarts(r.karts))
      .catch(() => setKarts([])); // karts are a nice-to-have, never block the tool
  }, []);

  const selectedProfile = useMemo(
    () => profiles.find((p) => p.id === form.engineProfileId),
    [profiles, form.engineProfileId]
  );

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const inputs: JettingInputs = {
      engineProfileId: form.engineProfileId,
      temperatureC: Number(form.temperatureC),
      humidityPercent: Number(form.humidityPercent),
      pressureHpa: Number(form.pressureHpa),
      pressureType: form.pressureType,
      altitudeM: Number(form.altitudeM),
      fuelType: form.fuelType.trim() || undefined,
      oilRatio: form.oilRatio.trim() || undefined,
      trackCondition: form.trackCondition,
      userCorrectionSteps: form.userCorrectionSteps || undefined,
    };

    try {
      const rec = await postJettingRecommendation(inputs);
      setRecommendation(rec);

      const kartName = karts.find((k) => k.id === form.kartId)?.name;
      const entry: HistoryEntry = {
        id: `${Date.now()}`,
        at: Date.now(),
        engineName: selectedProfile?.name ?? inputs.engineProfileId,
        kartName,
        inputs,
        recommendation: rec,
      };
      const next = [entry, ...history].slice(0, HISTORY_LIMIT);
      setHistory(next);
      saveHistory(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Calculation failed.");
      setRecommendation(null);
    } finally {
      setLoading(false);
    }
  };

  const restore = (entry: HistoryEntry) => {
    const i = entry.inputs;
    setForm((f) => ({
      ...f,
      engineProfileId: i.engineProfileId,
      temperatureC: String(i.temperatureC),
      humidityPercent: String(i.humidityPercent),
      pressureHpa: String(i.pressureHpa),
      pressureType: i.pressureType,
      altitudeM: String(i.altitudeM),
      fuelType: i.fuelType ?? "",
      oilRatio: i.oilRatio ?? "",
      trackCondition: i.trackCondition ?? "dry",
      userCorrectionSteps: i.userCorrectionSteps ?? 0,
    }));
    setRecommendation(entry.recommendation);
  };

  const clearHistory = () => {
    setHistory([]);
    saveHistory([]);
  };

  return (
    <AppPage
      title="Jetting"
      accent="Advisor"
      subtitle="A baseline carburettor jetting recommendation from the day's ambient conditions and your engine package. Enter the weather manually, or restore a previous run."
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* ---- Inputs ---- */}
        <form onSubmit={onSubmit} className={`${appPanel} space-y-4`}>
          <Field label="Engine" htmlFor="engine">
            <select
              id="engine"
              className={inputClass}
              value={form.engineProfileId}
              onChange={(e) => set("engineProfileId", e.target.value)}
            >
              {profiles.length === 0 && <option value="">Loading…</option>}
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.placeholder ? " (placeholder)" : ""}
                </option>
              ))}
            </select>
            {selectedProfile && (
              <p className="mt-1 text-[11px] leading-snug text-gray-500">
                {selectedProfile.carburettor} · assumes {selectedProfile.fuelAssumption}
              </p>
            )}
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Temperature (°C)" htmlFor="temp">
              <input
                id="temp"
                type="number"
                step="0.5"
                className={inputClass}
                value={form.temperatureC}
                onChange={(e) => set("temperatureC", e.target.value)}
              />
            </Field>
            <Field label="Humidity (%)" htmlFor="humidity">
              <input
                id="humidity"
                type="number"
                step="1"
                className={inputClass}
                value={form.humidityPercent}
                onChange={(e) => set("humidityPercent", e.target.value)}
              />
            </Field>
            <Field label="Pressure (hPa)" htmlFor="pressure">
              <input
                id="pressure"
                type="number"
                step="0.1"
                className={inputClass}
                value={form.pressureHpa}
                onChange={(e) => set("pressureHpa", e.target.value)}
              />
            </Field>
            <Field
              label="Pressure type"
              htmlFor="pressureType"
              hint="Rotax-style apps expect sea-level (QNH) pressure."
            >
              <select
                id="pressureType"
                className={inputClass}
                value={form.pressureType}
                onChange={(e) => set("pressureType", e.target.value as FormState["pressureType"])}
              >
                <option value="seaLevel">Sea-level (QNH)</option>
                <option value="station">Station (local)</option>
              </select>
            </Field>
            <Field label="Altitude (m)" htmlFor="altitude">
              <input
                id="altitude"
                type="number"
                step="10"
                className={inputClass}
                value={form.altitudeM}
                onChange={(e) => set("altitudeM", e.target.value)}
              />
            </Field>
            <Field label="Track condition" htmlFor="track">
              <select
                id="track"
                className={inputClass}
                value={form.trackCondition}
                onChange={(e) => set("trackCondition", e.target.value as FormState["trackCondition"])}
              >
                <option value="dry">Dry</option>
                <option value="damp">Damp</option>
                <option value="wet">Wet</option>
              </select>
            </Field>
            <Field label="Fuel type" htmlFor="fuel" hint="Optional — affects final jet.">
              <input
                id="fuel"
                type="text"
                placeholder="e.g. pump 98"
                className={inputClass}
                value={form.fuelType}
                onChange={(e) => set("fuelType", e.target.value)}
              />
            </Field>
            <Field label="Oil ratio" htmlFor="oil" hint="Optional.">
              <input
                id="oil"
                type="text"
                placeholder="e.g. 1:50"
                className={inputClass}
                value={form.oilRatio}
                onChange={(e) => set("oilRatio", e.target.value)}
              />
            </Field>
          </div>

          <Field
            label={`Manual correction: ${form.userCorrectionSteps > 0 ? "+" : ""}${form.userCorrectionSteps} (${
              form.userCorrectionSteps > 0 ? "richer" : form.userCorrectionSteps < 0 ? "leaner" : "none"
            })`}
            htmlFor="correction"
            hint="Calibration offset from your own testing. Each step ≈ one jet size."
          >
            <input
              id="correction"
              type="range"
              min={-4}
              max={4}
              step={1}
              className="w-full accent-brand"
              value={form.userCorrectionSteps}
              onChange={(e) => set("userCorrectionSteps", Number(e.target.value))}
            />
          </Field>

          {karts.length > 0 && (
            <Field label="Save against kart (optional)" htmlFor="kart">
              <select
                id="kart"
                className={inputClass}
                value={form.kartId}
                onChange={(e) => set("kartId", e.target.value)}
              >
                <option value="">— none —</option>
                {karts.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.name}
                  </option>
                ))}
              </select>
            </Field>
          )}

          {error && (
            <p className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !form.engineProfileId}
            className={`flex h-11 w-full items-center justify-center rounded-3xl bg-brand text-sm font-bold uppercase tracking-wide text-black transition duration-300 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`}
          >
            {loading ? "Calculating…" : "Get recommendation"}
          </button>
        </form>

        {/* ---- Output ---- */}
        <div className="space-y-6">
          {recommendation ? (
            <OutputCard rec={recommendation} engineName={selectedProfile?.name} />
          ) : (
            <div className={`${appPanel} text-sm leading-relaxed text-gray-400`}>
              Enter the day's conditions and your engine, then{" "}
              <span className="font-semibold text-white">Get recommendation</span>.
              The advisor compares the current air density to the engine's
              baseline and suggests a starting jet, needle clip and air-screw
              position.
            </div>
          )}

          <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-xs leading-relaxed text-amber-200/90">
            ⚠️ {DISCLAIMER}
          </p>

          {history.length > 0 && (
            <HistoryList history={history} onRestore={restore} onClear={clearHistory} />
          )}
        </div>
      </div>
    </AppPage>
  );
};

const CONFIDENCE_STYLE: Record<JettingRecommendation["confidence"], string> = {
  high: "border-brand/50 bg-brand/10 text-brand",
  medium: "border-amber-500/50 bg-amber-500/10 text-amber-300",
  low: "border-red-500/50 bg-red-500/10 text-red-300",
};

const MIXTURE_LABEL: Record<JettingRecommendation["mixtureDirection"], string> = {
  richer: "Richer ▲",
  leaner: "Leaner ▼",
  baseline: "Baseline ＝",
};

const Stat: React.FC<{ label: string; value: React.ReactNode; sub?: string }> = ({
  label,
  value,
  sub,
}) => (
  <div className="rounded-lg border border-white/10 bg-ink p-4">
    <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">{label}</p>
    <p className="mt-1 text-2xl font-extrabold text-white">{value}</p>
    {sub && <p className="text-[11px] text-gray-500">{sub}</p>}
  </div>
);

const OutputCard: React.FC<{ rec: JettingRecommendation; engineName?: string }> = ({
  rec,
  engineName,
}) => (
  <div className={`${appPanel} space-y-5`}>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="text-lg font-extrabold uppercase tracking-wide text-white">
        Recommendation
      </h2>
      <span
        className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide ${CONFIDENCE_STYLE[rec.confidence]}`}
      >
        {rec.confidence} confidence
      </span>
    </div>
    {engineName && <p className="-mt-3 text-xs text-gray-500">{engineName}</p>}

    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <Stat
        label="Main jet"
        value={rec.mainJetRecommendation}
        sub={
          rec.nearestAvailableJet !== undefined
            ? `nearest available: ${rec.nearestAvailableJet}`
            : undefined
        }
      />
      <Stat label="Needle clip" value={rec.needleClip} sub="pos. (3 = std)" />
      <Stat label="Air screw" value={`${rec.airScrewTurns}`} sub="turns out (2 = std)" />
      <Stat
        label="Mixture"
        value={<span className="text-base">{MIXTURE_LABEL[rec.mixtureDirection]}</span>}
      />
      <Stat label="Air density" value={rec.airDensityKgM3} sub="kg/m³" />
      <Stat label="Rel. density" value={`${rec.relativeAirDensityPercent}%`} sub="of baseline" />
    </div>

    {rec.densityAltitudeM !== undefined && (
      <p className="text-xs text-gray-500">
        Density altitude ≈{" "}
        <span className="font-semibold text-gray-300">{rec.densityAltitudeM} m</span> — the
        ISA altitude the air "feels like" to the engine.
      </p>
    )}

    {rec.correctionSummary.length > 0 && (
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wide text-gray-400">
          Why it changed
        </h3>
        <ul className="mt-2 space-y-1.5 text-sm text-gray-300">
          {rec.correctionSummary.map((line, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-brand">→</span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </div>
    )}

    {rec.warnings.length > 0 && (
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wide text-gray-400">Warnings</h3>
        <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-gray-400">
          {rec.warnings.map((line, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-amber-400">•</span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </div>
    )}
  </div>
);

const HistoryList: React.FC<{
  history: HistoryEntry[];
  onRestore: (e: HistoryEntry) => void;
  onClear: () => void;
}> = ({ history, onRestore, onClear }) => (
  <div className={appPanel}>
    <div className="mb-3 flex items-center justify-between">
      <h3 className="text-sm font-extrabold uppercase tracking-wide text-white">
        Recent recommendations
      </h3>
      <button
        type="button"
        onClick={onClear}
        className={`text-xs font-bold uppercase tracking-wide text-gray-500 hover:text-gray-300 ${focusRing}`}
      >
        Clear
      </button>
    </div>
    <ul className="space-y-2">
      {history.map((entry) => (
        <li key={entry.id}>
          <button
            type="button"
            onClick={() => onRestore(entry)}
            className={`flex w-full items-center justify-between gap-3 rounded-md border border-white/10 bg-ink px-3 py-2 text-left transition hover:border-brand/40 ${focusRing}`}
          >
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-white">
                {entry.engineName}
                {entry.kartName ? ` · ${entry.kartName}` : ""}
              </span>
              <span className="block text-[11px] text-gray-500">
                {entry.inputs.temperatureC}°C · {entry.inputs.humidityPercent}% ·{" "}
                {entry.inputs.pressureHpa} hPa · jet{" "}
                {entry.recommendation.mainJetRecommendation}
              </span>
            </span>
            <span className="shrink-0 text-xs font-bold uppercase text-brand">Load</span>
          </button>
        </li>
      ))}
    </ul>
  </div>
);

export default JettingPage;
