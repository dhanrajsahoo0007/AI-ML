import type { SequenceMessage, SequenceNote, SequenceSpec } from "@/components/diagrams/types";
import { SEQUENCE_LANE } from "@/components/diagrams/presets/genai-case";
import { n } from "@/components/diagrams/presets/production";
import { OVERHEAD, RESERVE, WALKTHROUGH } from "@/components/diagrams/presets/gcase-gateway";

// The support agent's first call on the two-tool kettle message, 11:00 on sale day, p50 (llm-platform-gateway, design
// sheet §9 walk-through, preset WALKTHROUGH and OVERHEAD in presets/gcase-gateway.ts):
//   0 while support loads case 1847 (its own 30 ms stage) it posts the new message to /v1/scan: regex maps the email,
//     the CPU name scanner maps "Sarah Collins" in OVERHEAD.prescan.nerP50 = 13.5 ms; both go into the dictionary;
//   1 the call: identity and deny-list (cached) by 2 ms; parse and count WALKTHROUGH.bytes = 20,000 bytes;
//   2 one Redis script reserves WALKTHROUGH.reserved = 20,000 × 2.50 + 512 × 10.00 per million = 0.05512 USD and the
//     rate estimate 5,000 ITPM + RESERVE.maxTokens = 512 OTPM (2.3 → 4.3 ms);
//   3 regex and the dictionary pass (0.3 ms): the same placeholders, nothing unseen, no NER;
//   4 sticky key keeps A, workspace ws-support; the request leaves at WALKTHROUGH.leavesAtMs = 5.6 ms;
//   5 first token at 400 ms at the support service (A's own share OVERHEAD.providerShareMs = 394.4 ms);
//   6 a 30-token order_lookup call: its email argument is allow-listed, so the placeholder is restored there;
//   7 usage settles: 2,700 read × 0.10 + 2,300 write × 2.50 + 30 out × 10.00 = WALKTHROUGH.settled 0.00632 USD,
//     refund WALKTHROUGH.refund 0.0488 USD; rate settles to 2,300 ITPM and 30 OTPM; one metering row.
// Step 3 is the other ending: the caller leaves mid-stream, the gateway aborts upstream and settles from its own count
// of streamed tokens (input is billed once processing starts).
// Steps: 1 pre-scan, reserve, send · 2 stream, restore, settle · 3 the caller leaves.
// Lanes (SEQUENCE_LANE, section tones only, labels ≤ 15 characters): Support service orange (the caller), Gateway
// neutral (harness), Counters violet (store), Redactor teal (check), Provider A green (model), Meter blue (records).
// The placeholder values, case number and snapshot version are the sheet's illustrative ones.

const usd = (v: number, d = 5) => `${v.toFixed(d)} USD`;
const ms = (v: number) => `${v} ms`;

const m = (from: string, to: string, label: string, step: number, kind?: SequenceMessage["kind"]): SequenceMessage => ({
  from,
  to,
  label,
  step,
  kind,
});

const messages: SequenceMessage[] = [
  // Step 1: pre-scan during the case load; reserve; send.
  m("support", "redactor", "/v1/scan: the new message", 1, "async"),
  m("support", "gateway", "support-agent, key m_5521-1", 1),
  m("gateway", "counters", `reserve ${usd(WALKTHROUGH.reserved)} + 5,000 / ${RESERVE.maxTokens} TPM`, 1),
  m("counters", "gateway", "held, all budget levels", 1, "return"),
  m("gateway", "redactor", "regex + dictionary pass", 1),
  m("redactor", "gateway", "same placeholders, no NER", 1, "return"),
  m("gateway", "provider", `leaves at ${ms(WALKTHROUGH.leavesAtMs)}, sticky: ws-support`, 1),

  // Step 2: the stream; one allow-listed argument restored; settle and refund.
  m("provider", "gateway", `first token at ${ms(WALKTHROUGH.firstTokenMs)}`, 2, "return"),
  m("gateway", "support", "order_lookup: email restored", 2, "return"),
  m(
    "provider",
    "gateway",
    `usage: ${n(WALKTHROUGH.cached)} read, ${n(WALKTHROUGH.written)} write, ${WALKTHROUGH.out} out`,
    2,
    "return"
  ),
  m("gateway", "counters", `settle ${usd(WALKTHROUGH.settled)}, refund ${usd(WALKTHROUGH.refund, 4)}`, 2),
  m("gateway", "meter", "one row: A, Sonnet 5.5, v412", 2, "async"),

  // Step 3: the other ending — the caller leaves mid-stream.
  m("support", "gateway", "the caller disconnects", 3),
  m("gateway", "provider", "abort upstream (HTTP/2 reset)", 3),
  m("gateway", "counters", "settle from counted tokens", 3),
  m("gateway", "meter", "row: cancelled, tokens counted", 3, "async"),
];

const firstOf = (step: number) => messages.findIndex((x) => x.step === step);

const notes: SequenceNote[] = [
  {
    lane: "redactor",
    text: `during the case load: CPU NER ${OVERHEAD.prescan.nerP50} ms, “Sarah Collins” → [PERSON_7f3a9c]`,
    step: 1,
    at: firstOf(1) + 0.5,
  },
  {
    lane: "gateway",
    text: `identity + deny-list by 2 ms; ${n(WALKTHROUGH.bytes)} bytes counted`,
    step: 1,
    at: firstOf(1) + 1.5,
  },
  {
    lane: "provider",
    text: `A's own share ${OVERHEAD.providerShareMs.toFixed(1)} ms of the 400`,
    step: 2,
    at: firstOf(2) + 0.5,
  },
  { lane: "gateway", text: "allow-listed field only; never inside a URL", step: 2, at: firstOf(2) + 1.5 },
  { lane: "provider", text: "input is billed once processing starts", step: 3, at: firstOf(3) + 1.5 },
];

const spec: SequenceSpec = {
  kind: "sequence",
  title: `One support call through the gateway: it leaves at ${ms(WALKTHROUGH.leavesAtMs)}, settles at ${usd(WALKTHROUGH.settled)}`,
  width: 1000,
  lanes: [
    { id: "support", label: "Support service", icon: "chat", tone: SEQUENCE_LANE.user },
    { id: "gateway", label: "Gateway", icon: "gateway", tone: SEQUENCE_LANE.harness },
    { id: "counters", label: "Counters", icon: "cache", tone: SEQUENCE_LANE.store },
    { id: "redactor", label: "Redactor", icon: "shield", tone: SEQUENCE_LANE.check },
    { id: "provider", label: "Provider A", icon: "model", tone: SEQUENCE_LANE.model },
    { id: "meter", label: "Meter", icon: "meter", tone: SEQUENCE_LANE.data },
  ],
  steps: [
    { title: `Pre-scan, reserve ${usd(WALKTHROUGH.reserved)}, send at ${ms(WALKTHROUGH.leavesAtMs)}` },
    { title: `Stream, restore one argument, settle ${usd(WALKTHROUGH.settled)}` },
    { title: "The caller leaves: abort upstream, settle from counted tokens" },
  ],
  messages,
  notes,
};

export default spec;
