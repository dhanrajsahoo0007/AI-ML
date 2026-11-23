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

describe("gcase-docextract: the document extraction pipeline's numbers", () => {
  it("keeps the straight-through targets of the design sheet", async () => {
    const { N2, STEADY, LAUNCH } = await import("@/components/diagrams/presets/gcase-docextract");
    expect(N2).toEqual({ launch: 0.4, steady: 0.6 });
    expect(STEADY).toBeDefined();
    expect(LAUNCH).toBeDefined();
  });
});

describe("gcase-enterprise: the enterprise assistant's numbers", () => {
  it("keeps the SharePoint poll arithmetic at 1 RU a call", async () => {
    const m = await import("@/components/diagrams/presets/gcase-enterprise");
    const found = JSON.stringify(m).match(/"v1PollShareAt8000":([0-9.]+)/);
    expect(found).not.toBeNull();
    expect(Number(found![1])).toBeCloseTo(0.48, 2);
  });
});

describe("gcase-kghealth: the clinical knowledge-graph assistant's numbers", () => {
  it("keeps the network's daily volumes of the design sheet", async () => {
    const { NETWORK } = await import("@/components/diagrams/presets/gcase-kghealth");
    expect(NETWORK.occupiedBeds).toBe(3_400);
    expect(NETWORK.questionsPerDay).toBe(7_200);
    expect(NETWORK.ordersPerDay).toBe(51_200);
    expect(NETWORK.notesPerDay).toBe(80_400);
    expect(NETWORK.storedNotes).toBe(247_000_000);
  });
});

describe("gcase-kgsemi: the semiconductor yield assistant's numbers", () => {
  it("keeps the fab's volumes and the question mix of the design sheet", async () => {
    const { FAB, USERS, REASONING } = await import("@/components/diagrams/presets/gcase-kgsemi");
    expect(FAB.wspm).toBe(40_000);
    expect(Math.round(FAB.lotsPerDay)).toBe(53);
    expect(FAB.tools).toBe(1_100);
    expect(USERS.perDay).toBe(1_080);
    expect(USERS.lookups + USERS.documents + USERS.investigations).toBe(USERS.perDay);
    expect(REASONING).toEqual({ low: 80, medium: 300 });
  });
});

describe("gcase-kgsemi: the candidate families after the interviewer pass", () => {
  it("counts tool at a step and batch runs as lot-level candidates", async () => {
    const { STATS, REVIEW_ADDS } = await import("@/components/diagrams/presets/gcase-kgsemi");
    expect(STATS.withinLot).toBe(5_360);
    expect(STATS.lotLevel).toBe(1_680);
    expect(STATS.tests).toBe(7_040);
    expect(Math.round(STATS.chanceHits)).toBe(352);
    expect(REVIEW_ADDS.wipAtRiskStep).toBe(725);
  });
});

describe("gcase-gateway: the LLM platform gateway's numbers", () => {
  it("keeps the canary bound and the interim small-model guarantee", async () => {
    const { PAGE_ADDS, SELF_HOSTED, CANARIES } = await import("@/components/diagrams/presets/gcase-gateway");
    expect(PAGE_ADDS.canaryDetectablePoints).toBeCloseTo(5.88, 1);
    expect(PAGE_ADDS.smallInterimShareOfScale).toBeCloseTo(0.58, 2);
    expect(SELF_HOSTED.gpus).toBe(2);
    expect(CANARIES.perDay).toBe(7_200);
  });
});

describe("gcase-code: the code assistant's numbers", () => {
  it("keeps the completion fleet, the cancellation saving and the seat economics", async () => {
    const { COMPLETION_FLEET, FUNNEL, COST, PAGE_ADDS } = await import("@/components/diagrams/presets/gcase-code");
    expect(COMPLETION_FLEET.gpus).toBe(355);
    expect(FUNNEL.sent).toBeCloseTo(5_355, 0);
    expect(FUNNEL.arriving).toBeCloseTo(4_200, 0);
    expect(PAGE_ADDS.gpusIfAllSentArrive).toBe(452);
    expect(PAGE_ADDS.gpusWithoutGate).toBe(591);
    expect(PAGE_ADDS.curveGpus.map((c) => c.gpus)).toEqual([389, 355, 200, 120]);
    expect(PAGE_ADDS.chatModel).toBeCloseTo(334, 0);
    expect(PAGE_ADDS.chatModelCached).toBeCloseTo(127, 0);
    expect(COST.meanSeat).toBeCloseTo(31.35, 1);
    expect(PAGE_ADDS.margin30).toBeCloseTo(0.158, 2);
    expect(PAGE_ADDS.heavyShareOfMean).toBeCloseTo(0.46, 2);
  });
});

describe("gcase-moderation: the content moderation system's numbers", () => {
  it("keeps the staffing, the prevalence bounds and the per-slice replay", async () => {
    const { PEOPLE, PREVALENCE_BOUNDS, PREVALENCE_WEEKLY, REPLAY_SLICE } =
      await import("@/components/diagrams/presets/gcase-moderation");
    expect(PEOPLE.fte).toBeCloseTo(1_492, 0);
    expect(PEOPLE.perMonth / 1e6).toBeCloseTo(6.76, 2);
    const hate = PREVALENCE_BOUNDS.find((r) => r.id === "hate")!;
    expect(hate.upper95).toBeCloseTo(6.59, 2);
    expect(hate.twoSided95.lo).toBeCloseTo(4.03, 2);
    expect(hate.twoSided95.hi).toBeCloseTo(6.83, 2);
    expect(PREVALENCE_WEEKLY.find((r) => r.id === "hate")!.weeklyFail).toBeCloseTo(0.53, 2);
    expect(REPLAY_SLICE.k).toBe(84);
    expect(REPLAY_SLICE.globalDeOnly2x).toBeCloseTo(0.0056, 4);
    expect(REPLAY_SLICE.catch2x).toBeGreaterThan(0.999);
  });
});

describe("gcase-chat: the chat service's numbers", () => {
  it("keeps the fleet range, the cost per turn and the latency paths", async () => {
    const { CAPACITY, COST, LATENCY, DEGRADE } = await import("@/components/diagrams/presets/gcase-chat");
    expect(CAPACITY.design.gpus).toBe(14_520);
    expect(CAPACITY.bf16Attention.gpus).toBe(16_896);
    expect(CAPACITY.bf16Kv.fleet.gpus).toBe(14_592);
    expect(COST.perTurn).toBeCloseTo(0.0024, 4);
    expect(LATENCY.held.p50).toBeCloseTo(691, 0);
    expect(LATENCY.turn50Miss.p50).toBeCloseTo(414, 0);
    expect(Math.round(DEGRADE.inflightSlots.withoutSlot)).toBe(40_675);
  }, 30_000);
});
