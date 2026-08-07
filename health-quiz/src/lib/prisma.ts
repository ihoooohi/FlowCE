import { PrismaClient } from "@prisma/client";

// One client per process. Next.js hot-reload re-evaluates modules, so the
// instance is stashed on globalThis in dev. The test setup exports
// TEST_DATABASE_URL_ACTIVE before this module is first imported, which
// points every route handler at the throwaway test database.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: process.env.TEST_DATABASE_URL_ACTIVE ?? undefined,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
