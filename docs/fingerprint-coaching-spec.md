# Virtual Pete — Corner Selection & Fingerprint Engine

**Software Requirements Specification (v1)**

> Markdown transcription of `Virtual_Pete_Corner_Selection_Fingerprint_Spec_v1.docx`
> for versioning/reference. The `.docx` remains the authoritative source.

## Purpose

This component is an **additive analysis layer** that operates downstream of the
existing, fully-tested feature extraction and lap comparison engine. It must not
modify or duplicate existing telemetry processing. Its role is to identify
high-confidence corner executions, generate grip-based fingerprints, filter
anomalous corner samples, and prepare deterministic inputs for AI coaching.

## Existing Architecture (Do Not Modify)

The existing upload, lap detection, distance mapping, feature extraction and lap
comparison pipeline remains the system of record. The new component shall consume:

- Uploaded session outputs
- Existing feature-to-distance mapping
- Existing corner definitions
- Existing entry/apex/exit metrics
- Existing braking and drive metrics
- Existing lap comparison outputs

Existing services are **read-only dependencies**.

## Processing Pipeline

```
Existing Upload Session
  -> Existing Lap Detection
  -> Existing Distance Mapping
  -> Existing Feature Extraction
  -> Existing Lap Comparison
  -> NEW Corner Selection Engine
  -> NEW Grip Utilisation Engine
  -> NEW Corner Fingerprint Engine
  -> NEW Attack Probability Engine
  -> NEW Sensitivity Filter
  -> NEW Selected Corner Library
  -> AI Coaching Payload
```

## Objectives

- Analyse every corner from every uploaded lap.
- Identify high-probability attack laps.
- Reject anomalies (traffic, avoidance, double braking, sensor issues, lift-offs,
  invalid telemetry).
- Allow a sensitivity slider to vary inclusion threshold **without recalculating
  telemetry**.
- Provide deterministic outputs for AI.

## Grip Utilisation

- Compute combined G from lateral and longitudinal acceleration.
- Estimate available grip dynamically from clean laps.
- Calculate instantaneous utilisation and aggregate utilisation over the complete
  corner using the utilisation integral.
- Store utilisation separately for **braking, trail braking, apex, exit and
  straight**.

## Grip Utilisation Timeline

- Normalise each corner from 0–100% progress.
- Store approximately **101 equally spaced samples** containing:
  - progress
  - time
  - distance
  - combined G
  - utilisation %
  - grip reserve
  - phase
- Derive:
  - peak utilisation
  - average utilisation
  - utilisation integral
  - phase utilisation areas
  - grip continuity
  - grip bias (entry/apex/exit)
  - coasting events
  - utilisation drop events

## Corner Fingerprint

Generate a fingerprint including:

- Overall utilisation
- Braking utilisation
- Trail braking utilisation
- Apex utilisation
- Exit utilisation
- Smoothness
- Stability
- Consistency
- Friction path quality
- Entry commitment
- Apex commitment
- Exit commitment
- Grip reserve
- Confidence

## Attack Probability

- Generate an attack score (0–100) from existing extracted metrics plus fingerprint
  metrics.
- Inputs include entry speed, apex speed, exit speed, section time, utilisation,
  smoothness, stability, consistency, friction path quality and confidence.
- **Weightings shall be configurable.**

## Sensitivity Slider

- One slider adjusts only the acceptance threshold.
- No telemetry or feature recalculation is permitted.
- Live outputs:
  - selected corner count
  - rejected corner count
  - included laps
  - min/max represented lap times
  - per-corner inclusion counts

## Reference Builder

- Construct a reference lap using the highest-confidence retained corner for each
  corner of the circuit.
- Store originating lap, fingerprint and grip timeline.

## User Interface

- Top summary with session statistics and slider.
- Corner matrix (laps vs corners).
- Corner detail with speed trace, friction circle, grip utilisation timeline,
  fingerprint and rejection reasons.

## AI Interface

- Only retained corners are passed to AI.
- Payload includes existing feature extraction metrics plus the new fingerprint,
  grip timeline metrics, attack probability and confidence.
- The AI interprets deterministic outputs only.

## Implementation Rules

- Do not modify the existing feature extraction engine.
- Do not duplicate deterministic calculations already present.
- Implement as independent services consuming existing outputs.
- Keep all new logic modular and replaceable.
