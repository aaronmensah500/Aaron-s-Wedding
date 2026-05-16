import { describe, expect, it } from "vitest";
import { stripToPlainText } from "./plainText";

describe("stripToPlainText", () => {
  it("removes HTML tags and decodes entities", () => {
    expect(stripToPlainText('Aaron <span style="x">&amp;</span> Princess')).toBe("Aaron & Princess");
  });

  it("converts br to space", () => {
    expect(stripToPlainText("The pleasure<br/> of your <em>company</em>")).toBe("The pleasure of your company");
  });
});
