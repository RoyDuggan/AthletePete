import React from "react";
import type { CornerFingerprint } from "../../types/fingerprint";

type FingerprintBarsProps = {
  fingerprint: CornerFingerprint;
};

const ROWS: { key: keyof CornerFingerprint; label: string; group: string }[] = [
  { key: "overallUtilisation", label: "Overall utilisation", group: "Utilisation" },
  { key: "brakingUtilisation", label: "Braking", group: "Utilisation" },
  { key: "trailBrakingUtilisation", label: "Trail braking", group: "Utilisation" },
  { key: "apexUtilisation", label: "Apex", group: "Utilisation" },
  { key: "exitUtilisation", label: "Exit", group: "Utilisation" },
  { key: "smoothness", label: "Smoothness", group: "Quality" },
  { key: "stability", label: "Stability", group: "Quality" },
  { key: "consistency", label: "Consistency", group: "Quality" },
  { key: "frictionPathQuality", label: "Friction path", group: "Quality" },
  { key: "entryCommitment", label: "Entry commit", group: "Commitment" },
  { key: "apexCommitment", label: "Apex commit", group: "Commitment" },
  { key: "exitCommitment", label: "Exit commit", group: "Commitment" },
  { key: "gripReserve", label: "Grip reserve", group: "Reserve" },
  { key: "confidence", label: "Confidence", group: "Reserve" },
];

/** Colour a 0–100 metric from red (low) through amber to green (high). */
function barColor(value: number): string {
  if (value >= 75) return "#22c55e";
  if (value >= 50) return "#84cc16";
  if (value >= 30) return "#f59e0b";
  return "#ef4444";
}

const FingerprintBars: React.FC<FingerprintBarsProps> = ({ fingerprint }) => {
  let lastGroup = "";

  return (
    <div className="space-y-1">
      {ROWS.map((row) => {
        const value = fingerprint[row.key];
        const showGroup = row.group !== lastGroup;
        lastGroup = row.group;

        return (
          <div key={row.key}>
            {showGroup && (
              <p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-gray-500">
                {row.group}
              </p>
            )}
            <div className="flex items-center gap-2">
              <span className="w-24 shrink-0 text-xs text-gray-400">{row.label}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/5">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.min(100, value)}%`, backgroundColor: barColor(value) }}
                />
              </div>
              <span className="w-8 shrink-0 text-right text-xs tabular-nums text-gray-300">
                {Math.round(value)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default FingerprintBars;
