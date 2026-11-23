// Shared legend, running example and builders for the production pages: the six GenAI groups Fine-Tuning &
// Adaptation, Evaluation, Inference & Serving, LLMOps & Observability, Safety, Security & Governance, and
// Multimodal & Voice (plan: SYSTEM-DESIGN/plans/production-pages-plan.md). Every figure in that track keeps one
// colour legend (PROD_TONE) and one running example (the Brightpost support assistant, already used on the cloud,
// RAG and agents pages), so a number that appears in two figures comes from one constant here.
//
// Page-only constants and builders go in presets/production-<short>.ts, importing from this file.

import { CORPUS, LATENCY_MS, PROMPT } from "./rag";
import { BRIGHTPOST } from "./agents";
import type { LayoutShape, LayoutTone } from "../types";

// ── Colour legend ────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * One role, one tone, on every page of the track. The same meaning as on the RAG and agents pages where they overlap
 * (the model is green, the question orange, passages blue, stores violet, scores lime, embeddings pink).
 */
export const PROD_TONE = {
  /** The model: an LLM, a model call, a generated answer, a base model. */
  model: "green",
  /** Traffic: the user, a request, a prompt. On the fine-tuning pages: the weights being trained. */
  traffic: "orange",
  /** Data: documents, datasets, examples, logs, traces, images. */
  data: "blue",
  /** Compute: a GPU, an inference engine, a replica, a container; a tool or a robot action. */
  compute: "teal",
  /** Stores: a cache, a registry, an index, a trace store. On the multimodal pages: audio. */
  store: "violet",
  /** A check: an evaluation, a grader, a judge, a guardrail, a metric, an SLO. */
  check: "lime",
  /** Failure, attack, breach, drift alarm, budget overrun. */
  failure: "red",
  /** Infrastructure and control: gateway, router, queue, pipeline. On the fine-tuning pages: frozen weights. */
  infra: "neutral",
  /** Embeddings and vectors. */
  embedding: "pink",
} as const satisfies Record<string, LayoutTone>;

/** Fine-tuning pages: frozen weights neutral, trained weights orange (those figures show no request). */
export const FINETUNE_TONE = {
  frozen: PROD_TONE.infra,
  trained: PROD_TONE.traffic,
  data: PROD_TONE.data,
  model: PROD_TONE.model,
  check: PROD_TONE.check,
} as const satisfies Record<string, LayoutTone>;

/** Multimodal pages: text orange, images and video blue, audio violet. */
export const MODALITY_TONE = {
  text: PROD_TONE.traffic,
  image: PROD_TONE.data,
  audio: PROD_TONE.store,
  model: PROD_TONE.model,
  embedding: PROD_TONE.embedding,
} as const satisfies Record<string, LayoutTone>;

// ── Running example: the Brightpost support assistant ────────────────────────────────────────────────────────────

/** Re-exported so production pages import the shop, the refund case and the help centre from one place. */
export { BRIGHTPOST, CORPUS };

/**
 * Traffic. Working:
 *   200,000 requests a day (given).
 *   Average rate = 200,000 ÷ 86,400 s = 2.31 requests/s, written "2.3 requests/s".
 *   Peak = about 5 × average = 11.6, written "12 requests/s" (a busy hour after a sale; illustrative factor).
 */
export const TRAFFIC = {
  requestsPerDay: 200_000,
  secondsPerDay: 86_400,
  averagePerSecond: 2.3,
  peakFactor: 5,
  peakPerSecond: 12,
} as const;

/**
 * Tokens per request. Input is the RAG prompt from presets/rag.ts (200 instructions + 5 chunks × 400 + 15 question
 * = 2,215, written "≈ 2,200 tokens"). Output: 250 tokens (given).
 * Per day: 200,000 × 2,200 = 440,000,000 input tokens (440 M); 200,000 × 250 = 50,000,000 output tokens (50 M).
 */
export const TOKENS = {
  inputPerRequest: 2_200,
  inputExact: PROMPT.total,
  outputPerRequest: 250,
  inputPerDay: 440_000_000,
  outputPerDay: 50_000_000,
  inputPerDayLabel: "440 M",
  outputPerDayLabel: "50 M",
} as const;

/**
 * Latency targets for one answer, from presets/rag.ts LATENCY_MS: time to first token 400 ms, full answer 1,500 ms.
 * Decode speed implied: (1,500 − 400) ms for 250 tokens = 4.4 ms per token ≈ 227 tokens/s (illustrative).
 */
export const LATENCY = {
  firstTokenMs: LATENCY_MS.firstToken,
  fullAnswerMs: LATENCY_MS.fullAnswer,
  decodeMsPerToken: 4.4,
} as const;

/**
 * Evaluation and training sets (given):
 *   the golden set: 200 real tickets with reference answers;
 *   the fine-tuning set: 5,000 resolved tickets.
 */
export const DATASETS = {
  goldenSet: 200,
  fineTuneSet: 5_000,
} as const;

/** The refund case as every page tells it: order 4471, a cracked kettle, £42; refunds over £30 need approval. */
export const REFUND_CASE = {
  orderId: BRIGHTPOST.orderId,
  item: BRIGHTPOST.item,
  price: BRIGHTPOST.price,
  approvalLimit: BRIGHTPOST.approvalLimit,
  label: `order ${BRIGHTPOST.orderId}, a cracked ${BRIGHTPOST.item}, £${BRIGHTPOST.price}`,
} as const;

/** Format a number with thousands separators, as the pages print them ("200,000"). */
export const n = (value: number) => value.toLocaleString("en-GB");

// ── Builders ─────────────────────────────────────────────────────────────────────────────────────────────────────────
//
// The six recurring figures of the track (plan §5 "Recurring figures"). Pure functions returning layout shapes in the
// approved style: pastel boxes with ink text, neutral arrows, labels on arrows as pills, annotations as 12.5 px text
// shapes. Every id starts with the caller's prefix. A builder that a caller has to place has a matching size helper.

type Point = [number, number];

interface StepOpts {
  /** Build step for every shape the builder returns (default 1). */
  step?: number;
}

