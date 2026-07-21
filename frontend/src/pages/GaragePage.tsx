import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import MarketingLayout from "../components/marketing/MarketingLayout";
import { container, focusRing } from "../components/marketing/ui";
import { useAuth } from "../context/AuthContext";
import {
  type Kart,
  type StoredSession,
  listKarts,
  createKart,
  deleteKart,
  listSessions,
  deleteSession,
} from "../api/garage";

const panel = "rounded-lg border border-white/10 bg-panel p-5";
const inputCls =
  "w-full rounded-md border border-gray-300 bg-mist px-3 py-2 text-sm text-[#374151] focus:outline-none focus:ring-2 focus:ring-brand";
const smallBtn =
  "rounded-md bg-steel px-4 py-2 text-xs font-bold uppercase tracking-wide text-brand transition duration-300 hover:bg-[#2a2a2a] disabled:opacity-50";

function formatBytes(n: number | null): string {
  if (!n) return "";
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

const GaragePage: React.FC = () => {
  const { user } = useAuth();

  const [karts, setKarts] = useState<Kart[]>([]);
  const [kartLimit, setKartLimit] = useState(2);
  const [sessions, setSessions] = useState<StoredSession[]>([]);
  const [sessionLimit, setSessionLimit] = useState(100);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState({ name: "", chassis: "", engine: "" });

  const reload = async () => {
    try {
      const [k, s] = await Promise.all([listKarts(), listSessions()]);
      setKarts(k.karts);
      setKartLimit(k.limit);
      setSessions(s.sessions);
      setSessionLimit(s.limit);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load your garage.");
    }
  };

  useEffect(() => {
    reload();
  }, []);

  const addKart = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) return;
    setBusy(true);
    setError("");
    try {
      await createKart({
        name: form.name,
        chassis: form.chassis || undefined,
        engine: form.engine || undefined,
      });
      setForm({ name: "", chassis: "", engine: "" });
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add kart.");
    } finally {
      setBusy(false);
    }
  };

  const removeKart = async (id: string) => {
    await deleteKart(id).catch(() => {});
    reload();
  };

  const removeSession = async (id: string) => {
    await deleteSession(id).catch(() => {});
    reload();
  };

  const trialDaysLeft = user
    ? Math.max(
        0,
        Math.ceil(
          (new Date(user.trialEndsAt).getTime() - Date.now()) / 86400000
        )
      )
    : 0;

  return (
    <MarketingLayout>
      <section className="bg-panel py-10 md:py-14">
        <div className={container}>
          <h1 className="text-2xl font-extrabold uppercase tracking-wide text-white md:text-4xl">
            My <span className="text-brand">Garage</span>
          </h1>
          {user && (
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className={panel}>
                <p className="text-xs uppercase tracking-wide text-gray-500">Account</p>
                <p className="mt-1 truncate text-sm font-bold text-white">{user.email}</p>
              </div>
              <div className={panel}>
                <p className="text-xs uppercase tracking-wide text-gray-500">Plan</p>
                <p className="mt-1 text-sm font-bold text-brand">{user.plan}</p>
              </div>
              <div className={panel}>
                <p className="text-xs uppercase tracking-wide text-gray-500">Credits left</p>
                <p className="mt-1 text-sm font-bold text-white">{user.creditsRemaining}</p>
              </div>
              <div className={panel}>
                <p className="text-xs uppercase tracking-wide text-gray-500">Trial</p>
                <p className="mt-1 text-sm font-bold text-white">{trialDaysLeft} days left</p>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="py-10 md:py-14">
        <div className={`${container} space-y-12`}>
          {error && <p className="advisory-negative text-sm text-[#ef4444]">{error}</p>}

          {/* Karts */}
          <div>
            <h2 className="text-lg font-extrabold uppercase tracking-wide text-white">
              Karts{" "}
              <span className="text-sm font-normal text-gray-500">
                ({karts.length}/{kartLimit})
              </span>
            </h2>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {karts.map((kart) => (
                <div key={kart.id} className={`${panel} flex items-start justify-between`}>
                  <div>
                    <p className="text-base font-bold text-white">{kart.name}</p>
                    <p className="mt-1 text-xs text-gray-400">
                      {[kart.chassis, kart.engine].filter(Boolean).join(" · ") ||
                        "No chassis/engine set"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeKart(kart.id)}
                    className={`text-xs font-bold uppercase text-gray-500 hover:text-[#ef4444] ${focusRing}`}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            {karts.length < kartLimit ? (
              <form
                onSubmit={addKart}
                className="mt-4 flex flex-col gap-2 sm:flex-row"
              >
                <input
                  className={inputCls}
                  placeholder="Kart name *"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
                <input
                  className={inputCls}
                  placeholder="Chassis"
                  value={form.chassis}
                  onChange={(e) => setForm({ ...form, chassis: e.target.value })}
                />
                <input
                  className={inputCls}
                  placeholder="Engine"
                  value={form.engine}
                  onChange={(e) => setForm({ ...form, engine: e.target.value })}
                />
                <button type="submit" disabled={busy} className={`${smallBtn} shrink-0`}>
                  Add Kart
                </button>
              </form>
            ) : (
              <p className="mt-4 text-xs text-gray-500">
                Kart limit reached on the free plan.{" "}
                <Link to="/pricing" className="text-brand hover:underline">
                  Upgrade
                </Link>{" "}
                to add more.
              </p>
            )}
          </div>

          {/* Sessions */}
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold uppercase tracking-wide text-white">
                Sessions{" "}
                <span className="text-sm font-normal text-gray-500">
                  ({sessions.length}/{sessionLimit})
                </span>
              </h2>
              <Link
                to="/app"
                className={`text-xs font-bold uppercase tracking-wide text-brand hover:underline ${focusRing}`}
              >
                Upload / Analyse →
              </Link>
            </div>

            {sessions.length === 0 ? (
              <p className="mt-4 text-sm text-gray-500">
                No sessions yet — upload telemetry from the{" "}
                <Link to="/app" className="text-brand hover:underline">
                  analysis page
                </Link>
                .
              </p>
            ) : (
              <div className="mt-4 overflow-hidden rounded-lg border border-white/10">
                {sessions.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between border-b border-white/5 bg-panel px-4 py-3 text-sm last:border-b-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-white">
                        {s.originalName ?? s.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(s.uploadedAt).toLocaleString()}
                        {s.sizeBytes ? ` · ${formatBytes(s.sizeBytes)}` : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeSession(s.id)}
                      className={`ml-3 shrink-0 text-xs font-bold uppercase text-gray-500 hover:text-[#ef4444] ${focusRing}`}
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
};

export default GaragePage;
