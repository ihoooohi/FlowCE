import { handleErrors, ok } from "@/lib/api";
import { getResult } from "@/lib/service";

export const dynamic = "force-dynamic";

// GET /api/v1/sessions/:sessionId/result — the gated endpoint.
// Subscription status decides the payload shape: free tier gets a masked
// view (premium fields omitted entirely), active subscribers get the full
// plan. Both are 200 — the tier is data, not an error.
export const GET = handleErrors(
  async (_req: Request, ctx: { params: Promise<{ sessionId: string }> }) => {
    const { sessionId } = await ctx.params;
    return ok(await getResult(sessionId));
  },
);
