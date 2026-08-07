import { beforeEach, describe, expect, it } from "vitest";
import { prisma, resetDb } from "../helpers/db";
import {
  createSession,
  fillFunnel,
  getProgress,
  putAnswer,
  submitSession,
  VALID_ANSWERS,
} from "../helpers/api";

beforeEach(resetDb);

describe("session lifecycle", () => {
  it("creates an anonymous session bound to a fresh user", async () => {
    const res = await createSession();
    expect(res.status).toBe(201);
    expect(res.body.data.sessionId).toBeTruthy();
    expect(res.body.data.status).toBe("IN_PROGRESS");

    const user = await prisma.user.findUnique({ where: { id: res.body.data.userId } });
    expect(user).not.toBeNull();
  });

  it("404s for an unknown session on every sub-resource", async () => {
    expect((await getProgress("nope")).status).toBe(404);
    expect((await putAnswer("nope", "gender", { gender: "female" })).status).toBe(404);
    expect((await submitSession("nope")).status).toBe(404);
  });
});

describe("step save + progress recovery", () => {
  it("persists a step and reports progress", async () => {
    const { body } = await createSession();
    const sessionId = body.data.sessionId;

    const saved = await putAnswer(sessionId, "gender", { gender: "female" });
    expect(saved.status).toBe(200);
    expect(saved.body.data.completedSteps).toEqual(["gender"]);
    expect(saved.body.data.nextStep).toBe("goal");

    // Simulate closing the page: a later GET must return everything saved.
    const progress = await getProgress(sessionId);
    expect(progress.status).toBe(200);
    expect(progress.body.data.answers.gender).toEqual({ gender: "female" });
    expect(progress.body.data.nextStep).toBe("goal");
    expect(progress.body.data.status).toBe("IN_PROGRESS");
  });

  it("recovers multi-step progress after an interruption", async () => {
    const { body } = await createSession();
    const sessionId = body.data.sessionId;
    await putAnswer(sessionId, "gender", VALID_ANSWERS.gender);
    await putAnswer(sessionId, "body", VALID_ANSWERS.body);

    const progress = await getProgress(sessionId);
    expect(progress.body.data.completedSteps).toEqual(["gender", "body"]);
    expect(progress.body.data.nextStep).toBe("goal");
    expect(progress.body.data.answers.body).toMatchObject({ weightKg: 68 });
  });

  it("accepts steps in any order", async () => {
    const { body } = await createSession();
    const sessionId = body.data.sessionId;
    for (const step of ["activity", "body", "goal", "gender"] as const) {
      const res = await putAnswer(sessionId, step, VALID_ANSWERS[step]);
      expect(res.status).toBe(200);
    }
    const submit = await submitSession(sessionId);
    expect(submit.status).toBe(201);
  });

  it("duplicate submissions of a step converge to one row", async () => {
    const { body } = await createSession();
    const sessionId = body.data.sessionId;

    const first = await putAnswer(sessionId, "gender", { gender: "female" });
    const second = await putAnswer(sessionId, "gender", { gender: "female" });
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(second.body.data.revision).toBe(2);

    const rows = await prisma.quizAnswer.findMany({ where: { sessionId } });
    expect(rows).toHaveLength(1);
  });

  it("overwriting a step replaces its payload", async () => {
    const { body } = await createSession();
    const sessionId = body.data.sessionId;
    await putAnswer(sessionId, "goal", { goal: "lose_weight" });
    await putAnswer(sessionId, "goal", { goal: "gain_muscle" });

    const progress = await getProgress(sessionId);
    expect(progress.body.data.answers.goal).toEqual({ goal: "gain_muscle" });
  });

  it("survives concurrent writes to the same step (no 500s, one row)", async () => {
    const { body } = await createSession();
    const sessionId = body.data.sessionId;

    const results = await Promise.all(
      Array.from({ length: 10 }, () =>
        putAnswer(sessionId, "gender", { gender: "female" }),
      ),
    );
    for (const r of results) expect(r.status).toBe(200);
    const rows = await prisma.quizAnswer.findMany({ where: { sessionId } });
    expect(rows).toHaveLength(1);
  });

  it("survives concurrent writes to different steps", async () => {
    const { body } = await createSession();
    const sessionId = body.data.sessionId;

    const results = await Promise.all(
      (Object.entries(VALID_ANSWERS) as [string, unknown][]).map(([k, v]) =>
        putAnswer(sessionId, k, v),
      ),
    );
    for (const r of results) expect(r.status).toBe(200);
    const progress = await getProgress(sessionId);
    expect(progress.body.data.completedSteps).toHaveLength(4);
  });
});

