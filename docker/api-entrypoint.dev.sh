#!/bin/sh
set -e

cd /app/apps/api

echo "Applying database migrations..."
npx prisma migrate deploy

if [ "${RUN_DB_SEED:-true}" = "true" ]; then
  echo "Seeding database (idempotent upserts)..."
  npx prisma db seed
fi

cd /app
echo "Starting API in watch mode on port ${API_PORT:-4000}..."
exec npm run dev:api
