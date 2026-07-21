import React, { useEffect, useState } from "react";
import type {
  AdvisoryData,
  AvailableLap,
  SessionInfo,
  ZoneMap,
} from "../types/advisoryData";
import { analyseSession, listZoneMaps } from "../api/zoneMaps";

type ZoneBasis = "fastest" | "within_2pct" | "all" | "custom";

type LapComparisonSelectorProps = {
  sessionId: string;
  sessions?: SessionInfo[];
  availableLaps: AvailableLap[];
  subjectLapNumber: number | null;
  referenceLapNumber: number | null;
  subjectSessionId?: string | null;
  referenceSessionId?: string | null;
  zoneBasis?: ZoneBasis;
  customZoneMapId?: string | null;
  trackLengthMeters?: number | null;
  /** Bumped by the parent when a custom map is saved, to refetch the library. */
  zoneMapsRefreshToken?: number;
  onAnalysis: (data: AdvisoryData) => void;
};

const ZONE_BASIS_OPTIONS: { value: ZoneBasis; label: string }[] = [
  { value: "fastest", label: "Fastest lap only" },
  { value: "within_2pct", label: "Laps within 2% of fastest" },
  { value: "all", label: "All laps" },
];

const CUSTOM_PREFIX = "custom:";

/** Globally-unique id for a lap (works before/after the multi-session fields). */
const lapKey = (lap: AvailableLap): string =>
  lap.lapId ?? `${lap.sessionId ?? ""}::${lap.lapNumber}`;

const formatLapLabel = (lap: AvailableLap, fastestKey: string | null): string => {
  const base = lap.label ?? `Lap ${lap.lapNumber}`;
  const time = `${lap.lapTimeSeconds.toFixed(3)}s`;
  const tags: string[] = [];

  if (lapKey(lap) === fastestKey) {
    tags.push("★ fastest");
  }

  if (lap.lapType !== "flying") {
    tags.push(lap.lapType.replace(/_/g, " "));
  }

  const suffix = tags.length ? ` (${tags.join(", ")})` : "";

  return `${base} — ${time}${suffix}`;
};

/** Key of the fastest valid flying lap across the whole group. */
const getFastestKey = (laps: AvailableLap[]): string | null => {
  const flying = laps.filter((lap) => lap.isValidFlyingLap);
  const pool = flying.length > 0 ? flying : laps;

  if (pool.length === 0) return null;

  return lapKey(
    pool.reduce((best, lap) =>
      lap.lapTimeSeconds < best.lapTimeSeconds ? lap : best
    )
  );
};

