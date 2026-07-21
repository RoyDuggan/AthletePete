import React, { useState } from "react";
import type { AdvisoryData, CoachingInsight } from "../types/advisoryData";
import ZoneMiniMap, { type TrackPoint } from "../components/ZoneMiniMap";
import ZoneGPlot from "../components/ZoneGPlot";
import SpeedDistanceChart from "../components/SpeedDistanceChart";
import ZoneMapEditor from "../components/ZoneMapEditor";
import LapComparisonSelector from "../components/LapComparisonSelector";
import AiInterpretation from "../components/AiInterpretation";
import ZonePromptEditor from "../components/ZonePromptEditor";
import ZoneAiSummary from "../components/ZoneAiSummary";
import { getZonePromptTemplate } from "../api/zoneInterpretation";
import { useServerPrompt, promptSaveLabel } from "../hooks/useServerPrompt";
import "../styles/advisory.css";

type AdvisoryDashboardProps = {
  data: AdvisoryData;
  onAnalysisUpdate?: (data: AdvisoryData) => void;
};

const AdvisoryDashboard: React.FC<AdvisoryDashboardProps> = ({
  data,
  onAnalysisUpdate,
}) => {
  const coachingInsights = data.coachingInsights ?? [];
  const setupAdvisory = data.setupAdvisory ?? [];
  const featureZones = data.featureZones ?? [];

  // Bumped whenever a custom zone map is saved, so the basis dropdown refetches
  // the saved-map library and shows the new entry.
  const [zoneMapsRefresh, setZoneMapsRefresh] = useState(0);

  // Customisable per-zone AI prompt context. Loaded from and persisted to the
  // user's account (via useServerPrompt) so it follows them across devices.
  const {
    template: effectiveZonePrompt,
    defaultTemplate: defaultZonePrompt,
    setTemplate: handleZonePromptChange,
    status: zonePromptStatus,
  } = useServerPrompt("zone", getZonePromptTemplate);

  // Derive a track outline from the delta trace GPS coordinates so each
  // feature-zone card can show a minimap of where the zone sits on circuit.
  const trackPoints: TrackPoint[] = (data.splitAnalysis?.deltaTrace ?? [])
    .filter((p) => p.fastestX !== undefined && p.fastestY !== undefined)
    .map((p) => ({
      distanceMeters: p.distanceMeters,
      x: p.fastestX as number,
      y: p.fastestY as number,
    }));
  const hasTrackOutline = trackPoints.length >= 2;

  // Per-sample g traces for the friction-circle plot under each zone minimap.
  // Subject and reference laps are overlaid; a single shared scale (across both)
  // keeps every zone plot comparable.
  const gTrace = data.gTrace ?? [];
  const referenceGTrace = data.referenceGTrace ?? [];
  const maxG = [...gTrace, ...referenceGTrace].reduce(
    (max, p) => Math.max(max, Math.abs(p.lateralG), Math.abs(p.longitudinalG)),
    0
  );
  const hasGData =
    (gTrace.length > 0 || referenceGTrace.length > 0) && maxG > 0;

  const filterToZone = <T extends { distanceMeters: number }>(
    trace: T[],
    start: number,
    end: number
  ): T[] =>
    trace.filter((p) => p.distanceMeters >= start && p.distanceMeters <= end);

  // Speed-vs-distance traces for the overall panel and per-zone charts. A shared
  // y-domain keeps every zone chart comparable with each other and the overall.
  const speedTrace = data.speedTrace ?? [];
  const referenceSpeedTrace = data.referenceSpeedTrace ?? [];
  const hasSpeedData = speedTrace.length > 1;
  const speedValues = [...speedTrace, ...referenceSpeedTrace].map(
    (p) => p.speedKmh
  );
  const speedYMin = speedValues.length
    ? Math.max(0, Math.floor(Math.min(...speedValues) / 10) * 10)
    : 0;
  const speedYMax = speedValues.length
    ? Math.ceil(Math.max(...speedValues) / 10) * 10
    : 0;

  // The fastest lap keeps the "Fastest Lap" wording; any other lap is labelled
  // by its role so comparisons stay accurate when non-fastest laps are chosen.
  const lapRoleLabel = (
    lapNumber: number,
    role: "subject" | "reference"
  ): string => {
    if (data.fastestLapNumber != null && lapNumber === data.fastestLapNumber) {
      return `Fastest Lap ${lapNumber}`;
    }

    return role === "subject"
      ? `Subject Lap ${lapNumber}`
      : `Reference Lap ${lapNumber}`;
  };

  // Coaching insights are derived per feature zone. Fold each zone-linked
  // insight (its recommendation + evidence) into that zone's card so every zone
  // is covered exactly once, and only show standalone cards for insights that
  // are not tied to a specific zone.
  const insightByZone = new Map<number, CoachingInsight>();
  for (const insight of coachingInsights) {
    if (insight.zoneNumber !== undefined) {
      insightByZone.set(insight.zoneNumber, insight);
    }
  }
  const unzonedInsights = coachingInsights.filter(
    (insight) => insight.zoneNumber === undefined
  );

  return (
    <div className="advisory-container">
      <h1>{data.sessionName}</h1>

      <p>
        <strong>Date:</strong> {data.date}
      </p>
      <p>
        <strong>Lap Count:</strong> {data.lapCount}
      </p>

      {/* Lap selection */}
      {onAnalysisUpdate && data.sessionId && data.availableLaps && (
        <LapComparisonSelector
          sessionId={data.sessionId}
          sessions={data.sessions}
          availableLaps={data.availableLaps}
          subjectLapNumber={data.subjectLapNumber ?? null}
          referenceLapNumber={data.referenceLapNumber ?? null}
          subjectSessionId={data.subjectSessionId ?? null}
          referenceSessionId={data.referenceSessionId ?? null}
          zoneBasis={data.zoneBasis}
          customZoneMapId={data.customZoneMapId ?? null}
          trackLengthMeters={data.trackLengthMeters}
          zoneMapsRefreshToken={zoneMapsRefresh}
          onAnalysis={onAnalysisUpdate}
        />
      )}

      {/* Lap Comparison */}
      {data.lapComparison && (
        <>
          <h2>Lap Comparison</h2>

          <div className="insight-card medium">
            <h3>
              {lapRoleLabel(data.lapComparison.fastestLapNumber, "subject")} vs{" "}
              {lapRoleLabel(data.lapComparison.comparisonLapNumber, "reference")}
            </h3>

            <p>
              <strong>Subject lap time:</strong>{" "}
              {data.lapComparison.fastestLapTimeSeconds.toFixed(3)}s
            </p>

            <p>
              <strong>Reference lap time:</strong>{" "}
              {data.lapComparison.comparisonLapTimeSeconds.toFixed(3)}s
            </p>

            <p
              className={
                data.lapComparison.deltaTimeSeconds < 0
                  ? "advisory-positive"
                  : data.lapComparison.deltaTimeSeconds > 0
                  ? "advisory-negative"
                  : undefined
              }
            >
              <strong>Delta:</strong>{" "}
              {data.lapComparison.deltaTimeSeconds > 0 ? "+" : ""}
              {data.lapComparison.deltaTimeSeconds.toFixed(3)}s{" "}
              {data.lapComparison.deltaTimeSeconds < 0
                ? "(gained)"
                : data.lapComparison.deltaTimeSeconds > 0
                ? "(lost)"
                : ""}
            </p>

            {/* Speed */}
            {data.lapComparison.entrySpeedDeltaKmh !== undefined && (
              <>
                <p>
                  <strong>Entry speed delta:</strong>{" "}
                  {data.lapComparison.entrySpeedDeltaKmh?.toFixed(2)} km/h
                </p>

                <p>
                  <strong>Apex speed delta:</strong>{" "}
                  {data.lapComparison.apexSpeedDeltaKmh?.toFixed(2)} km/h
                </p>

                <p>
                  <strong>Exit speed delta:</strong>{" "}
                  {data.lapComparison.exitSpeedDeltaKmh?.toFixed(2)} km/h
                </p>
              </>
            )}

            {/* Drive Phase */}
            {data.lapComparison.drivePhaseDeltaKmh !== undefined && (
              <>
                <p>
                  <strong>Inferred drive phase delta:</strong>{" "}
                  {data.lapComparison.drivePhaseDeltaKmh !== null
                    ? `${data.lapComparison.drivePhaseDeltaKmh.toFixed(2)} km/h`
                    : "Not available"}
                </p>

                <p>
                  <strong>Time to acceleration delta:</strong>{" "}
                  {data.lapComparison.timeToAccelerationDeltaSeconds !== null &&
                  data.lapComparison.timeToAccelerationDeltaSeconds !== undefined
                    ? `${data.lapComparison.timeToAccelerationDeltaSeconds.toFixed(
                        3
                      )}s`
                    : "Not available"}
                </p>

                <p>
                  <strong>Exit drive rating:</strong> Fastest lap{" "}
                  {data.lapComparison.fastestLapExitDriveRating}, comparison lap{" "}
                  {data.lapComparison.comparisonLapExitDriveRating}
                </p>
              </>
            )}

            {/* Braking */}
            {data.lapComparison.maxDecelerationDeltaKmhPerSec !== undefined && (
              <>
                <p>
                  <strong>Inferred max deceleration delta:</strong>{" "}
                  {data.lapComparison.maxDecelerationDeltaKmhPerSec !== null
                    ? `${data.lapComparison.maxDecelerationDeltaKmhPerSec.toFixed(
                        2
                      )} km/h/s`
                    : "Not available"}
                </p>

                <p>
                  <strong>Braking duration delta:</strong>{" "}
                  {data.lapComparison.brakingDurationDeltaSeconds !== null &&
                  data.lapComparison.brakingDurationDeltaSeconds !== undefined
                    ? `${data.lapComparison.brakingDurationDeltaSeconds.toFixed(
                        3
                      )}s`
                    : "Not available"}
                </p>

                <p>
                  <strong>Speed drop before apex delta:</strong>{" "}
                  {data.lapComparison.speedDropBeforeApexDeltaKmh !== null &&
                  data.lapComparison.speedDropBeforeApexDeltaKmh !== undefined
                    ? `${data.lapComparison.speedDropBeforeApexDeltaKmh.toFixed(
                        2
                      )} km/h`
                    : "Not available"}
                </p>

                <p>
                  <strong>Braking rating:</strong> Fastest lap{" "}
                  {data.lapComparison.fastestLapBrakingRating}, comparison lap{" "}
                  {data.lapComparison.comparisonLapBrakingRating}
                </p>
              </>
            )}

            {/* RPM */}
            {data.lapComparison.minRpmDelta !== undefined && (
              <>
                <p>
                  <strong>Minimum RPM delta:</strong>{" "}
                  {data.lapComparison.minRpmDelta !== null
                    ? `${data.lapComparison.minRpmDelta.toFixed(0)} rpm`
                    : "Not available"}
                </p>

                <p>
                  <strong>Maximum RPM delta:</strong>{" "}
                  {data.lapComparison.maxRpmDelta !== null &&
                  data.lapComparison.maxRpmDelta !== undefined
                    ? `${data.lapComparison.maxRpmDelta.toFixed(0)} rpm`
                    : "Not available"}
                </p>

                <p>
                  <strong>RPM drop before apex delta:</strong>{" "}
                  {data.lapComparison.rpmDropBeforeApexDelta !== null &&
                  data.lapComparison.rpmDropBeforeApexDelta !== undefined
                    ? `${data.lapComparison.rpmDropBeforeApexDelta.toFixed(0)} rpm`
                    : "Not available"}
                </p>

                <p>
                  <strong>RPM recovery after apex delta:</strong>{" "}
                  {data.lapComparison.rpmRecoveryAfterApexDelta !== null &&
                  data.lapComparison.rpmRecoveryAfterApexDelta !== undefined
                    ? `${data.lapComparison.rpmRecoveryAfterApexDelta.toFixed(
                        0
                      )} rpm`
                    : "Not available"}
                </p>

                <p>
                  <strong>RPM recovery rating:</strong> Fastest lap{" "}
                  {data.lapComparison.fastestLapRpmRecoveryRating}, comparison lap{" "}
                  {data.lapComparison.comparisonLapRpmRecoveryRating}
                </p>
              </>
            )}

            <p>
              <strong>Basis:</strong> {data.lapComparison.comparisonBasis}
            </p>
          </div>

          {/* AI interpretation of the overall lap, generated on demand from the
              comparison above. Keyed by the lap pair so the result resets when
              the user picks different laps. */}
          <AiInterpretation
            key={`${data.lapComparison.fastestLapNumber}-${data.lapComparison.comparisonLapNumber}`}
            data={data}
            subjectLabel={
              data.subjectLabel ??
              lapRoleLabel(data.lapComparison.fastestLapNumber, "subject")
            }
            referenceLabel={
              data.referenceLabel ??
              lapRoleLabel(data.lapComparison.comparisonLapNumber, "reference")
            }
          />
        </>
      )}

      {/* Speed vs distance */}
      {hasSpeedData && (
        <>
          <h2>Speed vs Distance</h2>

          <div className="insight-card medium">
            {onAnalysisUpdate && data.sessionId ? (
              <ZoneMapEditor
                sessionId={data.sessionId}
                sessions={data.sessions?.map((s) => s.sessionId)}
                subjectSessionId={data.subjectSessionId ?? null}
                referenceSessionId={data.referenceSessionId ?? null}
                subjectLapNumber={
                  data.subjectLapNumber ??
                  data.lapComparison?.fastestLapNumber ??
                  null
                }
                referenceLapNumber={
                  data.referenceLapNumber ??
                  data.lapComparison?.comparisonLapNumber ??
                  null
                }
                subject={speedTrace}
                reference={referenceSpeedTrace}
                delta={data.splitAnalysis?.deltaTrace}
                yMin={speedYMin}
                yMax={speedYMax}
                featureZones={featureZones}
                trackLengthMeters={data.trackLengthMeters}
                onAnalysis={onAnalysisUpdate}
                onZoneMapsChanged={() => setZoneMapsRefresh((n) => n + 1)}
              />
            ) : (
              <SpeedDistanceChart
                subject={speedTrace}
                reference={referenceSpeedTrace}
                delta={data.splitAnalysis?.deltaTrace}
                subjectLapNumber={data.subjectLapNumber ?? data.lapComparison?.fastestLapNumber ?? null}
                referenceLapNumber={data.referenceLapNumber ?? data.lapComparison?.comparisonLapNumber ?? null}
                yMin={speedYMin}
                yMax={speedYMax}
                boundaries={featureZones
                  .map((z) => z.startDistanceMeters)
                  .filter((s) => s > 0.01)}
              />
            )}
          </div>
        </>
      )}



      {/* Feature Zones */}
      {featureZones.length > 0 && (
        <>
          <h2>Feature Zones</h2>

          <ZonePromptEditor
            template={effectiveZonePrompt}
            defaultTemplate={defaultZonePrompt}
            onChange={handleZonePromptChange}
            status={promptSaveLabel(zonePromptStatus)}
          />

          <div className="zone-card-grid">
            {featureZones.map((zone) => {
              const insight = insightByZone.get(zone.zoneNumber);

              return (
              <div
                key={zone.zoneNumber}
                className={`insight-card zone-card ${zone.severity}`}
              >
                <div className="zone-card-content">
                  <h3>
                    Zone {zone.zoneNumber}: {zone.name}
                  </h3>

                  <p className={zone.severity === "gain" ? "advisory-positive" : "advisory-negative"}>
                    <strong>{zone.severity === "gain" ? "Gain" : "Loss"}:</strong>{" "}
                    {zone.deltaSeconds > 0 ? "+" : ""}
                    {zone.deltaSeconds.toFixed(3)}s
                  </p>

                  <p className="zone-distance">
                    {zone.startDistanceMeters.toFixed(0)}m –{" "}
                    {zone.endDistanceMeters.toFixed(0)}m
                  </p>

                  <p>{insight ? insight.summary : zone.description}</p>

                  <div className="insight-meta">
                    <span>Type: {zone.zoneType}</span>
                    <span>Metric: {zone.primaryMetric}</span>
                    <span>Confidence: {zone.confidence}</span>
                    {insight && <span>Priority: {insight.priority}</span>}
                  </div>

                  <div className="insight-evidence">
                    <strong>Evidence:</strong>
                    <ul>
                      <li>{zone.evidence}</li>
                      {(insight?.evidence ?? []).map((item, index) => (
                        <li key={index}>
                          <strong>{item.metric}:</strong> {item.value}
                          {item.location && (
                            <span className="evidence-sub"> {item.location}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {insight && (
                    <p className="recommendation">
                      <strong>Recommendation:</strong> {insight.recommendation}
                    </p>
                  )}
                </div>

                <div className="zone-card-map">
                  {hasTrackOutline ? (
                    <ZoneMiniMap
                      points={trackPoints}
                      startDistanceMeters={zone.startDistanceMeters}
                      endDistanceMeters={zone.endDistanceMeters}
                      centerDistanceMeters={zone.centerDistanceMeters}
                      severity={zone.severity}
                    />
                  ) : (
                    <div className="zone-minimap zone-minimap--empty">
                      No GPS trace available
                    </div>
                  )}

                  {hasGData && (
                    <>
                      <ZoneGPlot
                        points={filterToZone(
                          gTrace,
                          zone.startDistanceMeters,
                          zone.endDistanceMeters
                        )}
                        referencePoints={filterToZone(
                          referenceGTrace,
                          zone.startDistanceMeters,
                          zone.endDistanceMeters
                        )}
                        maxG={maxG}
                      />
                      <div className="zone-gplot-legend">
                        <span className="zone-gplot-legend-item">
                          <span className="swatch subject" />{" "}
                          {data.subjectLabel ??
                            `Lap ${data.subjectLapNumber ?? "—"}`}
                        </span>
                        <span className="zone-gplot-legend-item">
                          <span className="swatch reference" />{" "}
                          {data.referenceLabel ??
                            `Lap ${data.referenceLapNumber ?? "—"}`}
                        </span>
                      </div>
                    </>
                  )}

                  {hasSpeedData && (
                    <div className="zone-speed-chart">
                      <SpeedDistanceChart
                        subject={filterToZone(
                          speedTrace,
                          zone.startDistanceMeters,
                          zone.endDistanceMeters
                        )}
                        reference={filterToZone(
                          referenceSpeedTrace,
                          zone.startDistanceMeters,
                          zone.endDistanceMeters
                        )}
                        width={200}
                        height={110}
                        compact
                        yMin={speedYMin}
                        yMax={speedYMax}
                      />
                      <span className="zone-map-caption">Speed km/h vs m</span>
                    </div>
                  )}
                </div>

                <ZoneAiSummary
                  zone={zone}
                  data={data}
                  template={effectiveZonePrompt}
                />
              </div>
              );
            })}
          </div>
        </>
      )}

      {/* Coaching Insights (zone-derived insights are folded into the zone
          cards above; only non-zone insights are shown standalone here). */}
      {unzonedInsights.length > 0 && (
        <>
          <h2>Coaching Insights</h2>

          {unzonedInsights.map((insight) => (
            <div key={insight.id} className={`insight-card ${insight.priority}`}>
              <h3>{insight.title}</h3>

              <p>{insight.summary}</p>

              <div className="insight-meta">
                <span>Category: {insight.category}</span>
                <span>Priority: {insight.priority}</span>
                <span>Confidence: {insight.confidence}</span>
              </div>

              <div className="insight-evidence">
                <strong>Evidence:</strong>

                <ul>
                  {(insight.evidence ?? []).map((item, index) => (
                    <li key={index}>
                      <strong>{item.metric}:</strong> {item.value}

                      <div className="evidence-sub">
                        {item.location && <span>{item.location}</span>}
                        {item.comparison && <span> | {item.comparison}</span>}
                        {item.lapReference && <span> | {item.lapReference}</span>}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <p className="recommendation">
                <strong>Recommendation:</strong> {insight.recommendation}
              </p>
            </div>
          ))}
        </>
      )}

      {/* Setup Advisory */}
      <h2>Setup Advisory</h2>

      {setupAdvisory.map((setup) => (
        <div key={setup.id} className="insight-card low">
          <h3>{setup.title}</h3>

          <p>{setup.advice}</p>

          <div className="insight-meta">
            <span>Category: {setup.category}</span>
            <span>Confidence: {setup.confidence}</span>
          </div>

          <p>
            <strong>Evidence:</strong> {setup.evidence}
          </p>
        </div>
      ))}
    </div>
  );
};

export default AdvisoryDashboard;