describe("input rejection at the HTTP boundary", () => {
  it("400s on malformed JSON", async () => {
    const { body } = await createSession();
    const res = await putAnswer(body.data.sessionId, "gender", null, "{not json");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_JSON");
  });

  it("404s on an unknown step key", async () => {
    const { body } = await createSession();
    const res = await putAnswer(body.data.sessionId, "hobbies", { x: 1 });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("UNKNOWN_STEP");
  });

  it("422s with field-level issues on out-of-range values", async () => {
    const { body } = await createSession();
    const res = await putAnswer(body.data.sessionId, "body", {
      age: 12,
      heightCm: 400,
      weightKg: -60,
      targetWeightKg: 58,
    });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    const paths = res.body.error.details.issues.map((i: { path: string }) => i.path);
    expect(paths).toEqual(expect.arrayContaining(["age", "heightCm", "weightKg"]));
  });

  it("nothing is persisted when validation fails", async () => {
    const { body } = await createSession();
    const sessionId = body.data.sessionId;
    await putAnswer(sessionId, "body", { age: 12, heightCm: 165, weightKg: 68, targetWeightKg: 58 });
    const rows = await prisma.quizAnswer.findMany({ where: { sessionId } });
    expect(rows).toHaveLength(0);
  });
});

describe("submit", () => {
  it("rejects submission with missing steps, listing them", async () => {
    const { body } = await createSession();
    const sessionId = body.data.sessionId;
    await putAnswer(sessionId, "gender", VALID_ANSWERS.gender);

    const res = await submitSession(sessionId);
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("MISSING_STEPS");
    expect(res.body.error.details.missingSteps).toEqual(["goal", "body", "activity"]);
  });

  it("rejects goal/target contradictions at submit time", async () => {
    const sessionId = await fillFunnel({
      ...VALID_ANSWERS,
      goal: { goal: "lose_weight" },
      body: { age: 29, heightCm: 165, weightKg: 68, targetWeightKg: 75 },
    });
    const res = await submitSession(sessionId);
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects targets unreachable at a safe calorie intake", async () => {
    const sessionId = await fillFunnel({
      gender: { gender: "female" },
      goal: { goal: "lose_weight" },
      body: { age: 60, heightCm: 150, weightKg: 45, targetWeightKg: 42 },
      activity: { activityLevel: "sedentary" },
    });
    const res = await submitSession(sessionId);
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("UNREACHABLE_TARGET");
  });

  it("computes and persists the assessment on success", async () => {
    const sessionId = await fillFunnel();
    const res = await submitSession(sessionId);
    expect(res.status).toBe(201);

    const assessment = await prisma.assessment.findUnique({ where: { sessionId } });
    expect(assessment).not.toBeNull();
    expect(Number(assessment!.bmi)).toBe(25.0);
    expect(assessment!.recommendedCalories).toBe(1432);

    const session = await prisma.quizSession.findUnique({ where: { id: sessionId } });
    expect(session!.status).toBe("SUBMITTED");
    expect(session!.submittedAt).not.toBeNull();
  });

  it("freezes answers after submission", async () => {
    const sessionId = await fillFunnel();
    await submitSession(sessionId);
    const res = await putAnswer(sessionId, "gender", { gender: "male" });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("SESSION_ALREADY_SUBMITTED");
  });

  it("is idempotent: resubmitting returns the same assessment", async () => {
    const sessionId = await fillFunnel();
    const first = await submitSession(sessionId);
    const second = await submitSession(sessionId);
    expect(second.status).toBe(200);
    expect(second.body.data.alreadySubmitted).toBe(true);
    expect(second.body.data.assessmentId).toBe(first.body.data.assessmentId);
  });

  it("concurrent submits produce exactly one assessment", async () => {
    const sessionId = await fillFunnel();
    const results = await Promise.all([
      submitSession(sessionId),
      submitSession(sessionId),
      submitSession(sessionId),
    ]);
    for (const r of results) expect([200, 201]).toContain(r.status);
    const count = await prisma.assessment.count({ where: { sessionId } });
    expect(count).toBe(1);
  });
});
