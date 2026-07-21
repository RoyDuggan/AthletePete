import React, { useState } from "react";
import type { AdvisoryData } from "../types/advisoryData";
import { API_BASE, withCreds } from "../api/config";
import { getLapPromptTemplate } from "../api/userPrompts";
import { useServerPrompt, promptSaveLabel } from "../hooks/useServerPrompt";
import ZonePromptEditor from "./ZonePromptEditor";

type AiInterpretationProps = {
  data: AdvisoryData;
  subjectLabel: string;
  referenceLabel: string;
};

const LAP_PROMPT_HINT = (
  <>
    This prompt frames the overall AI interpretation of the whole lap. Edit it to
    change the engineer's persona, focus, or output style; the deterministic lap
    comparison data is appended automatically. Your changes are saved to your
    account.
  </>
);

/**
 * On-demand "AI interpretation" of the overall lap comparison. The deterministic
 * comparison the pipeline already produced is sent to the backend, which asks
 * Claude to read it like a race data engineer would in a debrief (≤200 words).
 *
 * This is a paid API call, so it only fires when the driver clicks the button.
 * The result is cleared whenever the underlying comparison changes (new laps),
 * keyed by the subject/reference lap numbers in the parent.
 */
const AiInterpretation: React.FC<AiInterpretationProps> = ({
  data,
  subjectLabel,
  referenceLabel,
}) => {
  const [interpretation, setInterpretation] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  // Customisable overall-interpretation prompt, persisted to the user's account.
  const {
    template: lapPrompt,
    defaultTemplate: defaultLapPrompt,
    setTemplate: setLapPrompt,
    status: lapPromptStatus,
  } = useServerPrompt("lap", getLapPromptTemplate);

  const generate = async () => {
    setLoading(true);
    setError("");

    try {
      const splitAnalysis = data.splitAnalysis
        ? {
            trackLengthMeters: data.splitAnalysis.trackLengthMeters,
            lapDeltaSeconds: data.splitAnalysis.lapDeltaSeconds,
            splits: data.splitAnalysis.splits.map((s) => ({
              zoneNumber: s.zoneNumber,
              startDistanceMeters: s.startDistanceMeters,
              endDistanceMeters: s.endDistanceMeters,
              deltaSeconds: s.deltaSeconds,
              impactType: s.impactType,
            })),
          }
        : null;

      const featureZones = (data.featureZones ?? []).map((z) => ({
        zoneNumber: z.zoneNumber,
        name: z.name,
        zoneType: z.zoneType,
        severity: z.severity,
        deltaSeconds: z.deltaSeconds,
        startDistanceMeters: z.startDistanceMeters,
        endDistanceMeters: z.endDistanceMeters,
        confidence: z.confidence,
        // Full per-zone channels so the lap summary can rank and explain the
        // most impactful zones, not just their net time delta.
        metrics: z.metrics,
      }));

      const response = await fetch(
        `${API_BASE}/interpret-comparison`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            // The customised context (empty falls back to the server default).
            template: lapPrompt,
            sessionName: data.sessionName,
            subjectLabel,
            referenceLabel,
            lapComparison: data.lapComparison,
            splitAnalysis,
            featureZones,
          }),
          ...withCreds,
        }
      );

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(
          payload.error ?? "Failed to generate the AI interpretation."
        );
        return;
      }

      setInterpretation(payload.interpretation ?? "");
    } catch {
      setError("Could not reach the interpretation server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="insight-card medium ai-interpretation">
      <h3>AI Interpretation</h3>

      <p className="ai-interpretation-sub">
        A race data engineer's read of the whole lap — weighed across every
        zone's metrics, leading with the most impactful corners.
      </p>

      <ZonePromptEditor
        template={lapPrompt}
        defaultTemplate={defaultLapPrompt}
        onChange={setLapPrompt}
        title="AI interpretation prompt context"
        hint={LAP_PROMPT_HINT}
        status={promptSaveLabel(lapPromptStatus)}
      />

      <button
        type="button"
        className="ai-interpretation-button"
        onClick={generate}
        disabled={loading}
      >
        {loading
          ? "Generating…"
          : interpretation
          ? "Regenerate interpretation"
          : "Generate AI interpretation"}
      </button>

      {error && <p className="advisory-negative">{error}</p>}

      {interpretation && (
        <p className="ai-interpretation-text">{interpretation}</p>
      )}
    </div>
  );
};

export default AiInterpretation;
