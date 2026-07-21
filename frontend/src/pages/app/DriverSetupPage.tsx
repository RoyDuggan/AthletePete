import React, { useEffect, useMemo, useState } from "react";

import { useAuth } from "../../context/AuthContext";
import { AppPage, appPanel } from "../../components/app/AppPage";
import {
  getDriverProfile,
  saveDriverProfile,
  getDriverFraming,
  type DriverProfile,
  type FramingDimension,
} from "../../api/driver";
import FramingPromptEditor from "../../components/app/FramingPromptEditor";

const inputCls =
  "w-full rounded-md border border-gray-300 bg-mist px-3 py-2 text-sm text-[#374151] focus:outline-none focus:ring-2 focus:ring-brand";
const labelCls = "mb-1 block text-xs font-bold uppercase tracking-wide text-gray-400";

const CLASSES = ["Bambino", "Cadet", "Junior", "Senior", "Gearbox"];

const EMPTY: DriverProfile = {
  name: "",
  raceNumber: "",
  kartClass: "",
  homeTrack: "",
  ageBracket: "",
  experience: "",
  coachingStyle: "",
};

/**
 * Driver profile setup. Persisted to the account so coaching can be tailored to
 * the driver, and — for Driver Admins — the place to edit the AI-framing prompts
 * that the Age / Experience / Coaching-style selections drive.
 */
const DriverSetupPage: React.FC = () => {
  const { user } = useAuth();

  const [form, setForm] = useState<DriverProfile>(EMPTY);
  const [dimensions, setDimensions] = useState<FramingDimension[]>([]);
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getDriverProfile(), getDriverFraming()])
      .then(([profile, framing]) => {
        if (cancelled) return;
        setForm({ ...EMPTY, ...profile, name: profile.name || user?.fullName || "" });
        setDimensions(framing.dimensions);
        setOverrides(framing.overrides);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load your driver profile.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.fullName]);

  const dim = useMemo(() => {
    const byKey = new Map(dimensions.map((d) => [d.key, d]));
    return {
      age: byKey.get("age"),
      experience: byKey.get("experience"),
      coachingStyle: byKey.get("coachingStyle"),
    };
  }, [dimensions]);

  const set = (key: keyof DriverProfile, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const stored = await saveDriverProfile(form);
      setForm((f) => ({ ...f, ...stored }));
      setSaved(true);
    } catch {
      setError("Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppPage
      title="Driver"
      accent="Setup"
      subtitle="Tell Virtual Pete about the driver so coaching can be tailored to their class, age and stage."
    >
      <form onSubmit={onSubmit} className={`${appPanel} max-w-2xl space-y-4`}>
        <div>
          <label className={labelCls} htmlFor="driver-name">Driver name</label>
          <input
            id="driver-name"
            className={inputCls}
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="e.g. Alex Carter"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls} htmlFor="race-number">Race number</label>
            <input
              id="race-number"
              className={inputCls}
              value={form.raceNumber}
              onChange={(e) => set("raceNumber", e.target.value)}
              placeholder="e.g. 47"
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="kart-class">Class</label>
            <select
              id="kart-class"
              className={inputCls}
              value={form.kartClass}
              onChange={(e) => set("kartClass", e.target.value)}
            >
              <option value="">Select a class…</option>
              {CLASSES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Coaching-framing selections: these drive how the AI frames its
            coaching (tone, depth, focus) for this driver. */}
        <div className="grid gap-4 sm:grid-cols-3">
          <FramingSelect
            id="driver-age"
            label="Age"
            value={form.ageBracket}
            dimension={dim.age}
            disabled={loading}
            onChange={(v) => set("ageBracket", v)}
          />
          <FramingSelect
            id="driver-experience"
            label="Experience"
            value={form.experience}
            dimension={dim.experience}
            disabled={loading}
            onChange={(v) => set("experience", v)}
          />
          <FramingSelect
            id="driver-coaching-style"
            label="Coaching style"
            value={form.coachingStyle}
            dimension={dim.coachingStyle}
            disabled={loading}
            onChange={(v) => set("coachingStyle", v)}
          />
        </div>

        <div>
          <label className={labelCls} htmlFor="home-track">Home track</label>
          <input
            id="home-track"
            className={inputCls}
            value={form.homeTrack}
            onChange={(e) => set("homeTrack", e.target.value)}
            placeholder="e.g. PFi"
          />
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={saving || loading}
            className="rounded-md bg-steel px-5 py-2 text-xs font-bold uppercase tracking-wide text-brand transition duration-300 hover:bg-[#2a2a2a] disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save driver"}
          </button>
          {saved && <span className="text-xs font-semibold text-brand">Saved ✓</span>}
          {error && <span className="text-xs font-semibold text-red-500">{error}</span>}
        </div>
      </form>

      {/* Driver-Admin-only: manage the framing prompts each option injects. */}
      {user?.driverAdmin && dimensions.length > 0 && (
        <FramingPromptEditor
          dimensions={dimensions}
          initialOverrides={overrides}
        />
      )}
    </AppPage>
  );
};

/** A framing dropdown backed by a fetched dimension (empty until loaded). */
const FramingSelect: React.FC<{
  id: string;
  label: string;
  value: string;
  dimension?: FramingDimension;
  disabled?: boolean;
  onChange: (value: string) => void;
}> = ({ id, label, value, dimension, disabled, onChange }) => (
  <div>
    <label className={labelCls} htmlFor={id}>{label}</label>
    <select
      id={id}
      className={inputCls}
      value={value}
      disabled={disabled || !dimension}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">Select…</option>
      {dimension?.options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  </div>
);

export default DriverSetupPage;