const r1 = (v: number) => Math.round(v * 10) / 10;
/** Rendered width of a 12.5 px annotation per character (lint does not measure text shapes). */
const TEXT_CHAR_W = 6.5;
/** Rendered width of a 13 px semibold box label per character, on the safe side (lint uses 6.2). */
const LABEL_CHAR_W = 7.2;
/** Height of a one-line text shape. */
const TEXT_H = 18;
/** Width of a one-line text shape for `label`. */
const textWidth = (label: string) => Math.ceil(label.length * TEXT_CHAR_W) + 6;
/** Width a box needs for its label, at least `min`. */
const boxWidth = (label: string, min: number) =>
  Math.max(min, Math.ceil(Math.max(...label.split("\n").map((l) => l.length)) * LABEL_CHAR_W) + 16);

/**
 * A one-line annotation. Text shapes are centred in their box, so the box is sized to the text: `align` says which
 * edge (or the centre) sits at `x`.
 */
function annotation(
  id: string,
  x: number,
  y: number,
  label: string,
  opts: StepOpts & { tone?: LayoutTone; align?: "left" | "centre" | "right" } = {}
): LayoutShape {
  const w = textWidth(label);
  const align = opts.align ?? "left";
  const left = align === "left" ? x : align === "right" ? x - w : x - w / 2;
  return {
    id,
    type: "text",
    x: r1(left),
    y: r1(y),
    w,
    h: TEXT_H,
    label,
    tone: opts.tone ?? PROD_TONE.infra,
    step: opts.step,
  };
}

/** A free polyline arrow from `points[0]` through the middle points to the last one (no shape ids). */
function freeArrow(id: string, points: Point[], extra: Partial<LayoutShape> = {}): LayoutShape {
  const [start, ...rest] = points;
  const end = rest[rest.length - 1];
  return {
    id,
    type: "arrow",
    x: start[0],
    y: start[1],
    w: r1(end[0] - start[0]),
    h: r1(end[1] - start[1]),
    via: rest.length > 1 ? rest.slice(0, -1) : undefined,
    ...extra,
  };
}

/** A plain line (no arrowhead) through `points`. */
const line = (id: string, points: Point[], extra: Partial<LayoutShape> = {}): LayoutShape => ({
  id,
  type: "path",
  x: 0,
  y: 0,
  points: points.map(([a, b]) => [r1(a), r1(b)] as Point),
  ...extra,
});

/** A "nice" tick step (1, 2 or 5 × 10^k) that cuts `range` into about `target` parts. */
function niceStep(range: number, target = 5) {
  const raw = range / target;
  const p = 10 ** Math.floor(Math.log10(raw));
  const f = raw / p;
  return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * p;
}

/** Tick values from `min` to `max` at a nice step (or `step`). */
function ticks(min: number, max: number, step = niceStep(max - min)) {
  const out: number[] = [];
  for (let v = Math.ceil(min / step - 1e-9) * step; v <= max + step * 1e-9; v += step) {
    out.push(Number(v.toPrecision(12)));
  }
  return out;
}

// 1. The lifecycle map ───────────────────────────────────────────────────────────────────────────────────────────────

/**
 * The stages of the lifecycle map, in reading order: the build path along the top (data → fine-tune → evaluate →
 * registry), the serving path along the bottom (user → gateway → engine → guardrails → answer), and the trace store
 * that feeds evaluation and data again.
 */
export const LIFECYCLE_STAGES = [
  "data",
  "finetune",
  "eval",
  "registry",
  "user",
  "gateway",
  "engine",
  "guardrails",
  "answer",
  "traces",
] as const;
export type LifecycleStage = (typeof LIFECYCLE_STAGES)[number];

/** Label, sub line, legend tone and grid cell (column, row) of each stage. */
export const LIFECYCLE: Record<
  LifecycleStage,
  { label: string; sub: string; tone: LayoutTone; col: number; row: 0 | 1 }
> = {
  data: { label: "Data", sub: `${n(DATASETS.fineTuneSet)} tickets`, tone: PROD_TONE.data, col: 0, row: 0 },
  finetune: { label: "Fine-tune", sub: "tone + policy", tone: PROD_TONE.model, col: 1, row: 0 },
  eval: { label: "Evaluate", sub: `golden set: ${DATASETS.goldenSet}`, tone: PROD_TONE.check, col: 2, row: 0 },
  registry: { label: "Registry", sub: "model versions", tone: PROD_TONE.store, col: 3, row: 0 },
  user: { label: "User", sub: `${TRAFFIC.peakPerSecond} req/s peak`, tone: PROD_TONE.traffic, col: 1, row: 1 },
  gateway: { label: "Gateway", sub: "limits, routing", tone: PROD_TONE.infra, col: 2, row: 1 },
  engine: { label: "Engine", sub: "on GPUs", tone: PROD_TONE.compute, col: 3, row: 1 },
  guardrails: { label: "Guardrails", sub: "PII, policy", tone: PROD_TONE.check, col: 4, row: 1 },
  answer: { label: "Answer", sub: `${TOKENS.outputPerRequest} tokens`, tone: PROD_TONE.model, col: 5, row: 1 },
  traces: { label: "Traces", sub: "every request", tone: PROD_TONE.data, col: 0, row: 1 },
};

/** Full-size geometry: six columns of 112-wide boxes, 28 apart; two rows 60 apart; the trace bus 30 below. */
const LC = { w: 112, h: 50, gapX: 28, gapY: 60, bus: 30 } as const;
const LC_PITCH = LC.w + LC.gapX;

/** Width and height of the full lifecycle map (812 × 202), including the pill on the trace bus. */
export const LIFECYCLE_SIZE = { width: 6 * LC.w + 5 * LC.gapX, height: 2 * LC.h + LC.gapY + LC.bus + 12 } as const;

/**
 * The whole track as one picture, top-left at (x, y), 812 × 202 (LIFECYCLE_SIZE). Top row: Data → Fine-tune →
 * Evaluate → Registry; Registry deploys down into the Engine. Bottom row: User → Gateway → Engine (on GPUs) →
 * Guardrails → Answer. A dashed bus under the bottom row carries traces and feedback back to the Traces box, which
 * feeds Evaluate ("evals on real traffic") and Data (new examples). Every stage in its legend tone, pastel.
 *
 * Ids: `<id>-<stage>` for the boxes; arrows `<id>-<from>-<to>`, `<id>-bus`, `<id>-tap-<stage>`. `steps` gives a
 * build step per stage (default `opts.step`, then 1); an arrow appears with the later of its two ends. `highlight`
 * rings stages; `subs: false` drops the sub lines; `labels` overrides a stage's label or sub.
 */
