import { describe, expect, it } from "vitest";
import { isSafeHttpsAssetUrl } from "./mapAssetUrl";

describe("isSafeHttpsAssetUrl", () => {
  it("accepts https image CDN URLs", () => {
    expect(
      isSafeHttpsAssetUrl("https://cdn.example.com/wedding/map-v2.png")
    ).toBe(true);
  });
  it("rejects http", () => {
    expect(isSafeHttpsAssetUrl("http://cdn.example.com/x.png")).toBe(false);
  });
  it("rejects userinfo", () => {
    expect(isSafeHttpsAssetUrl("https://user:pass@evil.com/x.png")).toBe(false);
  });
  it("rejects empty and overlong", () => {
    expect(isSafeHttpsAssetUrl("")).toBe(false);
    expect(isSafeHttpsAssetUrl("x".repeat(5000))).toBe(false);
  });
});
