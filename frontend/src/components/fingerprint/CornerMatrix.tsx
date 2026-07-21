import React from "react";
import type {
  CornerDefinition,
  CornerExecution,
  FingerprintLap,
} from "../../types/fingerprint";
import { isRetained, fastestLapKey, lapKey } from "../../lib/fingerprintSelection";

type CornerMatrixProps = {
  laps: FingerprintLap[];
  corners: CornerDefinition[];
  executions: CornerExecution[];
  threshold: number;
  selected: CornerExecution | null;
  onSelect: (exec: CornerExecution) => void;
};

const execKey = (sessionId: string, lapNumber: number, cornerNumber: number) =>
  `${sessionId}#${lapNumber}#${cornerNumber}`;

/** Attack-score → cell colour (retained cells only). */
function scoreColor(score: number): string {
  if (score >= 75) return "#16a34a";
  if (score >= 60) return "#65a30d";
  if (score >= 45) return "#ca8a04";
  return "#dc2626";
}

/** Formats a time in seconds for the matrix (— when missing). */
function fmtTime(seconds: number | null | undefined): string {
  return seconds === null || seconds === undefined ? "—" : seconds.toFixed(2);
}

/** Podium colours for the three fastest lap times (gold / silver / bronze). */
const MEDAL_COLORS: Record<1 | 2 | 3, string> = {
  1: "#fbbf24", // gold
  2: "#cbd5e1", // silver
  3: "#cd7f32", // bronze
};
const MEDAL_LABELS: Record<1 | 2 | 3, string> = {
  1: "Fastest lap",
  2: "2nd fastest lap",
  3: "3rd fastest lap",
};

/**
 * Laps × corners grid. Each cell is one corner execution, coloured by attack
 * score; anomaly-rejected cells are hatched grey, below-threshold cells are
 * faded. Click a cell to inspect it.
 */