export function lifecycleMap(
  idPrefix: string,
  x: number,
  y: number,
  opts: StepOpts & {
    steps?: Partial<Record<LifecycleStage, number>>;
    highlight?: LifecycleStage[];
    subs?: boolean;
    labels?: Partial<Record<LifecycleStage, { label?: string; sub?: string }>>;
  } = {}
): LayoutShape[] {
  const p = idPrefix;
  const stepOf = (s: LifecycleStage) => opts.steps?.[s] ?? opts.step;
  const later = (...ss: LifecycleStage[]) => {
    const vals = ss.map(stepOf).filter((v): v is number => v !== undefined);
    return vals.length ? Math.max(...vals) : undefined;
  };
  const left = (s: LifecycleStage) => x + LIFECYCLE[s].col * LC_PITCH;
  const top = (s: LifecycleStage) => y + LIFECYCLE[s].row * (LC.h + LC.gapY);
  const cx = (s: LifecycleStage) => left(s) + LC.w / 2;
  const ring = new Set(opts.highlight ?? []);

  const boxes: LayoutShape[] = LIFECYCLE_STAGES.map((s) => ({
    id: `${p}-${s}`,
    type: "box",
    x: left(s),
    y: top(s),
    w: LC.w,
    h: LC.h,
    label: opts.labels?.[s]?.label ?? LIFECYCLE[s].label,
    sub: opts.subs === false ? undefined : (opts.labels?.[s]?.sub ?? LIFECYCLE[s].sub),
    tone: LIFECYCLE[s].tone,
    fill: "pastel",
    highlight: ring.has(s) || undefined,
    step: stepOf(s),
  }));

  const link = (a: LifecycleStage, b: LifecycleStage, label?: string): LayoutShape => ({
    id: `${p}-${a}-${b}`,
    type: "arrow",
    x: 0,
    y: 0,
    from: `${p}-${a}`,
    to: `${p}-${b}`,
    label,
    step: later(a, b),
  });

  const midY = y + LC.h + LC.gapY / 2;
  const bottom = y + 2 * LC.h + LC.gapY;
  const busY = bottom + LC.bus;
  const arrows: LayoutShape[] = [
    link("data", "finetune"),
    link("finetune", "eval"),
    link("eval", "registry"),
    link("registry", "engine", "deploy"),
    link("user", "gateway"),
    link("gateway", "engine"),
    link("engine", "guardrails"),
    link("guardrails", "answer"),
    // Traces and feedback run back along a bus under the serving row into the trace store. The bus is two pieces so
    // its pill lands under User, clear of the taps.
    line(
      `${p}-bus-tail`,
      [
        [cx("answer"), bottom],
        [cx("answer"), busY],
        [cx("gateway"), busY],
      ],
      { dashed: true, step: later("answer", "traces") }
    ),
    freeArrow(
      `${p}-bus`,
      [
        [cx("gateway"), busY],
        [cx("traces"), busY],
        [cx("traces"), bottom],
      ],
      { dashed: true, label: "traces, feedback", step: later("answer", "traces") }
    ),
    ...(["gateway", "engine", "guardrails"] as const).map((s) =>
      freeArrow(
        `${p}-tap-${s}`,
        [
          [cx(s), bottom],
          [cx(s), busY],
        ],
        { dashed: true, head: false, step: later(s, "traces") }
      )
    ),
    // The trace store feeds evaluation (graded samples of real traffic) and the next training set.
    freeArrow(
      `${p}-traces-eval`,
      [
        [cx("traces") + 20, top("traces")],
        [cx("traces") + 20, midY],
        [cx("eval"), midY],
        [cx("eval"), y + LC.h],
      ],
      { dashed: true, label: "evals on real traffic", step: later("traces", "eval") }
    ),
    freeArrow(
      `${p}-traces-data`,
      [
        [cx("traces") - 20, top("traces")],
        [cx("traces") - 20, y + LC.h],
      ],
      { dashed: true, step: later("traces", "data") }
    ),
  ];
  return [...boxes, ...arrows];
}

// 2. The mini lifecycle (locator) ────────────────────────────────────────────────────────────────────────────────────

/** Width and height of a miniLifecycle drawn `width` wide (the full map scaled, without the bus pill). */
export const miniLifecycleSize = (width = 160) => {
  const s = width / LIFECYCLE_SIZE.width;
  return { width, height: Math.ceil((2 * LC.h + LC.gapY + LC.bus) * s) + 1 };
};

/**
 * A small, unlabelled copy of the lifecycle map, top-left at (x, y), `width` wide (default 160): the "you are here"
 * locator on the lead page of each category, like `miniMap` on the Transformer pages. Every stage is a pastel block in
 * its legend tone; the stages in `ring` are drawn solid with a pulsing ring. Lines (drawn behind the blocks) trace the
 * two rows, the deploy link, the trace bus and the two feedback links. Ids `<id>-<stage>` and `<id>-l-<name>`.
 */
export function miniLifecycle(
  idPrefix: string,
  x: number,
  y: number,
  opts: StepOpts & { width?: number; ring?: LifecycleStage[] } = {}
): LayoutShape[] {
  const p = idPrefix;
  const s = (opts.width ?? 160) / LIFECYCLE_SIZE.width;
  const px = (v: number) => r1(x + v * s);
  const py = (v: number) => r1(y + v * s);
  const left = (st: LifecycleStage) => LIFECYCLE[st].col * LC_PITCH;
  const top = (st: LifecycleStage) => LIFECYCLE[st].row * (LC.h + LC.gapY);
  const cx = (st: LifecycleStage) => left(st) + LC.w / 2;
  const cy = (st: LifecycleStage) => top(st) + LC.h / 2;
  const ring = new Set(opts.ring ?? []);
  const midY = LC.h + LC.gapY / 2;
  const busY = 2 * LC.h + LC.gapY + LC.bus;
  const l = (name: string, pts: Point[], dashed = false) =>
    line(
      `${p}-l-${name}`,
      pts.map(([a, b]) => [px(a), py(b)]),
      { dashed: dashed || undefined, step: opts.step }
    );
  return [
    l("build", [
      [cx("data"), cy("data")],
      [cx("registry"), cy("registry")],
    ]),
    l("serve", [
      [cx("user"), cy("user")],
      [cx("answer"), cy("answer")],
    ]),
    l("deploy", [
      [cx("registry"), cy("registry")],
      [cx("engine"), cy("engine")],
    ]),
    l("bus", [
      [cx("answer"), cy("answer")],
      [cx("answer"), busY],
      [cx("traces"), busY],
      [cx("traces"), cy("traces")],
    ]),
    l("feedback", [
      [cx("traces"), cy("traces")],
      [cx("traces"), midY],
      [cx("eval"), midY],
      [cx("eval"), cy("eval")],
    ]),
    l("data", [
      [cx("traces"), cy("traces")],
      [cx("data"), cy("data")],
    ]),
    ...LIFECYCLE_STAGES.map((st): LayoutShape => ({
      id: `${p}-${st}`,
      type: "box",
      x: px(left(st)),
      y: py(top(st)),
      w: r1(LC.w * s),
      h: r1(LC.h * s),
      tone: LIFECYCLE[st].tone,
      fill: "pastel",
      highlight: ring.has(st) || undefined,
      step: opts.step,
    })),
  ];
}

