import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { generateLoginToken, hashLoginToken, parseHostLoginTokens } from "./login-token";

describe("login-token", () => {
  const env = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...env };
  });

  afterEach(() => {
    process.env = env;
  });

  it("hashes tokens consistently", () => {
    const raw = "test-token-abc";
    expect(hashLoginToken(raw)).toBe(hashLoginToken(raw));
    expect(hashLoginToken(raw)).not.toBe(hashLoginToken("other"));
  });

  it("generates unique tokens", () => {
    expect(generateLoginToken()).not.toBe(generateLoginToken());
  });

  it("parses host login tokens from env", () => {
    process.env.HOST_LOGIN_TOKENS = "host@example.com:secret-one,other@example.com:secret-two";
    const map = parseHostLoginTokens();
    expect(map.get("host@example.com")).toBe(hashLoginToken("secret-one"));
    expect(map.get("other@example.com")).toBe(hashLoginToken("secret-two"));
  });
});
