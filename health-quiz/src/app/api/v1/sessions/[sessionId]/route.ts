import { handleErrors, ok } from "@/lib/api";
import { getProgress } from "@/lib/service";

export const dynamic = "force-dynamic";

// GET /api/v1/sessions/:sessionId — progress recovery: everything the
// client needs to resume mid-funnel (answers so far, next unanswered step).
export const GET = handleErrors(
  async (_req: Request, ctx: { params: Promise<{ sessionId: string }> }) => {
    const { sessionId } = await ctx.params;
    return ok(await getProgress(sessionId));
  },
);
