import { describe, it, expect } from "vitest";
import { sanitizePosterHtml } from "./sanitize-poster";

describe("sanitizePosterHtml", () => {
  it("strips script tags", () => {
    const out = sanitizePosterHtml('<p>Hi</p><script>alert(1)</script>');
    expect(out).not.toContain("script");
    expect(out).toContain("Hi");
  });

  it("allows safe emphasis", () => {
    expect(sanitizePosterHtml("<em>Save</em> the date")).toContain("em");
  });
});
