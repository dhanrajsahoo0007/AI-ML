import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { GENAI_TONE } from "@/components/diagrams/presets/genai-case";
import { LATENCY_MS as L, OUTPUT } from "@/components/diagrams/presets/gcase-support";
import { PROD_TONE, n, waterfall, waterfallSize, type WaterfallSpan } from "@/components/diagrams/presets/production";

// The support agent's latency budget (design sheet §12): two turns on one millisecond scale, from the moment the
// customer's message reaches the gateway to the checked reply being sent. Every value is LATENCY_MS in
// presets/gcase-support.ts (illustrative: decode at 80 tokens a second, 12.5 ms a token; first token 400 ms is
// Brightpost's target).
//   Question turn: gateway 30 + router 250 (retrieval 60 + 150 = 210 runs beside it) + assemble 20 + first token 400
//                  + 120-token reply 1,500 + supervisor 300 = 2,500 ms (N3 target 2,500 ms p50).
//   Action turn (the cracked kettle, two tools): 300 to assemble the context, then a 30-token tool call
//                  400 + 30 × 12.5 = 775, get_order 200, a second tool call 775, bad-actor gate (already done) + policy
//                  service 200, first token 400, reply 1,500, supervisor 300: 300 + 775 + 200 + 775 + 200 + 400 + 1,500
//                  + 300 = 4,450 ms (N3 target 4,500 ms p50).
//   "Checking your order…" is shown when the first tool call starts: 1,075 ms.
// Two steps: 1 the question turn, 2 the action turn on the same scale.
// Layout (880 wide): waterfall() from presets/production.ts twice, one shared msPerPx fitted to the longer turn, a
// 168 px label column, rows 26 px. A heading over each, the working underneath.
// Colours (GENAI_TONE): gateway and assembly neutral, router and retrieval lime (ranking), model green, the order tool
// teal, the policy service and the supervisor lime (checks).

const X = 12;
const LABEL_W = 168;

const span = (
  id: string,
  label: string,
  startMs: number,
  durationMs: number,
  tone: LayoutTone,
  step: number,
  note?: string
): WaterfallSpan => ({ id, label, startMs, durationMs, tone, step, note });

/** The question turn, as start times. */
const qRouter = L.gateway;
const qAssemble = L.gateway + L.router;
const qFirst = L.preModel;
const qReply = qFirst + L.firstToken;
const qSuper = qReply + L.reply;
const question: WaterfallSpan[] = [
  span("gw", "Gateway, load case", 0, L.gateway, PROD_TONE.infra, 1),
  span("router", "Intent router", qRouter, L.router, GENAI_TONE.rank, 1),
  span("search", "Search + rerank", qRouter, L.search + L.rerank, GENAI_TONE.rank, 1, "in parallel"),
  span("assemble", "Assemble context", qAssemble, L.assemble, PROD_TONE.infra, 1),
  span("first", "Model: first token", qFirst, L.firstToken, GENAI_TONE.model, 1),
  span("reply", `Model: ${OUTPUT.reply}-token reply`, qReply, L.reply, GENAI_TONE.model, 1),
  span("super", "Supervisor check", qSuper, L.supervisor, GENAI_TONE.check, 1),
];

/** The action turn (the kettle), as start times. */
const aCall1 = L.preModel;
const aOrder = aCall1 + L.toolCall;
const aCall2 = aOrder + L.orderApi;
const aPolicy = aCall2 + L.toolCall;
const aFirst = aPolicy + L.policy;
const aReply = aFirst + L.firstToken;
const aSuper = aReply + L.reply;
const action: WaterfallSpan[] = [
  span("gw", "Gateway, load case", 0, L.gateway, PROD_TONE.infra, 2),
  span("router", "Router + article", L.gateway, L.router, GENAI_TONE.rank, 2),
  span("assemble", "Assemble context", L.gateway + L.router, L.assemble, PROD_TONE.infra, 2),
  span("call1", "Model: tool call", aCall1, L.toolCall, GENAI_TONE.model, 2, "get_order"),
  span("order", "get_order", aOrder, L.orderApi, GENAI_TONE.tool, 2),
  span("call2", "Model: tool call", aCall2, L.toolCall, GENAI_TONE.model, 2, "request_refund"),
  span("policy", "Gate + policy", aPolicy, L.policy, GENAI_TONE.check, 2),
  span("first", "Model: first token", aFirst, L.firstToken, GENAI_TONE.model, 2),
  span("reply", `Model: ${OUTPUT.reply}-token reply`, aReply, L.reply, GENAI_TONE.model, 2),
  span("super", "Supervisor check", aSuper, L.supervisor, GENAI_TONE.check, 2),
];

const QUESTION_TARGET = 2_500;
const ACTION_TARGET = 4_500;

const scale = waterfallSize([...question, ...action], {
  width: 856,
  labelW: LABEL_W,
  total: { ms: ACTION_TARGET },
});
const common = { msPerPx: scale.msPerPx, labelW: LABEL_W, tickMs: 500, rowH: 26, barH: 18 };

const head = (id: string, y: number, label: string, step: number, full = false): LayoutShape => ({
  id,
  type: "text",
  x: X,
  y,
  w: full ? 856 : Math.ceil(label.length * 6.5) + 6,
  h: 18,
  label,
  tone: PROD_TONE.infra,
  step,
});

const TOP_Y = 32;
const top = waterfallSize(question, { ...common, total: { ms: L.question } });
const BOTTOM_HEAD_Y = TOP_Y + top.height + 16;
const BOTTOM_Y = BOTTOM_HEAD_Y + 26;
const bottom = waterfallSize(action, { ...common, total: { ms: L.kettle } });
const FOOT_Y = BOTTOM_Y + bottom.height + 10;

const shapes: LayoutShape[] = [
  head("h1", 4, `A question: ${n(L.question)} ms, target ${n(QUESTION_TARGET)} ms`, 1),
  ...waterfall("q", X, TOP_Y, question, {
    ...common,
    step: 1,
    total: { ms: L.question, label: `sent at ${n(L.question)} ms (target ${n(QUESTION_TARGET)})` },
  }),
  head("h2", BOTTOM_HEAD_Y, `The kettle refund, two tools: ${n(L.kettle)} ms, target ${n(ACTION_TARGET)} ms`, 2),
  ...waterfall("a", X, BOTTOM_Y, action, {
    ...common,
    step: 2,
    total: { ms: L.kettle, label: `sent at ${n(L.kettle)} ms (target ${n(ACTION_TARGET)})` },
    marks: [{ ms: aOrder, label: `"Checking your order…" ${n(aOrder)} ms` }],
  }),
  head(
    "foot1",
    FOOT_Y,
    `${L.gateway} + ${L.router} + ${L.assemble} + ${L.firstToken} + ${n(L.reply)} + ${L.supervisor} = ${n(L.question)} ms`,
    1,
    true
  ),
  head(
    "foot2",
    FOOT_Y + 20,
    `${L.preModel} + ${L.toolCall} + ${L.orderApi} + ${L.toolCall} + ${L.policy} + ${L.firstToken} + ${n(L.reply)} + ${L.supervisor} = ${n(L.kettle)} ms`,
    2,
    true
  ),
  head("foot3", FOOT_Y + 40, "Decode at 80 tokens a second (12.5 ms a token); all stage times illustrative.", 2, true),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "The support agent's latency budget: a question in 2,500 ms, a refund action in 4,450 ms",
  width: 880,
  height: FOOT_Y + 66,
  steps: [{ title: `A question: ${n(L.question)} ms` }, { title: `An action with two tools: ${n(L.kettle)} ms` }],
  shapes,
};

export default spec;
