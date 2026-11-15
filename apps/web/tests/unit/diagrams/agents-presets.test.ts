import { describe, expect, it } from "vitest";
import {
  AGENT_TONE,
  AUTONOMY_LADDER,
  BRIGHTPOST,
  CODING_CONTEXT,
  CODING_STEPS,
  COMPOUNDING,
  HAPPY_PATH,
  HAPPY_PATH_COUNTS,
  LATENCY_S,
  PASS_K,
  TILE_NODE,
  TOOLS,
  TRACE_KIND,
  chipWidth,
  contextBar,
  loopRing,
  miniLoop,
  miniLoopSize,
  passAtK,
  passHatK,
  patternTile,
  traceRows,
  traceRowsSize,
  type PatternKind,
  type TraceRow,
} from "@/components/diagrams/presets/agents";
import { lintSpec } from "@/components/diagrams/spec-lint";
import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";

const specOf = (shapes: LayoutShape[], width = 880, height = 500): LayoutSpec => ({
  kind: "layout",
  title: "t",
  width,
  height,
  shapes,
});

const PATTERNS: PatternKind[] = ["chaining", "routing", "parallel", "orchestrator", "evaluator"];

describe("agents presets: the legend and the running examples", () => {
  it("keeps the fixed legend", () => {
    expect(AGENT_TONE).toEqual({
      model: "green",
      task: "orange",
      action: "teal",
      result: "blue",
      memory: "violet",
      check: "lime",
      failure: "red",
      infra: "neutral",
      embedding: "pink",
    });
    expect(TRACE_KIND.thought.tone).toBe("green");
    expect(TRACE_KIND.action.tone).toBe("teal");
    expect(TRACE_KIND.observation.tone).toBe("blue");
    expect(TRACE_KIND.check.tone).toBe("lime");
    expect(TRACE_KIND.failure.tone).toBe("red");
  });

  it("keeps the Brightpost facts from the AI security page", () => {
    expect(BRIGHTPOST).toMatchObject({ customerId: "1847", orderId: "4471", price: 42, approvalLimit: 30 });
    expect(BRIGHTPOST.injectedOrder).toBe("5122");
    // The kettle always reaches the approval step.
    expect(BRIGHTPOST.price).toBeGreaterThan(BRIGHTPOST.approvalLimit);
    expect(BRIGHTPOST.message).toContain(BRIGHTPOST.orderId);
  });

  it("names the four tools the same way everywhere", () => {
    expect(Object.values(TOOLS).map((t) => t.name)).toEqual([
      "get_order",
      "search_help",
      "create_refund",
      "send_email",
    ]);
    expect(TOOLS.getOrder.call).toBe("get_order(4471)");
    expect(TOOLS.createRefund.call).toBe("create_refund(4471, 42.00)");
    for (const turn of HAPPY_PATH.filter((t) => t.action)) {
      expect(Object.values(TOOLS).some((t) => turn.action!.startsWith(t.name + "("))).toBe(true);
    }
  });

  it("derives the happy-path counts and latency", () => {
    expect(HAPPY_PATH_COUNTS).toEqual({ modelCalls: 5, toolCalls: 4, approvals: 1 });
    expect(HAPPY_PATH.at(-1)!.action).toBeUndefined();
    expect(HAPPY_PATH.at(-1)!.answer).toContain("£42");
    expect(LATENCY_S.happyPath).toBe(8.7);
    expect(AUTONOMY_LADDER.find((r) => r.rung === "Agent with tools")!.calls).toBe(HAPPY_PATH_COUNTS.modelCalls);
    // Model calls never fall as autonomy rises.
    for (let i = 1; i < AUTONOMY_LADDER.length; i++) {
      expect(AUTONOMY_LADDER[i].calls).toBeGreaterThanOrEqual(AUTONOMY_LADDER[i - 1].calls);
    }
  });

  it("keeps the coding agent's nine steps and context arithmetic", () => {
    expect(CODING_STEPS).toHaveLength(9);
    const sum = (o: Record<string, number>) => Object.values(o).reduce((s, v) => s + v, 0);
    expect(sum(CODING_CONTEXT.step1)).toBe(3_800);
    expect(sum(CODING_CONTEXT.step9)).toBe(24_000);
    expect(sum(CODING_CONTEXT.step9)).toBeLessThanOrEqual(CODING_CONTEXT.budget);
  });

  it("computes the shared arithmetic", () => {
    expect(COMPOUNDING).toEqual({ p95n10: 0.599, p95n20: 0.358, p99n20: 0.818 });
    expect(PASS_K).toMatchObject({ passAt: 0.992, passHat: 0.24 });
    expect(passAtK(0.7, 1)).toBeCloseTo(passHatK(0.7, 1));
    expect(passAtK(0.7, 8)).toBeGreaterThan(passAtK(0.7, 4));
    expect(passHatK(0.7, 8)).toBeLessThan(passHatK(0.7, 4));
  });
});

