import { describe, expect, it } from "vitest";
import { validateSiteContentImport } from "./weddingContent";

describe("validateSiteContentImport", () => {
  it("accepts objects with sections", () => {
    const r = validateSiteContentImport({ sections: { hero: true }, hero: { nameLine1: "A" } });
    expect(r.ok).toBe(true);
  });

  it("rejects non-objects", () => {
    expect(validateSiteContentImport(null).ok).toBe(false);
    expect(validateSiteContentImport([]).ok).toBe(false);
  });

  it("rejects missing sections", () => {
    const r = validateSiteContentImport({ hero: {} });
    expect(r.ok).toBe(false);
  });
});
