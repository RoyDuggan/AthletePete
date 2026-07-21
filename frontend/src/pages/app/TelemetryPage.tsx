import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import { useAnalysis } from "../../context/AnalysisContext";
import { AppPage, UpgradeNotice } from "../../components/app/AppPage";
import { hasFeature, trialActive } from "../../lib/tiers";
import FileUpload from "../../components/FileUpload";
import AdvisoryDashboard from "../../views/AdvisoryDashboard";
import {
  type StoredSession,
  listSessions,
  deleteSession,
} from "../../api/garage";
import { analyseSession } from "../../api/zoneMaps";

function formatBytes(n: number | null): string {
  if (!n) return "";
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/** Telemetry upload + analysis + saved sessions. Premium feature. */
const TelemetryPage: React.FC = () => {
  const { user } = useAuth();
  // Analysis + selection live in the shared session context so they survive
  // navigation to other /app pages (e.g. Coaching) until sign-out or a new load.
  const {
    advisoryData,
    setAdvisoryData,
    selectedKeys,
    setSelectedKeys,
    toggleKey,
  } = useAnalysis();
  const [sessions, setSessions] = useState<StoredSession[]>([]);
  const [sessionLimit, setSessionLimit] = useState(100);

  // Saved-session loading state (ephemeral, page-local).
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  const reloadSessions = async () => {
    try {
      const s = await listSessions();
      setSessions(s.sessions);
      setSessionLimit(s.limit);
    } catch {
      /* non-fatal: sessions list just stays empty */
    }
  };

  useEffect(() => {
    if (hasFeature(user, "telemetry")) reloadSessions();
  }, [user]);

  if (!hasFeature(user, "telemetry")) {
    return (
      <AppPage title="Telemetry" subtitle="Upload telemetry and turn it into lap time.">
        <UpgradeNotice feature="Telemetry" />
      </AppPage>
    );
  }

  const trialDays = user
    ? Math.max(
        0,
        Math.ceil((new Date(user.trialEndsAt).getTime() - Date.now()) / 86400000)
      )
    : 0;
  const trialOver = Boolean(user && !trialActive(user) && user.plan === "FREE");
  const noCredits = Boolean(user && user.creditsRemaining <= 0 && user.plan === "FREE");


  /** Re-analyse one or more saved sessions (no re-upload, no credit spent). */
  const loadSessions = async (storageKeys: string[]) => {
    if (storageKeys.length === 0) return;
    setLoading(true);
    setLoadError("");
    try {
      const data = await analyseSession({
        sessionId: storageKeys[0],
        sessions: storageKeys,
        subjectLapNumber: null,
        referenceLapNumber: null,
        zoneBasis: "fastest",
      });
      setAdvisoryData(data);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setLoadError(
        e instanceof Error ? e.message : "Could not load the selected session(s)."
      );
    } finally {
      setLoading(false);
    }
  };

  const removeSession = async (id: string, storageKey: string) => {
    await deleteSession(id).catch(() => {});
    setSelectedKeys(selectedKeys.filter((k) => k !== storageKey));
    reloadSessions();
  };

  // Ticked keys that still exist in the current sessions list.
  const presentKeys = sessions
    .map((s) => s.storageKey)
    .filter((k) => selectedKeys.includes(k));

  return (
    <AppPage
      title="Telemetry"
      subtitle="Upload a new session or load one or more saved sessions to see per-zone deltas, metrics and AI coaching."
    >
      {user && user.plan !== "FREE" && (
        <div className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border border-brand/30 bg-brand/5 px-5 py-3 text-sm text-gray-300">
          <span>
            <strong className="text-brand">Subscribed</strong> — unlimited uploads &amp; analysis
          </span>
          <Link
            to="/app/subscription"
            className="ml-auto font-bold uppercase tracking-wide text-brand hover:underline"
          >
            Manage billing
          </Link>
        </div>
      )}

      {user && user.plan === "FREE" && (
        <div className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border border-white/10 bg-panel px-5 py-3 text-sm text-gray-300">
          <span>
            <strong className="text-brand">{user.creditsRemaining}</strong> upload
            credits left
          </span>
          <span>
            <strong className="text-brand">{trialDays}</strong> trial days left
          </span>
          {(trialOver || noCredits) && (
            <span className="text-[#ef4444]">
              {trialOver
                ? "Trial ended — subscribe to keep analysing."
                : "Out of credits — subscribe to upload more."}
            </span>
          )}
          <Link
            to="/app/subscription"
            className="ml-auto font-bold uppercase tracking-wide text-brand hover:underline"
          >
            Upgrade
          </Link>
        </div>
      )}

      {/* Source: upload new, or load saved (no credit spent loading saved). */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upload new */}
        <div className="min-w-0 rounded-lg border border-white/10 bg-panel p-5">
          <h2 className="text-sm font-bold uppercase tracking-wide text-gray-400">
            Upload new files
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            {user && user.plan !== "FREE"
              ? "Uploads are unlimited on your plan."
              : "Loading new files costs one upload credit."}
          </p>
          <div className="mt-3">
            <FileUpload
              onUploadSuccess={(d) => {
                setAdvisoryData(d);
                reloadSessions();
              }}
            />
          </div>
        </div>

        {/* Load saved */}
        <div className="min-w-0 rounded-lg border border-white/10 bg-panel p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-bold uppercase tracking-wide text-gray-400">
              Saved sessions{" "}
              <span className="text-gray-600">
                ({sessions.length}/{sessionLimit})
              </span>
            </h2>
            <button
              type="button"
              disabled={loading || presentKeys.length === 0}
              onClick={() => loadSessions(presentKeys)}
              className="rounded-md bg-steel px-4 py-2 text-xs font-bold uppercase tracking-wide text-brand transition duration-300 hover:bg-[#2a2a2a] disabled:opacity-40"
            >
              {loading ? "Loading…" : `Load selected (${presentKeys.length})`}
            </button>
          </div>

          <p className="mt-1 text-xs text-gray-500">
            Tick one or more and load them — re-analysing saved sessions is free.
          </p>

          {loadError && <p className="mt-3 text-xs text-[#ef4444]">{loadError}</p>}

          {sessions.length === 0 ? (
            <p className="mt-4 text-sm text-gray-500">No sessions saved yet.</p>
          ) : (
            <div className="mt-3 max-h-80 space-y-1 overflow-y-auto">
              {sessions.map((s) => {
                const checked = selectedKeys.includes(s.storageKey);
                return (
                  <div
                    key={s.id}
                    className={`flex items-center gap-3 rounded-md border px-3 py-2 text-sm transition ${
                      checked
                        ? "border-brand/50 bg-brand/5"
                        : "border-white/5 hover:border-white/15"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleKey(s.storageKey)}
                      className="h-4 w-4 shrink-0 accent-brand"
                      aria-label={`Select ${s.name || s.originalName}`}
                    />
                    <button
                      type="button"
                      onClick={() => loadSessions([s.storageKey])}
                      className="min-w-0 flex-1 appearance-none bg-transparent text-left"
                      title={s.originalName ?? "Load this session"}
                    >
                      <p className="truncate font-semibold text-white">
                        {s.name || s.originalName}
                      </p>
                      {s.sizeBytes ? (
                        <p className="text-xs text-gray-500">
                          {formatBytes(s.sizeBytes)}
                        </p>
                      ) : null}
                    </button>
                    <button
                      type="button"
                      onClick={() => loadSessions([s.storageKey])}
                      className="shrink-0 text-xs font-bold uppercase text-brand hover:underline"
                    >
                      Open
                    </button>
                    <button
                      type="button"
                      onClick={() => removeSession(s.id, s.storageKey)}
                      className="shrink-0 text-xs font-bold uppercase text-gray-500 hover:text-[#ef4444]"
                    >
                      Delete
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Analysis output */}
      <div className="mt-8">
        {advisoryData ? (
          <AdvisoryDashboard data={advisoryData} onAnalysisUpdate={setAdvisoryData} />
        ) : (
          <p className="text-gray-400">
            Upload files or load a saved session to see analysis.
          </p>
        )}
      </div>
    </AppPage>
  );
};

export default TelemetryPage;
