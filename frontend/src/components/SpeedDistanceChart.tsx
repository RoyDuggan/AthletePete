import React, { useRef } from "react";
import type { SpeedTracePoint } from "../types/advisoryData";

type SpeedDistanceChartProps = {
  subject: SpeedTracePoint[];
  reference: SpeedTracePoint[];
  subjectLapNumber?: number | null;
  referenceLapNumber?: number | null;
  width?: number;
  height?: number;
  /** Compact mode: smaller padding, fewer ticks, no axis titles or legend. */
  compact?: boolean;
  /** Optional shared y-domain so multiple charts are directly comparable. */
  yMin?: number;
  yMax?: number;
  /** Zone-start distances (m) drawn as vertical lines over the chart. */
  boundaries?: number[];
  /**
   * Cumulative time delta (subject − reference) vs distance. When supplied with
   * ≥2 points, a delta panel is drawn below the speed plot on the same x-axis,
   * extending the chart height by ~25%.
   */
  delta?: { distanceMeters: number; deltaSeconds: number }[];
  /** When true, clicking adds a boundary and clicking a line removes it. */
  editable?: boolean;
  /** Add a boundary at the clicked distance (m). */
  onAddBoundary?: (distanceMeters: number) => void;
  /** Remove the boundary at the given index in `boundaries`. */
  onRemoveBoundary?: (index: number) => void;
};

const SUBJECT_COLOR = "#2563eb"; // blue
const REFERENCE_COLOR = "#f59e0b"; // amber
const BOUNDARY_COLOR = "#16a34a"; // green
const DELTA_UP_COLOR = "#dc2626"; // red — delta rising (subject losing time here)
const DELTA_DOWN_COLOR = "#16a34a"; // green — delta falling (subject gaining here)

const niceFloor = (v: number) => Math.max(0, Math.floor(v / 10) * 10);
const niceCeil = (v: number) => Math.ceil(v / 10) * 10;

