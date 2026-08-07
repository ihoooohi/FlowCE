#!/bin/sh
# Vercel build: migrate + seed + build.
# Neon's marketplace integration injects a pooled DATABASE_URL (pgbouncer),
# which prisma migrate can't use — prefer the unpooled URL when present.
# Locally neither override exists and Prisma reads .env as usual.
set -e

npx prisma generate

if [ -n "$DATABASE_URL_UNPOOLED" ]; then
  export DATABASE_URL="$DATABASE_URL_UNPOOLED"
fi

npx prisma migrate deploy
npx tsx prisma/seed.ts

npx next build
