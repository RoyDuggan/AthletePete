#!/bin/sh
# Nightly backup: Postgres dump + the appdata and telemetry volumes.
# Run inside the `backup` compose service (postgres:16-alpine). Writes
# timestamped archives to /backups (host ./backups) and prunes old ones.
set -eu

TS=$(date +%Y%m%d-%H%M%S)
OUT=/backups
KEEP="${BACKUP_KEEP_DAYS:-14}"

mkdir -p "$OUT"
echo "[backup] $TS starting (keep ${KEEP}d)"

# 1. Database — custom format so it restores with pg_restore.
pg_dump --no-owner --format=custom "$PGDATABASE" > "$OUT/db-$TS.dump"

# 2. JSON file stores (zone maps, prompts, driver profiles/framing).
tar czf "$OUT/appdata-$TS.tar.gz" -C /data/appdata . 2>/dev/null || \
  echo "[backup] appdata empty or missing"

# 3. Uploaded telemetry files.
tar czf "$OUT/uploads-$TS.tar.gz" -C /data/uploads . 2>/dev/null || \
  echo "[backup] uploads empty or missing"

# 4. Prune archives older than the retention window.
find "$OUT" -type f \( -name '*.dump' -o -name '*.tar.gz' \) -mtime +"$KEEP" -delete

echo "[backup] $TS done — $(ls -1 "$OUT"/*-"$TS".* 2>/dev/null | wc -l) files"
