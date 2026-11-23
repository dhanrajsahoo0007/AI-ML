import { describe, expect, it } from "vitest";
import { HERO, ZONE, zoneFrame } from "@/components/diagrams/presets/case-study";

describe("case-study preset: the hero skeleton", () => {
  it("keeps the six zones and their tones", () => {
    expect(Object.fromEntries(Object.entries(ZONE).map(([k, v]) => [k, v.tone]))).toEqual({
      clients: "neutral",
      edge: "blue",
      core: "green",
      services: "teal",
      async: "orange",
      storage: "violet",
    });
  });

  it("places every zone inside the 1200 × 740 canvas without overlaps", () => {
    const zones = zoneFrame();
    expect(zones.map((z) => z.id)).toEqual(["clients", "edge", "core", "services", "async", "storage"]);
    for (const z of zones) {
      expect(z.x + z.w).toBeLessThanOrEqual(HERO.width);
      expect(z.y + z.h).toBeLessThanOrEqual(HERO.height);
    }
    for (const a of zones)
      for (const b of zones)
        if (a !== b) {
          const apart = a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y;
          expect(apart, `${a.id} overlaps ${b.id}`).toBe(true);
        }
  });

  it("renames and omits zones on request", () => {
    const zones = zoneFrame({ core: "Real-time messaging" }, ["async"]);
    expect(zones.find((z) => z.id === "core")?.title).toBe("Real-time messaging");
    expect(zones.some((z) => z.id === "async")).toBe(false);
  });
});
