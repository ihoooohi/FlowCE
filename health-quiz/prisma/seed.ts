import { PrismaClient, Prisma } from "@prisma/client";
import { computeAssessment } from "../src/lib/health";

/**
 * Seeds two ready-to-inspect demo sessions (idempotent — safe to re-run):
 *
 *   demo-paid-0001 — submitted quiz + ACTIVE subscription
 *                    → GET /api/v1/sessions/demo-paid-0001/result returns the FULL plan
 *   demo-free-0001 — submitted quiz, no subscription
 *                    → same endpoint returns the MASKED free view
 */

const prisma = new PrismaClient();

const DEMO_ANSWERS = {
  gender: { gender: "female" as const },
  goal: { goal: "lose_weight" as const },
  body: { age: 29, heightCm: 165, weightKg: 68, targetWeightKg: 58 },
  activity: { activityLevel: "light" as const },
};

async function seedSession(opts: {
  userId: string;
  sessionId: string;
  paid: boolean;
}) {
  const { userId, sessionId, paid } = opts;
  const now = new Date();

  await prisma.user.deleteMany({ where: { id: userId } }); // cascades
  await prisma.user.create({ data: { id: userId } });
  await prisma.quizSession.create({
    data: {
      id: sessionId,
      userId,
      status: "SUBMITTED",
      submittedAt: now,
      answers: {
        create: Object.entries(DEMO_ANSWERS).map(([stepKey, payload]) => ({
          stepKey,
          payload: payload as unknown as Prisma.InputJsonValue,
        })),
      },
    },
  });

  const output = computeAssessment(
    {
      gender: DEMO_ANSWERS.gender.gender,
      goal: DEMO_ANSWERS.goal.goal,
      ...DEMO_ANSWERS.body,
      activityLevel: DEMO_ANSWERS.activity.activityLevel,
    },
    now,
  );
  await prisma.assessment.create({
    data: {
      sessionId,
      bmi: output.bmi,
      bmiCategory: output.bmiCategory,
      bmr: output.bmr,
      tdee: output.tdee,
      recommendedCalories: output.recommendedCalories,
      proteinG: output.macros.proteinG,
      carbsG: output.macros.carbsG,
      fatG: output.macros.fatG,
      weeklyChangeKg: output.weeklyChangeKg,
      targetDate: new Date(output.targetDate),
      projection: output.projection as unknown as Prisma.InputJsonValue,
      algorithmVersion: output.algorithmVersion,
    },
  });

  if (paid) {
    const subscription = await prisma.subscription.create({
      data: {
        userId,
        status: "ACTIVE",
        plan: "YEARLY",
        activatedAt: now,
        expiresAt: new Date("2099-12-31T00:00:00Z"),
      },
    });
    await prisma.payment.create({
      data: {
        userId,
        subscriptionId: subscription.id,
        idempotencyKey: `seed-${sessionId}`,
        amountCents: 39800,
        currency: "CNY",
        plan: "YEARLY",
        status: "SUCCEEDED",
      },
    });
  }
  console.log(`seeded ${sessionId} (${paid ? "paid" : "free"})`);
}

async function main() {
  await seedSession({ userId: "demo-user-paid", sessionId: "demo-paid-0001", paid: true });
  await seedSession({ userId: "demo-user-free", sessionId: "demo-free-0001", paid: false });
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
