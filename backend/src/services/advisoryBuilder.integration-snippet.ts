// @ts-nocheck
/*
Integration snippet for backend/src/services/advisoryBuilder.ts

1. Add the import:

import { analyseZones } from "./zoneAnalysisService";

2. Replace your current independent zone timing calculation with:
*/

const zoneAnalysis = analyseZones(fastestLap, comparisonLap, featureZones);
const zoneResults = zoneAnalysis.zones;

/*
3. Expose this in the advisory response if your AdvisoryData type supports it:

zoneAnalysis: {
  method: zoneAnalysis.method,
  validity: zoneAnalysis.validity,
  reason: zoneAnalysis.reason,
  totalLapDeltaSeconds: zoneAnalysis.totalLapDeltaSeconds,
  deltaTrace: zoneAnalysis.deltaTrace,
  zones: zoneResults,
}

4. Generate timing claims only for valid zones:
*/

const validZoneResults = zoneResults.filter(
  (zone) => zone.validity === "valid"
);

const suppressedZoneResults = zoneResults.filter(
  (zone) => zone.validity !== "valid"
);

/*
5. Use wording like this:

if (zone.validity === "valid") {
  description = `You are losing approximately ${zone.deltaSeconds.toFixed(3)}s in Zone ${zone.zoneNumber}.`;
} else {
  description = `Zone ${zone.zoneNumber} shows a possible difference, but the lap delta is too small relative to positional uncertainty for reliable time attribution.`;
}
*/