// 3. The request waterfall ───────────────────────────────────────────────────────────────────────────────────────────

/** One timed span of a request. */
export interface WaterfallSpan {
  id: string;
  label: string;
  startMs: number;
  durationMs: number;
  tone: LayoutTone;
  /** Printed after the bar, such as "2,215 tokens in". */
  note?: string;
  highlight?: boolean;
  /** Build step of this row (default the builder's step). */
  step?: number;
}

export interface WaterfallOpts extends StepOpts {
  /** Milliseconds per pixel. Without it the axis is fitted so the whole builder is `width` wide. */
  msPerPx?: number;
  /** Target width of the whole builder (labels, axis and notes) when `msPerPx` is not given. Default 640. */
  width?: number;
  /** Width of the label column (default: the longest label). */
  labelW?: number;
  /** Row pitch (default 30) and bar height (default 20). */
  rowH?: number;
  barH?: number;
  /** Tick spacing in ms (default a nice step, about five ticks). */
  tickMs?: number;
  /** The total: a dashed line at `ms` (default the end of the last span) labelled "total 1,500 ms". false: none. */
  total?: { ms?: number; label?: string } | false;
  /** Extra dashed markers with a label at the top, such as the first token at 400 ms. */
  marks?: { ms: number; label: string; tone?: LayoutTone }[];
}

const WF_LABEL_GAP = 10;
const WF_NOTE_GAP = 6;
const msLabel = (ms: number) => `${n(ms)} ms`;

/** Text printed after a span's bar: its duration when the bar is too narrow to hold it, then its note. */
function spanTexts(span: WaterfallSpan, barW: number) {
  const dur = msLabel(span.durationMs);
  const inside = barW - 8 >= dur.length * LABEL_CHAR_W;
  const after = [inside ? "" : dur, span.note ?? ""].filter(Boolean).join(" · ");
  return { inside: inside ? dur : undefined, after };
}

/** Everything the waterfall and its size helper share. */
function waterfallGeom(spans: WaterfallSpan[], opts: WaterfallOpts) {
  const endMs = Math.max(...spans.map((s) => s.startMs + s.durationMs));
  const totalMs = opts.total === false ? endMs : (opts.total?.ms ?? endMs);
  const axisMs = Math.max(endMs, totalMs, ...(opts.marks ?? []).map((m) => m.ms));
  const tickMs = opts.tickMs ?? niceStep(axisMs);
  const tickVals = ticks(0, axisMs, tickMs);
  const lastTick = tickVals[tickVals.length - 1];
  const labelW = opts.labelW ?? Math.max(...spans.map((s) => textWidth(s.label)));
  const axisX = labelW + WF_LABEL_GAP;
  /** Room needed right of the axis end for notes, the last tick label and marker labels, at a given scale. */
  const overhang = (msPerPx: number) => {
    const axisW = axisMs / msPerPx;
    const need = spans.map((s) => {
      const { after } = spanTexts(s, s.durationMs / msPerPx);
      return after ? (s.startMs + s.durationMs) / msPerPx + WF_NOTE_GAP + textWidth(after) - axisW : 0;
    });
    const tickLabel = textWidth(msLabel(lastTick)) / 2 - (axisMs - lastTick) / msPerPx;
    return Math.ceil(Math.max(0, tickLabel, ...need));
  };
  let msPerPx = opts.msPerPx ?? 0;
  if (!opts.msPerPx) {
    const target = opts.width ?? 640;
    let extra = 0;
    for (let i = 0; i < 6; i++) {
      msPerPx = axisMs / Math.max(40, target - axisX - extra);
      extra = overhang(msPerPx);
    }
  }
  const axisW = r1(axisMs / msPerPx);
  const rowH = opts.rowH ?? 30;
  const barH = opts.barH ?? 20;
  const topPad = opts.total !== false || opts.marks?.length ? 24 : 4;
  const height = topPad + spans.length * rowH + 4 + 7 + TEXT_H;
  return {
    totalMs,
    axisMs,
    tickVals,
    labelW,
    axisX,
    axisW,
    msPerPx,
    rowH,
    barH,
    topPad,
    width: Math.ceil(axisX + axisW + overhang(msPerPx)),
    height,
  };
}

/** Width, height and scale of a waterfall drawn with the same spans and options. */
export function waterfallSize(spans: WaterfallSpan[], opts: WaterfallOpts = {}) {
  const g = waterfallGeom(spans, opts);
  return { width: g.width, height: g.height, msPerPx: g.msPerPx, axisX: g.axisX, axisW: g.axisW };
}

/**
 * One request as timed spans, top-left at (x, y): a row per span with its label on the left and a pastel bar from
 * `startMs` for `durationMs` on a shared millisecond axis with ticks. The duration is printed in the bar when it fits,
 * otherwise after it with the note ("320 ms · 2,215 tokens in"). The total is a dashed line labelled at the top; `marks`
 * add more (time to first token); their lines run through the rows, so keep notes short where a mark falls. Ids
 * `<id>-<span id>` (bar), `<id>-<span id>-label`, `<id>-<span id>-after`,
 * `<id>-axis`, `<id>-tick-<i>`, `<id>-total`, `<id>-mark-<i>`.
 */
