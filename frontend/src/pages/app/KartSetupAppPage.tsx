import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { AppPage, appPanel } from "../../components/app/AppPage";
import KartConfigurations from "../../components/app/KartConfigurations";
import { focusRing } from "../../components/marketing/ui";
import {
  type Kart,
  listKarts,
  createKart,
  deleteKart,
} from "../../api/garage";

const inputCls =
  "w-full rounded-md border border-gray-300 bg-mist px-3 py-2 text-sm text-[#374151] focus:outline-none focus:ring-2 focus:ring-brand";
const smallBtn =
  "rounded-md bg-steel px-4 py-2 text-xs font-bold uppercase tracking-wide text-brand transition duration-300 hover:bg-[#2a2a2a] disabled:opacity-50";

/** Manage the driver's karts. Free-tier feature. Reuses the karts API. */
const KartSetupAppPage: React.FC = () => {
  const [karts, setKarts] = useState<Kart[]>([]);
  const [kartLimit, setKartLimit] = useState(2);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "", chassis: "", engine: "" });
  const [openKartId, setOpenKartId] = useState<string | null>(null);

  const reload = async () => {
    try {
      const k = await listKarts();
      setKarts(k.karts);
      setKartLimit(k.limit);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load your karts.");
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

  return (
    <AppPage
      title="Kart"
      accent="Setup"
      subtitle="Register your karts, then log setup configurations — chassis, axle, ride height, track width, tyres, gearing, engine and weather — for every session."
    >
      {error && <p className="mb-4 text-sm text-[#ef4444]">{error}</p>}

      <h2 className="text-sm font-bold uppercase tracking-wide text-gray-400">
        Karts <span className="text-gray-600">({karts.length}/{kartLimit})</span>
      </h2>

      <div className="mt-4 space-y-4">
        {karts.map((kart) => {
          const open = openKartId === kart.id;
          return (
            <div key={kart.id} className={appPanel}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-bold text-white">{kart.name}</p>
                  <p className="mt-1 text-xs text-gray-400">
                    {[kart.chassis, kart.engine].filter(Boolean).join(" · ") ||
                      "No chassis/engine set"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setOpenKartId(open ? null : kart.id)}
                    className={`text-xs font-bold uppercase text-gray-400 hover:text-brand ${focusRing}`}
                  >
                    {open ? "Hide setups" : "Setups"}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeKart(kart.id)}
                    className={`text-xs font-bold uppercase text-gray-500 hover:text-[#ef4444] ${focusRing}`}
                  >
                    Remove
                  </button>
                </div>
              </div>

              {open && <KartConfigurations kartId={kart.id} />}
            </div>
          );
        })}
      </div>

      {karts.length < kartLimit ? (
        <form onSubmit={addKart} className="mt-4 flex flex-col gap-2 sm:flex-row">
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
          Kart limit reached on your plan.{" "}
          <Link to="/app/subscription" className="text-brand hover:underline">
            Upgrade
          </Link>{" "}
          to add more.
        </p>
      )}
    </AppPage>
  );
};

export default KartSetupAppPage;
