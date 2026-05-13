import { describe, expect, it } from "vitest";
import { mapTiler256RasterUrlTemplate, parseCoord } from "./mapCoords";

describe("parseCoord", () => {
  it("parses numbers and rejects empty", () => {
    expect(parseCoord("5.6377")).toBeCloseTo(5.6377);
    expect(parseCoord("")).toBe(null);
    expect(parseCoord("  ")).toBe(null);
  });
});

describe("mapTiler256RasterUrlTemplate", () => {
  it("encodes id and key for Leaflet XYZ", () => {
    const u = mapTiler256RasterUrlTemplate("my-map-id", "k&x");
    expect(u).toContain("/maps/my-map-id/256/{z}/{x}/{y}.png");
    expect(u).toContain("key=k%26x");
  });
});
