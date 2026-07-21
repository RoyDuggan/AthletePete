/**
 * Engine profiles for the Jetting Advisor.
 *
 * IMPORTANT: this is an extensible, configuration-driven baseline advisory
 * system. It is NOT the Rotax (or any manufacturer's) proprietary calculation.
 * The baseline jet numbers below are illustrative starting points chosen to be
 * plausible for each class — they are not official factory data. Add new
 * engines by adding a profile object here; no calculator code changes needed.
 */

export type JettingLookupRow = {
  /** Inclusive lower bound of moist-air density (kg/m³) for this row. */
  minAirDensity: number;
  /** Exclusive upper bound of moist-air density (kg/m³) for this row. */
  maxAirDensity: number;
  mainJet: number | string;
  needleClip?: number;
  airScrewTurns?: number;
  confidence: "low" | "medium" | "high";
};

export type JettingAdjustmentRule = {
  /** Machine-readable condition key, evaluated by the calculator. */
  condition:
    | "airDensityAboveBaseline"
    | "airDensityBelowBaseline"
    | "highHumidity"
    | "highAltitude"
    | "wetTrack"
    | "nonStandardFuel";
  effect: "richer" | "leaner";
  message: string;
};

export type EngineProfile = {
  id: string;
  name: string;
  manufacturer: string;
  engineFamily: string;
  carburettor: string;
  fuelAssumption: string;
  baseline: {
    tempC: number;
    pressureHpaSeaLevel: number;
    humidityPercent: number;
    altitudeM: number;
    mainJet: number | string;
    needleClip: number;
    airScrewTurns: number;
  };
  /** Discrete jet sizes the carb accepts; recommendations snap to the nearest. */
  allowedMainJets?: number[];
  /** Optional density→jet lookup. Used in preference to the estimator. */
  lookupTable?: JettingLookupRow[];
  adjustmentRules: JettingAdjustmentRule[];
  notes: string[];
  /** Placeholder = not yet calibrated; recommendations carry low confidence. */
  placeholder?: boolean;
};

/** Inclusive even-step jet ladder, e.g. range(120, 130, 2) → [120,122,...,130]. */
function jetLadder(min: number, max: number, step = 2): number[] {
  const out: number[] = [];
  for (let j = min; j <= max; j += step) out.push(j);
  return out;
}

/** Adjustment rules shared by the well-supported carburetted classes. */
const COMMON_RULES: JettingAdjustmentRule[] = [
  {
    condition: "airDensityAboveBaseline",
    effect: "richer",
    message:
      "Air is denser than your baseline — more oxygen per stroke, so richen to keep the mixture safe.",
  },
  {
    condition: "airDensityBelowBaseline",
    effect: "leaner",
    message:
      "Air is thinner than your baseline — less oxygen per stroke, so lean off to avoid a rich, sluggish run.",
  },
  {
    condition: "highHumidity",
    effect: "leaner",
    message:
      "High humidity displaces oxygen — nudge slightly leaner versus the dry-air figure.",
  },
  {
    condition: "highAltitude",
    effect: "leaner",
    message:
      "Altitude lowers air density — expect a leaner jet than at sea level.",
  },
  {
    condition: "wetTrack",
    effect: "richer",
    message:
      "Damp/wet running often favours a slightly richer, softer response — verify on track.",
  },
  {
    condition: "nonStandardFuel",
    effect: "richer",
    message:
      "Fuel differs from the profile assumption — fuel chemistry shifts the final jet; treat as a starting point only.",
  },
];

const ILLUSTRATIVE_NOTE =
  "Baseline figures are illustrative starting points, not official factory data.";
const STD_SETTINGS_NOTE =
  "Standard needle clip is position 3 (lower = leaner, higher = richer); standard air screw is 2 turns out (more turns = leaner).";