/** Overlaid speed-vs-distance line chart for the subject and reference laps. */
const SpeedDistanceChart: React.FC<SpeedDistanceChartProps> = ({
  subject,
  reference,
  subjectLapNumber,
  referenceLapNumber,
  width = 720,
  height = 260,
  compact = false,
  yMin: yMinProp,
  yMax: yMaxProp,
  boundaries,
  editable = false,
  onAddBoundary,
  onRemoveBoundary,
  delta,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const all = [...subject, ...reference];

  if (all.length < 2) {
    return (
      <p className="lap-selector-status">No speed data{compact ? "" : " available."}</p>
    );
  }

  const padLeft = compact ? 28 : 46;
  const padRight = compact ? 8 : 14;
  const padTop = compact ? 8 : 14;
  const padBottom = compact ? 18 : 30;

  // Delta panel: only when a usable trace is supplied. It sits below the speed
  // plot on a shared x-axis and adds ~25% to the total SVG height.
  const deltaPoints = delta ?? [];
  const showDelta = deltaPoints.length >= 2;
  const deltaBandH = showDelta ? Math.round(height * 0.25) : 0;
  const svgHeight = height + deltaBandH;

  // Share the x-domain across speed + delta so the two panels line up exactly.
  const xs = [...all, ...deltaPoints].map((p) => p.distanceMeters);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const xSpan = xMax - xMin || 1;

  const speeds = all.map((p) => p.speedKmh);
  const yMin = yMinProp ?? niceFloor(Math.min(...speeds));
  const yMaxRaw = yMaxProp ?? niceCeil(Math.max(...speeds));
  const yMax = yMaxRaw > yMin ? yMaxRaw : yMin + 10;

  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const px = (d: number) => padLeft + ((d - xMin) / xSpan) * plotW;
  const py = (s: number) => padTop + (1 - (s - yMin) / (yMax - yMin)) * plotH;

  // Invert a click's clientX back to a lap distance. The SVG scales responsively
  // via its viewBox, so map through the rendered width (getBoundingClientRect),
  // not the `width` prop. Returns null for clicks outside the plot area.
  const clientXToDistance = (clientX: number): number | null => {
    const svg = svgRef.current;
    if (!svg) return null;

    const rect = svg.getBoundingClientRect();
    if (rect.width === 0) return null;

    const xViewBox = ((clientX - rect.left) / rect.width) * width;
    if (xViewBox < padLeft || xViewBox > width - padRight) return null;

    return xMin + ((xViewBox - padLeft) / plotW) * xSpan;
  };

  const drawnBoundaries = boundaries ?? [];

  // Zone numbers: split the x-domain at the boundaries and label each interval
  // 1..n at its centre. Only shown when boundaries are supplied (the overall
  // chart), and renumbers live as boundaries are added/removed in edit mode.
  const showZoneNumbers = boundaries !== undefined;
  const zoneEdges = [
    xMin,
    ...drawnBoundaries
      .filter((d) => d > xMin && d < xMax)
      .sort((a, b) => a - b),
    xMax,
  ];
  const zoneLabels = showZoneNumbers
    ? zoneEdges.slice(0, -1).map((start, i) => ({
        number: i + 1,
        center: (start + zoneEdges[i + 1]) / 2,
      }))
    : [];

  const toPolyline = (data: SpeedTracePoint[]) =>
    data
      .map((p) => `${px(p.distanceMeters).toFixed(1)},${py(p.speedKmh).toFixed(1)}`)
      .join(" ");

  const yTickCount = compact ? 2 : 4;
  const xTickCount = compact ? 2 : 5;
  const yTicks = Array.from({ length: yTickCount + 1 }, (_, i) =>
    yMin + ((yMax - yMin) * i) / yTickCount
  );
  const xTicks = Array.from({ length: xTickCount + 1 }, (_, i) =>
    xMin + (xSpan * i) / xTickCount
  );

  // --- Delta panel -----------------------------------------------------------
  // The trace stores deltaSeconds = reference − subject; negate it so the panel
  // follows the app-wide "subject − reference" convention (a rising line means
  // the subject is losing time). The line is coloured by slope: red where it
  // rises (losing), green where it falls (gaining) — see deltaRuns below.
  const deltaTop = height + (compact ? 6 : 12);
  const deltaBottom = svgHeight - (compact ? 12 : 22);
  const deltaVals = showDelta ? deltaPoints.map((p) => -p.deltaSeconds) : [0];
  let dMin = Math.min(0, ...deltaVals);
  let dMax = Math.max(0, ...deltaVals);
  if (dMax - dMin < 1e-6) {
    dMin -= 0.1;
    dMax += 0.1;
  }
  const dPad = (dMax - dMin) * 0.08;
  dMin -= dPad;
  dMax += dPad;

  const pyD = (v: number) =>
    deltaTop + (1 - (v - dMin) / (dMax - dMin)) * (deltaBottom - deltaTop);
  const zeroY = pyD(0);

  // Colour each stretch of the line by its slope, not by cumulative sign: red
  // where the delta is rising (subject losing time through that section), green
  // where falling (gaining). Consecutive same-direction segments are merged into
  // one polyline run so the line stays continuous.
  const deltaScreenPts = deltaPoints.map((p) => ({
    x: px(p.distanceMeters),
    y: pyD(-p.deltaSeconds),
    v: -p.deltaSeconds,
  }));

  // Colour is the sign of the delta's INSTANTANEOUS slope (delta falling =
  // subject faster = green), with only enough filtering to drop sub-metre
  // sample noise. A tiny ±COLOR_SMOOTH_M moving average removes single-sample
  // flecks without letting the cumulative shape leak into the decision — a
  // larger window would start mis-colouring genuine short gain/loss transitions.
  // The drawn line still uses the raw `.y` positions.
  const COLOR_SMOOTH_M = 2;
  const smoothedV: number[] = [];
  {
    let lo = 0;
    let hi = 0;
    let sum = 0;
    for (let i = 0; i < deltaScreenPts.length; i++) {
      const d = deltaPoints[i].distanceMeters;
      while (
        lo < deltaScreenPts.length &&
        deltaPoints[lo].distanceMeters < d - COLOR_SMOOTH_M
      ) {
        sum -= deltaScreenPts[lo].v;
        lo++;
      }
      while (
        hi < deltaScreenPts.length &&
        deltaPoints[hi].distanceMeters <= d + COLOR_SMOOTH_M
      ) {
        sum += deltaScreenPts[hi].v;
        hi++;
      }
      smoothedV.push(hi > lo ? sum / (hi - lo) : deltaScreenPts[i].v);
    }
  }
  const segmentRising = (i: number) => smoothedV[i + 1] > smoothedV[i];
  const deltaRuns: { color: string; points: string }[] = [];
  for (let start = 0; start < deltaScreenPts.length - 1; ) {
    let end = start; // last segment index in this run
    while (
      end + 1 < deltaScreenPts.length - 1 &&
      segmentRising(end + 1) === segmentRising(start)
    ) {
      end++;
    }
    deltaRuns.push({
      color: segmentRising(start) ? DELTA_UP_COLOR : DELTA_DOWN_COLOR,
      points: deltaScreenPts
        .slice(start, end + 2)
        .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
        .join(" "),
    });
    start = end + 1;
  }

  const deltaTicks = [dMax - dPad, 0, dMin + dPad];

  return (
    <div className="speed-chart">
      {!compact && (
        <div className="zone-gplot-legend speed-chart-legend">
          <span className="zone-gplot-legend-item">
            <span className="swatch subject" /> Lap {subjectLapNumber ?? "—"} (subject)
          </span>
          <span className="zone-gplot-legend-item">
            <span className="swatch reference" /> Lap {referenceLapNumber ?? "—"} (reference)
          </span>
          {showDelta && (
            <span className="zone-gplot-legend-item">
              Δt (subject − reference): red = losing time, green = gaining
            </span>
          )}
        </div>
      )}

      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${svgHeight}`}
        className="speed-chart-svg"
        role="img"
        aria-label={
          showDelta
            ? "Speed versus distance for the subject and reference laps, with a cumulative time-delta panel below"
            : "Speed versus distance for the subject and reference laps"
        }
      >
        {/* Y gridlines + labels */}
        {yTicks.map((val) => (
          <g key={`y-${val}`}>
            <line
              x1={padLeft}
              y1={py(val)}
              x2={width - padRight}
              y2={py(val)}
              stroke="#eef2f7"
            />
            <text
              x={padLeft - 4}
              y={py(val) + 3}
              className="speed-chart-axis"
              textAnchor="end"
            >
              {Math.round(val)}
            </text>
          </g>
        ))}

        {/* X gridlines + labels */}
        {xTicks.map((d) => (
          <g key={`x-${d}`}>
            <line
              x1={px(d)}
              y1={padTop}
              x2={px(d)}
              y2={height - padBottom}
              stroke="#f3f4f6"
            />
            <text
              x={px(d)}
              y={height - padBottom + 13}
              className="speed-chart-axis"
              textAnchor="middle"
            >
              {Math.round(d)}
            </text>
          </g>
        ))}

        {/* Axis titles (full mode only) */}
        {!compact && (
          <>
            <text
              x={(padLeft + width - padRight) / 2}
              y={height - 2}
              className="speed-chart-axis-title"
              textAnchor="middle"
            >
              Distance (m)
            </text>
            <text
              x={12}
              y={(padTop + height - padBottom) / 2}
              className="speed-chart-axis-title"
              textAnchor="middle"
              transform={`rotate(-90 12 ${(padTop + height - padBottom) / 2})`}
            >
              Speed (km/h)
            </text>
          </>
        )}

        {/* Reference behind, subject on top */}
        <polyline
          points={toPolyline(reference)}
          fill="none"
          stroke={REFERENCE_COLOR}
          strokeWidth={1.5}
        />
        <polyline
          points={toPolyline(subject)}
          fill="none"
          stroke={SUBJECT_COLOR}
          strokeWidth={1.5}
        />

        {/* Transparent add-layer: a click on empty plot area inserts a boundary.
            Rendered before the delete hit-lines so a click on a line removes it
            (the line's handler stops propagation) rather than adding. */}
        {editable && (
          <rect
            x={padLeft}
            y={padTop}
            width={plotW}
            height={plotH}
            fill="transparent"
            style={{ cursor: "crosshair" }}
            onClick={(event) => {
              const distance = clientXToDistance(event.clientX);
              if (distance !== null) onAddBoundary?.(distance);
            }}
          />
        )}

        {/* Zone-start vertical lines (always visible when boundaries provided). */}
        {drawnBoundaries.map((d, i) => (
          <line
            key={`boundary-${i}`}
            x1={px(d)}
            y1={padTop}
            x2={px(d)}
            y2={height - padBottom}
            stroke={BOUNDARY_COLOR}
            strokeWidth={1.5}
            strokeDasharray={editable ? "4 3" : undefined}
            opacity={0.85}
          />
        ))}

        {/* Zone numbers, centred at the top of each zone. pointer-events:none so
            they never intercept add/remove clicks in edit mode. */}
        {zoneLabels.map((zone) => (
          <text
            key={`zone-num-${zone.number}`}
            x={px(zone.center)}
            y={padTop + (compact ? 7 : 10)}
            className="speed-chart-zone-number"
            textAnchor="middle"
            style={{ pointerEvents: "none" }}
          >
            {zone.number}
          </text>
        ))}

        {/* Wide invisible delete hit-lines (only in edit mode), on top so a click
            on a boundary removes it instead of adding a new one. */}
        {editable &&
          drawnBoundaries.map((d, i) => (
            <line
              key={`boundary-hit-${i}`}
              x1={px(d)}
              y1={padTop}
              x2={px(d)}
              y2={height - padBottom}
              stroke="transparent"
              strokeWidth={10}
              style={{ cursor: "pointer" }}
              onClick={(event) => {
                event.stopPropagation();
                onRemoveBoundary?.(i);
              }}
            />
          ))}

        {/* Cumulative time-delta panel, sharing the speed plot's x-axis. */}
        {showDelta && (
          <>
            {/* Divider between the speed and delta panels. */}
            <line
              x1={padLeft}
              y1={height}
              x2={width - padRight}
              y2={height}
              stroke="#e5e7eb"
            />

            {/* Faint x gridlines through the delta band for alignment. */}
            {xTicks.map((d) => (
              <line
                key={`dx-${d}`}
                x1={px(d)}
                y1={deltaTop}
                x2={px(d)}
                y2={deltaBottom}
                stroke="#f3f4f6"
              />
            ))}

            {/* Zone-start boundaries continued through the delta band. */}
            {drawnBoundaries.map((d, i) => (
              <line
                key={`delta-boundary-${i}`}
                x1={px(d)}
                y1={deltaTop}
                x2={px(d)}
                y2={deltaBottom}
                stroke={BOUNDARY_COLOR}
                strokeWidth={1.5}
                opacity={0.35}
              />
            ))}

            {/* Delta y labels (max / 0 / min). */}
            {deltaTicks.map((val, i) => (
              <g key={`delta-y-${i}`}>
                <text
                  x={padLeft - 4}
                  y={pyD(val) + 3}
                  className="speed-chart-axis"
                  textAnchor="end"
                >
                  {val === 0 ? "0" : `${val > 0 ? "+" : ""}${val.toFixed(2)}`}
                </text>
              </g>
            ))}

            {/* Zero reference line. */}
            <line
              x1={padLeft}
              y1={zeroY}
              x2={width - padRight}
              y2={zeroY}
              stroke="#9ca3af"
              strokeDasharray="3 3"
            />

            {/* Delta trace: red where rising (losing time), green where falling
                (gaining), coloured per contiguous same-slope run. */}
            {deltaRuns.map((run, i) => (
              <polyline
                key={`delta-run-${i}`}
                points={run.points}
                fill="none"
                stroke={run.color}
                strokeWidth={1.6}
              />
            ))}

            {/* Delta axis title (full mode only). */}
            {!compact && (
              <text
                x={12}
                y={(deltaTop + deltaBottom) / 2}
                className="speed-chart-axis-title"
                textAnchor="middle"
                transform={`rotate(-90 12 ${(deltaTop + deltaBottom) / 2})`}
              >
                Δt (s)
              </text>
            )}
          </>
        )}
      </svg>
    </div>
  );
};

export default SpeedDistanceChart;