export function waterfall(
  idPrefix: string,
  x: number,
  y: number,
  spans: WaterfallSpan[],
  opts: WaterfallOpts = {}
): LayoutShape[] {
  const p = idPrefix;
  const g = waterfallGeom(spans, opts);
  const ax = x + g.axisX;
  const toX = (ms: number) => r1(ax + ms / g.msPerPx);
  const rowsTop = y + g.topPad;
  const axisY = rowsTop + spans.length * g.rowH + 4;
  const out: LayoutShape[] = [];
  spans.forEach((s, i) => {
    const step = s.step ?? opts.step;
    const ry = rowsTop + i * g.rowH;
    const barX = toX(s.startMs);
    const barW = Math.max(2, r1(s.durationMs / g.msPerPx));
    const { inside, after } = spanTexts(s, barW);
    out.push(
      annotation(`${p}-${s.id}-label`, x + g.labelW, ry + (g.rowH - TEXT_H) / 2, s.label, {
        align: "right",
        tone: PROD_TONE.infra,
        step,
      }),
      {
        id: `${p}-${s.id}`,
        type: "cell",
        x: barX,
        y: r1(ry + (g.rowH - g.barH) / 2),
        w: barW,
        h: g.barH,
        label: inside,
        tone: s.tone,
        fill: "pastel",
        highlight: s.highlight,
        step,
      }
    );
    if (after) {
      out.push(
        annotation(`${p}-${s.id}-after`, barX + barW + WF_NOTE_GAP, ry + (g.rowH - TEXT_H) / 2, after, {
          tone: PROD_TONE.infra,
          step,
        })
      );
    }
  });
  out.push(
    line(
      `${p}-axis`,
      [
        [ax, axisY],
        [ax + g.axisW, axisY],
      ],
      { step: opts.step }
    )
  );
  g.tickVals.forEach((v, i) => {
    const tx = toX(v);
    const last = i === g.tickVals.length - 1;
    out.push(
      line(
        `${p}-tick-${i}`,
        [
          [tx, axisY],
          [tx, axisY + 5],
        ],
        { step: opts.step }
      ),
      annotation(`${p}-tick-${i}-label`, tx, axisY + 7, last ? msLabel(v) : n(v), { align: "centre", step: opts.step })
    );
  });
  const marker = (id: string, ms: number, label: string, tone: LayoutTone = PROD_TONE.infra) => {
    const mx = toX(ms);
    const w = textWidth(label);
    const lx = Math.min(Math.max(mx - w / 2, x), x + g.width - w);
    return [
      line(
        id,
        [
          [mx, y + TEXT_H + 2],
          [mx, axisY],
        ],
        { dashed: true, tone, step: opts.step }
      ),
      annotation(`${id}-label`, lx, y, label, { tone, step: opts.step }),
    ];
  };
  if (opts.total !== false) {
    out.push(...marker(`${p}-total`, g.totalMs, opts.total?.label ?? `total ${msLabel(g.totalMs)}`));
  }
  (opts.marks ?? []).forEach((m, i) => out.push(...marker(`${p}-mark-${i}`, m.ms, m.label, m.tone)));
  return out;
}

// 4. The meter ───────────────────────────────────────────────────────────────────────────────────────────────────────

/** One stacked part of a meter's fill. */
export interface MeterSegment {
  value: number;
  tone: LayoutTone;
  /** Written inside the segment when it fits. */
  label?: string;
}

export interface MeterOpts extends StepOpts {
  /** Title above the bar, left: "Rate limit". */
  label: string;
  used: number;
  limit: number;
  /** Unit after the numbers: "tokens/min". */
  unit: string;
  /** Whole width (default 480). */
  width?: number;
  /** Fill tone when there are no segments (default PROD_TONE.check). */
  tone?: LayoutTone;
  /** Stacked parts of the fill; they must add up to `used`. */
  segments?: MeterSegment[];
  /** Right end of the scale (default the larger of limit and used). */
  max?: number;
  /** Text under the limit line (default "limit"). */
  limitLabel?: string;
  barH?: number;
  highlight?: boolean;
}

/** Width and height of a meter (title row, bar, limit label). */
export const meterSize = (opts: Pick<MeterOpts, "width" | "barH"> = {}) => ({
  width: opts.width ?? 480,
  height: 24 + (opts.barH ?? 28) + 6 + TEXT_H,
});

/**
 * A bar with a limit and a fill, top-left at (x, y): a token budget, a rate limit, GPU memory, an error budget. The
 * title sits top left and the numbers top right ("1,800 / 2,000 tokens/min"); the fill (or its stacked `segments`)
 * runs from the left, with free space on paper; a line marks the limit, labelled underneath. Anything past the limit
 * is a red cell ("+300") and the numbers and limit line turn red. Ids `<id>-title`, `<id>-numbers`, `<id>-seg-<i>`,
 * `<id>-over`, `<id>-free`, `<id>-limit`, `<id>-limit-label`. Throws if the segments do not add up to `used`.
 */
export function meter(idPrefix: string, x: number, y: number, opts: MeterOpts): LayoutShape[] {
  const p = idPrefix;
  const { width } = meterSize(opts);
  const barH = opts.barH ?? 28;
  const segments = opts.segments ?? [{ value: opts.used, tone: opts.tone ?? PROD_TONE.check }];
  const sum = segments.reduce((a, s) => a + s.value, 0);
  if (Math.abs(sum - opts.used) > 1e-9) throw new Error(`meter ${p}: segments add up to ${sum}, not ${opts.used}`);
  const scaleMax = opts.max ?? Math.max(opts.limit, opts.used);
  const over = opts.used > opts.limit;
  const toX = (v: number) => Math.round(x + (Math.min(v, scaleMax) / scaleMax) * width);
  const barY = y + 24;
  const step = opts.step;
  const cell = (
    id: string,
    a: number,
    b: number,
    tone: LayoutTone,
    label?: string,
    fill: LayoutShape["fill"] = "pastel"
  ) => {
    const x1 = toX(a);
    const w = toX(b) - x1;
    const fits = label !== undefined && w - 8 >= label.length * LABEL_CHAR_W;
    return {
      id,
      type: "cell",
      x: x1,
      y: barY,
      w,
      h: barH,
      label: fits ? label : undefined,
      tone,
      fill,
      step,
    } as LayoutShape;
  };
  const out: LayoutShape[] = [];
  let acc = 0;
  segments.forEach((s, i) => {
    const a = acc;
    acc += s.value;
    const b = Math.min(acc, opts.limit);
    if (b > a) out.push({ ...cell(`${p}-seg-${i}`, a, b, s.tone, s.label), highlight: opts.highlight });
  });
  if (over) out.push(cell(`${p}-over`, opts.limit, opts.used, PROD_TONE.failure, `+${n(opts.used - opts.limit)}`));
  if (opts.used < scaleMax && toX(scaleMax) - toX(opts.used) >= 1) {
    out.push(cell(`${p}-free`, opts.used, scaleMax, PROD_TONE.infra, undefined, "paper"));
  }
  const numbers = `${n(opts.used)} / ${n(opts.limit)} ${opts.unit}`;
  const limitX = toX(opts.limit);
  const limitTone = over ? PROD_TONE.failure : PROD_TONE.infra;
  const limitText = opts.limitLabel ?? "limit";
  const lw = textWidth(limitText);
  out.push(
    annotation(`${p}-title`, x, y, opts.label, { tone: PROD_TONE.infra, step }),
    annotation(`${p}-numbers`, x + width, y, numbers, { align: "right", tone: limitTone, step }),
    line(
      `${p}-limit`,
      [
        [limitX, barY - 5],
        [limitX, barY + barH + 5],
      ],
      { tone: limitTone, step }
    ),
    annotation(`${p}-limit-label`, Math.min(Math.max(limitX - lw / 2, x), x + width - lw), barY + barH + 6, limitText, {
      tone: limitTone,
      step,
    })
  );
  return out;
}

