import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import { useAnalysis } from "../../context/AnalysisContext";
import { AppPage, UpgradeNotice } from "../../components/app/AppPage";
import { hasFeature } from "../../lib/tiers";
import { listSessions, type StoredSession } from "../../api/garage";
import { listZoneMaps } from "../../api/zoneMaps";
import type { ZoneMap } from "../../types/advisoryData";
import { computeFingerprint, coachFingerprint } from "../../api/fingerprint";
import { REJECTION_LABELS, describeSelectionBasis } from "../../types/fingerprint";
import { selectCorners, isRetained, fastestLapKey } from "../../lib/fingerprintSelection";
import ZoneGPlot from "../../components/ZoneGPlot";
import CornerMatrix from "../../components/fingerprint/CornerMatrix";
import ZoneMiniMap from "../../components/ZoneMiniMap";
import GripTimelineChart from "../../components/fingerprint/GripTimelineChart";
import FingerprintBars from "../../components/fingerprint/FingerprintBars";
import SensitivitySlider from "../../components/fingerprint/SensitivitySlider";

const card = "rounded-2xl border border-white/5 bg-white/[0.02] p-5";

const CoachingPage: React.FC = () => {
  const { user } = useAuth();
  // Selection, basis and the fingerprint analysis live in the shared session
  // context so they survive navigation to/from other /app pages until sign-out
  // or a new analysis. The set is shared with the Telemetry page.
  const {
    selectedKeys,
    toggleKey,
    zoneMapId,
    setZoneMapId,
    fingerprint: result,
    setFingerprint: setResult,
    sensitivity: threshold,
    setSensitivity: setThreshold,
    selectedExec,
    setSelectedExec,
    coaching,
    setCoaching,
  } = useAnalysis();

  const [sessions, setSessions] = useState<StoredSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [zoneMaps, setZoneMaps] = useState<ZoneMap[]>([]);
  const [computing, setComputing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coachingLoading, setCoachingLoading] = useState(false);
  const [coachingError, setCoachingError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasFeature(user, "coaching")) return;
    listSessions()
      .then((r) => setSessions(r.sessions))
      .catch(() => setSessions([]))
      .finally(() => setLoadingSessions(false));
    listZoneMaps()
      .then(setZoneMaps)
      .catch(() => setZoneMaps([]));
  }, [user]);

  const selection = useMemo(
    () => (result ? selectCorners(result.executions, threshold) : null),
    [result, threshold]
  );

  // Canonical definition (start/centre/end distances) of the selected corner.
  const selectedCorner = useMemo(() => {
    if (!result || !selectedExec) return null;
    return (
      result.corners.find((c) => c.cornerNumber === selectedExec.cornerNumber) ??
      null
    );
  }, [result, selectedExec]);

  // Reference timeline for the selected corner (best retained execution).
  const referenceTimeline = useMemo(() => {
    if (!result || !selectedExec) return undefined;
    return result.reference.find((r) => r.cornerNumber === selectedExec.cornerNumber)
      ?.timeline;
  }, [result, selectedExec]);

  const maxG = useMemo(() => {
    if (!selectedExec) return 1;
    const all = selectedExec.gTrace.flatMap((p) => [
      Math.abs(p.lateralG),
      Math.abs(p.longitudinalG),
    ]);
    return Math.max(1, ...all);
  }, [selectedExec]);

  if (!hasFeature(user, "coaching")) {
    return (
      <AppPage
        title="Coaching"
        accent="/ Virtual Pete"
        subtitle="AI coaching that explains where time is lost and why."
      >
        <UpgradeNotice feature="Coaching" />
      </AppPage>
    );
  }

  async function runAnalysis() {
    const ids = selectedKeys;
    if (ids.length === 0) return;

    setComputing(true);
    setError(null);
    setResult(null);
    setSelectedExec(null);
    setCoaching(null);
    setCoachingError(null);

    try {
      const r = await computeFingerprint(
        ids,
        zoneMapId
          ? { zoneBasis: "custom", customZoneMapId: zoneMapId }
          : undefined
      );
      setResult(r);
      setThreshold(r.defaultSensitivity);

      // Default the detail view to the strongest retained execution.
      const fastestKey = fastestLapKey(r.executions);
      const retained = r.executions
        .filter((e) => isRetained(e, r.defaultSensitivity, fastestKey))
        .sort((a, b) => b.attackScore - a.attackScore);
      setSelectedExec(retained[0] ?? r.executions[0] ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to analyse.");
    } finally {
      setComputing(false);
    }
  }

  async function runCoaching() {
    if (!result || !selection) return;

    setCoachingLoading(true);
    setCoachingError(null);
    setCoaching(null);

    try {
      const text = await coachFingerprint({
        sessionLabel: result.sessions.map((s) => s.reference ?? s.label).join(", "),
        sensitivity: threshold,
        corners: selection.selected.map((c) => ({
          cornerNumber: c.cornerNumber,
          lapLabel: c.lapLabel,
          entrySpeedKmh: c.entrySpeedKmh,
          apexSpeedKmh: c.apexSpeedKmh,
          exitSpeedKmh: c.exitSpeedKmh,
          sectionTimeSeconds: c.sectionTimeSeconds,
          attackScore: c.attackScore,
          fingerprint: c.fingerprint,
          timelineMetrics: c.timelineMetrics,
        })),
      });
      setCoaching(text);
    } catch (e) {
      setCoachingError(e instanceof Error ? e.message : "Failed to generate coaching.");
    } finally {
      setCoachingLoading(false);
    }
  }

  return (
    <AppPage
      title="Coaching"
      accent="/ Virtual Pete"
      subtitle="Corner fingerprints: how much grip you use, corner by corner, lap by lap."
    >
      {/* Session picker */}
      <div className={card}>
        <h2 className="text-sm font-bold uppercase tracking-wide text-gray-400">
          1 · Choose sessions
        </h2>

        {loadingSessions ? (
          <p className="mt-3 text-sm text-gray-500">Loading saved sessions…</p>
        ) : sessions.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">
            No saved sessions yet. Upload telemetry on the{" "}
            <Link to="/app/telemetry" className="font-bold text-brand hover:underline">
              Telemetry
            </Link>{" "}
            page first.
          </p>
        ) : (
          <div className="mt-3 max-h-60 space-y-1 overflow-y-auto">
            {sessions.map((s) => {
              const checked = selectedKeys.includes(s.storageKey);
              return (
                <label
                  key={s.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm transition ${
                    checked ? "border-brand/50 bg-brand/5" : "border-white/5 hover:border-white/15"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleKey(s.storageKey)}
                    className="h-4 w-4 accent-brand"
                  />
                  <span className="min-w-0 flex-1 truncate font-semibold text-white">
                    {s.name || s.originalName}
                  </span>
                </label>
              );
            })}
          </div>
        )}

        <div className="mt-4">
          <label
            htmlFor="zone-markers"
            className="block text-xs font-bold uppercase tracking-wide text-gray-500"
          >
            Zone markers
          </label>
          <select
            id="zone-markers"
            value={zoneMapId}
            onChange={(e) => setZoneMapId(e.target.value)}
            className="mt-1 w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-white focus:border-brand focus:outline-none"
          >
            <option value="">Auto-detect corners</option>
            {zoneMaps.length > 0 && (
              <optgroup label="Saved lap markers">
                {zoneMaps.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.boundaries.length + 1} zones)
                  </option>
                ))}
              </optgroup>
            )}
          </select>
          <p className="mt-1 text-[11px] text-gray-500">
            Saved marker sets from the{" "}
            <Link to="/app/telemetry" className="text-brand hover:underline">
              Telemetry
            </Link>{" "}
            page. Each zone spans a corner and its following straight, so the
            markers cover the whole lap.
          </p>
        </div>

        <button
          type="button"
          onClick={runAnalysis}
          disabled={computing || selectedKeys.length === 0}
          className="mt-4 rounded-lg bg-brand px-4 py-2 text-sm font-bold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {computing ? "Analysing…" : `Analyse ${selectedKeys.length || ""} session${selectedKeys.length === 1 ? "" : "s"}`.trim()}
        </button>

        {error && <p className="mt-3 text-sm text-[#ef4444]">{error}</p>}
      </div>

      {result && selection && (
        <>
          {result.warnings.map((w, i) => (
            <p key={i} className="mt-4 text-xs text-amber-400">
              ⚠ {w}
            </p>
          ))}

          {/* Summary + slider */}
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className={card}>
              <h2 className="text-sm font-bold uppercase tracking-wide text-gray-400">
                Session summary
              </h2>
              <dl className="mt-3 grid grid-cols-3 gap-3 text-sm">
                <Summary label="Sessions" value={result.sessions.length} />
                <Summary label="Laps" value={result.laps.length} />
                <Summary label="Corners" value={result.corners.length} />
                <Summary label="Executions" value={result.executions.length} />
                <Summary
                  label="Anomalies"
                  value={result.executions.filter((e) => e.rejected).length}
                />
                <Summary label="Retained" value={selection.stats.selectedCount} />
              </dl>
            </div>

            <div className={card}>
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-400">
                2 · Sensitivity
              </h2>
              <SensitivitySlider
                value={threshold}
                onChange={setThreshold}
                stats={selection.stats}
              />
            </div>
          </div>

          {/* Corner matrix */}
          <div className={`${card} mt-6`}>
            <h2 className="text-sm font-bold uppercase tracking-wide text-gray-400">
              3 · Corner matrix
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Each cell is one corner on one lap, coloured by attack score. Faded =
              below threshold, × = anomaly. Click a cell to inspect it.
            </p>
            <div className="mt-3 flex flex-col gap-4 lg:flex-row">
              <div className="min-w-0 flex-1">
                <CornerMatrix
                  laps={result.laps}
                  corners={result.corners}
                  executions={result.executions}
                  threshold={threshold}
                  selected={selectedExec}
                  onSelect={setSelectedExec}
                />
              </div>

              <div className="shrink-0 lg:w-56">
                <p className="mb-2 text-xs font-bold uppercase text-gray-500">
                  Track map
                </p>
                {result.trackOutline.length >= 2 ? (
                  <>
                    <ZoneMiniMap
                      points={result.trackOutline}
                      startDistanceMeters={selectedCorner?.startDistanceMeters ?? 0}
                      endDistanceMeters={selectedCorner?.endDistanceMeters ?? 0}
                      centerDistanceMeters={selectedCorner?.centerDistanceMeters}
                      severity="gain"
                      width={210}
                      height={170}
                    />
                    <p className="mt-2 text-[11px] text-gray-500">
                      {selectedExec
                        ? `Corner ${selectedExec.cornerNumber} zone highlighted — click a matrix cell to change.`
                        : "Click a matrix cell to highlight its zone."}
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-gray-500">
                    No GPS trace in this session.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Corner detail */}
          {selectedExec && (
            <div className={`${card} mt-6`}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-sm font-bold uppercase tracking-wide text-gray-400">
                  4 · Corner {selectedExec.cornerNumber} · {selectedExec.lapLabel}
                </h2>
                <span className="text-sm text-gray-400">
                  Attack{" "}
                  <span className="font-bold text-brand">
                    {Math.round(selectedExec.attackScore)}
                  </span>
                </span>
              </div>

              {(() => {
                const corner = result.corners.find(
                  (c) => c.cornerNumber === selectedExec.cornerNumber
                );
                return corner?.selectionBasis ? (
                  <p className="mt-1 text-[11px] text-gray-500">
                    Zone basis: {describeSelectionBasis(corner.selectionBasis)}
                  </p>
                ) : null;
              })()}

              {selectedExec.rejected && (
                <p className="mt-2 text-xs text-amber-400">
                  Rejected:{" "}
                  {selectedExec.rejectionReasons
                    .map((r) => REJECTION_LABELS[r])
                    .join(", ")}
                </p>
              )}

              <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_1.3fr_1fr]">
                <div>
                  <p className="mb-2 text-xs font-bold uppercase text-gray-500">
                    Friction circle
                  </p>
                  <ZoneGPlot points={selectedExec.gTrace} maxG={maxG} size={180} />
                  <dl className="mt-3 space-y-1 text-xs">
                    <Row label="Entry" value={fmtSpeed(selectedExec.entrySpeedKmh)} />
                    <Row label="Apex" value={fmtSpeed(selectedExec.apexSpeedKmh)} />
                    <Row label="Exit" value={fmtSpeed(selectedExec.exitSpeedKmh)} />
                    <Row
                      label="Section"
                      value={
                        selectedExec.sectionTimeSeconds !== null
                          ? `${selectedExec.sectionTimeSeconds.toFixed(3)}s`
                          : "—"
                      }
                    />
                  </dl>
                </div>

                <div>
                  <p className="mb-2 text-xs font-bold uppercase text-gray-500">
                    Grip utilisation timeline
                  </p>
                  <GripTimelineChart
                    timeline={selectedExec.timeline}
                    reference={referenceTimeline}
                  />
                  <p className="mt-1 text-[10px] text-gray-500">
                    Blue = this execution; dashed amber = corner's best retained
                    reference.
                  </p>
                </div>

                <div>
                  <p className="mb-2 text-xs font-bold uppercase text-gray-500">
                    Fingerprint
                  </p>
                  <FingerprintBars fingerprint={selectedExec.fingerprint} />
                </div>
              </div>
            </div>
          )}

          {/* AI coaching */}
          <div className={`${card} mt-6`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-bold uppercase tracking-wide text-gray-400">
                5 · AI coaching
              </h2>
              <button
                type="button"
                onClick={runCoaching}
                disabled={coachingLoading || selection.stats.selectedCount === 0}
                className="rounded-lg bg-brand px-4 py-2 text-sm font-bold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {coachingLoading
                  ? "Coaching…"
                  : `Coach ${selection.stats.selectedCount} retained corners`}
              </button>
            </div>

            {coachingError && (
              <p className="mt-3 text-sm text-[#ef4444]">{coachingError}</p>
            )}
            {coaching && (
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-gray-200">
                {coaching}
              </p>
            )}
            {!coaching && !coachingError && !coachingLoading && (
              <p className="mt-3 text-xs text-gray-500">
                Generates a debrief from the currently retained corners only.
              </p>
            )}
          </div>
        </>
      )}
    </AppPage>
  );
};

const Summary: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div>
    <dt className="text-xs text-gray-500">{label}</dt>
    <dd className="text-lg font-bold tabular-nums text-white">{value}</dd>
  </div>
);

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex justify-between">
    <dt className="text-gray-500">{label}</dt>
    <dd className="font-semibold tabular-nums text-gray-200">{value}</dd>
  </div>
);

function fmtSpeed(value: number | null): string {
  return value !== null ? `${value.toFixed(1)} km/h` : "—";
}

export default CoachingPage;
