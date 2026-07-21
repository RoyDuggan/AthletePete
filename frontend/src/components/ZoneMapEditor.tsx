import React, { useMemo, useState } from "react";

import type {
  AdvisoryData,
  FeatureZone,
  SpeedTracePoint,
} from "../types/advisoryData";
import { analyseSession, createZoneMap } from "../api/zoneMaps";
import SpeedDistanceChart from "./SpeedDistanceChart";

type ZoneMapEditorProps = {
  sessionId: string;
  sessions?: string[];
  subjectSessionId?: string | null;
  referenceSessionId?: string | null;
  subjectLapNumber: number | null;
  referenceLapNumber: number | null;
  subject: SpeedTracePoint[];
  reference: SpeedTracePoint[];
  delta?: { distanceMeters: number; deltaSeconds: number }[];
  yMin: number;
  yMax: number;
  featureZones: FeatureZone[];
  trackLengthMeters: number | null;
  onAnalysis: (data: AdvisoryData) => void;
  onZoneMapsChanged: () => void;
};

/** Zone starts of the current analysis (excluding the implicit 0m lap start). */
const zoneStartBoundaries = (zones: FeatureZone[]): number[] =>
  zones
    .map((zone) => zone.startDistanceMeters)
    .filter((start) => start > 0.01)
    .sort((a, b) => a - b);

/**
 * Wraps the overall speed-vs-distance chart with an editable zone-map overlay.
 * Vertical lines mark each zone start; in edit mode the user clicks empty space
 * to add a boundary or a line to remove one, then saves the result as a named,
 * reusable map. Saving (and selecting from the basis dropdown) re-runs analysis.
 */
const ZoneMapEditor: React.FC<ZoneMapEditorProps> = ({
  sessionId,
  sessions,
  subjectSessionId,
  referenceSessionId,
  subjectLapNumber,
  referenceLapNumber,
  subject,
  reference,
  delta,
  yMin,
  yMax,
  featureZones,
  trackLengthMeters,
  onAnalysis,
  onZoneMapsChanged,
}) => {
  const currentBoundaries = useMemo(
    () => zoneStartBoundaries(featureZones),
    [featureZones]
  );

  const [editing, setEditing] = useState(false);
  const [boundaries, setBoundaries] = useState<number[]>(currentBoundaries);
  const [saveName, setSaveName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const enterEdit = () => {
    setBoundaries(currentBoundaries);
    setSaveName("");
    setError("");
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setError("");
  };

  const addBoundary = (distanceMeters: number) => {
    setBoundaries((prev) =>
      [...prev, distanceMeters]
        .filter((d) => d > 0.01)
        .sort((a, b) => a - b)
        .filter((d, i, arr) => i === 0 || d - arr[i - 1] > 0.01)
    );
  };

  const removeBoundary = (index: number) => {
    setBoundaries((prev) => prev.filter((_, i) => i !== index));
  };

  const save = async () => {
    const name = saveName.trim();

    if (!name) {
      setError("Enter a name for this zone map.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      const map = await createZoneMap({
        name,
        boundaries,
        trackLengthMeters,
      });

      onZoneMapsChanged();

      const data = await analyseSession({
        sessionId,
        sessions,
        subjectSessionId,
        referenceSessionId,
        subjectLapNumber,
        referenceLapNumber,
        zoneBasis: "custom",
        customZoneMapId: map.id,
      });

      onAnalysis(data);
      setEditing(false);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not save the zone map."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <SpeedDistanceChart
        subject={subject}
        reference={reference}
        delta={delta}
        subjectLapNumber={subjectLapNumber}
        referenceLapNumber={referenceLapNumber}
        yMin={yMin}
        yMax={yMax}
        boundaries={editing ? boundaries : currentBoundaries}
        editable={editing}
        onAddBoundary={addBoundary}
        onRemoveBoundary={removeBoundary}
      />

      {!editing ? (
        <div className="zone-map-toolbar">
          <button type="button" className="zone-map-button" onClick={enterEdit}>
            Edit zones
          </button>
          <span className="zone-map-hint">
            Vertical lines mark each zone start.
          </span>
        </div>
      ) : (
        <>
          <p className="zone-map-hint">
            Click empty chart space to add a zone boundary; click a line to remove
            it. {boundaries.length + 1} zone
            {boundaries.length + 1 === 1 ? "" : "s"}.
          </p>

          <div className="zone-map-toolbar">
            <input
              className="zone-map-name-input"
              type="text"
              placeholder="Map name (e.g. Brands Hatch)"
              value={saveName}
              onChange={(event) => setSaveName(event.target.value)}
              disabled={busy}
            />
            <button
              type="button"
              className="zone-map-button primary"
              onClick={save}
              disabled={busy}
            >
              {busy ? "Saving…" : "Save map"}
            </button>
            <button
              type="button"
              className="zone-map-button"
              onClick={cancelEdit}
              disabled={busy}
            >
              Cancel
            </button>
          </div>

          {error && <p className="advisory-negative">{error}</p>}
        </>
      )}
    </div>
  );
};

export default ZoneMapEditor;
