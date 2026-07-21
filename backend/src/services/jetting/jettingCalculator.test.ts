import { test } from "node:test";
import assert from "node:assert/strict";

import {
  calculateJettingRecommendation,
  JettingValidationError,
  moistAirDensity,
  type JettingInputs,
} from "./jettingCalculator";

const SENIOR = "rotax-125-senior-max";

/** Baseline-ish inputs for the Senior MAX; override per test. */
function inputs(over: Partial<JettingInputs> = {}): JettingInputs {
  return {
    engineProfileId: SENIOR,
    temperatureC: 20,
    humidityPercent: 50,
    pressureHpa: 1013,
    pressureType: "seaLevel",
    altitudeM: 0,
    ...over,
  };
}

test("hot day reduces air density and tends leaner", () => {
  const base = calculateJettingRecommendation(inputs({ temperatureC: 20 }));
  const hot = calculateJettingRecommendation(inputs({ temperatureC: 38 }));

  assert.ok(hot.airDensityKgM3 < base.airDensityKgM3, "hotter air is less dense");
  assert.equal(hot.mixtureDirection, "leaner");
  assert.ok(
    Number(hot.nearestAvailableJet) <= Number(base.nearestAvailableJet),
    "leaner → jet not larger than baseline"
  );
});

test("cold day increases air density and tends richer", () => {
  const base = calculateJettingRecommendation(inputs({ temperatureC: 20 }));
  const cold = calculateJettingRecommendation(inputs({ temperatureC: 2 }));

  assert.ok(cold.airDensityKgM3 > base.airDensityKgM3, "colder air is denser");
  assert.equal(cold.mixtureDirection, "richer");
  assert.ok(
    Number(cold.nearestAvailableJet) >= Number(base.nearestAvailableJet),
    "richer → jet not smaller than baseline"
  );
});

test("higher altitude reduces air density (sea-level pressure held)", () => {
  const low = calculateJettingRecommendation(inputs({ altitudeM: 0 }));
  const high = calculateJettingRecommendation(inputs({ altitudeM: 1500 }));

  assert.ok(high.airDensityKgM3 < low.airDensityKgM3);
  assert.equal(high.mixtureDirection, "leaner");
});

test("higher humidity slightly reduces air density", () => {
  const dry = calculateJettingRecommendation(inputs({ humidityPercent: 10 }));
  const humid = calculateJettingRecommendation(inputs({ humidityPercent: 95 }));

  assert.ok(humid.airDensityKgM3 < dry.airDensityKgM3, "moist air is less dense");
  // Effect is small — well under 2% for this temperature.
  assert.ok(dry.airDensityKgM3 - humid.airDensityKgM3 < 0.02);
});

test("nearest available jet is selected from the ladder", () => {
  const rec = calculateJettingRecommendation(inputs());
  // Baseline conditions → density ratio ≈ 1 → recommend the baseline jet (160).
  assert.equal(rec.nearestAvailableJet, 160);
  assert.equal(rec.mainJetRecommendation, 160);
  assert.equal(rec.relativeAirDensityPercent, 100);
});

test("user correction steps shift the jet up the ladder (richer)", () => {
  const base = calculateJettingRecommendation(inputs());
  const richer = calculateJettingRecommendation(inputs({ userCorrectionSteps: 2 }));
  // Ladder steps are 2 sizes apart → +2 steps == +4 jet sizes.
  assert.equal(Number(richer.nearestAvailableJet), Number(base.nearestAvailableJet) + 4);
});

test("pressure type conversion changes station pressure (and density)", () => {
  // Same numeric pressure at altitude: 'seaLevel' is reduced to station pressure
  // (lower), so its density must be below the 'station' reading.
  const seaLevel = calculateJettingRecommendation(
    inputs({ altitudeM: 1200, pressureHpa: 1013, pressureType: "seaLevel" })
  );
  const station = calculateJettingRecommendation(
    inputs({ altitudeM: 1200, pressureHpa: 1013, pressureType: "station" })
  );
  assert.ok(seaLevel.airDensityKgM3 < station.airDensityKgM3);

  // And a sea-level pressure read at altitude equals an equivalent station read.
  const equivStationHpa = 1013 * Math.pow(1 - 2.25577e-5 * 1200, 5.25588);
  const equiv = calculateJettingRecommendation(
    inputs({ altitudeM: 1200, pressureHpa: equivStationHpa, pressureType: "station" })
  );
  assert.ok(Math.abs(equiv.airDensityKgM3 - seaLevel.airDensityKgM3) < 1e-4);
});

test("missing / unknown profile throws a validation error", () => {
  assert.throws(
    () => calculateJettingRecommendation(inputs({ engineProfileId: "does-not-exist" })),
    JettingValidationError
  );
  assert.throws(
    () =>
      calculateJettingRecommendation({
        ...inputs(),
        engineProfileId: undefined as unknown as string,
      }),
    JettingValidationError
  );
});

test("lookup-table profile uses the table row (generic 2-stroke)", () => {
  const rec = calculateJettingRecommendation({
    engineProfileId: "generic-2stroke",
    temperatureC: 20,
    humidityPercent: 50,
    pressureHpa: 1013,
    pressureType: "seaLevel",
    altitudeM: 0,
  });
  // Baseline density (~1.19) falls in the middle "high" row → jet 130.
  assert.equal(rec.mainJetRecommendation, 130);
  // Placeholder profile caps confidence below "high".
  assert.notEqual(rec.confidence, "high");
});

test("needle-based carb returns a string recommendation, low confidence", () => {
  const rec = calculateJettingRecommendation({
    engineProfileId: "iame-x30-senior",
    temperatureC: 30,
    humidityPercent: 50,
    pressureHpa: 1013,
    pressureType: "seaLevel",
    altitudeM: 0,
  });
  assert.equal(typeof rec.mainJetRecommendation, "string");
  assert.equal(rec.nearestAvailableJet, undefined);
  assert.equal(rec.confidence, "low");
});

test("moistAirDensity matches ISA sea-level air to ~1%", () => {
  // Dry-ish air at 15 °C, 1013.25 hPa ≈ 1.225 kg/m³.
  const rho = moistAirDensity(1013.25, 15, 0);
  assert.ok(Math.abs(rho - 1.225) < 0.02, `expected ~1.225, got ${rho}`);
});
