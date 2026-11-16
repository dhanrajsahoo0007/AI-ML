import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { LATENCY, PROD_TONE, TOKENS, n, waterfall, waterfallSize } from "@/components/diagrams/presets/production";
import type { WaterfallSpan } from "@/components/diagrams/presets/production";
import { BUDGET } from "@/components/diagrams/presets/production-serving";

// The latency budget of one Brightpost answer, from the moment the request reaches a replica (llm-serving-inference,
// Deep dive "Latency budget"). A `waterfall` of three spans on one millisecond axis:
//   queue wait 0–80 ms · prefill of the 2,200-token prompt 80–400 ms → first token at 400 ms ·
//   decode of 250 tokens at 4.4 ms each 400–1,500 ms → full answer at 1,500 ms.
// Working (BUDGET in presets/production-serving.ts): prefill = 400 − 80 = 320 ms; decode = 250 × 4.4 = 1,100 ms;
// 400 + 1,100 = 1,500 ms; decode rate 1,000 ÷ 4.4 = 227 tokens/s. The 400 ms and 1,500 ms targets are LATENCY
// (presets/rag.ts LATENCY_MS); the 80 ms queue wait is an illustrative budget, not a measurement.
//
// Steps: 1 queue wait + prefill = time to first token (the first-token mark appears) · 2 decode adds 250 tokens at
// the decode rate (the decode row and the "full answer" line appear).
//
// Fact check: prefill processes the whole prompt in one pass and produces the first output token; each later token
// needs one decode iteration (Kwon et al., 2023, arXiv 2309.06180, §2.2; Zhong et al., OSDI 2024, DistServe, §2,
// which names the two targets time to first token and time per output token).
//
// Grid: the waterfall from (10, 0), fitted to 760 wide by waterfallSize; two annotation lines under its tick labels.
// Colours (PROD_TONE): queue neutral (control), prefill teal (GPU compute), decode green (the model's answer
// tokens), the first-token mark green. Two tones plus neutral.

const X = 10;
const WIDTH = 760;

const spans: WaterfallSpan[] = [
  { id: "queue", label: "Queue wait", startMs: 0, durationMs: BUDGET.queueMs, tone: PROD_TONE.infra, step: 1 },
  {
    id: "prefill",
    label: `Prefill: ${n(TOKENS.inputPerRequest)} tokens in`,
    startMs: BUDGET.queueMs,
    durationMs: BUDGET.prefillMs,
    tone: PROD_TONE.compute,
    step: 1,
  },
  {
    id: "decode",
    label: `Decode: ${TOKENS.outputPerRequest} tokens out`,
    startMs: BUDGET.firstTokenMs,
    durationMs: BUDGET.decodeMs,
    tone: PROD_TONE.model,
    step: 2,
  },
];

const opts = {
  width: WIDTH,
  tickMs: 250,
  total: { ms: BUDGET.fullAnswerMs, label: `full answer ${n(BUDGET.fullAnswerMs)} ms` },
  marks: [{ ms: BUDGET.firstTokenMs, label: `first token ${n(BUDGET.firstTokenMs)} ms`, tone: PROD_TONE.model }],
};
const size = waterfallSize(spans, opts);

// The total line and its label belong to step 2, with the decode row; the builder gives them its own step. Only the
// bars announce themselves in the stepper: row labels, ticks, the axis and the marker lines are quiet.
const BARS = new Set(spans.map((s) => `wf-${s.id}`));
const shapes = waterfall("wf", X, 0, spans, opts).map((s) => ({
  ...s,
  step: s.id === "wf-total" || s.id === "wf-total-label" ? 2 : s.step,
  quiet: BARS.has(s.id) ? undefined : true,
}));

const note = (id: string, y: number, label: string, step: number): LayoutShape => ({
  id,
  type: "text",
  x: X + size.axisX,
  y,
  w: Math.ceil(label.length * 6.5) + 6,
  h: 18,
  label,
  tone: PROD_TONE.infra,
  step,
});

const NOTE_Y = size.height + 14;

const spec: LayoutSpec = {
  kind: "layout",
  title: "One answer's latency budget: time to first token, then the decode rate",
  width: 780,
  height: NOTE_Y + 2 * 24 + 4,
  steps: [{ title: "Queue wait + prefill = time to first token" }, { title: "Decode adds one token every 4.4 ms" }],
  shapes: [
    ...shapes,
    note(
      "ttft-sum",
      NOTE_Y,
      `time to first token = ${BUDGET.queueMs} ms queue + ${BUDGET.prefillMs} ms prefill = ${BUDGET.firstTokenMs} ms`,
      1
    ),
    note(
      "decode-sum",
      NOTE_Y + 24,
      `full answer = ${BUDGET.firstTokenMs} + ${TOKENS.outputPerRequest} × ${LATENCY.decodeMsPerToken} ms = ${n(
        BUDGET.fullAnswerMs
      )} ms (${BUDGET.decodeTokensPerSec} tokens/s; budget, illustrative)`,
      2
    ),
  ],
};

export default spec;
