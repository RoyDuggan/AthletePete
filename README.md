# Virtual Pete

**Find your edge.** AI-assisted kart telemetry analysis, driver coaching, and setup advisory.

Virtual Pete ingests AiM / RaceStudio telemetry exports, detects laps from beacon
markers, and turns the data into actionable insight: lap-to-lap comparison,
per-corner ("feature zone") time gain/loss, friction-circle g-plots, and
speed-vs-distance traces.

---

## Features

- **Lap detection & selection** — laps are detected from beacon markers; compare
  any two laps, not just the fastest. Lap times are shown in the picker and the
  fastest lap is marked. By default the fastest lap is used as the reference.
- **Fixed-distance split analysis** — distance-aligned, AiM-style sector deltas
  with a cumulative delta trace.
- **Feature zones** — corner/braking zones detected from speed and lateral-g,
  made contiguous so the whole lap is covered. Each zone card shows:
  - a **track minimap** highlighting the zone's location,
  - a **friction-circle ("g-g") plot** of lateral vs longitudinal g, overlaying
    the subject and reference laps,
  - a **speed-vs-distance** profile for that zone,
  - merged evidence + coaching recommendation (each zone covered once).
- **Speed vs distance** — full-lap overlay of subject and reference laps.
- **Coaching insights & setup advisory** — prioritised, zone-linked guidance.

## Tech stack

| Layer    | Stack                                             |
| -------- | ------------------------------------------------- |
| Backend  | Node.js, Express 5, TypeScript, ts-node, Multer   |
| Frontend | React 18, Vite 5, TypeScript, React Router        |
| Reports  | ExcelJS (lap-marker consistency reports)          |
| Infra    | docker-compose (PostGIS — reserved for future use)|

## Project structure

```
VirtualPete/
├── backend/                # Express + TypeScript API
│   ├── src/
│   │   ├── index.ts        # server entry (port 3001)
│   │   ├── routes/         # upload + analyse routes
│   │   ├── services/       # parsing, lap detection, analysis, advisory builder
│   │   └── types/          # shared API types
│   └── uploads/            # uploaded telemetry (gitignored)
├── frontend/               # React + Vite app
│   └── src/
│       ├── views/          # AdvisoryDashboard
│       ├── components/     # FileUpload, ZoneMiniMap, ZoneGPlot,
│       │                   # SpeedDistanceChart, LapComparisonSelector
│       └── types/          # shared client types
├── docker-compose.yml      # PostGIS database (optional / future)
└── package.json            # root convenience scripts (run both apps)
```

## Getting started

### Prerequisites

- Node.js 18+ and npm

### Install

```bash
npm install                 # root (concurrently)
cd backend  && npm install
cd ../frontend && npm install
```

### Run (development)

From the repo root, run both apps together:

```bash
npm run dev
```

Or run them separately:

```bash
npm run dev:backend         # http://localhost:3001
npm run dev:frontend        # http://localhost:5173
```

Then open the frontend, go to the **Telemetry Analysis** page (`/app`), upload an
AiM CSV, and use the **Compare Laps** selectors to explore.

### Build

```bash
npm run build:frontend      # tsc -b && vite build  ->  frontend/dist
```

> The backend runs via `ts-node` (`npm run start` in `backend/`); there is no
> separate compile step required to run it.

## API

Base URL: `http://localhost:3001`

| Method | Endpoint                | Body                                                        | Returns          |
| ------ | ----------------------- | ---------------------------------------------------------- | ---------------- |
| GET    | `/api/health`           | —                                                          | `{ status }`     |
| POST   | `/api/upload-session`   | multipart, field `file` (AiM CSV)                          | `AdvisoryData`   |
| POST   | `/api/analyse-session`  | JSON `{ sessionId, subjectLapNumber, referenceLapNumber }` | `AdvisoryData`   |
| GET    | `/uploads/*`            | —                                                          | static files     |

`upload-session` parses the file and returns the default analysis plus
`availableLaps` and a `sessionId`. `analyse-session` re-runs the analysis for a
chosen pair of laps using the saved file — no re-upload needed.

## Telemetry format

AiM CSV exports with a `Time` header row and `Beacon Markers` line. Channels used
include GPS Speed, `GPS LatAcc` / `GPS LonAcc` (g), `AccelerometerX/Y`, RPM,
GPS position, and distance. GPS acceleration channels drive the friction-circle
plots (with a speed-gradient fallback for longitudinal g).

## Notes

- Uploaded telemetry (`backend/uploads/`) and generated Excel reports
  (`**/tests/*.xlsx`) are gitignored.
- The PostGIS service in `docker-compose.yml` is reserved for future use; the
  current analysis pipeline is file-based and does not require a database.
