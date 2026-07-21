import React, { useEffect, useState } from "react";

import { appPanel } from "./AppPage";
import { focusRing } from "../marketing/ui";
import {
  type KartConfiguration,
  type KartConfigInput,
  listKartConfigs,
  createKartConfig,
  deleteKartConfig,
} from "../../api/garage";

const inputCls =
  "w-full rounded-md border border-gray-300 bg-mist px-3 py-2 text-sm text-[#374151] focus:outline-none focus:ring-2 focus:ring-brand";
const labelCls =
  "mb-1 block text-[11px] font-bold uppercase tracking-wide text-gray-400";
const smallBtn =
  "rounded-md bg-steel px-4 py-2 text-xs font-bold uppercase tracking-wide text-brand transition duration-300 hover:bg-[#2a2a2a] disabled:opacity-50";

type FormState = {
  name: string;
  chassis: string;
  axle: string;
  rideHeight: string;
  tyres: string;
  engine: string;
  trackWidthFront: string;
  trackWidthRear: string;
  gearFront: string;
  gearRear: string;
  airTempC: string;
  trackTempC: string;
  weatherCondition: string;
  notes: string;
};

const EMPTY: FormState = {
  name: "",
  chassis: "",
  axle: "",
  rideHeight: "",
  tyres: "",
  engine: "",
  trackWidthFront: "",
  trackWidthRear: "",
  gearFront: "",
  gearRear: "",
  airTempC: "",
  trackTempC: "",
  weatherCondition: "",
  notes: "",
};

/** Blank string → undefined; numeric strings → number for the API payload. */
const numField = (v: string): number | undefined => {
  const t = v.trim();
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
};
const textField = (v: string): string | undefined => v.trim() || undefined;

/** Summarise a config into short "label: value" chips for the read view. */
function chips(c: KartConfiguration): [string, string][] {
  const width =
    c.trackWidthFront != null || c.trackWidthRear != null
      ? `${c.trackWidthFront ?? "–"}/${c.trackWidthRear ?? "–"} mm`
      : null;
  const gearing =
    c.gearFront != null || c.gearRear != null
      ? `${c.gearFront ?? "–"}/${c.gearRear ?? "–"} T`
      : null;
  const weather =
    c.weatherCondition ||
    c.airTempC != null ||
    c.trackTempC != null
      ? [
          c.weatherCondition,
          c.airTempC != null ? `air ${c.airTempC}°` : null,
          c.trackTempC != null ? `track ${c.trackTempC}°` : null,
        ]
          .filter(Boolean)
          .join(" ")
      : null;

  return (
    [
      ["Chassis", c.chassis],
      ["Axle", c.axle],
      ["Ride height", c.rideHeight],
      ["Track width", width],
      ["Tyres", c.tyres],
      ["Gearing", gearing],
      ["Engine", c.engine],
      ["Weather", weather],
    ] as [string, string | null][]
  ).filter((entry): entry is [string, string] => Boolean(entry[1]));
}

