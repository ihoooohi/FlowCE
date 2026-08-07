/**
 * Integration-test client: invokes the real Next.js route handlers with Web
 * Request objects — the exact code paths production traffic goes through,
 * minus the HTTP socket.
 */
import { POST as createSessionRoute } from "@/app/api/v1/sessions/route";
import { GET as progressRoute } from "@/app/api/v1/sessions/[sessionId]/route";
import { PUT as answerRoute } from "@/app/api/v1/sessions/[sessionId]/answers/[stepKey]/route";
import { POST as submitRoute } from "@/app/api/v1/sessions/[sessionId]/submit/route";
import { GET as resultRoute } from "@/app/api/v1/sessions/[sessionId]/result/route";
import { POST as payRoute } from "@/app/api/v1/pay/route";

const BASE = "http://localhost/api/v1";

export interface ApiResponse {
  status: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any;
}

async function toApiResponse(res: Response): Promise<ApiResponse> {
  return { status: res.status, body: await res.json() };
}

export async function createSession(): Promise<ApiResponse> {
  const res = await createSessionRoute(new Request(`${BASE}/sessions`, { method: "POST" }));
  return toApiResponse(res);
}

export async function getProgress(sessionId: string): Promise<ApiResponse> {
  const res = await progressRoute(new Request(`${BASE}/sessions/${sessionId}`), {
    params: Promise.resolve({ sessionId }),
  });
  return toApiResponse(res);
}

export async function putAnswer(
  sessionId: string,
  stepKey: string,
  payload: unknown,
  rawBody?: string,
): Promise<ApiResponse> {
  const res = await answerRoute(
    new Request(`${BASE}/sessions/${sessionId}/answers/${stepKey}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: rawBody ?? JSON.stringify(payload),
    }),
    { params: Promise.resolve({ sessionId, stepKey }) },
  );
  return toApiResponse(res);
}

export async function submitSession(sessionId: string): Promise<ApiResponse> {
  const res = await submitRoute(
    new Request(`${BASE}/sessions/${sessionId}/submit`, { method: "POST" }),
    { params: Promise.resolve({ sessionId }) },
  );
  return toApiResponse(res);
}

export async function getResult(sessionId: string): Promise<ApiResponse> {
  const res = await resultRoute(new Request(`${BASE}/sessions/${sessionId}/result`), {
    params: Promise.resolve({ sessionId }),
  });
  return toApiResponse(res);
}

export async function pay(body: unknown, rawBody?: string): Promise<ApiResponse> {
  const res = await payRoute(
    new Request(`${BASE}/pay`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: rawBody ?? JSON.stringify(body),
    }),
  );
  return toApiResponse(res);
}

// ---------- canned funnel data ----------

export const VALID_ANSWERS = {
  gender: { gender: "female" },
  goal: { goal: "lose_weight" },
  body: { age: 29, heightCm: 165, weightKg: 68, targetWeightKg: 58 },
  activity: { activityLevel: "light" },
} as const;

/** Create a session and walk it through all four steps (not submitted). */
export async function fillFunnel(
  answers: Record<string, unknown> = VALID_ANSWERS,
): Promise<string> {
  const created = await createSession();
  const sessionId: string = created.body.data.sessionId;
  for (const [stepKey, payload] of Object.entries(answers)) {
    const res = await putAnswer(sessionId, stepKey, payload);
    if (res.status !== 200) {
      throw new Error(
        `fillFunnel: saving ${stepKey} failed (${res.status}): ${JSON.stringify(res.body)}`,
      );
    }
  }
  return sessionId;
}

/** Full journey up to and including submit. */
export async function completeFunnel(
  answers: Record<string, unknown> = VALID_ANSWERS,
): Promise<string> {
  const sessionId = await fillFunnel(answers);
  const res = await submitSession(sessionId);
  if (res.status !== 201) {
    throw new Error(
      `completeFunnel: submit failed (${res.status}): ${JSON.stringify(res.body)}`,
    );
  }
  return sessionId;
}
