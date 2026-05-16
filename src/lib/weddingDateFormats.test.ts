import { describe, expect, it } from "vitest";
import {
  combineLocalDateAndTime,
  deriveWeddingDateFormats,
  toRomanNumeral,
} from "./weddingDateFormats";

describe("weddingDateFormats", () => {
  it("formats 12 Dec 2026 like the shipped defaults", () => {
    const f = deriveWeddingDateFormats("2026-12-12T16:30:00+00:00");
    expect(f?.dateDisplayRoman).toBe("XII · XII · MMXXVI");
    expect(f?.navMonoId).toBe("No. 12 · 12 · 26");
    expect(f?.dotDateShort).toBe("12 · 12 · 26");
    expect(f?.spelledLine).toBe("Twelve · Twelve · Twenty Six");
    expect(f?.yearRoman).toBe("MMXXVI");
  });

  it("converts years to roman", () => {
    expect(toRomanNumeral(2026)).toBe("MMXXVI");
    expect(toRomanNumeral(12)).toBe("XII");
  });

  it("combines date and time into ISO", () => {
    const iso = combineLocalDateAndTime("2026-12-12", "16:30");
    expect(iso).toBeTruthy();
    expect(deriveWeddingDateFormats(iso!)?.dateDisplayRoman).toBe("XII · XII · MMXXVI");
  });
});
