# Deployment

Virtual Pete runs as a self-contained Docker Compose stack:

| Service    | What it does                                              |
| ---------- | --------------------------------------------------------- |
| `web`      | Caddy — serves the built frontend, proxies `/api` to the backend, and (in production) terminates HTTPS automatically. |
| `backend`  | Node/Express + Prisma API.                                |
| `postgres` | PostgreSQL 16 (named volume `pgdata`).                     |

Telemetry uploads persist in the `telemetry` volume; the database in `pgdata`.

## Quick start (local)

```bash
cp .env.example .env          # fill in ANTHROPIC_API_KEY + a JWT_SECRET
docker compose up --build
# open http://localhost:8080
```

The backend runs `prisma migrate deploy` on start, creating the schema on first
boot. Check health at `http://localhost:8080/api/health` → `{"status":"ok","db":true}`.

## Production (with a domain + HTTPS)

Point your domain's DNS at the host, then in `.env`:

```bash
SITE_ADDRESS=app.example.com   # Caddy will obtain a Let's Encrypt cert
HTTP_PORT=80
HTTPS_PORT=443
```

```bash
docker compose up --build -d
```

Caddy provisions and renews TLS automatically (ports 80 + 443 must be reachable).

## Configuration (.env)

| Variable             | Purpose                                               |
| -------------------- | ----------------------------------------------------- |
| `POSTGRES_USER/PASSWORD/DB` | Database credentials.                          |
| `ANTHROPIC_API_KEY`  | Enables the AI coaching summaries.                    |
| `JWT_SECRET`         | Signs auth tokens (used from the auth phase onward).  |
| `SITE_ADDRESS`       | `:80` for local HTTP, or a domain for auto-HTTPS.     |
| `HTTP_PORT`/`HTTPS_PORT` | Host port mappings for the `web` service.         |

`DATABASE_URL` is assembled from the `POSTGRES_*` values in `docker-compose.yml`.

## Backups

The `backup` service runs nightly (default **03:00**, `BACKUP_CRON`) and writes
timestamped archives to `./backups`, keeping `BACKUP_KEEP_DAYS` days (default 14):

- `db-<ts>.dump` — Postgres (custom format, restore with `pg_restore`)
- `appdata-<ts>.tar.gz` — the JSON stores (zone maps, prompts, driver profile/framing)
- `uploads-<ts>.tar.gz` — uploaded telemetry files

Run one immediately (don't wait for the schedule):

```bash
docker compose exec backup sh /usr/local/bin/backup.sh
```

**Restore** (stop the app first for a clean restore):

```bash
# Database (drops & recreates objects, then loads the dump):
cat backups/db-<ts>.dump | docker compose exec -T postgres \
  pg_restore --clean --if-exists --no-owner -U vpete -d virtualpete

# JSON stores → appdata volume:
docker run --rm -v virtualpete_appdata:/data -v "$PWD/backups:/b" alpine \
  sh -c "rm -rf /data/* && tar xzf /b/appdata-<ts>.tar.gz -C /data"

# Uploaded files → telemetry volume:
docker run --rm -v virtualpete_telemetry:/data -v "$PWD/backups:/b" alpine \
  sh -c "rm -rf /data/* && tar xzf /b/uploads-<ts>.tar.gz -C /data"
```

**Off-site (recommended for disaster recovery):** `./backups` is local only. Sync
it off the machine — e.g. a cron/rclone job to S3 or Backblaze B2 — so a disk or
host failure doesn't lose everything. Keep at least one copy off-site.

## Local development (without Docker)

Frontend and backend still run directly (`npm run dev` in each). The frontend
talks to `http://localhost:3001/api` in dev and to same-origin `/api` in a
production build — override with `VITE_API_BASE` at build time if needed.

For DB-backed features locally, start just Postgres via Compose
(`docker compose up postgres`) and set `DATABASE_URL` in `backend/.env`, then run
`npm run prisma:migrate` in `backend/`.