/** List + add form for one kart's saved setup configurations. */
const KartConfigurations: React.FC<{ kartId: string }> = ({ kartId }) => {
  const [configs, setConfigs] = useState<KartConfiguration[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const reload = async () => {
    try {
      const { configs } = await listKartConfigs(kartId);
      setConfigs(configs);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load configurations.");
    }
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kartId]);

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) {
      setError("Give the configuration a name.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const payload: KartConfigInput = {
        name: form.name.trim(),
        chassis: textField(form.chassis),
        axle: textField(form.axle),
        rideHeight: textField(form.rideHeight),
        tyres: textField(form.tyres),
        engine: textField(form.engine),
        trackWidthFront: numField(form.trackWidthFront),
        trackWidthRear: numField(form.trackWidthRear),
        gearFront: numField(form.gearFront),
        gearRear: numField(form.gearRear),
        airTempC: numField(form.airTempC),
        trackTempC: numField(form.trackTempC),
        weatherCondition: textField(form.weatherCondition),
        notes: textField(form.notes),
      };
      await createKartConfig(kartId, payload);
      setForm(EMPTY);
      setShowForm(false);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save configuration.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    await deleteKartConfig(kartId, id).catch(() => {});
    reload();
  };

  return (
    <div className="mt-3 border-t border-white/10 pt-3">
      <div className="flex items-center justify-between">
        <h4 className="text-[11px] font-bold uppercase tracking-wide text-gray-400">
          Configurations{" "}
          <span className="text-gray-600">({configs.length})</span>
        </h4>
        <button
          type="button"
          onClick={() => setShowForm((s) => !s)}
          className={`text-[11px] font-bold uppercase text-brand hover:underline ${focusRing}`}
        >
          {showForm ? "Cancel" : "+ Add setup"}
        </button>
      </div>

      {error && <p className="mt-2 text-xs text-[#ef4444]">{error}</p>}

      {configs.length > 0 && (
        <ul className="mt-3 space-y-2">
          {configs.map((c) => (
            <li key={c.id} className="rounded-md border border-white/10 bg-black/20 p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-bold text-white">{c.name}</p>
                <button
                  type="button"
                  onClick={() => remove(c.id)}
                  className={`shrink-0 text-[11px] font-bold uppercase text-gray-500 hover:text-[#ef4444] ${focusRing}`}
                >
                  Remove
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                {chips(c).map(([k, v]) => (
                  <span key={k} className="text-xs text-gray-400">
                    <span className="text-gray-600">{k}:</span> {v}
                  </span>
                ))}
              </div>
              {c.notes && (
                <p className="mt-2 text-xs italic text-gray-500">{c.notes}</p>
              )}
            </li>
          ))}
        </ul>
      )}

      {showForm && (
        <form onSubmit={save} className={`${appPanel} mt-3 space-y-4`}>
          <div>
            <label className={labelCls}>Configuration name *</label>
            <input
              className={inputCls}
              placeholder="e.g. Round 3 — Wet"
              value={form.name}
              onChange={set("name")}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Chassis</label>
              <input className={inputCls} value={form.chassis} onChange={set("chassis")} />
            </div>
            <div>
              <label className={labelCls}>Axle</label>
              <input className={inputCls} value={form.axle} onChange={set("axle")} />
            </div>
            <div>
              <label className={labelCls}>Ride height</label>
              <input className={inputCls} value={form.rideHeight} onChange={set("rideHeight")} />
            </div>
            <div>
              <label className={labelCls}>Tyres</label>
              <input className={inputCls} value={form.tyres} onChange={set("tyres")} />
            </div>
            <div>
              <label className={labelCls}>Engine</label>
              <input className={inputCls} value={form.engine} onChange={set("engine")} />
            </div>
            <div>
              <label className={labelCls}>Weather condition</label>
              <input
                className={inputCls}
                placeholder="Dry / Damp / Wet"
                value={form.weatherCondition}
                onChange={set("weatherCondition")}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className={labelCls}>Track width front (mm)</label>
              <input
                className={inputCls}
                inputMode="numeric"
                value={form.trackWidthFront}
                onChange={set("trackWidthFront")}
              />
            </div>
            <div>
              <label className={labelCls}>Track width rear (mm)</label>
              <input
                className={inputCls}
                inputMode="numeric"
                value={form.trackWidthRear}
                onChange={set("trackWidthRear")}
              />
            </div>
            <div />
            <div>
              <label className={labelCls}>Gear — front (T)</label>
              <input
                className={inputCls}
                inputMode="numeric"
                value={form.gearFront}
                onChange={set("gearFront")}
              />
            </div>
            <div>
              <label className={labelCls}>Gear — rear (T)</label>
              <input
                className={inputCls}
                inputMode="numeric"
                value={form.gearRear}
                onChange={set("gearRear")}
              />
            </div>
            <div />
            <div>
              <label className={labelCls}>Air temp (°C)</label>
              <input
                className={inputCls}
                inputMode="decimal"
                value={form.airTempC}
                onChange={set("airTempC")}
              />
            </div>
            <div>
              <label className={labelCls}>Track temp (°C)</label>
              <input
                className={inputCls}
                inputMode="decimal"
                value={form.trackTempC}
                onChange={set("trackTempC")}
              />
            </div>
            <div />
          </div>

          <div>
            <label className={labelCls}>Notes</label>
            <input className={inputCls} value={form.notes} onChange={set("notes")} />
          </div>

          <button type="submit" disabled={busy} className={smallBtn}>
            {busy ? "Saving…" : "Save configuration"}
          </button>
        </form>
      )}
    </div>
  );
};

export default KartConfigurations;
