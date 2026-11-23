import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import {
  LATENCY,
  PROD_TONE,
  TOKENS,
  n,
  waterfall,
  waterfallSize,
  type WaterfallOpts,
  type WaterfallSpan,
} from "@/components/diagrams/presets/production";
import { TRACE } from "@/components/diagrams/presets/production-observe";

// One Brightpost request as a trace: a root span and five child spans on a shared millisecond axis (tracing-logging,
// Architecture; reused by llmops-observability). No steps: the rows are read together.
//   gateway 0-15 ms (limits and routing), cache lookup 15-35 (a miss), retrieval 35-135 (embed the question, search,
//   5 chunks), model call 135-1,635 (the shared 1,500 ms answer: 2,200 tokens in, 250 out), guardrail 1,635-1,695.
//   Total = 15 + 20 + 100 + 1,500 + 60 = 1,695 ms. The model call is 1,500 / 1,695 = 88.5 % of the request.
//   The customer's first token: 135 + 400 = 535 ms (a lime dashed line, as on the streaming page).
// Only the model call comes from the shared constants (presets/production.ts LATENCY); the other timings are
// illustrative (presets/production-observe.ts TRACE).
// Layout: one waterfall at (20, 8), 860 wide, 30 px rows, label column 170. Canvas 880 x 290.
// Colours (PROD_TONE): root, gateway neutral (infra), cache violet (store), retrieval blue (data), model call green,
// guardrail lime (check). The model call is the one highlight. Four tones plus neutral.

const X = 20;
const T = TRACE;
const spans: WaterfallSpan[] = [
  {
    id: "root",
    label: "brightpost.request",
    startMs: 0,
    durationMs: T.totalMs,
    tone: PROD_TONE.infra,
    note: "root span",
  },
  {
    id: "gw",
    label: "└ gateway",
    startMs: T.gateway.startMs,
    durationMs: T.gateway.durationMs,
    tone: PROD_TONE.infra,
    note: "key, limits, route",
  },
  {
    id: "cache",
    label: "└ cache lookup",
    startMs: T.cache.startMs,
    durationMs: T.cache.durationMs,
    tone: PROD_TONE.store,
    note: "miss",
  },
  {
    id: "ret",
    label: "└ retrieval",
    startMs: T.retrieval.startMs,
    durationMs: T.retrieval.durationMs,
    tone: PROD_TONE.data,
    note: "5 chunks",
  },
  {
    id: "model",
    label: "└ model call",
    startMs: T.model.startMs,
    durationMs: T.model.durationMs,
    tone: PROD_TONE.model,
    highlight: true,
  },
  {
    id: "guard",
    label: "└ guardrail",
    startMs: T.guardrail.startMs,
    durationMs: T.guardrail.durationMs,
    tone: PROD_TONE.check,
    note: "pass",
  },
];

const opts: WaterfallOpts = {
  width: 860,
  labelW: 150,
  tickMs: 250,
  total: { label: `total ${n(T.totalMs)} ms` },
  marks: [{ ms: T.firstTokenMs, label: `first token ${T.firstTokenMs} ms`, tone: PROD_TONE.check }],
};
const size = waterfallSize(spans, opts);

const foot = `Model call: ${n(TOKENS.inputPerRequest)} tokens in, ${TOKENS.outputPerRequest} out, ${n(LATENCY.fullAnswerMs)} of ${n(T.totalMs)} ms (${Math.round(T.modelShare * 1000) / 10} %). Other timings are illustrative.`;

const shapes: LayoutShape[] = [
  ...waterfall("tr", X, 8, spans, opts),
  {
    id: "foot",
    type: "text",
    x: X,
    y: 8 + size.height + 10,
    w: Math.ceil(foot.length * 6.5) + 6,
    h: 18,
    label: foot,
    tone: PROD_TONE.infra,
  },
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "One Brightpost request as a trace: a root span and five child spans",
  width: 880,
  height: 8 + size.height + 40,
  shapes,
};

export default spec;