export const JETTING_PROFILES: EngineProfile[] = [
  {
    id: "rotax-125-micro-max",
    name: "Rotax 125 Micro MAX",
    manufacturer: "Rotax",
    engineFamily: "125 MAX EVO",
    carburettor: "Dellorto VHSB 34",
    fuelAssumption: "Pump unleaded + 2-stroke oil",
    baseline: {
      tempC: 20,
      pressureHpaSeaLevel: 1013,
      humidityPercent: 50,
      altitudeM: 0,
      mainJet: 150,
      needleClip: 3,
      airScrewTurns: 2,
    },
    allowedMainJets: jetLadder(132, 168),
    adjustmentRules: COMMON_RULES,
    notes: [ILLUSTRATIVE_NOTE, STD_SETTINGS_NOTE],
  },
  {
    id: "rotax-125-mini-max",
    name: "Rotax 125 Mini MAX",
    manufacturer: "Rotax",
    engineFamily: "125 MAX EVO",
    carburettor: "Dellorto VHSB 34",
    fuelAssumption: "Pump unleaded + 2-stroke oil",
    baseline: {
      tempC: 20,
      pressureHpaSeaLevel: 1013,
      humidityPercent: 50,
      altitudeM: 0,
      mainJet: 155,
      needleClip: 3,
      airScrewTurns: 2,
    },
    allowedMainJets: jetLadder(135, 172),
    adjustmentRules: COMMON_RULES,
    notes: [ILLUSTRATIVE_NOTE, STD_SETTINGS_NOTE],
  },
  {
    id: "rotax-125-junior-max",
    name: "Rotax 125 Junior MAX",
    manufacturer: "Rotax",
    engineFamily: "125 MAX EVO",
    carburettor: "Dellorto VHSB 34",
    fuelAssumption: "Pump unleaded + 2-stroke oil",
    baseline: {
      tempC: 20,
      pressureHpaSeaLevel: 1013,
      humidityPercent: 50,
      altitudeM: 0,
      mainJet: 158,
      needleClip: 3,
      airScrewTurns: 2,
    },
    allowedMainJets: jetLadder(138, 176),
    adjustmentRules: COMMON_RULES,
    notes: [ILLUSTRATIVE_NOTE, STD_SETTINGS_NOTE],
  },
  {
    id: "rotax-125-senior-max",
    name: "Rotax 125 Senior MAX",
    manufacturer: "Rotax",
    engineFamily: "125 MAX EVO",
    carburettor: "Dellorto VHSB 34",
    fuelAssumption: "Pump unleaded + 2-stroke oil",
    baseline: {
      tempC: 20,
      pressureHpaSeaLevel: 1013,
      humidityPercent: 50,
      altitudeM: 0,
      mainJet: 160,
      needleClip: 3,
      airScrewTurns: 2,
    },
    allowedMainJets: jetLadder(140, 180),
    adjustmentRules: COMMON_RULES,
    notes: [ILLUSTRATIVE_NOTE, STD_SETTINGS_NOTE],
  },
  {
    id: "rotax-dd2",
    name: "Rotax DD2",
    manufacturer: "Rotax",
    engineFamily: "125 MAX DD2 EVO",
    carburettor: "Dellorto VHSB 34",
    fuelAssumption: "Pump unleaded + 2-stroke oil",
    baseline: {
      tempC: 20,
      pressureHpaSeaLevel: 1013,
      humidityPercent: 50,
      altitudeM: 0,
      mainJet: 162,
      needleClip: 3,
      airScrewTurns: 2,
    },
    allowedMainJets: jetLadder(142, 182),
    adjustmentRules: COMMON_RULES,
    notes: [ILLUSTRATIVE_NOTE, STD_SETTINGS_NOTE],
  },
  {
    id: "iame-x30-senior",
    name: "IAME X30 Senior",
    manufacturer: "IAME",
    engineFamily: "X30",
    carburettor: "Tillotson HW (diaphragm, needle-based)",
    fuelAssumption: "Pump unleaded + 2-stroke oil",
    baseline: {
      tempC: 20,
      pressureHpaSeaLevel: 1013,
      humidityPercent: 50,
      altitudeM: 0,
      // Diaphragm carb: mixture is set by H/L needles, not a fixed main jet.
      mainJet: "Needle-based carb — set H/L needles",
      needleClip: 3,
      airScrewTurns: 2,
    },
    adjustmentRules: COMMON_RULES,
    placeholder: true,
    notes: [
      "Placeholder profile — the X30 uses a diaphragm carb tuned by high/low " +
        "speed needles rather than a fixed main jet. Use the richer/leaner " +
        "direction and density indicators as guidance, then set the needles.",
      ILLUSTRATIVE_NOTE,
    ],
  },
  {
    id: "generic-2stroke",
    name: "Generic 2-stroke carburetted kart",
    manufacturer: "Generic",
    engineFamily: "2-stroke",
    carburettor: "Generic slide/float carburettor",
    fuelAssumption: "Pump unleaded + 2-stroke oil",
    baseline: {
      tempC: 20,
      pressureHpaSeaLevel: 1013,
      humidityPercent: 50,
      altitudeM: 0,
      mainJet: 130,
      needleClip: 3,
      airScrewTurns: 2,
    },
    allowedMainJets: jetLadder(100, 170),
    // Small illustrative lookup table to demonstrate the table-driven path.
    lookupTable: [
      { minAirDensity: 0.0, maxAirDensity: 1.16, mainJet: 122, needleClip: 2, airScrewTurns: 2.5, confidence: "medium" },
      { minAirDensity: 1.16, maxAirDensity: 1.22, mainJet: 130, needleClip: 3, airScrewTurns: 2.0, confidence: "high" },
      { minAirDensity: 1.22, maxAirDensity: 2.0, mainJet: 138, needleClip: 4, airScrewTurns: 1.5, confidence: "medium" },
    ],
    adjustmentRules: COMMON_RULES,
    placeholder: true,
    notes: [
      "Generic placeholder for any carburetted 2-stroke. Calibrate the baseline " +
        "and jet ladder to your specific engine for better accuracy.",
      ILLUSTRATIVE_NOTE,
      STD_SETTINGS_NOTE,
    ],
  },
];

export function getEngineProfile(id: string): EngineProfile | undefined {
  return JETTING_PROFILES.find((p) => p.id === id);
}

/** Lightweight summary list for the profiles API / engine dropdown. */
export function listEngineProfiles() {
  return JETTING_PROFILES.map((p) => ({
    id: p.id,
    name: p.name,
    manufacturer: p.manufacturer,
    engineFamily: p.engineFamily,
    carburettor: p.carburettor,
    fuelAssumption: p.fuelAssumption,
    placeholder: Boolean(p.placeholder),
  }));
}
