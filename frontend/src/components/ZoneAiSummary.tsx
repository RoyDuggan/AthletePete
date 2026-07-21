import React, { useState } from "react";

import type { AdvisoryData, FeatureZone } from "../types/advisoryData";
import { interpretZone } from "../api/zoneInterpretation";
import { buildZonePromptValues } from "../utils/zonePromptValues";

type ZoneAiSummaryProps = {
  zone: FeatureZone;
  data: AdvisoryData;
  /** The shared, customisable prompt template (same for every zone). */
  template: string;
};

/**
 * On-demand AI summary for a single feature zone. The per-zone comparison
 * channels the pipeline computed are folded into the customisable prompt
 * template and sent to Claude for a concise, structured read of that zone.
 *
 * This is a paid API call, so it only fires when the driver clicks the button.
 */
const ZoneAiSummary: React.FC<ZoneAiSummaryProps> = ({
  zone,
  data,
  template,
}) => {
  const [summary, setSummary] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const hasMetrics = Boolean(zone.metrics);

  const generate = async () => {
    setLoading(true);
    setError("");

    try {
      const values = buildZonePromptValues(zone, data);
      const text = await interpretZone({ template, values });
      setSummary(text);
    } catch (generateError) {
      setError(
        generateError instanceof Error
          ? generateError.message
          : "Could not reach the zone summary server."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="zone-ai-summary">
      <button
        type="button"
        className="zone-ai-summary-button"
        onClick={generate}
        disabled={loading || !hasMetrics}
        title={
          hasMetrics
            ? undefined
            : "Per-zone metrics need both a subject and reference lap."
        }
      >
        {loading
          ? "Generating…"
          : summary
          ? "Regenerate AI summary"
          : "Generate AI summary"}
      </button>

      {!hasMetrics && (
        <p className="zone-ai-summary-hint">
          Compare two laps to enable the AI zone summary.
        </p>
      )}

      {error && <p className="advisory-negative">{error}</p>}

      {summary && <p className="zone-ai-summary-text">{summary}</p>}
    </div>
  );
};

export default ZoneAiSummary;
