import React from "react";

export type TrackPoint = {
  distanceMeters: number;
  x: number;
  y: number;
};

type ZoneMiniMapProps = {
  /** Full-lap track outline, ordered by distance. */
  points: TrackPoint[];
  startDistanceMeters: number;
  endDistanceMeters: number;
  centerDistanceMeters?: number;
  severity: "gain" | "loss" | "neutral";
  width?: number;
  height?: number;
};

const PADDING = 8;

const SEVERITY_COLORS: Record<ZoneMiniMapProps["severity"], string> = {
  gain: "#16a34a",
  loss: "#dc2626",
  neutral: "#6b7280",
};

/**
 * Renders a small SVG track outline derived from GPS trace points and
 * highlights the segment that falls within a feature zone's distance range.
 */
const ZoneMiniMap: React.FC<ZoneMiniMapProps> = ({
  points,
  startDistanceMeters,
  endDistanceMeters,
  centerDistanceMeters,
  severity,
  width = 160,
  height = 120,
}) => {
  if (points.length < 2) {
    return (
      <div className="zone-minimap zone-minimap--empty">
        No track outline
      </div>
    );
  }

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;

  const availW = width - PADDING * 2;
  const availH = height - PADDING * 2;
  const scale = Math.min(availW / spanX, availH / spanY);

  // Centre the track within the viewBox.
  const offsetX = PADDING + (availW - spanX * scale) / 2;
  const offsetY = PADDING + (availH - spanY * scale) / 2;

  // Flip Y so north (larger y) renders towards the top of the SVG.
  const project = (p: TrackPoint): [number, number] => [
    offsetX + (p.x - minX) * scale,
    offsetY + (maxY - p.y) * scale,
  ];

  const toPath = (pts: TrackPoint[]): string =>
    pts
      .map((p, i) => {
        const [sx, sy] = project(p);
        return `${i === 0 ? "M" : "L"}${sx.toFixed(1)} ${sy.toFixed(1)}`;
      })
      .join(" ");

  const lo = Math.min(startDistanceMeters, endDistanceMeters);
  const hi = Math.max(startDistanceMeters, endDistanceMeters);
  const zonePoints = points.filter(
    (p) => p.distanceMeters >= lo && p.distanceMeters <= hi
  );

  const color = SEVERITY_COLORS[severity];

  // Marker at the zone centre (nearest trace point by distance).
  const centerTarget = centerDistanceMeters ?? (lo + hi) / 2;
  const marker = points.reduce((best, p) =>
    Math.abs(p.distanceMeters - centerTarget) <
    Math.abs(best.distanceMeters - centerTarget)
      ? p
      : best
  );
  const [mx, my] = project(marker);

  return (
    <svg
      className="zone-minimap"
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      role="img"
      aria-label="Track minimap with highlighted zone"
    >
      <path
        d={toPath(points)}
        fill="none"
        stroke="#cbd5e1"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {zonePoints.length >= 2 && (
        <path
          d={toPath(zonePoints)}
          fill="none"
          stroke={color}
          strokeWidth={4}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}
      <circle cx={mx} cy={my} r={4} fill={color} stroke="#fff" strokeWidth={1.5} />
    </svg>
  );
};

export default ZoneMiniMap;
