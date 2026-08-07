import { prisma } from "@/lib/prisma";
import { handleErrors, ok } from "@/lib/api";

export const dynamic = "force-dynamic";

// GET /api/v1/health — liveness + database connectivity
export const GET = handleErrors(async () => {
  await prisma.$queryRaw`SELECT 1`;
  return ok({ status: "ok", database: "up" });
});
