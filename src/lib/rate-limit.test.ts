import { describe, it, expect, beforeEach } from "vitest";
import { rateLimitConsume, __resetRateLimitsForTests } from "./rate-limit";

describe("rateLimitConsume", () => {
  beforeEach(() => {
    __resetRateLimitsForTests();
  });

  it("allows requests under the cap", () => {
    for (let i = 0; i < 5; i++) {
      expect(rateLimitConsume("k1", 5, 60_000)).toEqual({ ok: true });
    }
  });

  it("blocks after max within the window", () => {
    for (let i = 0; i < 3; i++) rateLimitConsume("k2", 3, 60_000);
    const last = rateLimitConsume("k2", 3, 60_000);
    expect(last.ok).toBe(false);
    if (!last.ok) expect(last.retryAfterMs).toBeGreaterThan(0);
  });
});
