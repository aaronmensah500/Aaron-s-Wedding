import { describe, expect, it } from "vitest";
import { adminPinMatches, isAdminPinRequired } from "./adminPinServer";

describe("adminPinMatches", () => {
  it("accepts any pin when PIN is not required", () => {
    expect(adminPinMatches("wrong", { pin: "121226", requirePin: false })).toBe(true);
    expect(adminPinMatches("", { pin: "121226", requirePin: false })).toBe(true);
  });

  it("requires exact pin when required", () => {
    const config = { pin: "121226", requirePin: true };
    expect(adminPinMatches("121226", config)).toBe(true);
    expect(adminPinMatches("121227", config)).toBe(false);
  });

  it("treats undefined requirePin as required", () => {
    expect(isAdminPinRequired(undefined)).toBe(true);
    expect(adminPinMatches("121226", { pin: "121226", requirePin: undefined })).toBe(true);
  });
});
