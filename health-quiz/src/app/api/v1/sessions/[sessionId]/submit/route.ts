import { handleErrors, ok } from "@/lib/api";
import { submitSession } from "@/lib/service";

export const dynamic = "force-dynamic";

// POST /api/v1/sessions/:sessionId/submit — finalize the quiz: validate
// completeness + cross-field consistency, run the assessment algorithm,
// persist the result. Idempotent: re-submits return the stored assessment.
export const POST = handleErrors(
  async (_req: Request, ctx: { params: Promise<{ sessionId: string }> }) => {
    const { sessionId } = await ctx.params;
    const { alreadySubmitted, assessment } = await submitSession(sessionId);
    return ok(
      {
        sessionId,
        status: "SUBMITTED",
        alreadySubmitted,
        assessmentId: assessment.id,
      },
      { status: alreadySubmitted ? 200 : 201 },
    );
  },
);
