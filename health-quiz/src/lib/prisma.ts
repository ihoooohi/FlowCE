import { PrismaClient } from "@prisma/client";

// One client per process. Next.js hot-reload re-evaluates modules, so the
// instance is stashed on globalThis in dev. The test setup exports
// TEST_DATABASE_URL_ACTIVE before this module is first imported, which
// points every route handler at the throwaway test database.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Neon's Vercel-Marketplace integration injects a POOLED connection string
// (host contains "-pooler"). Prisma needs pgbouncer=true on such URLs or
// its prepared statements break; serverless also wants a small per-instance
// connection budget. Plain URLs (local dev, CI, tests) pass through as-is.
function resolveDatabaseUrl(): string | undefined {
  const url = process.env.TEST_DATABASE_URL_ACTIVE ?? process.env.DATABASE_URL;
  if (url && url.includes("-pooler.") && !url.includes("pgbouncer=")) {
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}pgbouncer=true&connection_limit=1&connect_timeout=15`;
  }
  return url;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ datasourceUrl: resolveDatabaseUrl() });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