// 5. The gate ────────────────────────────────────────────────────────────────────────────────────────────────────────

/** One check in a gate. */
export interface GateCheck {
  label: string;
  pass: boolean;
  /** Second line (default "pass" or "fail"). */
  sub?: string;
}

export interface GateOpts extends StepOpts {
  /** The change under test: a label, or a label with a sub line and tone (default PROD_TONE.infra). */
  change: string | { label: string; sub?: string; tone?: LayoutTone };
  checks: GateCheck[];
  result: "promote" | "block";
  /** Result box label (default "Promote" or "Block") and sub line. */
  resultLabel?: string;
  resultSub?: string;
}

const GATE = { h: 44, rowGap: 12, colGap: 64, resultW: 112 } as const;

function gateGeom(opts: GateOpts) {
  const change = typeof opts.change === "string" ? { label: opts.change } : opts.change;
  const changeW = Math.max(boxWidth(change.label, 120), change.sub ? Math.ceil(change.sub.length * 6) + 20 : 0);
  // The 11 px sub line measures about 5.9 px per character; size the column for the longer of label and sub.
  const checkW = Math.max(
    ...opts.checks.map((c) => Math.max(boxWidth(c.label, 150), c.sub ? Math.ceil(c.sub.length * 6) + 20 : 0))
  );
  const resultLabel = opts.resultLabel ?? (opts.result === "promote" ? "Promote" : "Block");
  const resultW = boxWidth(resultLabel, GATE.resultW);
  const height = opts.checks.length * GATE.h + (opts.checks.length - 1) * GATE.rowGap;
  const changeH = change.label.includes("\n") || change.sub ? Math.max(GATE.h, 50) : GATE.h;
  return {
    change,
    changeW,
    changeH,
    checkW,
    resultLabel,
    resultW,
    height: Math.max(height, changeH),
    width: changeW + GATE.colGap + checkW + GATE.colGap + resultW,
  };
}

/** Width and height of a gate with the same options. */
export const gateSize = (opts: GateOpts) => {
  const g = gateGeom(opts);
  return { width: g.width, height: g.height };
};

/**
 * A change on the left, its checks in a column in the middle (lime when they pass, red when they fail) and the
 * outcome on the right (Promote green, Block red), top-left at (x, y), with an arrow from the change to every check
 * and from every check to the outcome. Used for regression tests, canaries, registries and retraining. Ids
 * `<id>-change`, `<id>-check-<i>`, `<id>-result`, `<id>-in-<i>`, `<id>-out-<i>`.
 */
export function gate(idPrefix: string, x: number, y: number, opts: GateOpts): LayoutShape[] {
  const p = idPrefix;
  const g = gateGeom(opts);
  const step = opts.step;
  const midY = y + g.height / 2;
  const checksTop = y + (g.height - (opts.checks.length * GATE.h + (opts.checks.length - 1) * GATE.rowGap)) / 2;
  const checkX = x + g.changeW + GATE.colGap;
  const resultX = checkX + g.checkW + GATE.colGap;
  const out: LayoutShape[] = [
    {
      id: `${p}-change`,
      type: "box",
      x,
      y: r1(midY - g.changeH / 2),
      w: g.changeW,
      h: g.changeH,
      label: g.change.label,
      sub: g.change.sub,
      tone: g.change.tone ?? PROD_TONE.infra,
      fill: "pastel",
      step,
    },
    {
      id: `${p}-result`,
      type: "box",
      x: resultX,
      y: r1(midY - GATE.h / 2),
      w: g.resultW,
      h: GATE.h,
      label: g.resultLabel,
      sub: opts.resultSub,
      tone: opts.result === "promote" ? PROD_TONE.model : PROD_TONE.failure,
      fill: "pastel",
      step,
    },
  ];
  opts.checks.forEach((c, i) => {
    out.push(
      {
        id: `${p}-check-${i}`,
        type: "box",
        x: checkX,
        y: r1(checksTop + i * (GATE.h + GATE.rowGap)),
        w: g.checkW,
        h: GATE.h,
        label: c.label,
        sub: c.sub ?? (c.pass ? "pass" : "fail"),
        tone: c.pass ? PROD_TONE.check : PROD_TONE.failure,
        fill: "pastel",
        step,
      },
      { id: `${p}-in-${i}`, type: "arrow", x: 0, y: 0, from: `${p}-change`, to: `${p}-check-${i}`, step },
      { id: `${p}-out-${i}`, type: "arrow", x: 0, y: 0, from: `${p}-check-${i}`, to: `${p}-result`, step }
    );
  });
  return out;
}

// 6. The confusion grid ──────────────────────────────────────────────────────────────────────────────────────────────
//
// Convention for every helper: counts[r][c], rows are the truth (the reference label or the human), columns are the
// prediction (the model or the judge). `positive` is the index of the positive class (default 0).

const total = (counts: number[][]) => counts.flat().reduce((a, v) => a + v, 0);
const colSum = (counts: number[][], c: number) => counts.reduce((a, row) => a + row[c], 0);
const rowSum = (counts: number[][], r: number) => counts[r].reduce((a, v) => a + v, 0);

