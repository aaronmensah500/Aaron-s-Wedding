/**
 * In-process sliding-window rate limiter for serverless-friendly single-instance Node.
 * For multi-instance deploys, add Redis or an edge rate limiter.
 */
type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function rateLimitConsume(key: string, max: number, windowMs: number): { ok: true } | { ok: false; retryAfterMs: number } {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || now >= b.resetAt) {
    b = { count: 0, resetAt: now + windowMs };
    buckets.set(key, b);
  }
  if (b.count >= max) {
    return { ok: false, retryAfterMs: Math.max(0, b.resetAt - now) };
  }
  b.count += 1;
  return { ok: true };
}

/** Test helper */
export function __resetRateLimitsForTests() {
  buckets.clear();
}
