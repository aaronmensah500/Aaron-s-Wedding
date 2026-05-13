import { describe, expect, it } from "vitest";
import {
  extractMapTilerMapIdFromEmbedSrc,
  isAllowedMapEmbedUrl,
  normalizeMapEmbedUrl,
} from "./mapEmbed";

describe("normalizeMapEmbedUrl", () => {
  it("trims and decodes &amp;", () => {
    expect(normalizeMapEmbedUrl("  https://x.com/a?b=1&amp;c=2  ")).toBe("https://x.com/a?b=1&c=2");
  });
  it("extracts src from iframe paste", () => {
    const html =
      '<iframe src="https://www.google.com/maps/embed?pb=abc&amp;z=1" width="400"></iframe>';
    expect(normalizeMapEmbedUrl(html)).toBe("https://www.google.com/maps/embed?pb=abc&z=1");
  });
});

describe("isAllowedMapEmbedUrl", () => {
  it("accepts Google embed", () => {
    expect(isAllowedMapEmbedUrl("https://www.google.com/maps/embed?pb=abc")).toBe(true);
  });
  it("accepts Google embed inside iframe HTML", () => {
    expect(
      isAllowedMapEmbedUrl(
        '<iframe src="https://www.google.com/maps/embed?pb=xyz" height="300"></iframe>'
      )
    ).toBe(true);
  });
  it("accepts OSM export embed with bbox", () => {
    expect(
      isAllowedMapEmbedUrl(
        "https://www.openstreetmap.org/export/embed.html?bbox=-0.19%2C5.58%2C-0.12%2C5.64&layer=mapnik"
      )
    ).toBe(true);
  });
  it("rejects OSM embed without bbox", () => {
    expect(
      isAllowedMapEmbedUrl("https://www.openstreetmap.org/export/embed.html?layer=mapnik")
    ).toBe(false);
  });
  it("accepts Bing maps embed", () => {
    expect(isAllowedMapEmbedUrl("https://www.bing.com/maps/embed?h=400&w=500")).toBe(true);
  });
  it("accepts Waze embed", () => {
    expect(isAllowedMapEmbedUrl("https://embed.waze.com/iframe?zoom=10&lat=5.6&lon=-0.17")).toBe(true);
  });
  it("accepts uMap embed", () => {
    expect(
      isAllowedMapEmbedUrl("https://umap.openstreetmap.fr/en/map/test-map/123?scaleControl=false")
    ).toBe(true);
  });
  it("accepts MapTiler Cloud embed", () => {
    expect(
      isAllowedMapEmbedUrl(
        "https://api.maptiler.com/maps/streets/?key=test#12.0/5.6/-0.17"
      )
    ).toBe(true);
  });
  it("extracts MapTiler map id from embed URL", () => {
    expect(
      extractMapTilerMapIdFromEmbedSrc(
        "https://api.maptiler.com/maps/019e217e-3336-78fe-be8d-458487caf8f1/?key=x"
      )
    ).toBe("019e217e-3336-78fe-be8d-458487caf8f1");
    expect(extractMapTilerMapIdFromEmbedSrc("https://api.maptiler.com/maps/streets-v2/#10/0/0")).toBe("streets-v2");
    expect(extractMapTilerMapIdFromEmbedSrc("https://www.google.com/maps/embed?pb=1")).toBe(null);
  });
  it("rejects arbitrary URLs", () => {
    expect(isAllowedMapEmbedUrl("https://evil.com/export/embed.html?bbox=1,2,3,4")).toBe(false);
  });
});