/** Precision: of everything predicted positive, the share that is positive. TP ÷ (TP + FP). */
export const precision = (counts: number[][], positive = 0) => counts[positive][positive] / colSum(counts, positive);

/** Recall: of everything truly positive, the share predicted positive. TP ÷ (TP + FN). */
export const recall = (counts: number[][], positive = 0) => counts[positive][positive] / rowSum(counts, positive);

/** Accuracy: the share on the diagonal. */
export const accuracy = (counts: number[][]) => counts.reduce((a, row, i) => a + row[i], 0) / total(counts);

/** False-positive rate: of everything truly negative, the share predicted positive. FP ÷ (FP + TN). */
export const falsePositiveRate = (counts: number[][], positive = 0) => {
  let fp = 0;
  let negatives = 0;
  counts.forEach((row, r) => {
    if (r === positive) return;
    fp += row[positive];
    negatives += rowSum(counts, r);
  });
  return fp / negatives;
};

/**
 * Cohen's kappa: agreement beyond chance between the rows' rater and the columns' rater.
 * κ = (pₒ − pₑ) ÷ (1 − pₑ), pₒ = the diagonal share, pₑ = Σₖ (row total ₖ × column total ₖ) ÷ N².
 */
export function cohensKappa(counts: number[][]) {
  const N = total(counts);
  const po = accuracy(counts);
  const pe = counts.reduce((a, _, k) => a + rowSum(counts, k) * colSum(counts, k), 0) / (N * N);
  return (po - pe) / (1 - pe);
}

export interface ConfusionGridOpts extends StepOpts {
  /** Truth classes (rows) and predicted classes (columns). */
  rowLabels: string[];
  colLabels: string[];
  counts: number[][];
  title?: string;
  /** Who labelled the rows ("Human ↓"), written in the corner, and the columns ("Judge"), written above them. */
  rowTitle?: string;
  colTitle?: string;
  /** Computed by the caller with the helpers above; a number prints with two decimals. */
  metrics: { label: string; value: number | string }[];
  cellW?: number;
  cellH?: number;
  /** Cells to ring, as [row, column]. */
  highlight?: [number, number][];
}

function confusionGeom(opts: ConfusionGridOpts) {
  const cellW = opts.cellW ?? 72;
  const cellH = opts.cellH ?? 40;
  const titleH = opts.title ? 24 : 0;
  const colTitleH = opts.colTitle ? 20 : 0;
  const rowLabelW = Math.max(...opts.rowLabels.map(textWidth), opts.rowTitle ? textWidth(opts.rowTitle) : 0);
  const gridX = rowLabelW + 8;
  const gridY = titleH + colTitleH + 22;
  const cols = opts.colLabels.length;
  const rows = opts.rowLabels.length;
  const metricText = opts.metrics.map(
    (m) => `${m.label} = ${typeof m.value === "number" ? m.value.toFixed(2) : m.value}`
  );
  const metricW = metricText.length ? Math.max(...metricText.map((t) => boxWidth(t, 120))) : 0;
  const metricX = gridX + cols * cellW + (metricText.length ? 28 : 0);
  const metricH = 30;
  const metricsBottom = gridY + metricText.length * (metricH + 8) - 8;
  return {
    cellW,
    cellH,
    titleH,
    colTitleH,
    gridX,
    gridY,
    cols,
    rows,
    metricText,
    metricW,
    metricX,
    metricH,
    width: metricX + metricW,
    height: Math.max(gridY + rows * cellH, metricsBottom),
  };
}

/** Width and height of a confusion grid with the same options. */
export const confusionGridSize = (opts: ConfusionGridOpts) => {
  const g = confusionGeom(opts);
  return { width: g.width, height: g.height };
};

/**
 * A small table of counts with its metrics beside it, top-left at (x, y): rows are the truth, columns the prediction
 * (see the helpers above). Agreement cells (the diagonal) are lime, disagreements a soft red; row labels sit on the
 * left, column labels above, an optional title on top. The metrics column on the right prints what the caller computed
 * ("Cohen's κ = 0.70"). Ids `<id>-<r>-<c>`, `<id>-row-<r>`, `<id>-col-<c>`, `<id>-metric-<i>`, `<id>-title`,
 * `<id>-row-title`, `<id>-col-title`.
 */
export function confusionGrid(idPrefix: string, x: number, y: number, opts: ConfusionGridOpts): LayoutShape[] {
  const p = idPrefix;
  const g = confusionGeom(opts);
  const step = opts.step;
  const gx = x + g.gridX;
  const gy = y + g.gridY;
  const ring = new Set((opts.highlight ?? []).map(([r, c]) => `${r}-${c}`));
  const out: LayoutShape[] = [];
  if (opts.title) out.push(annotation(`${p}-title`, x, y, opts.title, { tone: PROD_TONE.infra, step }));
  if (opts.colTitle) {
    out.push(
      annotation(`${p}-col-title`, gx + (g.cols * g.cellW) / 2, y + g.titleH, opts.colTitle, { align: "centre", step })
    );
  }
  if (opts.rowTitle) {
    out.push(annotation(`${p}-row-title`, gx - 8, gy - 22, opts.rowTitle, { align: "right", step }));
  }
  opts.colLabels.forEach((label, c) =>
    out.push(annotation(`${p}-col-${c}`, gx + c * g.cellW + g.cellW / 2, gy - 22, label, { align: "centre", step }))
  );
  opts.rowLabels.forEach((label, r) => {
    out.push(
      annotation(`${p}-row-${r}`, gx - 8, gy + r * g.cellH + (g.cellH - TEXT_H) / 2, label, { align: "right", step })
    );
    opts.counts[r].forEach((count, c) =>
      out.push({
        id: `${p}-${r}-${c}`,
        type: "cell",
        x: gx + c * g.cellW,
        y: gy + r * g.cellH,
        w: g.cellW,
        h: g.cellH,
        label: n(count),
        tone: r === c ? PROD_TONE.check : PROD_TONE.failure,
        fill: r === c ? "pastel" : "soft",
        highlight: ring.has(`${r}-${c}`) || undefined,
        step,
        quiet: true,
      })
    );
  });
  g.metricText.forEach((label, i) =>
    out.push({
      id: `${p}-metric-${i}`,
      type: "cell",
      x: x + g.metricX,
      y: gy + i * (g.metricH + 8),
      w: g.metricW,
      h: g.metricH,
      label,
      tone: PROD_TONE.check,
      fill: "soft",
      step,
    })
  );
  return out;
}

