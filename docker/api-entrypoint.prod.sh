#!/bin/sh
set -e

cd /app/apps/api

echo "Applying database migrations..."
export DATABASE_URL="${DATABASE_URL:?DATABASE_URL is required}"
npx prisma migrate deploy

if [ "${RUN_DB_SEED:-false}" = "true" ]; then
  echo "Seeding database (idempotent upserts)..."
  npx prisma db seed
fi

echo "Starting API (production) on port ${API_PORT:-4000}..."
exec node dist/src/main