const CornerMatrix: React.FC<CornerMatrixProps> = ({
  laps,
  corners,
  executions,
  threshold,
  selected,
  onSelect,
}) => {
  const byKey = new Map<string, CornerExecution>();
  for (const exec of executions) {
    byKey.set(execKey(exec.sessionId, exec.lapNumber, exec.cornerNumber), exec);
  }

  const selectedKey = selected
    ? execKey(selected.sessionId, selected.lapNumber, selected.cornerNumber)
    : null;

  // The fastest lap is always retained regardless of the threshold, so its
  // corners never fade out under the sensitivity slider.
  const fastestKey = fastestLapKey(executions);

  // Medal ranking for the three quickest lap times (gold / silver / bronze).
  const medalByLap = new Map<string, 1 | 2 | 3>();
  [...laps]
    .filter((l) => l.lapTimeSeconds !== null && l.lapTimeSeconds !== undefined)
    .sort((a, b) => a.lapTimeSeconds - b.lapTimeSeconds)
    .slice(0, 3)
    .forEach((l, i) => medalByLap.set(lapKey(l), (i + 1) as 1 | 2 | 3));

  // Fastest section time per corner across all clean (non-rejected) executions,
  // and the theoretical-minimum lap = the sum of those per-corner bests. Also
  // track which cell that fastest execution is, so we can ring it in red.
  const bestByCorner = new Map<number, number>();
  const fastestKeyByCorner = new Map<number, string>();
  for (const exec of executions) {
    if (exec.rejected || exec.sectionTimeSeconds === null) continue;
    const best = bestByCorner.get(exec.cornerNumber);
    if (best === undefined || exec.sectionTimeSeconds < best) {
      bestByCorner.set(exec.cornerNumber, exec.sectionTimeSeconds);
      fastestKeyByCorner.set(
        exec.cornerNumber,
        execKey(exec.sessionId, exec.lapNumber, exec.cornerNumber)
      );
    }
  }
  const theoreticalMin = corners.reduce((sum, c) => {
    const best = bestByCorner.get(c.cornerNumber);
    return best !== undefined ? sum + best : sum;
  }, 0);

  return (
    <div className="overflow-x-auto">
      <table className="border-separate border-spacing-1 text-xs">
        <thead>
          <tr>
            <th className="sticky left-0 bg-transparent px-2 text-left font-normal text-gray-500">
              Best
            </th>
            {corners.map((c) => (
              <th
                key={c.cornerNumber}
                className="px-1 text-center font-mono text-[10px] font-normal text-emerald-400/90"
                title={`Fastest C${c.cornerNumber} section across all laps`}
              >
                {fmtTime(bestByCorner.get(c.cornerNumber))}
              </th>
            ))}
            <th
              className="px-2 text-right font-mono text-[10px] font-bold text-emerald-300"
              title="Theoretical minimum lap time — sum of the fastest section for every corner"
            >
              {theoreticalMin > 0 ? theoreticalMin.toFixed(2) : "—"}
            </th>
          </tr>
          <tr>
            <th className="sticky left-0 bg-transparent px-2 text-left text-gray-500">
              Lap
            </th>
            {corners.map((c) => (
              <th key={c.cornerNumber} className="px-1 text-center text-gray-500">
                C{c.cornerNumber}
              </th>
            ))}
            <th className="px-2 text-right text-gray-500">Lap time</th>
          </tr>
        </thead>
        <tbody>
          {laps.map((lap) => {
            const medal = medalByLap.get(lapKey(lap));
            return (
            <tr key={`${lap.sessionId}#${lap.lapNumber}`}>
              <td className="sticky left-0 whitespace-nowrap bg-transparent px-2 text-gray-400">
                {lap.label}
              </td>
              {corners.map((corner) => {
                const key = execKey(lap.sessionId, lap.lapNumber, corner.cornerNumber);
                const exec = byKey.get(key);

                if (!exec) {
                  return (
                    <td key={key} className="h-7 w-7">
                      <div className="h-6 w-6 rounded bg-white/5" />
                    </td>
                  );
                }

                const retained = isRetained(exec, threshold, fastestKey);
                const isSelected = key === selectedKey;
                const isFastest =
                  fastestKeyByCorner.get(corner.cornerNumber) === key;

                let background = scoreColor(exec.attackScore);
                let opacity = 1;
                let title = `${lap.label} · C${corner.cornerNumber} · attack ${Math.round(
                  exec.attackScore
                )}`;

                if (exec.rejected) {
                  background = "#374151";
                  opacity = 0.55;
                  title += ` · rejected (${exec.rejectionReasons.join(", ")})`;
                } else if (!retained) {
                  opacity = 0.3;
                  title += " · below threshold";
                }

                if (isFastest) {
                  // Fastest execution through this corner — keep it legible.
                  opacity = Math.max(opacity, 0.9);
                  title += " · fastest section";
                }

                return (
                  <td key={key} className="h-7 w-7">
                    <button
                      type="button"
                      onClick={() => onSelect(exec)}
                      title={title}
                      className={`h-6 w-6 rounded text-[9px] font-bold text-white transition ${
                        isFastest ? "outline outline-2 outline-red-500" : ""
                      } ${
                        isSelected ? "ring-2 ring-white" : "hover:ring-1 hover:ring-white/40"
                      }`}
                      style={{ backgroundColor: background, opacity }}
                    >
                      {exec.rejected ? "×" : Math.round(exec.attackScore)}
                    </button>
                  </td>
                );
              })}
              <td
                className={`whitespace-nowrap px-2 text-right font-mono text-[11px] ${
                  medal ? "font-bold" : "text-gray-300"
                }`}
                style={medal ? { color: MEDAL_COLORS[medal] } : undefined}
                title={medal ? MEDAL_LABELS[medal] : undefined}
              >
                {medal && <span className="mr-1">●</span>}
                {fmtTime(lap.lapTimeSeconds)}
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default CornerMatrix;