const LapComparisonSelector: React.FC<LapComparisonSelectorProps> = ({
  sessionId,
  sessions,
  availableLaps,
  subjectLapNumber,
  referenceLapNumber,
  subjectSessionId,
  referenceSessionId,
  zoneBasis: zoneBasisProp,
  customZoneMapId,
  trackLengthMeters,
  zoneMapsRefreshToken,
  onAnalysis,
}) => {
  // Resolve the currently-analysed laps to their unique keys so the <select>s
  // stay in sync even when lap numbers repeat across sessions.
  const findKey = (
    lapNumber: number | null,
    sessId: string | null | undefined
  ): string | null => {
    if (lapNumber === null) return null;
    const match =
      availableLaps.find(
        (lap) =>
          lap.lapNumber === lapNumber &&
          (sessId == null || lap.sessionId === sessId)
      ) ?? null;
    return match ? lapKey(match) : null;
  };

  const [subjectKey, setSubjectKey] = useState<string | null>(
    findKey(subjectLapNumber, subjectSessionId)
  );
  const [referenceKey, setReferenceKey] = useState<string | null>(
    findKey(referenceLapNumber, referenceSessionId)
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [zoneMaps, setZoneMaps] = useState<ZoneMap[]>([]);

  // Keep the selects in sync after a re-analysis (e.g. a saved custom map).
  useEffect(() => {
    setSubjectKey(findKey(subjectLapNumber, subjectSessionId));
    setReferenceKey(findKey(referenceLapNumber, referenceSessionId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectLapNumber, referenceLapNumber, subjectSessionId, referenceSessionId]);

  const selectedBasisValue =
    zoneBasisProp === "custom" && customZoneMapId
      ? `${CUSTOM_PREFIX}${customZoneMapId}`
      : zoneBasisProp ?? "fastest";

  const fastestKey = getFastestKey(availableLaps);

  useEffect(() => {
    let cancelled = false;

    listZoneMaps()
      .then((maps) => {
        if (!cancelled) setZoneMaps(maps);
      })
      .catch(() => {
        if (!cancelled) setZoneMaps([]);
      });

    return () => {
      cancelled = true;
    };
  }, [zoneMapsRefreshToken]);

  const lapByKey = (key: string | null): AvailableLap | null =>
    key ? availableLaps.find((lap) => lapKey(lap) === key) ?? null : null;

  const runAnalysis = async (
    subjectLap: AvailableLap | null,
    referenceLap: AvailableLap | null,
    basis: ZoneBasis,
    mapId?: string
  ) => {
    setLoading(true);
    setError("");

    try {
      const data = await analyseSession({
        sessionId: subjectLap?.sessionId ?? sessionId,
        sessions: sessions?.map((s) => s.sessionId),
        subjectSessionId: subjectLap?.sessionId ?? null,
        referenceSessionId: referenceLap?.sessionId ?? null,
        subjectLapNumber: subjectLap?.lapNumber ?? null,
        referenceLapNumber: referenceLap?.lapNumber ?? null,
        zoneBasis: basis,
        customZoneMapId: mapId,
      });

      onAnalysis(data);
    } catch {
      setError("Could not reach the analysis server.");
    } finally {
      setLoading(false);
    }
  };

  const currentMapId =
    zoneBasisProp === "custom" && customZoneMapId ? customZoneMapId : undefined;

  const handleSubject = (key: string) => {
    setSubjectKey(key);
    runAnalysis(
      lapByKey(key),
      lapByKey(referenceKey),
      zoneBasisProp ?? "fastest",
      currentMapId
    );
  };

  const handleReference = (key: string) => {
    setReferenceKey(key);
    runAnalysis(
      lapByKey(subjectKey),
      lapByKey(key),
      zoneBasisProp ?? "fastest",
      currentMapId
    );
  };

  const handleZoneBasis = (raw: string) => {
    const subjectLap = lapByKey(subjectKey);
    const referenceLap = lapByKey(referenceKey);

    if (raw.startsWith(CUSTOM_PREFIX)) {
      runAnalysis(
        subjectLap,
        referenceLap,
        "custom",
        raw.slice(CUSTOM_PREFIX.length)
      );
      return;
    }

    runAnalysis(subjectLap, referenceLap, raw as ZoneBasis);
  };

  // Warn when a reused custom map was saved for a noticeably different track
  // length — its absolute boundaries may not line up with this session.
  const selectedMap = currentMapId
    ? zoneMaps.find((map) => map.id === currentMapId)
    : undefined;
  const trackLengthMismatch =
    selectedMap?.trackLengthMeters != null &&
    trackLengthMeters != null &&
    trackLengthMeters > 0 &&
    Math.abs(selectedMap.trackLengthMeters - trackLengthMeters) /
      trackLengthMeters >
      0.02;

  // Warn when the subject and reference laps come from files whose track length
  // differs notably — a cross-session compare only makes sense on the same track.
  const subjectLap = lapByKey(subjectKey);
  const referenceLap = lapByKey(referenceKey);
  const subjSession = sessions?.find(
    (s) => s.sessionId === subjectLap?.sessionId
  );
  const refSession = sessions?.find(
    (s) => s.sessionId === referenceLap?.sessionId
  );
  const crossSessionTrackMismatch =
    subjSession?.trackLengthMeters != null &&
    refSession?.trackLengthMeters != null &&
    subjSession.sessionId !== refSession.sessionId &&
    Math.abs(subjSession.trackLengthMeters - refSession.trackLengthMeters) /
      subjSession.trackLengthMeters >
      0.02;

  if (availableLaps.length === 0) {
    return null;
  }

  const multiSession = (sessions?.length ?? 0) > 1;

  return (
    <div className="card lap-selector">
      <h2>Compare Laps</h2>

      <div className="lap-selector-row">
        <label className="lap-selector-field">
          <span>Subject lap</span>
          <select
            value={subjectKey ?? ""}
            onChange={(event) => handleSubject(event.target.value)}
            disabled={loading}
          >
            {availableLaps.map((lap) => (
              <option key={lapKey(lap)} value={lapKey(lap)}>
                {formatLapLabel(lap, fastestKey)}
              </option>
            ))}
          </select>
        </label>

        <span className="lap-selector-vs">vs</span>

        <label className="lap-selector-field">
          <span>Reference lap (benchmark)</span>
          <select
            value={referenceKey ?? ""}
            onChange={(event) => handleReference(event.target.value)}
            disabled={loading}
          >
            {availableLaps.map((lap) => (
              <option key={lapKey(lap)} value={lapKey(lap)}>
                {formatLapLabel(lap, fastestKey)}
              </option>
            ))}
          </select>
        </label>

        <label className="lap-selector-field">
          <span>Zone detection basis</span>
          <select
            value={selectedBasisValue}
            onChange={(event) => handleZoneBasis(event.target.value)}
            disabled={loading}
          >
            {ZONE_BASIS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
            {zoneMaps.length > 0 && (
              <optgroup label="Custom maps">
                {zoneMaps.map((map) => (
                  <option key={map.id} value={`${CUSTOM_PREFIX}${map.id}`}>
                    {map.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </label>
      </div>

      <p className="lap-selector-status">
        Zones are detected from{" "}
        {zoneBasisProp === "fastest"
          ? "the fastest lap"
          : zoneBasisProp === "within_2pct"
          ? "all laps within 2% of the fastest"
          : zoneBasisProp === "custom"
          ? `a custom zone map${selectedMap ? ` (${selectedMap.name})` : ""}`
          : "all laps"}
        {multiSession ? ", pooled across all uploaded sessions" : ""}. In/out
        laps are always excluded.
      </p>

      {multiSession && (
        <p className="lap-selector-status">
          {sessions?.length} sessions loaded — laps are prefixed S1, S2, … by
          upload order. You can compare laps from different sessions.
        </p>
      )}

      {crossSessionTrackMismatch && (
        <p className="lap-selector-status">
          ⚠ Subject session ({subjSession?.trackLengthMeters?.toFixed(0)}m) and
          reference session ({refSession?.trackLengthMeters?.toFixed(0)}m) differ
          in track length — the cross-session comparison may not align.
        </p>
      )}

      {trackLengthMismatch && (
        <p className="lap-selector-status">
          ⚠ This map was saved for a{" "}
          {selectedMap?.trackLengthMeters?.toFixed(0)}m track but this session is{" "}
          {trackLengthMeters?.toFixed(0)}m — the boundaries may not align.
        </p>
      )}

      {fastestKey !== null && (
        <p className="lap-selector-status">
          ★ marks the fastest lap — used as the reference benchmark by default.
        </p>
      )}

      {loading && <p className="lap-selector-status">Analysing…</p>}
      {error && <p className="advisory-negative">{error}</p>}

      {subjectKey !== null && subjectKey === referenceKey && (
        <p className="lap-selector-status">
          Subject and reference are the same lap — the comparison will be empty.
        </p>
      )}
    </div>
  );
};

export default LapComparisonSelector;
