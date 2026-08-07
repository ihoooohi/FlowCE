import { handleErrors, ok, readJson } from "@/lib/api";
import { saveAnswer } from "@/lib/service";

export const dynamic = "force-dynamic";

// PUT /api/v1/sessions/:sessionId/answers/:stepKey — save one step.
// PUT because the operation is a full idempotent replace of that step's
// answer: duplicates and retries converge to the same state.
export const PUT = handleErrors(
  async (
    req: Request,
    ctx: { params: Promise<{ sessionId: string; stepKey: string }> },
  ) => {
    const { sessionId, stepKey } = await ctx.params;
    const payload = await readJson(req);
    return ok(await saveAnswer(sessionId, stepKey, payload));
  },
);
