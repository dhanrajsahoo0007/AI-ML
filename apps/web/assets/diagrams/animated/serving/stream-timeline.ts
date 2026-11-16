import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import {
  LATENCY,
  PROD_TONE,
  TOKENS,
  n,
  waterfall,
  waterfallSize,
  type WaterfallSpan,
} from "@/components/diagrams/presets/production";
import { HOLD_BACK, TPOT_MS } from "@/components/diagrams/presets/production-stream";

// One Brightpost answer, streamed and not streamed (streaming-and-time-to-first-token, Core concepts). No steps: the
// rows are read together.
//
// Top waterfall, "Inside the engine": queue + prefill 0–400 ms (teal, compute) reads the 2,200-token prompt; decode
// 400–1,500 ms (green, the model) writes 250 tokens. A lime dashed line marks the first token at 400 ms (TTFT is a
// metric, a check) and runs down through the bottom waterfall too.
// Bottom waterfall, "How long the customer's screen stays blank": orange bars (the customer) are the blank time.
//   Not streamed: 1,500 ms, then the whole answer at once.
//   Streamed: 400 ms, then text as it is generated.
//   Streamed through a 30-token guardrail window: 400 + 30 × 4.4 = 532 ms (HOLD_BACK, illustrative window).
// Footer: TPOT = (1,500 − 400) ÷ (250 − 1) = 4.4 ms (vLLM's definition).
//
// Both waterfalls share one scale (msPerPx from all five spans at a target width of 820) and one label column, so the
// 400 ms line is straight. Canvas 860 × 330. Tones: teal, green, orange, lime, plus neutral.

const X = 20;
const LABEL_W = 170;
const engine: WaterfallSpan[] = [
  {
    id: "prefill",
    label: "Queue + prefill",
    startMs: 0,
    durationMs: LATENCY.firstTokenMs,
    tone: PROD_TONE.compute,
    note: `${n(TOKENS.inputPerRequest)} tokens in`,
  },
  {
    id: "decode",
    label: "Decode",
    startMs: LATENCY.firstTokenMs,
    durationMs: LATENCY.fullAnswerMs - LATENCY.firstTokenMs,
    tone: PROD_TONE.model,
    note: `${TOKENS.outputPerRequest} tokens out`,
  },
];
const screen: WaterfallSpan[] = [
  {
    id: "plain",
    label: "Not streamed",
    startMs: 0,
    durationMs: LATENCY.fullAnswerMs,
    tone: PROD_TONE.traffic,
    note: "then all at once",
  },
  {
    id: "streamed",
    label: "Streamed",
    startMs: 0,
    durationMs: LATENCY.firstTokenMs,
    tone: PROD_TONE.traffic,
    highlight: true,
    note: `then a token every ${TPOT_MS} ms`,
  },
  {
    id: "held",
    label: `Streamed, ${HOLD_BACK.tokens}-token check`,
    startMs: 0,
    durationMs: HOLD_BACK.firstTextMs,
    tone: PROD_TONE.traffic,
    note: `then text ${HOLD_BACK.tokens} tokens behind`,
  },
];

const scale = waterfallSize([...engine, ...screen], { width: 820, labelW: LABEL_W });
const common = { msPerPx: scale.msPerPx, labelW: LABEL_W };
const TOP_Y = 32;
const top = waterfallSize(engine, common);
const BOTTOM_HEAD_Y = TOP_Y + top.height + 16;
const BOTTOM_Y = BOTTOM_HEAD_Y + 24;
const bottom = waterfallSize(screen, { ...common, total: false });
const FOOT_Y = BOTTOM_Y + bottom.height + 12;
const firstX = Math.round((X + scale.axisX + LATENCY.firstTokenMs / scale.msPerPx) * 10) / 10;

const head = (id: string, y: number, label: string): LayoutShape => ({
  id,
  type: "text",
  x: X,
  y,
  w: Math.ceil(label.length * 6.5) + 6,
  h: 18,
  label,
  tone: PROD_TONE.infra,
});

const footer = `Time per output token = (${n(LATENCY.fullAnswerMs)} − ${LATENCY.firstTokenMs}) ÷ (${TOKENS.outputPerRequest} − 1) = ${TPOT_MS} ms`;

const shapes: LayoutShape[] = [
  head("engine-head", 6, "Inside the engine"),
  ...waterfall("eng", X, TOP_Y, engine, {
    ...common,
    total: { label: `answer complete ${n(LATENCY.fullAnswerMs)} ms` },
    marks: [{ ms: LATENCY.firstTokenMs, label: `first token ${LATENCY.firstTokenMs} ms`, tone: PROD_TONE.check }],
  }),
  head("screen-head", BOTTOM_HEAD_Y, "How long the customer's screen stays blank"),
  ...waterfall("scr", X, BOTTOM_Y, screen, { ...common, total: false }),
  // The first-token line carried down through the screen rows.
  {
    id: "first-down",
    type: "path",
    x: 0,
    y: 0,
    points: [
      [firstX, BOTTOM_Y],
      [firstX, BOTTOM_Y + 4 + screen.length * 30],
    ],
    dashed: true,
    tone: PROD_TONE.check,
  },
  {
    id: "tpot",
    type: "text",
    x: X,
    y: FOOT_Y,
    w: Math.ceil(footer.length * 6.5) + 6,
    h: 18,
    label: footer,
    tone: PROD_TONE.infra,
  },
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "One answer, streamed and not streamed: time to first token and time per output token",
  width: 860,
  height: FOOT_Y + 26,
  shapes,
};

export default spec;
