/**
 * Jetting Advisor — baseline advisory calculator.
 *
 * This produces a SAFE BASELINE recommendation from ambient conditions and a
 * configuration-driven engine profile. It is explicitly NOT a manufacturer's
 * proprietary calculation; treat every output as a starting point to be
 * verified on track (plug colour, EGT, engine response) and against the rules.
 */
import {
  type EngineProfile,
  type JettingAdjustmentRule,
  getEngineProfile,
} from "../../data/jettingProfiles";

export type JettingInputs = {
  engineProfileId: string;
  temperatureC: number;
  humidityPercent: number;
  pressureHpa: number;
  pressureType: "seaLevel" | "station";
  altitudeM: number;
  fuelType?: string;
  oilRatio?: string;
  trackCondition?: "dry" | "damp" | "wet";
  userCorrectionSteps?: number;
};

export type JettingRecommendation = {
  engineProfileId: string;
  mainJetRecommendation: number | string;
  nearestAvailableJet?: number;
  needleClip: number;
  airScrewTurns: number;
  mixtureDirection: "leaner" | "baseline" | "richer";
  airDensityKgM3: number;
  relativeAirDensityPercent: number;
  densityAltitudeM?: number;
  correctionSummary: string[];
  warnings: string[];
  confidence: "low" | "medium" | "high";
};

/** Thrown for unknown profiles / invalid inputs; the API maps it to HTTP 400. */
export class JettingValidationError extends Error {
  status = 400;
  constructor(message: string) {
    super(message);
    this.name = "JettingValidationError";
  }
}

// --- Physical constants ---
const RD = 287.058; // specific gas constant, dry air   (J/kg·K)
const RV = 461.495; // specific gas constant, water vapour (J/kg·K)
const ISA_SEA_LEVEL_DENSITY = 1.225; // kg/m³
const KELVIN = 273.15;

/** Saturation vapour pressure (hPa) via the Tetens formula, t in °C. */
function saturationVapourPressureHpa(tempC: number): number {
  return 6.1078 * Math.pow(10, (7.5 * tempC) / (tempC + 237.3));
}

/**
 * Convert a sea-level (QNH-style) pressure to the local station pressure at the
 * given altitude using the ISA barometric relation.
 */
function seaLevelToStationHpa(pressureSeaLevelHpa: number, altitudeM: number): number {
  return pressureSeaLevelHpa * Math.pow(1 - 2.25577e-5 * altitudeM, 5.25588);
}

/**
 * Moist-air density (kg/m³) from station pressure, temperature and humidity.
 * Density = dry-air partial density + water-vapour partial density.
 */
export function moistAirDensity(
  stationPressureHpa: number,
  tempC: number,
  humidityPercent: number
): number {
  const tempK = tempC + KELVIN;
  const pSatHpa = saturationVapourPressureHpa(tempC);
  const pVapourHpa = (clamp(humidityPercent, 0, 100) / 100) * pSatHpa;
  const pDryHpa = Math.max(0, stationPressureHpa - pVapourHpa);
  // hPa → Pa (×100).
  const pDry = pDryHpa * 100;
  const pVapour = pVapourHpa * 100;
  return pDry / (RD * tempK) + pVapour / (RV * tempK);
}

