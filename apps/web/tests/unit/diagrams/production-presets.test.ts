import { describe, expect, it } from "vitest";
import {
  LIFECYCLE,
  LIFECYCLE_SIZE,
  LIFECYCLE_STAGES,
  PROD_TONE,
  TOKENS,
  TRAFFIC,
  accuracy,
  cohensKappa,
  confusionGrid,
  confusionGridSize,
  curve,
  falsePositiveRate,
  gate,
  gateSize,
  lifecycleMap,
  meter,
  meterSize,
  miniLifecycle,
  miniLifecycleSize,
  precision,
  recall,
  waterfall,
  waterfallSize,
  type WaterfallSpan,
} from "@/components/diagrams/presets/production";
import { lintSpec } from "@/components/diagrams/spec-lint";
import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";

const specOf = (shapes: LayoutShape[], width: number, height: number, steps?: number): LayoutSpec => ({
  kind: "layout",
  title: "t",
  width,
  height,
  shapes,
  steps: steps ? Array.from({ length: steps }, (_, i) => ({ title: `step ${i + 1}` })) : undefined,
});

/** Tones other than neutral used by a set of shapes. */
const tonesOf = (shapes: LayoutShape[]) =>
  new Set(shapes.map((s) => s.tone ?? "neutral").filter((t) => t !== "neutral"));

const SPANS: WaterfallSpan[] = [
  { id: "gw", label: "Gateway", startMs: 0, durationMs: 15, tone: PROD_TONE.infra },
  { id: "ret", label: "Retrieval", startMs: 15, durationMs: 125, tone: PROD_TONE.data, note: "5 chunks" },
  { id: "model", label: "Model", startMs: 140, durationMs: 1_330, tone: PROD_TONE.model, note: "2,215 tokens in" },
  { id: "guard", label: "Guardrail", startMs: 1_470, durationMs: 30, tone: PROD_TONE.check },
];

const COUNTS = [
  [45, 5],
  [10, 40],
];

describe("production presets: legend and running example", () => {
  it("keeps the nine roles of the legend", () => {
    expect(PROD_TONE).toEqual({
      model: "green",
      traffic: "orange",
      data: "blue",
      compute: "teal",
      store: "violet",
      check: "lime",
      failure: "red",
      infra: "neutral",
      embedding: "pink",
    });
  });

  it("keeps the working of the constants", () => {
    expect(TRAFFIC.requestsPerDay / TRAFFIC.secondsPerDay).toBeCloseTo(TRAFFIC.averagePerSecond, 1);
    expect(Math.round(TRAFFIC.averagePerSecond * TRAFFIC.peakFactor)).toBe(TRAFFIC.peakPerSecond);
    expect(TRAFFIC.requestsPerDay * TOKENS.inputPerRequest).toBe(TOKENS.inputPerDay);
    expect(TOKENS.inputPerDay).toBe(440_000_000);
    expect(TRAFFIC.requestsPerDay * TOKENS.outputPerRequest).toBe(TOKENS.outputPerDay);
    expect(TOKENS.outputPerDay).toBe(50_000_000);
    expect(TOKENS.inputExact).toBe(2_215);
    expect(Math.round(TOKENS.inputExact / 100) * 100).toBe(TOKENS.inputPerRequest);
  });
});

