import { describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import { verifyPaystackWebhookSignature } from "./paystack-server";

describe("verifyPaystackWebhookSignature", () => {
  it("accepts a valid HMAC signature", () => {
    const body = '{"event":"charge.success"}';
    const secret = "sk_test_secret";
    const sig = createHmac("sha512", secret).update(body).digest("hex");
    expect(verifyPaystackWebhookSignature(body, sig, secret)).toBe(true);
  });

  it("rejects a bad signature", () => {
    expect(verifyPaystackWebhookSignature("{}", "bad", "sk_test_secret")).toBe(false);
  });
});
