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

describe("gcase-support: the support agent's numbers", () => {
  it("keeps the volume, cost and latency arithmetic of the design sheet", async () => {
    const { VOLUME, CONTEXT, COST, LATENCY_MS, RETRIEVAL, REFUNDS, FUNNEL } =
      await import("@/components/diagrams/presets/gcase-support");
    expect(VOLUME.conversationsPerDay).toBe(50_000);
    expect(VOLUME.modelCallsPerMessage).toBeCloseTo(1.65);
    expect(VOLUME.peakCallsPerSecond).toBe(20);
    expect(CONTEXT.total).toBe(6_000);
    expect(CONTEXT.stable).toBe(2_700);
    expect(CONTEXT.averageTotal).toBe(5_000);
    expect(COST.noTool).toBeCloseTo(0.00607, 5);
    expect(COST.oneTool).toBeCloseTo(0.00747, 5);
    expect(COST.twoTools).toBeCloseTo(0.0089, 4);
    expect(COST.agentPerMessage).toBeCloseTo(0.007, 3);
    expect(COST.perConversation).toBeCloseTo(0.033, 3);
    expect(Math.round(COST.cacheSaving * 100)).toBe(46);
    expect(LATENCY_MS.question).toBe(2_500);
    expect(LATENCY_MS.oneTool).toBe(3_475);
    expect(LATENCY_MS.kettle).toBe(4_450);
    expect(LATENCY_MS.p95).toBe(5_950);
    expect(RETRIEVAL.kept).toBe(5);
    expect(REFUNDS.perDay).toBe(3_000);
    expect(REFUNDS.approvals).toBe(750);
    expect(FUNNEL.handedOff).toBe(16_000);
    expect(FUNNEL.byAgentAlone).toBe(29_300);
    expect(FUNNEL.rate).toBe(0.6);
  });
});
