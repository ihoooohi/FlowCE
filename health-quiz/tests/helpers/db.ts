import { prisma } from "@/lib/prisma";

/** Wipe all rows between tests (schema stays). */
export async function resetDb(): Promise<void> {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "payments", "subscriptions", "assessments", "quiz_answers", "quiz_sessions", "users" CASCADE',
  );
}

export { prisma };
