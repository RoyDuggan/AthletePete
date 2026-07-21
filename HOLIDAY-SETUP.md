# Resuming development on another machine

Quick checklist for picking AthletePete up on a laptop. The code is all in git;
the items below are the things git does **not** carry.

## 1. Clone and check out the working branch

```bash
git clone https://github.com/RoyDuggan/AthletePete.git
cd AthletePete
git checkout ChatGPT-restructured-nav
```

Active development is on `ChatGPT-restructured-nav` (not yet merged to `main`).

## 2. Create the secret env files (gitignored)

`.env` and `backend/.env` are not committed. Copy the templates and fill them in:

```bash
cp .env.example .env
cp backend/.env.example backend/.env
```

Values you need to provide:

- `ANTHROPIC_API_KEY` — from https://console.anthropic.com/ (powers AI coaching).
- `JWT_SECRET` — any long random string (signs auth cookies).
- `POSTGRES_PASSWORD` — any strong password (used by the db + backend).

## 3. Run it

**With Docker (matches production):**

```bash
docker compose up -d --build
```

Site at http://localhost:8080. A clean build bakes in the current frontend —
no extra steps. Needs internet for the base images (node, caddy, postgres) the
first time.

**Frontend only (fast UI iteration):**

```bash
cd frontend
npm install
npm run dev      # Vite dev server, proxies /api to the backend
```

## 4. Expect a fresh database

The Postgres data and uploaded telemetry files (`backend/uploads/`) are local
volumes — they do **not** transfer. On a new machine:

- The schema auto-migrates on backend start (`prisma migrate deploy`).
- Existing accounts and saved sessions won't be there — re-register and
  re-upload to test.

## Where things stand

Done and deployed locally on this branch:

- Navigation restructure — public marketing site vs auth-gated `/app/*`
  workspace (Dashboard, Driver, Kart, Jetting, Calendar, Telemetry, Coaching,
  Subscription, Settings) behind a single `RequireAuth` + `AccessGate`.
- Subscription tier model (`frontend/src/lib/tiers.ts`):
  Free / Trial / Individual / Team feature gating.
- Telemetry page: load data by uploading new files **or** selecting one or more
  saved sessions (re-analysed via `/analyse-session`, no re-upload, no credit).

Placeholders that still need backend work:

- Driver profile (currently localStorage only)
- Calendar
- Coaching (conversational; per-session AI summaries already work on Telemetry)
- Settings editing + GDPR export/delete

Not started (per the production roadmap): Stripe billing (Phase 4), hardening
(Phase 5 — rate-limiting, backups, GDPR).
