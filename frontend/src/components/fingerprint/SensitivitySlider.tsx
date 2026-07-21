import React from "react";
import type { SelectionStats } from "../../lib/fingerprintSelection";

type SensitivitySliderProps = {
  value: number;
  onChange: (value: number) => void;
  stats: SelectionStats;
};

function fmtTime(seconds: number | null): string {
  if (seconds === null) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds - m * 60;
  return m > 0 ? `${m}:${s.toFixed(2).padStart(5, "0")}` : `${s.toFixed(2)}s`;
}

/**
 * The single sensitivity control. Moving it only changes the attack-score
 * acceptance threshold — the live stats update instantly with no recompute.
 */
const SensitivitySlider: React.FC<SensitivitySliderProps> = ({
  value,
  onChange,
  stats,
}) => (
  <div>
    <div className="flex items-center justify-between">
      <label htmlFor="sensitivity" className="text-sm font-semibold text-white">
        Sensitivity
      </label>
      <span className="text-sm tabular-nums text-brand">{value}</span>
    </div>

    <input
      id="sensitivity"
      type="range"
      min={0}
      max={100}
      step={1}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="mt-2 w-full accent-brand"
    />
    <div className="mt-1 flex justify-between text-[10px] text-gray-500">
      <span>Inclusive (more corners)</span>
      <span>Strict (only the best)</span>
    </div>

    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-3">
      <Stat label="Selected" value={String(stats.selectedCount)} />
      <Stat label="Below threshold" value={String(stats.belowThresholdCount)} />
      <Stat label="Rejected" value={String(stats.rejectedCount)} />
      <Stat label="Included laps" value={String(stats.includedLapCount)} />
      <Stat label="Fastest represented" value={fmtTime(stats.minLapTimeSeconds)} />
      <Stat label="Slowest represented" value={fmtTime(stats.maxLapTimeSeconds)} />
    </dl>
  </div>
);

const Stat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <dt className="text-gray-500">{label}</dt>
    <dd className="font-semibold tabular-nums text-white">{value}</dd>
  </div>
);

export default SensitivitySlider;
