# Changelog

All notable changes to **AthletePete** are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project aims to follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### 2026-07-20 — Commercial-readiness release (changes since the 17 Jul review)

Baseline for this block: commit `c3a22ce` ("Add corner-selection fingerprint
coaching"). See `TESTING-CHECKLIST.md` for step-by-step test flows.

#### Added
- **Stripe subscription billing** (test mode): hosted Checkout for Driver / Team
  / Coach (£15 / £25 / £35 per month), a Customer Portal for cancel and
  upgrade/downgrade, and a signature-verified webhook that syncs the
  subscription + user plan. Env-driven (`STRIPE_*`), inert until configured.
- **Driver AI-framing**: Age / Experience / Coaching-style selections on Driver
  Setup (account-persisted) that reframe every coaching output, plus a
  **Driver Admin** editor for the framing prompts (`driverAdmin` flag, DB-only).
- **Kart Configurations**: saved, named setup snapshots per kart (chassis,
  gearing, track width, weather) — new model + migration.
- **Legal pages**: `/terms` and `/privacy` (linked from footer + sign-up);
  company-identity fields are placeholders in `lib/legal.ts`.
- **GDPR self-service** (Settings → Your data): data export (JSON) and account
  deletion (cancels Stripe, wipes files + file-stores + DB).
- **Transactional email** (Postmark): email verification on register + resend,
  and password reset — `/forgot-password`, `/reset-password`, `/verify-email`.
  Env-driven; logs links to the console until a token is set.
- **Sign In header CTA** on the marketing site when logged out.
- **Automated nightly backups**: a compose sidecar dumps the DB + volumes to
  `./backups` with retention.

#### Changed
- **Fastest lap always retained** regardless of the sensitivity slider; the
  Lap-time column highlights the top three laps gold/silver/bronze.
- **AI prompts (overall + per-zone) now persist to the account** (were
  per-device) and the overall interpretation prompt became customisable.
- **Shared analysis state** across Telemetry and Coaching via AnalysisContext.
- **"Access My Race Hub" now routes to the Welcome Back page**; sign-up wording
  changed from "Sign Up" to "Register".
- Telemetry analysis refinements: GPS coords, lap speed metrics, and split/delta
  alignment on each lap's own distance channel.

#### Security
- Rate limiting (strict on auth endpoints), helmet security headers, a
  production JWT-secret guard, and removal of the non-functional "Sign in with
  Google" buttons.

### Added
- **Editable zone maps (map segment editing)**: each zone start is drawn as a
  vertical line on the overall Speed vs Distance chart. An edit mode lets you
  click empty space to add a boundary (split a segment) or click a line to remove
  one (merge adjacent segments). Hand-edited maps are saved to a named, reusable
  library on the backend (`GET/POST/DELETE /api/zone-maps`) and appear as
  selectable options in the **Zone detection basis** dropdown; selecting one
  re-runs the analysis with those boundaries. Zone cards/deltas recompute on save
  and on select.
- **Per-zone AI summaries**: every feature zone now carries its own comparison
  channels (entry/apex/exit speed, drive/braking/RPM deltas) computed over that
  zone's distance window — the same metrics the whole-lap comparison reports, but
  per corner. Each zone card gains a **Generate AI summary** button that sends
  those metrics to Claude (`POST /api/interpret-zone`) for a concise, structured
  race-engineer read of the zone. The prompt context is a **customisable default**
  (served from `GET /api/zone-prompt-template`, editable per device above the
  Feature Zones grid) with `{{placeholders}}` filled from each zone's data.
- **Multi-session upload & cross-session comparison**: the uploader now accepts
  several telemetry files at once, numbered by upload order (S1, S2, …). Laps
  from every file are pooled into one selectable list (in/out laps excluded) and
  prefixed with their session number, so a subject and reference lap can be
  compared **across different sessions**. The zone-detection basis pools flying
  laps across all sessions, and a warning flags subject/reference files whose
  track length differs. `/api/analyse-session` gained a session-group shape and
  stays backward compatible with the single-session callers.
- **Zone numbers on the overall Speed vs Distance chart**: each zone is labelled
  with its number, centred at the top of the zone; the labels renumber live while
  editing zone boundaries.

### Changed
- **Overall AI interpretation now reads every zone's full metrics.** The lap
  summary is fed each zone's entry/apex/exit speed, drive, braking and RPM
  deltas (not just its net time delta) and is instructed to rank zones by time
  impact and lead with the most impactful corners.
- The per-zone AI summary spans the **full width** of its zone card.

### Fixed
- **Gain/loss sign convention is now consistent.** Zone-card deltas and the
  overall lap delta were the inverse of the fixed-distance split table. All three
  now use **subject − reference**: a positive delta is time **lost** (slower), a
  negative delta is time **gained** (faster) — and the zone cards agree with the
  split table and the speed trace.

## [0.1.0-beta] - 2026-06-12

First potential beta — baseline for Brands Hatch testing.

### Added
- Lap comparison with selectable subject/reference laps; lap times shown in the
  picker and the fastest lap marked. New `POST /api/analyse-session` re-analyses
  any lap pair without re-uploading; `/api/upload-session` returns `availableLaps`
  and a `sessionId`.
- Feature zones rendered as cards, each with a **track minimap** of the zone's
  location on the circuit.
- **Friction-circle ("g-g") plot** per zone (lateral vs longitudinal g), with the
  subject and reference laps overlaid in different colours.
- **Speed vs Distance** — a full-lap overlay panel plus a compact per-zone chart,
  all on a shared scale.
- **Selectable zone-detection basis**: fastest lap, all laps within 2% of fastest,
  or all laps (multi-lap modes cluster apex detections into consensus zones;
  in/out laps always excluded).
- Project `README.md`, session worklog, and beta announcement docs.

### Changed
- Feature zones are now **contiguous** (boundaries at the midpoint between
  adjacent apexes) so the whole lap is covered and zone deltas reconcile with the
  total lap delta.
- Default comparison uses the **fastest lap as the reference** benchmark.
- Coaching insights are folded into their zone cards (each zone covered once) via
  a `zoneNumber` link.
- Adaptive labelling: a compared lap reads "Subject Lap N" unless it is the
  fastest, then "Fastest Lap N".

### Fixed
- Backend `tsconfig` deprecation (`moduleResolution: Node` → `Node16`).
- Removed corrupt/dead files (`TrackMap.tsx`, `pages/Dashboard.tsx`,
  `data/mockAdvisoryData.ts`, stale frontend `services/advisoryBuilder.ts`).
- `.gitignore` now correctly excludes generated `**/tests/*.xlsx` reports.
- Added missing dependencies (`react-router-dom`, `exceljs`, `@types/node`); both
  backend type-check and frontend build pass clean.

[Unreleased]: https://github.com/RoyDuggan/AthletePete/compare/v0.1.0-beta...HEAD
[0.1.0-beta]: https://github.com/RoyDuggan/AthletePete/releases/tag/v0.1.0-beta
