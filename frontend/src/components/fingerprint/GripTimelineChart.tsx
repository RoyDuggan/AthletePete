import React from "react";
import type { CornerPhase, GripTimelineSample } from "../../types/fingerprint";

type GripTimelineChartProps = {
  timeline: GripTimelineSample[];
  /** Optional reference execution to overlay (e.g. the best retained corner). */
  reference?: GripTimelineSample[];
  width?: number;
  height?: number;
};

const PHASE_COLOR: Record<CornerPhase, string> = {
  braking: "#ef4444",
  trail_braking: "#f59e0b",
  apex: "#8b5cf6",
  exit: "#22c55e",
  straight: "#64748b",
};

const PHASE_LABEL: Record<CornerPhase, string> = {
  braking: "Braking",
  trail_braking: "Trail",
  apex: "Apex",
  exit: "Exit",
  straight: "Straight",
};

const SUBJECT_COLOR = "#2563eb";
const REFERENCE_COLOR = "#f59e0b";

/**
 * Grip-utilisation timeline: utilisation % (0–120) against corner progress
 * (0–100%). A dashed line marks 100% (the grip envelope); the phase band under
 * the axis shows where braking/trail/apex/exit fall.
 */
const GripTimelineChart: React.FC<GripTimelineChartProps> = ({
  timeline,
  reference,
  width = 520,
  height = 200,
}) => {
  if (timeline.length === 0) {
    return <div className="text-sm text-gray-500">No timeline data.</div>;
  }

  const padL = 34;
  const padR = 10;
  const padT = 10;
  const padB = 26;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;
  const maxY = 120;

  const x = (progress: number) => padL + (progress / 100) * plotW;
  const y = (util: number) => padT + plotH - (Math.min(util, maxY) / maxY) * plotH;

  const toPath = (data: GripTimelineSample[]) =>
    data
      .map((s, i) => `${i === 0 ? "M" : "L"} ${x(s.progress)} ${y(s.utilisationPct)}`)
      .join(" ");

  // Phase band segments (contiguous runs of the same phase).
  const bands: { phase: CornerPhase; from: number; to: number }[] = [];
  timeline.forEach((s, i) => {
    const last = bands[bands.length - 1];
    if (last && last.phase === s.phase) {
      last.to = s.progress;
    } else {
      bands.push({ phase: s.phase, from: i === 0 ? 0 : s.progress, to: s.progress });
    }
  });

  const gridLines = [0, 25, 50, 75, 100];

  return (
    <div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        role="img"
        aria-label="Grip utilisation across corner progress"
      >
        {/* Y grid + labels */}
        {gridLines.map((g) => (
          <g key={g}>
            <line
              x1={padL}
              y1={y(g)}
              x2={width - padR}
              y2={y(g)}
              stroke={g === 100 ? "#94a3b8" : "#e5e7eb"}
              strokeDasharray={g === 100 ? "4 3" : undefined}
            />
            <text x={padL - 5} y={y(g) + 3} textAnchor="end" fontSize={9} fill="#94a3b8">
              {g}
            </text>
          </g>
        ))}

        {/* Phase band under the plot */}
        {bands.map((b, i) => (
          <rect
            key={i}
            x={x(b.from)}
            y={padT + plotH + 4}
            width={Math.max(0, x(b.to) - x(b.from))}
            height={6}
            fill={PHASE_COLOR[b.phase]}
            opacity={0.7}
          />
        ))}

        {reference && reference.length > 0 && (
          <path d={toPath(reference)} fill="none" stroke={REFERENCE_COLOR} strokeWidth={1.5} strokeDasharray="4 3" opacity={0.8} />
        )}
        <path d={toPath(timeline)} fill="none" stroke={SUBJECT_COLOR} strokeWidth={2} />

        <text x={padL} y={height - 2} fontSize={9} fill="#94a3b8">
          entry
        </text>
        <text x={width - padR} y={height - 2} textAnchor="end" fontSize={9} fill="#94a3b8">
          exit
        </text>
      </svg>

      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-gray-500">
        {(Object.keys(PHASE_LABEL) as CornerPhase[]).map((p) => (
          <span key={p} className="inline-flex items-center gap-1">
            <span
              className="inline-block h-2 w-2 rounded-sm"
              style={{ backgroundColor: PHASE_COLOR[p] }}
            />
            {PHASE_LABEL[p]}
          </span>
        ))}
      </div>
    </div>
  );
};

export default GripTimelineChart;
