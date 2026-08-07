import { z } from "zod";
import { handleErrors, ok, readJson } from "@/lib/api";
import { recordPayment } from "@/lib/service";

export const dynamic = "force-dynamic";

const payBodySchema = z
  .object({
    sessionId: z.string().min(1, "sessionId is required"),
    plan: z.enum(["MONTHLY", "YEARLY"]).default("MONTHLY"),
    // Payment providers retry webhooks; the key makes replays harmless.
    // Optional for hand-driven demo calls — a random key is minted then.
    idempotencyKey: z.string().min(8).max(128).optional(),
  })
  .strict();

// POST /api/v1/pay — mock payment-provider callback. Activates (or extends)
// the subscription of the user owning the given session and records the
// payment in the ledger.
export const POST = handleErrors(async (req: Request) => {
  const body = payBodySchema.parse(await readJson(req));
  const result = await recordPayment({
    sessionId: body.sessionId,
    plan: body.plan,
    idempotencyKey: body.idempotencyKey ?? crypto.randomUUID(),
  });
  return ok(result, { status: result.replayed ? 200 : 201 });
});
