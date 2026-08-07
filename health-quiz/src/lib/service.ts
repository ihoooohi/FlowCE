import { Prisma, type Subscription } from "@prisma/client";
import { prisma } from "./prisma";
import { ApiError } from "./api";
import {
  STEP_KEYS,
  STEP_SCHEMAS,
  isStepKey,
  validateCrossField,
  type CompleteAnswers,
  type StepKey,
} from "./quiz-schema";
import {
  computeAssessment,
  HealthAlgorithmError,
  type AssessmentInput,
} from "./health";
import { PLAN_PRICING, serializeResult } from "./result";

/**
 * Business logic for the funnel. Route handlers stay thin; everything here
 * is exercised directly by the integration tests through the HTTP routes.
 */

const SUBSCRIPTION_DURATION_DAYS: Record<string, number> = {
  MONTHLY: 30,
  YEARLY: 365,
};

// ---------- sessions ----------

export async function createSession() {
  const user = await prisma.user.create({
    data: { sessions: { create: {} } },
    include: { sessions: true },
  });
  const session = user.sessions[0]!;
  return { sessionId: session.id, userId: user.id, status: session.status };
}

async function requireSession(sessionId: string) {
  const session = await prisma.quizSession.findUnique({
    where: { id: sessionId },
    include: { answers: true },
  });
  if (!session) {
    throw new ApiError(404, "SESSION_NOT_FOUND", `session ${sessionId} not found`);
  }
  return session;
}

function answersToMap(
  answers: { stepKey: string; payload: Prisma.JsonValue }[],
): Partial<Record<StepKey, unknown>> {
  const map: Partial<Record<StepKey, unknown>> = {};
  for (const a of answers) {
    if (isStepKey(a.stepKey)) map[a.stepKey] = a.payload;
  }
  return map;
}

function progressView(session: {
  id: string;
  status: string;
  submittedAt: Date | null;
  answers: { stepKey: string; payload: Prisma.JsonValue }[];
}) {
  const answers = answersToMap(session.answers);
  const completedSteps = STEP_KEYS.filter((k) => answers[k] !== undefined);
  const nextStep = STEP_KEYS.find((k) => answers[k] === undefined) ?? null;
  return {
    sessionId: session.id,
    status: session.status,
    submittedAt: session.submittedAt?.toISOString() ?? null,
    steps: STEP_KEYS,
    completedSteps,
    nextStep,
    answers,
  };
}

export async function getProgress(sessionId: string) {
  return progressView(await requireSession(sessionId));
}

// ---------- step answers ----------