describe("agents presets: builders", () => {
  it("draws the loop ring with an exit and lints clean", () => {
    const { shapes, centres } = loopRing("loop", 300, 200, { highlight: "model" });
    expect(shapes.filter((s) => s.type === "box").map((s) => s.id)).toEqual([
      "loop-context",
      "loop-model",
      "loop-tool",
      "loop-result",
      "loop-done",
    ]);
    // First station at the left, the model at the top.
    expect(centres.context![0]).toBeLessThan(centres.model![0]);
    expect(centres.model![1]).toBeLessThan(centres.context![1]);
    expect(shapes.find((s) => s.id === "loop-model")).toMatchObject({ tone: "green", highlight: true });
    expect(shapes.filter((s) => s.type === "arrow")).toHaveLength(5);
    expect(lintSpec(specOf(shapes, 720, 400))).toEqual([]);

    const five = loopRing("l5", 300, 220, { stations: ["context", "model", "tool", "check", "state"], exit: false });
    expect(five.shapes.some((s) => s.id === "l5-done")).toBe(false);
    expect(lintSpec(specOf(five.shapes, 640, 440))).toEqual([]);
  });

  it("draws the mini loop with one coloured station", () => {
    const shapes = miniLoop("m", 10, 10, { highlight: "tool" });
    const boxes = shapes.filter((s) => s.type === "box");
    expect(boxes.map((b) => b.label)).toEqual(["Context", "Model", "Tool", "Check", "State"]);
    expect(boxes.filter((b) => b.tone !== "neutral").map((b) => [b.id, b.tone, b.fill])).toEqual([
      ["m-tool", "teal", "pastel"],
    ]);
    const { width, height } = miniLoopSize();
    expect(lintSpec(specOf(shapes, width + 20, height + 20))).toEqual([]);
  });

  it("lays trace rows in columns wide enough for every label", () => {
    const rows: TraceRow[] = HAPPY_PATH.slice(0, 4).map((t, i) => ({
      step: i + 1,
      chips: [
        { kind: "thought", label: t.thought },
        { kind: "action", label: t.action! },
        { kind: "observation", label: t.observation! },
      ],
    }));
    rows.push({ step: 5, chips: [{ kind: "answer", label: HAPPY_PATH[4].answer!, span: 3 }] });
    const shapes = traceRows("tr", 10, 10, rows);
    const { width, height } = traceRowsSize(rows);
    expect(
      lintSpec({ ...specOf(shapes, width + 20, height + 20), steps: rows.map((_, i) => ({ title: `${i}` })) })
    ).toEqual([]);
    for (const s of shapes.filter((s) => s.type === "box")) {
      expect(s.w!, s.id).toBeGreaterThanOrEqual(chipWidth({ label: s.label!, sub: s.sub }));
    }
    expect(shapes.find((s) => s.id === "tr-0-1")).toMatchObject({ tone: "teal", sub: "tool call", fill: "pastel" });
    // The answer spans the three columns.
    const first = shapes.filter((s) => s.id.startsWith("tr-0-") && s.type === "box");
    const answer = shapes.find((s) => s.id === "tr-4-0")!;
    expect(answer.x).toBe(first[0].x);
    expect(answer.x + answer.w!).toBe(first[2].x + first[2].w!);
  });

  it("draws the context window in proportion, with free space and labels that fit", () => {
    const { shapes, height } = contextBar(
      "cb",
      20,
      20,
      Object.entries(CODING_CONTEXT.step9).map(([kind, tokens]) => ({
        kind: kind as "instructions",
        tokens,
      })),
      { total: CODING_CONTEXT.budget, w: 800 }
    );
    const cells = shapes.filter((s) => s.type === "cell");
    expect(cells).toHaveLength(7);
    expect(cells.at(-1)).toMatchObject({ label: "Free", sub: "8,000", fill: "paper" });
    // Touching, whole-unit edges from 20 to 820.
    expect(cells[0].x).toBe(20);
    expect(cells.at(-1)!.x + cells.at(-1)!.w!).toBe(820);
    for (let i = 1; i < cells.length; i++) expect(cells[i].x).toBe(cells[i - 1].x + cells[i - 1].w!);
    // Narrow slices get their label underneath, never overlapping each other.
    const texts = shapes.filter((s) => s.type === "text");
    expect(texts.map((t) => t.label)).toEqual(["Instructions 2,000", "Tool definitions 1,500", "Task 300"]);
    for (let i = 1; i < texts.length; i++) expect(texts[i].x).toBeGreaterThanOrEqual(texts[i - 1].x + texts[i - 1].w!);
    expect(height).toBe(66);
    expect(lintSpec(specOf(shapes, 840, 120))).toEqual([]);
    expect(() => contextBar("x", 0, 0, [{ kind: "task", tokens: 10 }], { total: 5 })).toThrow();
  });

  it("draws every pattern tile with the same node size, within four tones, lint clean", () => {
    for (const kind of PATTERNS) {
      const { shapes, width, height } = patternTile(kind, kind);
      const boxes = shapes.filter((s) => s.type === "box");
      for (const b of boxes) expect([b.w, b.h], `${kind} ${b.id}`).toEqual([TILE_NODE.w, TILE_NODE.h]);
      const tones = new Set(boxes.map((b) => b.tone).filter((t) => t !== "neutral"));
      expect(tones.size, kind).toBeLessThanOrEqual(4);
      expect(
        boxes.some((b) => b.tone === "red"),
        kind
      ).toBe(false);
      expect(width, kind).toBeLessThanOrEqual(880);
      expect(lintSpec(specOf(shapes, width, height)), kind).toEqual([]);
    }
    const ev = patternTile("ev", "evaluator", 0, 0, { highlight: "eval" });
    expect(ev.shapes.find((s) => s.id === "ev-eval")).toMatchObject({ tone: "lime", highlight: true });
    expect(ev.shapes.find((s) => s.label === "fail: feedback")).toMatchObject({ dashed: true });
  });
});
