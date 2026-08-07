import { beforeEach, describe, expect, it } from "vitest";
import { prisma, resetDb } from "../helpers/db";
import {
  completeFunnel,
  createSession,
  getResult,
  pay,
  putAnswer,
  submitSession,
  VALID_ANSWERS,
} from "../helpers/api";

beforeEach(resetDb);

describe("end-to-end: funnel → masked result → /pay → full result", () => {
  it("walks the entire journey through the real route handlers", async () => {
    // 1. Start the funnel and answer step by step.
    const created = await createSession();
    const sessionId: string = created.body.data.sessionId;
    for (const [step, payload] of Object.entries(VALID_ANSWERS)) {
      expect((await putAnswer(sessionId, step, payload)).status).toBe(200);
    }

    // 2. Submit → assessment computed server-side.
    const submitted = await submitSession(sessionId);
    expect(submitted.status).toBe(201);

    // 3. Before paying: masked view, projection withheld.
    const before = await getResult(sessionId);
    expect(before.body.data.tier).toBe("free");
    // key-form match — "projection" also appears as a string inside `locked`
    expect(JSON.stringify(before.body.data)).not.toContain('"projection":');

    // 4. Mock payment callback flips the subscription in the database.
    const paid = await pay({ sessionId, plan: "MONTHLY", idempotencyKey: "e2e-key-0001" });
    expect(paid.status).toBe(201);
    expect(paid.body.data.subscription.status).toBe("ACTIVE");
    expect(paid.body.data.subscription.plan).toBe("MONTHLY");
    expect(new Date(paid.body.data.subscription.expiresAt).getTime()).toBeGreaterThan(
      Date.now(),
    );

    // 5. Same endpoint, same session — now the full plan.
    const after = await getResult(sessionId);
    expect(after.body.data.tier).toBe("premium");
    expect(after.body.data.plan.projection.length).toBeGreaterThan(5);
    expect(after.body.data.plan.recommendedCalories).toBeGreaterThan(0);

    // 6. The ledger has exactly one SUCCEEDED payment.
    const payments = await prisma.payment.findMany();
    expect(payments).toHaveLength(1);
    expect(payments[0]!.status).toBe("SUCCEEDED");
  });

  it("replaying the same idempotency key does not double-charge or extend", async () => {
    const sessionId = await completeFunnel();

    const first = await pay({ sessionId, plan: "MONTHLY", idempotencyKey: "replay-key" });
    expect(first.status).toBe(201);
    expect(first.body.data.replayed).toBe(false);

    const replay = await pay({ sessionId, plan: "MONTHLY", idempotencyKey: "replay-key" });
    expect(replay.status).toBe(200);
    expect(replay.body.data.replayed).toBe(true);
    expect(replay.body.data.subscription.expiresAt).toBe(
      first.body.data.subscription.expiresAt,
    );

    expect(await prisma.payment.count()).toBe(1);
  });

  it("a second (new-key) payment extends the subscription from its current expiry", async () => {
    const sessionId = await completeFunnel();
    const first = await pay({ sessionId, plan: "MONTHLY", idempotencyKey: "extend-1" });
    const second = await pay({ sessionId, plan: "MONTHLY", idempotencyKey: "extend-2" });

    const firstExpiry = new Date(first.body.data.subscription.expiresAt).getTime();
    const secondExpiry = new Date(second.body.data.subscription.expiresAt).getTime();
    // extended by ~30 days on top of the previous expiry, not reset from now
    expect(secondExpiry - firstExpiry).toBe(30 * 86_400_000);
    expect(await prisma.payment.count()).toBe(2);
  });

  it("rejects an idempotency key already used by another user", async () => {
    const a = await completeFunnel();
    const b = await completeFunnel();
    await pay({ sessionId: a, idempotencyKey: "stolen-key-12" });
    const res = await pay({ sessionId: b, idempotencyKey: "stolen-key-12" });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("PAYMENT_INVALID");
  });

  it("payment before submission still unlocks a later result", async () => {
    // Paying early (e.g. from a marketing page) must not break the flow.
    const created = await createSession();
    const sessionId: string = created.body.data.sessionId;
    for (const [step, payload] of Object.entries(VALID_ANSWERS)) {
      await putAnswer(sessionId, step, payload);
    }
    const paid = await pay({ sessionId, plan: "YEARLY" });
    expect(paid.status).toBe(201);

    await submitSession(sessionId);
    const res = await getResult(sessionId);
    expect(res.body.data.tier).toBe("premium");
  });

  it("concurrent /pay calls with distinct keys settle to one consistent subscription", async () => {
    const sessionId = await completeFunnel();
    const results = await Promise.all([
      pay({ sessionId, plan: "MONTHLY", idempotencyKey: "concurrent-key-1" }),
      pay({ sessionId, plan: "MONTHLY", idempotencyKey: "concurrent-key-2" }),
    ]);
    for (const r of results) expect([200, 201]).toContain(r.status);

    const session = await prisma.quizSession.findUniqueOrThrow({
      where: { id: sessionId },
    });
    const subs = await prisma.subscription.findMany({ where: { userId: session.userId } });
    expect(subs).toHaveLength(1);
    expect(subs[0]!.status).toBe("ACTIVE");
  });
});