export async function saveAnswer(
  sessionId: string,
  stepKey: string,
  rawPayload: unknown,
) {
  if (!isStepKey(stepKey)) {
    throw new ApiError(
      404,
      "UNKNOWN_STEP",
      `unknown step "${stepKey}" — valid steps: ${STEP_KEYS.join(", ")}`,
    );
  }
  const session = await requireSession(sessionId);
  if (session.status === "SUBMITTED") {
    throw new ApiError(
      409,
      "SESSION_ALREADY_SUBMITTED",
      "answers are frozen once the session has been submitted",
    );
  }

  const payload = STEP_SCHEMAS[stepKey].parse(rawPayload); // ZodError → 422

  // Idempotent per-step upsert. Two concurrent first-writes race on the
  // (sessionId, stepKey) unique constraint; the loser's P2002 is retried as
  // a plain update, so duplicates converge instead of erroring.
  const data = payload as unknown as Prisma.InputJsonValue;
  let answer;
  try {
    answer = await prisma.quizAnswer.upsert({
      where: { sessionId_stepKey: { sessionId, stepKey } },
      create: { sessionId, stepKey, payload: data },
      update: { payload: data, revision: { increment: 1 } },
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      answer = await prisma.quizAnswer.update({
        where: { sessionId_stepKey: { sessionId, stepKey } },
        data: { payload: data, revision: { increment: 1 } },
      });
    } else {
      throw err;
    }
  }

  const fresh = await requireSession(sessionId);
  return { stepKey, revision: answer.revision, ...progressView(fresh) };
}

// ---------- submit & assessment ----------

function assembleCompleteAnswers(session: {
  answers: { stepKey: string; payload: Prisma.JsonValue }[];
}): CompleteAnswers {
  const map = answersToMap(session.answers);
  const missing = STEP_KEYS.filter((k) => map[k] === undefined);
  if (missing.length > 0) {
    throw new ApiError(422, "MISSING_STEPS", "some steps are not answered yet", {
      missingSteps: missing,
    });
  }
  // Stored payloads were validated on write; re-parse so any row edited out
  // of band (or written by an older schema) fails loudly instead of feeding
  // garbage to the algorithm.
  return {
    gender: STEP_SCHEMAS.gender.parse(map.gender),
    goal: STEP_SCHEMAS.goal.parse(map.goal),
    body: STEP_SCHEMAS.body.parse(map.body),
    activity: STEP_SCHEMAS.activity.parse(map.activity),
  };
}

export async function submitSession(sessionId: string, now = new Date()) {
  const session = await requireSession(sessionId);

  if (session.status === "SUBMITTED") {
    // Idempotent: re-submitting returns the stored assessment.
    const existing = await prisma.assessment.findUnique({
      where: { sessionId },
    });
    if (existing) return { alreadySubmitted: true, assessment: existing };
  }

  const answers = assembleCompleteAnswers(session);
  const crossFieldIssues = validateCrossField(answers);
  if (crossFieldIssues.length > 0) {
    throw new ApiError(422, "VALIDATION_ERROR", "answers are inconsistent", {
      issues: crossFieldIssues,
    });
  }

  const input: AssessmentInput = {
    gender: answers.gender.gender,
    goal: answers.goal.goal,
    age: answers.body.age,
    heightCm: answers.body.heightCm,
    weightKg: answers.body.weightKg,
    targetWeightKg: answers.body.targetWeightKg,
    activityLevel: answers.activity.activityLevel,
  };

  let output;
  try {
    output = computeAssessment(input, now);
  } catch (err) {
    if (err instanceof HealthAlgorithmError) {
      throw new ApiError(422, "UNREACHABLE_TARGET", err.message);
    }
    throw err;
  }

  try {
    const assessment = await prisma.$transaction(async (tx) => {
      const created = await tx.assessment.create({
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
      await tx.quizSession.update({
        where: { id: sessionId },
        data: { status: "SUBMITTED", submittedAt: now },
      });
      return created;
    });
    return { alreadySubmitted: false, assessment };
  } catch (err) {
    // Concurrent double-submit: the loser hits the unique sessionId
    // constraint — hand back the winner's assessment.
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      const existing = await prisma.assessment.findUnique({
        where: { sessionId },
      });
      if (existing) return { alreadySubmitted: true, assessment: existing };
    }
    throw err;
  }
}

// ---------- subscription & result ----------

export function isPremium(
  subscription: Pick<Subscription, "status" | "expiresAt"> | null | undefined,
  now = new Date(),
): boolean {
  if (!subscription || subscription.status !== "ACTIVE") return false;
  return subscription.expiresAt === null || subscription.expiresAt > now;
}

export async function getResult(sessionId: string, now = new Date()) {
  const session = await prisma.quizSession.findUnique({
    where: { id: sessionId },
    include: {
      answers: true,
      assessment: true,
      user: { include: { subscription: true } },
    },
  });
  if (!session) {
    throw new ApiError(404, "SESSION_NOT_FOUND", `session ${sessionId} not found`);
  }
  if (session.status !== "SUBMITTED" || !session.assessment) {
    throw new ApiError(
      409,
      "SESSION_NOT_SUBMITTED",
      "submit the quiz before requesting results",
    );
  }
  const answers = assembleCompleteAnswers(session);
  const premium = isPremium(session.user.subscription, now);
  return serializeResult(sessionId, answers, session.assessment, premium);
}

// ---------- mock payment ----------

export async function recordPayment(
  params: {
    sessionId: string;
    plan: "MONTHLY" | "YEARLY";
    idempotencyKey: string;
  },
  now = new Date(),
) {
  const { sessionId, plan, idempotencyKey } = params;
  const session = await prisma.quizSession.findUnique({
    where: { id: sessionId },
    include: { user: { include: { subscription: true } } },
  });
  if (!session) {
    throw new ApiError(404, "SESSION_NOT_FOUND", `session ${sessionId} not found`);
  }

  const pricing = PLAN_PRICING.find((p) => p.plan === plan)!;

  // Replay: same idempotency key returns the original outcome, no new rows.
  const existing = await prisma.payment.findUnique({
    where: { idempotencyKey },
    include: { subscription: true },
  });
  if (existing) {
    if (existing.userId !== session.userId) {
      throw new ApiError(
        422,
        "PAYMENT_INVALID",
        "idempotency key was already used by a different user",
      );
    }
    return paymentView(existing.id, existing.subscription, true);
  }

  const durationDays = SUBSCRIPTION_DURATION_DAYS[plan]!;
  const activate = () => prisma.$transaction(async (tx) => {
    const current = await tx.subscription.findUnique({
      where: { userId: session.userId },
    });
    // Renewals extend from the current expiry, fresh activations from now.
    const base =
      current && current.status === "ACTIVE" && current.expiresAt && current.expiresAt > now
        ? current.expiresAt
        : now;
    const expiresAt = new Date(base.getTime() + durationDays * 86_400_000);

    const subscription = await tx.subscription.upsert({
      where: { userId: session.userId },
      create: {
        userId: session.userId,
        status: "ACTIVE",
        plan,
        activatedAt: now,
        expiresAt,
      },
      update: { status: "ACTIVE", plan, activatedAt: current?.activatedAt ?? now, expiresAt },
    });
    const payment = await tx.payment.create({
      data: {
        userId: session.userId,
        subscriptionId: subscription.id,
        idempotencyKey,
        amountCents: pricing.amountCents,
        currency: pricing.currency,
        plan,
        status: "SUCCEEDED",
      },
    });
    return { payment, subscription };
  });

  let result;
  try {
    result = await activate();
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      // Two races end up here: (a) a concurrent call with the SAME
      // idempotency key already wrote the payment — return it as a replay;
      // (b) a concurrent call with a different key created the user's
      // subscription row first — retry once, the upsert now updates.
      const replayed = await prisma.payment.findUnique({
        where: { idempotencyKey },
        include: { subscription: true },
      });
      if (replayed) return paymentView(replayed.id, replayed.subscription, true);
      result = await activate();
    } else {
      throw err;
    }
  }

  return paymentView(result.payment.id, result.subscription, false);
}

function paymentView(
  paymentId: string,
  subscription: Subscription | null,
  replayed: boolean,
) {
  return {
    paymentId,
    replayed,
    subscription: subscription
      ? {
          status: subscription.status,
          plan: subscription.plan,
          activatedAt: subscription.activatedAt?.toISOString() ?? null,
          expiresAt: subscription.expiresAt?.toISOString() ?? null,
        }
      : null,
  };
}