describe("production presets: builders", () => {
  it("draws the lifecycle map: every stage in its legend tone, within 860 wide, lint clean", () => {
    const shapes = lifecycleMap("lc", 20, 20, { highlight: ["engine"] });
    const boxes = shapes.filter((s) => s.type === "box");
    expect(boxes.map((b) => b.id)).toEqual(LIFECYCLE_STAGES.map((s) => `lc-${s}`));
    for (const s of LIFECYCLE_STAGES) expect(shapes.find((b) => b.id === `lc-${s}`)!.tone).toBe(LIFECYCLE[s].tone);
    expect(LIFECYCLE.engine.tone).toBe(PROD_TONE.compute);
    expect(LIFECYCLE.registry.tone).toBe(PROD_TONE.store);
    expect(LIFECYCLE.guardrails.tone).toBe(PROD_TONE.check);
    expect(shapes.find((s) => s.id === "lc-engine")!.highlight).toBe(true);
    expect(LIFECYCLE_SIZE.width).toBeLessThanOrEqual(860);
    expect(lintSpec(specOf(shapes, LIFECYCLE_SIZE.width + 40, LIFECYCLE_SIZE.height + 40))).toEqual([]);
  });

  it("gives lifecycle arrows the later step of their two ends", () => {
    const steps = {
      data: 1,
      finetune: 1,
      eval: 2,
      registry: 2,
      user: 3,
      gateway: 3,
      engine: 3,
      guardrails: 3,
      answer: 3,
      traces: 4,
    };
    const shapes = lifecycleMap("lc", 10, 10, { steps });
    expect(shapes.find((s) => s.id === "lc-finetune-eval")!.step).toBe(2);
    expect(shapes.find((s) => s.id === "lc-registry-engine")!.step).toBe(3);
    expect(shapes.find((s) => s.id === "lc-traces-eval")!.step).toBe(4);
    expect(lintSpec(specOf(shapes, LIFECYCLE_SIZE.width + 20, LIFECYCLE_SIZE.height + 20, 4))).toEqual([]);
  });

  it("draws the mini lifecycle unlabelled with the named stages ringed", () => {
    const shapes = miniLifecycle("mini", 10, 10, { ring: ["gateway", "engine"] });
    const boxes = shapes.filter((s) => s.type === "box");
    expect(boxes).toHaveLength(LIFECYCLE_STAGES.length);
    expect(boxes.every((b) => b.label === undefined)).toBe(true);
    expect(boxes.filter((b) => b.highlight).map((b) => b.id)).toEqual(["mini-gateway", "mini-engine"]);
    const { width, height } = miniLifecycleSize();
    expect(width).toBe(160);
    for (const b of boxes) expect(b.x + b.w! - 10).toBeLessThanOrEqual(width);
    for (const b of boxes) expect(b.y + b.h! - 10).toBeLessThanOrEqual(height);
    expect(lintSpec(specOf(shapes, width + 20, height + 20))).toEqual([]);
  });

  it("draws the waterfall to scale, with the total marked, lint clean", () => {
    const opts = { width: 700, marks: [{ ms: 400, label: "first token" }] };
    const { width, height, msPerPx, axisX } = waterfallSize(SPANS, opts);
    expect(Math.abs(width - 700)).toBeLessThanOrEqual(2);
    const shapes = waterfall("wf", 20, 20, SPANS, opts);
    const bar = (id: string) => shapes.find((s) => s.id === `wf-${id}`)!;
    expect(bar("model").x).toBeCloseTo(20 + axisX + 140 / msPerPx, 0);
    expect(bar("model").w).toBeCloseTo(1_330 / msPerPx, 0);
    expect(bar("model").label).toBe("1,330 ms");
    // A bar too narrow for its duration prints it after the bar instead.
    expect(bar("gw").label).toBeUndefined();
    expect(shapes.find((s) => s.id === "wf-gw-after")!.label).toBe("15 ms");
    expect(shapes.find((s) => s.id === "wf-total-label")!.label).toBe("total 1,500 ms");
    expect(shapes.some((s) => s.id === "wf-mark-0")).toBe(true);
    expect(tonesOf(shapes).size).toBeLessThanOrEqual(4);
    expect(lintSpec(specOf(shapes, width + 40, height + 40))).toEqual([]);

    // A fixed scale gives the axis length directly.
    expect(waterfallSize(SPANS, { msPerPx: 2.5 }).axisW).toBe(600);
  });

  it("draws a meter with the limit, stacked segments and the over-limit part in red", () => {
    const { width, height } = meterSize({ width: 480 });
    const under = meter("m1", 20, 20, { label: "Rate limit", used: 1_800, limit: 2_000, unit: "tokens/min", width });
    expect(under.find((s) => s.id === "m1-numbers")!.label).toBe("1,800 / 2,000 tokens/min");
    expect(under.some((s) => s.tone === PROD_TONE.failure)).toBe(false);
    expect(lintSpec(specOf(under, width + 40, height + 40))).toEqual([]);

    const over = meter("m2", 20, 20, { label: "Rate limit", used: 2_300, limit: 2_000, unit: "tokens/min", width });
    const red = over.find((s) => s.id === "m2-over")!;
    expect(red.tone).toBe(PROD_TONE.failure);
    expect(red.x).toBe(over.find((s) => s.id === "m2-seg-0")!.x + over.find((s) => s.id === "m2-seg-0")!.w!);
    expect(red.x + red.w!).toBe(20 + width);
    expect(lintSpec(specOf(over, width + 40, height + 40))).toEqual([]);

    const stacked = meter("m3", 20, 20, {
      label: "GPU memory",
      used: 70,
      limit: 80,
      unit: "GB",
      width,
      segments: [
        { value: 16, tone: PROD_TONE.model, label: "Weights" },
        { value: 40, tone: PROD_TONE.store, label: "KV cache" },
        { value: 14, tone: PROD_TONE.compute },
      ],
    });
    expect(stacked.filter((s) => s.id.startsWith("m3-seg-"))).toHaveLength(3);
    expect(tonesOf(stacked).size).toBeLessThanOrEqual(4);
    expect(lintSpec(specOf(stacked, width + 40, height + 40))).toEqual([]);
    expect(() =>
      meter("bad", 0, 0, { label: "x", used: 10, limit: 20, unit: "", segments: [{ value: 5, tone: "blue" }] })
    ).toThrow();
  });

  it("draws a gate: lime checks, a failing one red, promote green or block red", () => {
    const opts = {
      change: { label: "Prompt v8", sub: "new refund wording" },
      checks: [
        { label: "Golden set ≥ 92 %", pass: true },
        { label: "p95 latency ≤ 1.5 s", pass: false },
      ],
      result: "block" as const,
    };
    const shapes = gate("g", 20, 20, opts);
    expect(shapes.find((s) => s.id === "g-check-0")!.tone).toBe(PROD_TONE.check);
    expect(shapes.find((s) => s.id === "g-check-1")).toMatchObject({ tone: PROD_TONE.failure, sub: "fail" });
    expect(shapes.find((s) => s.id === "g-result")).toMatchObject({ label: "Block", tone: PROD_TONE.failure });
    expect(shapes.filter((s) => s.type === "arrow")).toHaveLength(4);
    expect(tonesOf(shapes).size).toBeLessThanOrEqual(4);
    const { width, height } = gateSize(opts);
    expect(lintSpec(specOf(shapes, width + 40, height + 40))).toEqual([]);

    const promote = gate("p", 0, 0, {
      change: "Model v3",
      checks: [{ label: "Canary", pass: true }],
      result: "promote",
    });
    expect(promote.find((s) => s.id === "p-result")).toMatchObject({ label: "Promote", tone: PROD_TONE.model });
  });

  it("computes the confusion-grid metrics by hand", () => {
    // Rows: truth, columns: prediction, positive = row/column 0.
    // TP 45, FN 5, FP 10, TN 40. Precision 45/55, recall 45/50, accuracy 85/100, FPR 10/50.
    expect(precision(COUNTS)).toBeCloseTo(45 / 55);
    expect(recall(COUNTS)).toBeCloseTo(0.9);
    expect(accuracy(COUNTS)).toBeCloseTo(0.85);
    expect(falsePositiveRate(COUNTS)).toBeCloseTo(0.2);
    // pₒ = 0.85; pₑ = (50 × 55 + 50 × 45) / 100² = 0.5; κ = (0.85 − 0.5) / (1 − 0.5) = 0.7.
    expect(cohensKappa(COUNTS)).toBeCloseTo(0.7);
    // Perfect agreement is κ = 1; chance agreement is κ = 0.
    expect(
      cohensKappa([
        [30, 0],
        [0, 70],
      ])
    ).toBeCloseTo(1);
    expect(
      cohensKappa([
        [25, 25],
        [25, 25],
      ])
    ).toBeCloseTo(0);
  });

  it("draws the confusion grid with the metrics beside it, lint clean", () => {
    const opts = {
      title: "Judge vs human",
      rowTitle: "Human ↓",
      colTitle: "Judge →",
      rowLabels: ["Good", "Bad"],
      colLabels: ["Good", "Bad"],
      counts: COUNTS,
      metrics: [
        { label: "Precision", value: precision(COUNTS) },
        { label: "Cohen's κ", value: cohensKappa(COUNTS) },
      ],
    };
    const shapes = confusionGrid("cg", 20, 20, opts);
    expect(shapes.find((s) => s.id === "cg-0-0")).toMatchObject({ label: "45", tone: PROD_TONE.check });
    expect(shapes.find((s) => s.id === "cg-1-0")).toMatchObject({ label: "10", tone: PROD_TONE.failure });
    expect(shapes.find((s) => s.id === "cg-metric-1")!.label).toBe("Cohen's κ = 0.70");
    expect(tonesOf(shapes).size).toBeLessThanOrEqual(4);
    const { width, height } = confusionGridSize(opts);
    expect(lintSpec(specOf(shapes, width + 40, height + 40))).toEqual([]);
  });

  it("draws a curve with data-space points mapped inside the axes, lint clean", () => {
    const shapes = curve("c", 20, 20, {
      width: 400,
      height: 260,
      xDomain: [0, 12],
      yDomain: [0, 6000],
      xLabel: "requests/s",
      yLabel: "£ per month",
      series: [
        {
          points: [
            [0, 0],
            [12, 5400],
          ],
          tone: PROD_TONE.model,
          label: "API",
        },
        {
          points: [
            [0, 2900],
            [12, 2900],
          ],
          tone: PROD_TONE.compute,
          label: "own GPUs",
          dashed: true,
        },
      ],
      marks: [{ x: 6.4, y: 2900, label: "break-even", place: "above-left" }],
      shapeOnly: true,
    });
    const axes = shapes.find((s) => s.id === "c-axes")!.points!;
    const [, origin, xEnd] = axes;
    const api = shapes.find((s) => s.id === "c-s0")!.points!;
    expect(api[0]).toEqual(origin);
    expect(api[1][0]).toBe(xEnd[0]);
    const mark = shapes.find((s) => s.id === "c-m0")!;
    expect(mark.type).toBe("circle");
    expect(mark.y).toBe(shapes.find((s) => s.id === "c-s1")!.points![0][1]);
    expect(shapes.find((s) => s.id === "c-shape-only")!.label).toBe("shape only");
    expect(tonesOf(shapes).size).toBeLessThanOrEqual(4);
    expect(lintSpec(specOf(shapes, 440, 300))).toEqual([]);
    expect(curve("d", 0, 0, { ...base(), shapeOnly: false }).some((s) => s.id === "d-shape-only")).toBe(false);
  });
});

function base() {
  return {
    width: 300,
    height: 200,
    xDomain: [0, 1] as [number, number],
    yDomain: [0, 1] as [number, number],
    xLabel: "x",
    yLabel: "y",
    series: [
      {
        points: [
          [0, 0],
          [1, 1],
        ] as [number, number][],
        tone: PROD_TONE.model,
      },
    ],
  };
}
