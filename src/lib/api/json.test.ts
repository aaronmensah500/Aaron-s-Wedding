import { describe, it, expect, beforeEach } from "vitest";
import { parseApiErrorCode, parseApiErrorMessage } from "./json";

describe("parseApiError", () => {
  it("reads nested error code", () => {
    expect(parseApiErrorCode({ error: { code: "invalid_email", message: "x" } })).toBe("invalid_email");
  });

  it("reads legacy string error", () => {
    expect(parseApiErrorCode({ error: "save_failed" })).toBe("save_failed");
  });

  it("reads nested message", () => {
    expect(parseApiErrorMessage({ error: { code: "x", message: "Hello" } })).toBe("Hello");
  });
});
