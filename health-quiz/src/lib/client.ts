"use client";

/**
 * Browser-side API client. The sessionId lives in localStorage so a closed
 * tab resumes exactly where it left off (progress recovery is server-side —
 * the client only keeps the key).
 */

const SESSION_KEY = "health-quiz-session-id";

export interface ApiEnvelope<T> {
  data?: T;
  error?: { code: string; message: string; details?: unknown };
}

export async function api<T>(
  path: string,
  init?: RequestInit,
): Promise<{ status: number; body: ApiEnvelope<T> }> {
  const res = await fetch(`/api/v1${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
  });
  return { status: res.status, body: (await res.json()) as ApiEnvelope<T> };
}

export function getStoredSessionId(): string | null {
  try {
    return localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

export function storeSessionId(id: string): void {
  try {
    localStorage.setItem(SESSION_KEY, id);
  } catch {
    /* private mode — resume just won't survive the tab */
  }
}

export function clearSessionId(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}
