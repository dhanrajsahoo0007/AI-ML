import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { LATENCY, PROD_TONE, TOKENS, n } from "@/components/diagrams/presets/production";
import { TPS } from "@/components/diagrams/presets/production-observe";

// The two latency numbers a user feels (latency-token-monitoring, Core concepts). No steps.
//   Time to first token (TTFT) 400 ms: the blank screen. Queue wait + prefill of the 2,200-token prompt. Teal, as the
//   prefill phase is on the streaming page.
//   Tokens per second (TPS) 227: how fast the text flows. 1,000 ms ÷ 4.4 ms per token = 227. Green (decode, the model).
//   End to end = 400 + (250 - 1) × 4.4 = 400 + 1,095.6 = 1,495.6 ≈ 1,500 ms (the shared target).
//   Under each number, three things that move it. A last box separates per-reader TPS from engine throughput.
// Layout (880 x 330): two columns, x 20 and 460 (w 400); tiles at y 16 (h 70); three cause boxes at y 130 (w 126, h 50,
// gap 11); formula line at y 212; the warning box at y 246 (x 20, w 840, h 60).
// Colours (PROD_TONE): TTFT tile and its causes teal, TPS tile and its causes green; the warning box neutral.

const tile = (id: string, x: number, label: string, sub: string, tone: LayoutShape["tone"]): LayoutShape => ({
  id,
  type: "box",
  x,
  y: 16,
  w: 400,
  h: 70,
  label,
  sub,
  tone,
  fill: "pastel",
});
const cause = (
  id: string,
  col: number,
  i: number,
  label: string,
  sub: string,
  tone: LayoutShape["tone"]
): LayoutShape => ({
  id,
  type: "box",
  x: (col === 0 ? 20 : 460) + i * 137,
  y: 130,
  w: 126,
  h: 50,
  label,
  sub,
  tone,
  fill: "pastel",
});
const link = (from: string, to: string): LayoutShape => ({
  id: `a-${to}`,
  type: "arrow",
  x: 0,
  y: 0,
  from,
  to,
  tone: PROD_TONE.infra,
});

const formula = `End to end = TTFT + (${TOKENS.outputPerRequest} − 1) × ${LATENCY.decodeMsPerToken} ms = ${LATENCY.firstTokenMs} + 1,095.6 ≈ ${n(LATENCY.fullAnswerMs)} ms`;

const shapes: LayoutShape[] = [
  tile(
    "ttft",
    20,
    "Time to first token (TTFT)",
    `${LATENCY.firstTokenMs} ms: how long the screen stays blank`,
    PROD_TONE.compute
  ),
  tile(
    "tps",
    460,
    "Tokens per second (TPS)",
    `${TPS} tokens/s: 1,000 ms ÷ ${LATENCY.decodeMsPerToken} ms per token`,
    PROD_TONE.model
  ),
  cause("c-queue", 0, 0, "Queue wait", "no free slot yet", PROD_TONE.compute),
  cause("c-prompt", 0, 1, "Prompt length", `${n(TOKENS.inputPerRequest)} tokens to read`, PROD_TONE.compute),
  cause("c-cache", 0, 2, "Cache hits", "skip part of prefill", PROD_TONE.compute),
  cause("c-batch", 1, 0, "Batch size", "readers per step", PROD_TONE.model),
  cause("c-model", 1, 1, "Model size", "more weights", PROD_TONE.model),
  cause("c-bw", 1, 2, "Memory speed", "reads the weights", PROD_TONE.model),
  link("ttft", "c-queue"),
  link("ttft", "c-prompt"),
  link("ttft", "c-cache"),
  link("tps", "c-batch"),
  link("tps", "c-model"),
  link("tps", "c-bw"),
  {
    id: "formula",
    type: "text",
    x: 20,
    y: 210,
    w: 840,
    h: 18,
    label: formula,
    tone: PROD_TONE.infra,
  },
  {
    id: "warn",
    type: "box",
    x: 20,
    y: 244,
    w: 840,
    h: 60,
    label: "Do not confuse TPS with engine throughput",
    sub: "Throughput adds up every request on a GPU; TPS is one reader's speed. Bigger batches raise one and lower the other.",
    tone: PROD_TONE.infra,
    fill: "pastel",
  },
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "The two numbers users feel: time to first token and tokens per second",
  width: 880,
  height: 322,
  shapes,
};

export default spec;
