import { beforeEach, describe, expect, it } from "vitest";
import { prisma, resetDb } from "../helpers/db";
import { completeFunnel, createSession, getResult, pay } from "../helpers/api";
import { PREMIUM_ONLY_FIELDS } from "@/lib/result";

beforeEach(resetDb);

async function subscribeDirectly(sessionId: string, expiresAt: Date | null) {
  const session = await prisma.quizSession.findUniqueOrThrow({
    where: { id: sessionId },
  });
  await prisma.subscription.create({
    data: {
      userId: session.userId,
      status: "ACTIVE",
      plan: "MONTHLY",
      activatedAt: new Date(),
      expiresAt,
    },
  });
}

describe("result gating — free tier", () => {
  it("409s when the quiz has not been submitted yet", async () => {
    const { body } = await createSession();
    const res = await getResult(body.data.sessionId);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("SESSION_NOT_SUBMITTED");
  });

  it("returns the masked view with every premium field absent", async () => {
    const sessionId = await completeFunnel();
    const res = await getResult(sessionId);
    expect(res.status).toBe(200);

    const view = res.body.data;
    expect(view.tier).toBe("free");
    expect(view.summary.bmi).toBe(25.0);
    expect(view.summary.bmiCategory).toBe("OVERWEIGHT");
    // coarse teaser only: month granularity, no exact date
    expect(view.preview.targetMonth).toMatch(/^\d{4}-\d{2}$/);

    // The protected fields must be ABSENT, not null — nothing to scrape.
    // (`"<field>":` matches an object KEY anywhere in the payload; the
    // `locked` array legitimately lists the names as string values.)
    expect(view.plan).toBeUndefined();
    const serialized = JSON.stringify(view);
    for (const field of PREMIUM_ONLY_FIELDS) {
      expect(serialized).not.toContain(`"${field}":`);
    }
    expect(view.locked).toEqual([...PREMIUM_ONLY_FIELDS]);
    expect(view.upgrade.required).toBe(true);
    expect(view.upgrade.payEndpoint).toBe("/api/v1/pay");
  });
});

describe("result gating — premium tier", () => {
  it("returns the full plan for an active subscription", async () => {
    const sessionId = await completeFunnel();
    await subscribeDirectly(sessionId, null); // no expiry

    const res = await getResult(sessionId);
    expect(res.status).toBe(200);
    const view = res.body.data;
    expect(view.tier).toBe("premium");
    expect(view.plan.recommendedCalories).toBe(1432);
    expect(view.plan.macros.proteinG).toBeGreaterThan(0);
    expect(view.plan.weeklyChangeKg).toBe(-0.45);
    expect(view.plan.targetDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(Array.isArray(view.plan.projection)).toBe(true);
    expect(view.plan.projection.length).toBeGreaterThan(5);
    expect(view.plan.projection[0]).toMatchObject({ week: 0, weightKg: 68 });
    // no paywall remnants in the premium payload
    expect(view.locked).toBeUndefined();
    expect(view.upgrade).toBeUndefined();
  });

  it("treats an expired subscription as free", async () => {
    const sessionId = await completeFunnel();
    await subscribeDirectly(sessionId, new Date(Date.now() - 86_400_000)); // expired yesterday

    const res = await getResult(sessionId);
    expect(res.body.data.tier).toBe("free");
    expect(res.body.data.plan).toBeUndefined();
  });
});

describe("/pay input validation", () => {
  it("422s without a sessionId", async () => {
    const res = await pay({});
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("404s for an unknown session", async () => {
    const res = await pay({ sessionId: "ghost" });
    expect(res.status).toBe(404);
  });

  it("422s for an unknown plan or extra fields", async () => {
    const sessionId = await completeFunnel();
    expect((await pay({ sessionId, plan: "LIFETIME" })).status).toBe(422);
    expect((await pay({ sessionId, makeAdmin: true })).status).toBe(422);
  });

  it("400s on malformed JSON", async () => {
    const res = await pay(null, "{{{");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_JSON");
  });
});
