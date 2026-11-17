import { describe, expect, it } from "vitest";
import { ZONE } from "@/components/diagrams/presets/case-study";
import {
  GENAI_TONE,
  GENAI_ZONE_TITLES,
  HERO,
  SEQUENCE_LANE,
  genaiZones,
} from "@/components/diagrams/presets/genai-case";

describe("genai-case preset: the GenAI hero skeleton", () => {
  it("names the six case-study zones for GenAI and keeps their tones and places", () => {
    const zones = genaiZones();
    expect(zones.map((z) => z.title)).toEqual(Object.values(GENAI_ZONE_TITLES));
    expect(zones.map((z) => z.tone)).toEqual(Object.values(ZONE).map((z) => z.tone));
    for (const z of zones) {
      expect(z.x + z.w).toBeLessThanOrEqual(HERO.width);
      expect(z.y + z.h).toBeLessThanOrEqual(HERO.height);
    }
  });

  it("renames and omits zones on request", () => {
    const zones = genaiZones({ core: "Call orchestration" }, ["async"]);
    expect(zones.find((z) => z.id === "core")?.title).toBe("Call orchestration");
    expect(zones.some((z) => z.id === "async")).toBe(false);
  });

  it("reuses the legend colours and keeps sequence lanes on section tones", () => {
    expect(GENAI_TONE).toEqual({
      user: "orange",
      model: "green",
      tool: "teal",
      data: "blue",
      store: "violet",
      rank: "lime",
      check: "lime",
      failure: "red",
    });
    for (const tone of Object.values(SEQUENCE_LANE)) expect(["lime", "pink"]).not.toContain(tone);
  });
});
