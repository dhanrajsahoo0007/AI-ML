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
    expect(COST.oneTool).toBeCloseTo(0.00862, 5);
    expect(COST.twoTools).toBeCloseTo(0.0103, 4);
    expect(COST.agentPerMessage).toBeCloseTo(0.0076, 4);
    expect(COST.perConversation).toBeCloseTo(0.036, 3);
    expect(Math.round(COST.cacheSaving * 100)).toBe(46);
    expect(LATENCY_MS.question).toBe(2_500);
    expect(LATENCY_MS.oneTool).toBe(3_475);
    expect(LATENCY_MS.kettle).toBe(4_450);
    expect(LATENCY_MS.p95).toBe(6_350);
    expect(RETRIEVAL.kept).toBe(5);
    expect(REFUNDS.perDay).toBe(3_000);
    expect(REFUNDS.approvals).toBe(750);
    expect(FUNNEL.handedOff).toBe(16_000);
    expect(FUNNEL.byAgentAlone).toBe(29_300);
    expect(FUNNEL.rate).toBe(0.6);
  });
});

describe("gcase-voice: the voice agent's numbers", () => {
  it("keeps the volume, cost and latency arithmetic of the design sheet", async () => {
    const { CALLS, TURNS, CONTEXT, COST, BUDGET, CAPACITY, TURN_DETECTORS } =
      await import("@/components/diagrams/presets/gcase-voice");
    expect(CALLS.minutesPerDay).toBe(32_000);
    expect(CALLS.busyConcurrent).toBe(64);
    expect(CALLS.busyP999).toBe(89);
    expect(TURNS.callsPerMinute).toBeCloseTo(7.2);
    expect(CONTEXT.total).toBe(3_600);
    expect(CONTEXT.stable).toBe(2_000);
    expect(COST.mid).toBeCloseTo(0.00365, 5);
    expect(COST.blended).toBeCloseTo(0.00123, 5);
    expect(COST.agentModel).toBeCloseTo(0.0089, 4);
    expect(Math.round(COST.smallSplitSaving * 100)).toBe(66);
    expect(COST.synthesis).toBeCloseTo(0.018, 4);
    expect(COST.perMinute).toBeCloseTo(0.048, 3);
    expect(COST.s2sBase).toBeCloseTo(0.067, 3);
    expect(COST.s2sUncachedRebill).toBeCloseTo(0.32, 2);
    expect(BUDGET.sequential).toBe(1_200);
    expect(BUDGET.preemptive).toBe(1_100);
    expect(BUDGET.fillerHeard).toBe(850);
    expect(BUDGET.toolReply).toBe(2_100);
    expect(BUDGET.helpReply).toBe(1_310);
    expect(BUDGET.freeWait).toBe(900);
    expect(Math.round(BUDGET.p95NoTool / 10) * 10).toBe(1_490);
    expect(BUDGET.p95NoTool).toBeLessThanOrEqual(1_600);
    expect(BUDGET.p95Tool).toBeLessThanOrEqual(2_800);
    expect(BUDGET.bargeInStop).toBe(466);
    expect(BUDGET.conceptPage).toBe(1_000);
    expect(CAPACITY.workers).toBe(15);
    expect(CAPACITY.peakModelCallsPerSecond).toBeCloseTo(30);
    expect(CAPACITY.recordingGBPerDay).toBeCloseTo(7.68, 2);
    expect(CAPACITY.busyHourErlangs).toBe(48);
    expect(TURN_DETECTORS[0].points[1].cutoffs).toBe(0.045);
  });
});

describe("gcase-answer: the answer engine's numbers", () => {
  it("keeps the traffic, targets and daily cost of the design sheet", async () => {
    const { TRAFFIC, TARGETS, DAILY } = await import("@/components/diagrams/presets/gcase-answer");
    expect(TRAFFIC.perDay).toBe(10_000_000);
    expect(Math.round(TRAFFIC.quickPerDay)).toBe(8_000_000);
    expect(TARGETS.ownP50Ms).toBe(1_500);
    expect(TARGETS.apiP95Ms).toBe(3_200);
    expect(TARGETS.usdPerQuestion).toBe(0.03);
    expect(Math.round(DAILY.total / 100) * 100).toBe(241_700);
    expect(DAILY.perQuestion).toBeCloseTo(0.024, 3);
    expect(DAILY.perQuestion).toBeLessThanOrEqual(TARGETS.usdPerQuestion);
  });
});