/** Density altitude (m) — the ISA altitude at which air has this density. */
export function densityAltitude(densityKgM3: number): number {
  const ratio = densityKgM3 / ISA_SEA_LEVEL_DENSITY;
  return (1 - Math.pow(ratio, 1 / 4.2559)) / 2.25577e-5;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function nearestJet(target: number, allowed: number[]): number {
  return allowed.reduce((best, jet) =>
    Math.abs(jet - target) < Math.abs(best - target) ? jet : best
  );
}

function stationPressureFrom(inputs: JettingInputs): number {
  return inputs.pressureType === "seaLevel"
    ? seaLevelToStationHpa(inputs.pressureHpa, inputs.altitudeM)
    : inputs.pressureHpa;
}

/** Baseline moist-air density for a profile, from its baseline conditions. */
function baselineDensity(profile: EngineProfile): number {
  const station = seaLevelToStationHpa(
    profile.baseline.pressureHpaSeaLevel,
    profile.baseline.altitudeM
  );
  return moistAirDensity(station, profile.baseline.tempC, profile.baseline.humidityPercent);
}

function validateInputs(inputs: JettingInputs, warnings: string[]): void {
  const numericFields: [string, number][] = [
    ["temperatureC", inputs.temperatureC],
    ["humidityPercent", inputs.humidityPercent],
    ["pressureHpa", inputs.pressureHpa],
    ["altitudeM", inputs.altitudeM],
  ];
  for (const [field, value] of numericFields) {
    if (typeof value !== "number" || Number.isNaN(value)) {
      throw new JettingValidationError(`"${field}" must be a number.`);
    }
  }
  if (inputs.pressureType !== "seaLevel" && inputs.pressureType !== "station") {
    throw new JettingValidationError(`"pressureType" must be "seaLevel" or "station".`);
  }

  // Soft range checks → warnings (still compute, but flag out-of-range data).
  if (inputs.temperatureC < -15 || inputs.temperatureC > 50) {
    warnings.push("Temperature is outside the typical range (−15 to 50 °C) — check the value.");
  }
  if (inputs.humidityPercent < 0 || inputs.humidityPercent > 100) {
    warnings.push("Humidity should be 0–100% — value was clamped.");
  }
  if (inputs.pressureHpa < 850 || inputs.pressureHpa > 1085) {
    warnings.push("Pressure is outside the typical range (850–1085 hPa) — check the value and pressure type.");
  }
  if (inputs.altitudeM < -100 || inputs.altitudeM > 3500) {
    warnings.push("Altitude is outside the typical range (−100 to 3500 m) — check the value.");
  }
}

function applicableRules(
  profile: EngineProfile,
  inputs: JettingInputs,
  relativeDensityPercent: number
): JettingAdjustmentRule[] {
  const denser = relativeDensityPercent > 100.5;
  const thinner = relativeDensityPercent < 99.5;
  return profile.adjustmentRules.filter((rule) => {
    switch (rule.condition) {
      case "airDensityAboveBaseline":
        return denser;
      case "airDensityBelowBaseline":
        return thinner;
      case "highHumidity":
        return inputs.humidityPercent >= 80;
      case "highAltitude":
        return inputs.altitudeM >= 800;
      case "wetTrack":
        return inputs.trackCondition === "wet" || inputs.trackCondition === "damp";
      case "nonStandardFuel":
        return Boolean(
          inputs.fuelType &&
            inputs.fuelType.trim() !== "" &&
            inputs.fuelType.trim().toLowerCase() !==
              profile.fuelAssumption.toLowerCase()
        );
      default:
        return false;
    }
  });
}

/**
 * Compute a baseline jetting recommendation for the given conditions.
 * @throws {JettingValidationError} if the engine profile is unknown / inputs invalid.
 */
export function calculateJettingRecommendation(
  inputs: JettingInputs
): JettingRecommendation {
  if (!inputs || typeof inputs.engineProfileId !== "string") {
    throw new JettingValidationError("engineProfileId is required.");
  }
  const profile = getEngineProfile(inputs.engineProfileId);
  if (!profile) {
    throw new JettingValidationError(`Unknown engine profile: "${inputs.engineProfileId}".`);
  }

  const warnings: string[] = [];
  validateInputs(inputs, warnings);

  // 1–6: air density, current vs baseline.
  const stationPressureHpa = stationPressureFrom(inputs);
  const airDensity = moistAirDensity(
    stationPressureHpa,
    inputs.temperatureC,
    inputs.humidityPercent
  );
  const baseDensity = baselineDensity(profile);
  const densityRatio = airDensity / baseDensity;
  const relativeAirDensityPercent = round(densityRatio * 100, 1);

  // Mixture direction: denser air → richer, thinner air → leaner.
  let mixtureDirection: JettingRecommendation["mixtureDirection"] = "baseline";
  if (relativeAirDensityPercent > 100.5) mixtureDirection = "richer";
  else if (relativeAirDensityPercent < 99.5) mixtureDirection = "leaner";

  const correctionSummary = applicableRules(
    profile,
    inputs,
    relativeAirDensityPercent
  ).map((r) => r.message);

  // 9–11: jet from lookup table, else density-ratio estimate.
  const baselineJetNumeric =
    typeof profile.baseline.mainJet === "number" ? profile.baseline.mainJet : null;

  let mainJetRecommendation: number | string;
  let nearestAvailableJet: number | undefined;
  let needleClip = profile.baseline.needleClip;
  let airScrewTurns = profile.baseline.airScrewTurns;
  let confidence: JettingRecommendation["confidence"];

  const lookupRow = profile.lookupTable?.find(
    (row) => airDensity >= row.minAirDensity && airDensity < row.maxAirDensity
  );

  if (lookupRow) {
    mainJetRecommendation = lookupRow.mainJet;
    if (lookupRow.needleClip !== undefined) needleClip = lookupRow.needleClip;
    if (lookupRow.airScrewTurns !== undefined) airScrewTurns = lookupRow.airScrewTurns;
    confidence = lookupRow.confidence;
  } else if (baselineJetNumeric !== null) {
    // Jet number ≈ orifice diameter; fuel flow must track air mass flow, so the
    // orifice AREA scales with density and the jet NUMBER with its square root.
    const estimated = baselineJetNumeric * Math.sqrt(densityRatio);
    mainJetRecommendation = round(estimated, 0);
    // Needle/air-screw nudges proportional to how far density has moved.
    needleClip = clamp(
      profile.baseline.needleClip + clipDelta(relativeAirDensityPercent),
      1,
      5
    );
    airScrewTurns = round(
      clamp(profile.baseline.airScrewTurns - airScrewDelta(relativeAirDensityPercent), 0.5, 3.5),
      2
    );
    confidence = estimateConfidence(profile, relativeAirDensityPercent);
  } else {
    // Needle-based carb (no main jet): give direction + needle/air-screw only.
    mainJetRecommendation = profile.baseline.mainJet; // string passthrough
    confidence = "low";
    warnings.push(
      "This engine uses a needle-based carburettor — no main-jet number is " +
        "produced. Use the richer/leaner direction to set the H/L needles."
    );
  }

  // 12: user calibration offset (richer = +steps, leaner = −steps).
  const steps = Math.trunc(inputs.userCorrectionSteps ?? 0);

  // Snap numeric recommendations to the jet ladder (and apply the offset there).
  if (typeof mainJetRecommendation === "number") {
    if (profile.allowedMainJets && profile.allowedMainJets.length > 0) {
      const ladder = [...profile.allowedMainJets].sort((a, b) => a - b);
      const snapped = nearestJet(mainJetRecommendation, ladder);
      let idx = ladder.indexOf(snapped);
      idx = clamp(idx + steps, 0, ladder.length - 1);
      nearestAvailableJet = ladder[idx];
      mainJetRecommendation = nearestAvailableJet;
    } else if (steps !== 0) {
      mainJetRecommendation = round(mainJetRecommendation + steps * 2, 0);
    }
  }

  if (steps !== 0) {
    correctionSummary.push(
      `Applied your manual calibration of ${steps > 0 ? "+" : ""}${steps} step${
        Math.abs(steps) === 1 ? "" : "s"
      } (${steps > 0 ? "richer" : "leaner"}).`
    );
  }

  // 13: confidence + warnings.
  if (profile.placeholder) {
    confidence = lowerConfidence(confidence);
    warnings.push(
      `"${profile.name}" is a placeholder profile — calibrate it against known-good settings before relying on it.`
    );
  }
  if (Math.abs(relativeAirDensityPercent - 100) > 8) {
    confidence = lowerConfidence(confidence);
    warnings.push(
      "Conditions are far from this profile's baseline — the estimate is extrapolated, so confidence is reduced."
    );
  }
  warnings.push(
    "Baseline advisory only — verify with plug colour, EGT, engine response, manufacturer guidance and race regulations."
  );

  const densityAltitudeM = round(densityAltitude(airDensity), 0);

  return {
    engineProfileId: profile.id,
    mainJetRecommendation,
    nearestAvailableJet,
    needleClip,
    airScrewTurns,
    mixtureDirection,
    airDensityKgM3: round(airDensity, 4),
    relativeAirDensityPercent,
    densityAltitudeM,
    correctionSummary,
    warnings,
    confidence,
  };
}

function clipDelta(relativeDensityPercent: number): number {
  const d = relativeDensityPercent - 100;
  if (d > 6) return 2;
  if (d > 2.5) return 1;
  if (d < -6) return -2;
  if (d < -2.5) return -1;
  return 0;
}

function airScrewDelta(relativeDensityPercent: number): number {
  // Richer (denser air) → fewer turns out (−); leaner (thinner) → more (+).
  const d = relativeDensityPercent - 100;
  if (d > 6) return 0.75;
  if (d > 2.5) return 0.5;
  if (d < -6) return -0.75;
  if (d < -2.5) return -0.5;
  return 0;
}

function estimateConfidence(
  profile: EngineProfile,
  relativeDensityPercent: number
): "low" | "medium" | "high" {
  if (profile.placeholder) return "low";
  const drift = Math.abs(relativeDensityPercent - 100);
  if (drift <= 4) return "high";
  if (drift <= 8) return "medium";
  return "low";
}

function lowerConfidence(c: "low" | "medium" | "high"): "low" | "medium" | "high" {
  return c === "high" ? "medium" : "low";
}

function round(value: number, dp: number): number {
  const f = Math.pow(10, dp);
  return Math.round(value * f) / f;
}
