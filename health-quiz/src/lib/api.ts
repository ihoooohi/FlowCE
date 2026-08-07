import { NextResponse } from "next/server";
import { ZodError } from "zod";

/**
 * Response envelope shared by every endpoint:
 *   success → { data: ... }
 *   failure → { error: { code, message, details? } }
 */

export type ErrorCode =
  | "INVALID_JSON"
  | "VALIDATION_ERROR"
  | "UNKNOWN_STEP"
  | "SESSION_NOT_FOUND"
  | "SESSION_ALREADY_SUBMITTED"
  | "SESSION_NOT_SUBMITTED"
  | "MISSING_STEPS"
  | "UNREACHABLE_TARGET"
  | "PAYMENT_INVALID"
  | "INTERNAL_ERROR";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function ok<T>(data: T, init?: { status?: number }): NextResponse {
  return NextResponse.json({ data }, { status: init?.status ?? 200 });
}

function errorResponse(
  status: number,
  code: ErrorCode,
  message: string,
  details?: unknown,
): NextResponse {
  return NextResponse.json(
    { error: { code, message, ...(details === undefined ? {} : { details }) } },
    { status },
  );
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new ApiError(400, "INVALID_JSON", "request body must be valid JSON");
  }
}

/**
 * Wraps a route handler: ApiError → its status/code, ZodError → 422 with
 * field-level issues, anything else → 500 without leaking internals.
 */
export function handleErrors<Args extends unknown[]>(
  handler: (...args: Args) => Promise<NextResponse>,
): (...args: Args) => Promise<NextResponse> {
  return async (...args: Args) => {
    try {
      return await handler(...args);
    } catch (err) {
      if (err instanceof ApiError) {
        return errorResponse(err.status, err.code, err.message, err.details);
      }
      if (err instanceof ZodError) {
        return errorResponse(422, "VALIDATION_ERROR", "invalid input", {
          issues: err.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        });
      }
      console.error("[api] unhandled error:", err);
      return errorResponse(500, "INTERNAL_ERROR", "internal server error");
    }
  };
}