// 7. The curve ───────────────────────────────────────────────────────────────────────────────────────────────────────

/** One line on a curve, in data space. */
export interface CurveSeries {
  points: [number, number][];
  tone: LayoutTone;
  /** Written in the series' tone just above its last point (omit or "" for none). */
  label?: string;
  smooth?: boolean;
  dashed?: boolean;
}

/** Where a mark's label sits relative to its point. */
export type MarkPlace =
  "above" | "below" | "left" | "right" | "above-left" | "above-right" | "below-left" | "below-right";

/** A marked point in data space: a small circle with a label beside it (`place`, default above). */
export interface CurveMark {
  x: number;
  y: number;
  label?: string;
  tone?: LayoutTone;
  place?: MarkPlace;
  /** Extra [dx, dy] in px on the label, to clear a line that would cross it. */
  nudge?: [number, number];
}

export interface CurveOpts extends StepOpts {
  /** Whole size, axes and labels included. */
  width: number;
  height: number;
  xDomain: [number, number];
  yDomain: [number, number];
  series: CurveSeries[];
  marks?: CurveMark[];
  xLabel: string;
  yLabel: string;
  /** Print "shape only" in the top-right corner: the curve is not computed or cited. */
  shapeOnly?: boolean;
  /** Tick values (default nice steps, about five per axis) and their formats (default "1,200"). */
  xTicks?: number[];
  yTicks?: number[];
  formatX?: (v: number) => string;
  formatY?: (v: number) => string;
}

/**
 * A small plot, top-left at (x, y), `width` × `height` overall: an L of axes with a few ticks, each series as a `path`
 * in its tone (straight or `smooth`), marked points as small circles with labels, the y label above the y axis and the
 * x label under the x axis. Points are in data space and mapped inside. With `shapeOnly`, "shape only" is printed in
 * the top-right corner (plan §5: draw only computed or cited points, otherwise say so). Ids `<id>-axes`,
 * `<id>-xt-<i>`, `<id>-yt-<i>` (+ `-label`), `<id>-s<i>` (+ `-label`), `<id>-m<i>` (+ `-label`), `<id>-x-label`,
 * `<id>-y-label`, `<id>-shape-only`.
 */
export function curve(idPrefix: string, x: number, y: number, opts: CurveOpts): LayoutShape[] {
  const p = idPrefix;
  const step = opts.step;
  const fx = opts.formatX ?? ((v: number) => n(v));
  const fy = opts.formatY ?? ((v: number) => n(v));
  const [x0, x1] = opts.xDomain;
  const [y0, y1] = opts.yDomain;
  const xTicks = opts.xTicks ?? ticks(x0, x1);
  const yTicks = opts.yTicks ?? ticks(y0, y1);
  const padL = Math.max(36, ...yTicks.map((v) => textWidth(fy(v)) + 8));
  const left = x + padL;
  const right = x + opts.width - 12;
  const topY = y + 26;
  const bottomY = y + opts.height - 42;
  const toX = (v: number) => r1(left + ((v - x0) / (x1 - x0)) * (right - left));
  const toY = (v: number) => r1(bottomY - ((v - y0) / (y1 - y0)) * (bottomY - topY));
  /** Keep a text box of width w inside the builder. */
  const clampX = (lx: number, w: number) => Math.min(Math.max(lx, x), x + opts.width - w);
  const out: LayoutShape[] = [
    line(
      `${p}-axes`,
      [
        [left, topY - 6],
        [left, bottomY],
        [right, bottomY],
      ],
      { step }
    ),
  ];
  xTicks.forEach((v, i) => {
    const tx = toX(v);
    out.push(
      line(
        `${p}-xt-${i}`,
        [
          [tx, bottomY],
          [tx, bottomY + 4],
        ],
        { step }
      ),
      annotation(`${p}-xt-${i}-label`, tx, bottomY + 5, fx(v), { align: "centre", step })
    );
  });
  yTicks.forEach((v, i) => {
    const ty = toY(v);
    out.push(
      line(
        `${p}-yt-${i}`,
        [
          [left - 4, ty],
          [left, ty],
        ],
        { step }
      ),
      annotation(`${p}-yt-${i}-label`, left - 6, ty - TEXT_H / 2, fy(v), { align: "right", step })
    );
  });
  out.push(
    annotation(`${p}-y-label`, x, y, opts.yLabel, { step }),
    annotation(`${p}-x-label`, (left + right) / 2, bottomY + 22, opts.xLabel, { align: "centre", step })
  );
  opts.series.forEach((s, i) => {
    const pts = s.points.map(([a, b]) => [toX(a), toY(b)] as Point);
    out.push(
      line(`${p}-s${i}`, pts, { tone: s.tone, smooth: s.smooth || undefined, dashed: s.dashed || undefined, step })
    );
    if (s.label) {
      const [lx, ly] = pts[pts.length - 1];
      const w = textWidth(s.label);
      out.push({
        ...annotation(`${p}-s${i}-label`, clampX(lx - w, w), Math.max(y, ly - TEXT_H - 4), s.label, {
          tone: s.tone,
          step,
        }),
      });
    }
  });
  (opts.marks ?? []).forEach((m, i) => {
    const mx = toX(m.x);
    const my = toY(m.y);
    const tone = m.tone ?? PROD_TONE.infra;
    out.push({ id: `${p}-m${i}`, type: "circle", x: mx, y: my, w: 8, tone, fill: "pastel", step });
    if (m.label) {
      const w = textWidth(m.label);
      const place = m.place ?? "above";
      const [dx, dy] = m.nudge ?? [0, 0];
      const lx = (place.endsWith("left") ? mx - w - 6 : place.endsWith("right") ? mx + 6 : mx - w / 2) + dx;
      const ly =
        (place.startsWith("above") ? my - TEXT_H - 5 : place.startsWith("below") ? my + 6 : my - TEXT_H / 2) + dy;
      out.push(
        annotation(`${p}-m${i}-label`, clampX(lx, w), Math.min(Math.max(y, ly), y + opts.height - TEXT_H), m.label, {
          tone,
          step,
        })
      );
    }
  });
  if (opts.shapeOnly) {
    out.push(annotation(`${p}-shape-only`, right, y, "shape only", { align: "right", tone: PROD_TONE.infra, step }));
  }
  return out;
}
