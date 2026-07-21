import React from "react";
import type { GTracePoint } from "../types/advisoryData";

type ZoneGPlotProps = {
  /** Subject (e.g. fastest) lap g samples within the zone. */
  points: GTracePoint[];
  /** Reference (comparison) lap g samples within the zone. */
  referencePoints?: GTracePoint[];
  /** Shared g scale (max |g| across the lap) so every zone plot is comparable. */
  maxG: number;
  size?: number;
};

const SUBJECT_COLOR = "#2563eb"; // blue
const REFERENCE_COLOR = "#f59e0b"; // amber

/**
 * "Circle of life" friction-circle plot: lateral g on the x-axis, longitudinal
 * g on the y-axis (up = acceleration, down = braking). Subject and reference
 * laps are overlaid in different colours; the outer circle marks the grip
 * envelope.
 */
const ZoneGPlot: React.FC<ZoneGPlotProps> = ({
  points,
  referencePoints = [],
  maxG,
  size = 160,
}) => {
  if ((points.length === 0 && referencePoints.length === 0) || maxG <= 0) {
    return <div className="zone-gplot zone-gplot--empty">No g data</div>;
  }

  const pad = 14;
  const center = size / 2;
  const radius = center - pad;
  const scale = radius / maxG;

  const project = (
    lateralG: number,
    longitudinalG: number
  ): [number, number] => [
    center + lateralG * scale,
    center - longitudinalG * scale,
  ];

  const renderDots = (data: GTracePoint[], color: string) =>
    data.map((p, i) => {
      const [x, y] = project(p.lateralG, p.longitudinalG);
      return <circle key={i} cx={x} cy={y} r={1.6} fill={color} fillOpacity={0.55} />;
    });

  return (
    <svg
      className="zone-gplot"
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      role="img"
      aria-label="Lateral versus longitudinal g for this zone, subject and reference laps"
    >
      {/* Grip envelope + 1g reference ring */}
      <circle cx={center} cy={center} r={radius} fill="#f8fafc" stroke="#cbd5e1" />
      {maxG > 1 && (
        <circle
          cx={center}
          cy={center}
          r={scale}
          fill="none"
          stroke="#e5e7eb"
          strokeDasharray="3 3"
        />
      )}

      {/* Axes */}
      <line x1={center} y1={pad} x2={center} y2={size - pad} stroke="#e5e7eb" />
      <line x1={pad} y1={center} x2={size - pad} y2={center} stroke="#e5e7eb" />

      {/* Axis labels */}
      <text x={size - pad + 1} y={center - 3} className="zone-gplot-axis" textAnchor="end">
        lat
      </text>
      <text x={center + 4} y={pad + 2} className="zone-gplot-axis">
        accel
      </text>
      <text x={center + 4} y={size - pad - 1} className="zone-gplot-axis">
        brake
      </text>

      {/* Reference first (behind), then subject on top */}
      {renderDots(referencePoints, REFERENCE_COLOR)}
      {renderDots(points, SUBJECT_COLOR)}

      <text x={center} y={size - 2} className="zone-gplot-scale" textAnchor="middle">
        {maxG.toFixed(1)}g
      </text>
    </svg>
  );
};

export default ZoneGPlot;
