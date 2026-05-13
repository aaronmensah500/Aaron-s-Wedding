/** Shared JSON response helpers for Astro API routes. */

export const jsonHeaders = { "Content-Type": "application/json" } as const;

export const apiSecurityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
} as const;

export type ApiErrorBody = { error: { code: string; message: string } };

export function jsonResponse(body: unknown, init?: ResponseInit): Response {
  const headers = new Headers(jsonHeaders);
  for (const [k, v] of Object.entries(apiSecurityHeaders)) {
    headers.set(k, v);
  }
  if (init?.headers) {
    new Headers(init.headers).forEach((v, k) => headers.set(k, v));
  }
  return new Response(JSON.stringify(body), { ...init, headers });
}

export function jsonOk(data: Record<string, unknown> = {}): Response {
  return jsonResponse({ ok: true, ...data }, { status: 200 });
}

export function jsonError(code: string, status: number, message: string, extraHeaders?: HeadersInit): Response {
  const body: ApiErrorBody = { error: { code, message } };
  return jsonResponse(body, { status, headers: extraHeaders });
}

/** Parse API JSON error for UI (supports legacy string `error` and nested `{ error: { code } }`). */
export function parseApiErrorCode(body: unknown): string | undefined {
  if (!body || typeof body !== "object") return undefined;
  const o = body as Record<string, unknown>;
  const e = o.error;
  if (typeof e === "string") return e;
  if (e && typeof e === "object" && "code" in e) return String((e as { code: unknown }).code);
  return undefined;
}

export function parseApiErrorMessage(body: unknown, fallback = "Something went wrong."): string {
  if (!body || typeof body !== "object") return fallback;
  const o = body as Record<string, unknown>;
  const e = o.error;
  if (typeof e === "string") return e;
  if (e && typeof e === "object" && "message" in e) {
    const m = (e as { message: unknown }).message;
    if (typeof m === "string" && m.length) return m;
  }
  const code = parseApiErrorCode(body);
  return code ?? fallback;
}
