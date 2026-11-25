import type { SequenceMessage, SequenceNote, SequenceSpec } from "@/components/diagrams/types";
import { SEQUENCE_LANE } from "@/components/diagrams/presets/genai-case";
import { n } from "@/components/diagrams/presets/production";
import { FONTS, measureText } from "@/components/diagrams/text-width";
import {
  CONTEXT,
  KETTLE_TIMELINE as T,
  LATENCY_MS as L,
  OUTPUT,
  REFUNDS,
} from "@/components/diagrams/presets/gcase-support";

// The cracked kettle's action turn, end to end (customer-support-agent, Final architecture walk-through; design sheet
// §9 and §12), p50. Times are KETTLE_TIMELINE in presets/gcase-support.ts, built from LATENCY_MS (decode 12.5 ms a
// token and a 400 ms first token, illustrative):
//   case 1847 loaded T.caseLoaded = 30; router (250, retrieval 60 + 150 beside it) → damaged_item at T.routed = 280;
//   context assembled (6,000 tokens with the article) → call 1 at T.callStarts = 300; first token 400 + 30-token tool
//   call 375 → get_order(4471) at T.getOrderAsked = 1,075, when "Checking your order…" is shown; the order API 200 →
//   T.orderBack = 1,275; call 2 (775) → request_refund at T.refundAsked = 2,050; bad-actor gate (already clear) and
//   policy 200 → £42 over the £30 limit, pending_approval at T.policyBack = 2,250; call 3: first token 400 + 120-token
//   reply 1,500 → T.replyDecoded = 4,150; supervisor 300 → sent at T.sent = 4,450 = LATENCY_MS.kettle.
// The orchestrator runs every tool call and adds the verified customer id (the page's Step 4), so it has its own lane
// between the customer and the services; the model never calls the order API or the policy service itself.
// Steps: 1 load, route, fetch evidence · 2 two tool calls · 3 the reply, checked and sent.
// Lanes (SEQUENCE_LANE, section tones only; labels ≤ 15 characters): Customer orange (user), Orchestrator neutral
// (harness), Intent router and Agent model green (model calls), Order API teal (tool), Policy service and Supervisor
// teal (checks).
// Width: every message label is measured with measureText(FONTS.message) and the spec is widened until each label,
// plus its 12 px box and 24 px of air, fits inside the span of the two lanes it joins (min 1,120, the KG figure's).

const ms = (v: number) => `${n(Math.round(v))} ms`;

const m = (from: string, to: string, label: string, step: number, kind?: SequenceMessage["kind"]): SequenceMessage => ({
  from,
  to,
  label,
  step,
  kind,
});

const lanes: SequenceSpec["lanes"] = [
  { id: "customer", label: "Customer", icon: "users", tone: SEQUENCE_LANE.user },
  { id: "orch", label: "Orchestrator", icon: "coordinator", tone: SEQUENCE_LANE.harness },
  { id: "router", label: "Intent router", icon: "router", tone: SEQUENCE_LANE.model },
  { id: "model", label: "Agent model", icon: "model", tone: SEQUENCE_LANE.model },
  { id: "orders", label: "Order API", icon: "tool", tone: SEQUENCE_LANE.tool },
  { id: "policy", label: "Policy service", icon: "policy", tone: SEQUENCE_LANE.check },
  { id: "supervisor", label: "Supervisor", icon: "shield", tone: SEQUENCE_LANE.check },
];

const messages: SequenceMessage[] = [
  // Step 1: load the case, route, fetch evidence; call 1 starts at 300 ms.
  m("customer", "orch", "“Kettle cracked, order 4471” + photo", 1),
  m("orch", "router", `case loaded at ${ms(T.caseLoaded)}: classify`, 1),
  m("router", "orch", `damaged_item at ${ms(T.routed)}`, 1, "return"),
  m("orch", "model", `${n(CONTEXT.total)} tokens with the article, at ${ms(T.callStarts)}`, 1),

  // Step 2: two tool calls, each run by the orchestrator.
  m("model", "orch", `get_order(4471) at ${ms(T.getOrderAsked)}`, 2, "return"),
  m("orch", "customer", "“Checking your order…”", 2, "async"),
  m("orch", "orders", "get_order(4471), customer 1847", 2),
  m("orders", "orch", `delivered, £${REFUNDS.kettle}, at ${ms(T.orderBack)}`, 2, "return"),
  m("orch", "model", "order result", 2),
  m("model", "orch", `request_refund at ${ms(T.refundAsked)}`, 2, "return"),
  m("orch", "policy", "request_refund(4471, li_1, damaged)", 2),
  m("policy", "orch", `£${REFUNDS.kettle} > £${REFUNDS.autoLimit}: pending_approval, ${ms(T.policyBack)}`, 2, "return"),

  // Step 3: the reply, checked, then sent.
  m("orch", "model", "policy result", 3),
  m("model", "orch", `${OUTPUT.reply}-token reply by ${ms(T.replyDecoded)}`, 3, "return"),
  m("orch", "supervisor", "check the reply", 3),
  m("supervisor", "orch", `cites the article ✓ at ${ms(T.sent)}`, 3, "return"),
  m("orch", "customer", `reply sent at ${ms(T.sent)}`, 3, "return"),
];

const firstOf = (step: number) => messages.findIndex((x) => x.step === step);

const notes: SequenceNote[] = [
  { lane: "router", text: `retrieval beside it: ${L.search} + ${L.rerank} ms`, step: 1, at: firstOf(1) + 1.5 },
  {
    lane: "model",
    text: `each tool call: ${L.firstToken} first token + ${OUTPUT.toolCall} × ${L.msPerToken} = ${ms(L.toolCall)}`,
    step: 2,
    at: firstOf(2) + 0.5,
  },
  { lane: "policy", text: "gate already clear; R-2291 waits for staff", step: 2, at: firstOf(2) + 7.5 },
  {
    lane: "model",
    text: `${L.firstToken} + ${OUTPUT.reply} × ${L.msPerToken} = ${ms(L.firstToken + L.reply)}`,
    step: 3,
    at: firstOf(3) + 0.5,
  },
];

// Widest label per lane gap, measured, sets the width.
const index = new Map(lanes.map((l, i) => [l.id, i]));
const MARGIN_X = 20; // SEQ.marginX
const colNeeded = Math.max(
  ...messages.map((x) => {
    const gaps = Math.abs((index.get(x.from) ?? 0) - (index.get(x.to) ?? 0)) || 1;
    return (measureText(x.label ?? "", FONTS.message) + 12 + 24) / gaps;
  })
);
const width = Math.max(1_120, Math.ceil(colNeeded * lanes.length + MARGIN_X * 2));

const spec: SequenceSpec = {
  kind: "sequence",
  title: `The cracked kettle's turn: “Checking your order…” at ${ms(T.getOrderAsked)}, the checked reply at ${ms(T.sent)}`,
  width,
  lanes,
  steps: [
    { title: `Load the case, route, fetch evidence: the first model call at ${ms(T.callStarts)}` },
    { title: `Two tool calls: get_order at ${ms(T.getOrderAsked)}, request_refund at ${ms(T.refundAsked)}` },
    { title: `Write the reply, check it, send it at ${ms(T.sent)}` },
  ],
  messages,
  notes,
};

export default spec;
