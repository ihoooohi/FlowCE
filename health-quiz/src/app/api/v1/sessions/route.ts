import { handleErrors, ok } from "@/lib/api";
import { createSession } from "@/lib/service";

export const dynamic = "force-dynamic";

// POST /api/v1/sessions — mint an anonymous user + quiz session.
// The returned sessionId is an unguessable cuid and acts as the bearer
// credential for everything else in the funnel.
export const POST = handleErrors(async (_req: Request) => {
  const session = await createSession();
  return ok(session, { status: 201 });
});
