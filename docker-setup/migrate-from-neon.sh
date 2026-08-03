#!/usr/bin/env bash
# Copies every table, row, and field from your Neon database into local Docker Postgres.
# Run from inside this docker-setup/ folder: bash migrate-from-neon.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=========================================="
echo "Step 1: Load .env"
echo "=========================================="
if [ ! -f .env ]; then
  echo "Missing .env — copy .env.example to .env and fill in NEON_DATABASE_URL first."
  exit 1
fi
set -a
source .env
set +a

if [ -z "${NEON_DATABASE_URL:-}" ]; then
  echo "NEON_DATABASE_URL is empty in .env — fill it in and re-run."
  exit 1
fi

LOCAL_URL="postgresql://ledgercore:ledgercore_dev_password@localhost:5433/ledgercore"

echo "=========================================="
echo "Step 2: Start local Postgres + pgAdmin"
echo "=========================================="
docker compose up -d

echo "Waiting for local Postgres to be ready..."
until docker exec ledgercore-postgres pg_isready -U ledgercore -d ledgercore > /dev/null 2>&1; do
  sleep 1
done
echo "Local Postgres is up on localhost:5433"

echo "=========================================="
echo "Step 3: Dump everything from Neon"
echo "=========================================="
echo "(This runs pg_dump inside a throwaway container — no local install needed.)"
docker run --rm postgres:18 \
  pg_dump --no-owner --no-privileges --format=plain "$NEON_DATABASE_URL" \
  > neon_backup.sql

SIZE=$(du -h neon_backup.sql | cut -f1)
echo "Dump complete: neon_backup.sql ($SIZE)"

echo "=========================================="
echo "Step 4: Restore into local Postgres"
echo "=========================================="
docker exec -i ledgercore-postgres psql -U ledgercore -d ledgercore < neon_backup.sql

echo "=========================================="
echo "Done."
echo "=========================================="
echo "Local DB URL for your .env / Prisma:"
echo "  $LOCAL_URL"
echo ""
echo "pgAdmin (visual browser): http://localhost:5050"
echo "  Login: admin@ledgercore.local / admin"
echo "  Add server -> Host: postgres (or host.docker.internal) -> Port: 5432 -> User: ledgercore -> Password: ledgercore_dev_password"
echo ""
echo "neon_backup.sql contains your full data — do not commit it. Delete it once you've verified the restore:"
echo "  rm neon_backup.sql"