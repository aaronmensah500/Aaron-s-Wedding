import { describe, expect, it } from "vitest";
import { buildGoogleDirectionsUrl } from "./directionsLinks";

describe("buildGoogleDirectionsUrl", () => {
  it("includes origin when provided", () => {
    expect(buildGoogleDirectionsUrl(5.6, -0.17, 5.64, -0.15)).toContain("origin=5.64,-0.15");
    expect(buildGoogleDirectionsUrl(5.6, -0.17, 5.64, -0.15)).toContain("destination=5.6,-0.17");
  });
  it("omits origin when not provided", () => {
    const u = buildGoogleDirectionsUrl(5.6, -0.17);
    expect(u).not.toContain("origin=");
    expect(u).toContain("destination=5.6,-0.17");
  });
});
