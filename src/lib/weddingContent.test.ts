import { describe, expect, it } from "vitest";
import {
  localDraftDiffersFromPublished,
  shouldApplyPublishedSiteContent,
  validateSiteContentImport,
} from "./weddingContent";

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

describe("shouldApplyPublishedSiteContent", () => {
  it("applies published when there is no local edit timestamp", () => {
    expect(shouldApplyPublishedSiteContent(null, "2026-05-01T12:00:00.000Z")).toBe(true);
  });

  it("keeps local draft when local edit is newer than published", () => {
    expect(
      shouldApplyPublishedSiteContent(
        "2026-05-10T12:00:00.000Z",
        "2026-05-01T12:00:00.000Z"
      )
    ).toBe(false);
  });

  it("applies published when published is newer than local", () => {
    expect(
      shouldApplyPublishedSiteContent(
        "2026-05-01T12:00:00.000Z",
        "2026-05-10T12:00:00.000Z"
      )
    ).toBe(true);
  });
});

describe("localDraftDiffersFromPublished", () => {
  it("detects different weddingDateIso", () => {
    expect(
      localDraftDiffersFromPublished(
        { site: { weddingDateIso: "2026-06-01T16:30:00.000Z" } },
        { site: { weddingDateIso: "2026-12-12T16:30:00.000Z" } }
      )
    ).toBe(true);
  });

  it("is false when dates match", () => {
    const iso = "2026-12-12T16:30:00.000Z";
    expect(
      localDraftDiffersFromPublished({ site: { weddingDateIso: iso } }, { site: { weddingDateIso: iso } })
    ).toBe(false);
  });
});
