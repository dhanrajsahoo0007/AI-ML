import type { SequenceMessage, SequenceNote, SequenceSpec } from "@/components/diagrams/types";
import { SEQUENCE_LANE } from "@/components/diagrams/presets/genai-case";
import { n } from "@/components/diagrams/presets/production";
import { COMPLETION_BUDGET, COMPLETION_CONTEXT, FUNNEL } from "@/components/diagrams/presets/gcase-code";

// The completion request: trigger, cancel, reuse (code-assistant, design sheet §15 deep dive 1 and §6 API; preset
// COMPLETION_BUDGET, COMPLETION_CONTEXT and FUNNEL in presets/gcase-code.ts). Brightpost's developer is writing the CSV
// loop in src/parser.ts:
//   1 they type ";" → the plugin waits COMPLETION_BUDGET.debounce = 75 ms of quiet → not typed-through → the
//     pre-request gate passes (it keeps 60% of triggers) → c_30 leaves with 2,000 tokens, of which the server must
//     prefill COMPLETION_CONTEXT.newAvg = 490 (the frozen blocks and the earlier prefix are cached);
//   2 120 ms after the ";" they type " " → c_31 carries supersedes: c_30 → the server aborts c_30 mid-prefill (it costs
//     about half a request; a cancel costs 0.4 of a request on average, and FUNNEL.cancelShare = 65% of sent requests
//     are cancelled) → c_31 reuses COMPLETION_CONTEXT.reusedAvg = 1,510 of its 2,000 tokens from the KV prefix (salted
//     per organisation) and drafts the line from the prefix (prompt lookup);
//   3 the first line streams back → the filter shows it (score 0.62) → ghost text at COMPLETION_BUDGET.p50 = 225 ms
//     after the space → they type "i", which matches the ghost text, so the plugin trims it with no request → Tab
//     accepts 24 characters; the events go out batched.
// Steps: 1 trigger and gate · 2 supersede and abort · 3 ghost text, typed-through, Tab.
// Lanes (SEQUENCE_LANE, section tones only, labels ≤ 15 characters): Developer orange (the person), IDE plugin teal
// (it runs the gate, the cache and the filter: checks), Gateway neutral, FIM server green (the model).
// Request ids, the score and the line are the sheet's illustrative ones (§6 API example).

const pct = (v: number) => `${Math.round(v * 100)}%`;

const m = (from: string, to: string, label: string, step: number, kind?: SequenceMessage["kind"]): SequenceMessage => ({
  from,
  to,
  label,
  step,
  kind,
});

const messages: SequenceMessage[] = [
  // Step 1: trigger and gate.
  m("dev", "plugin", "types ;", 1),
  m("plugin", "gateway", `c_30: ${n(COMPLETION_CONTEXT.total)} tokens, ${n(COMPLETION_CONTEXT.newAvg)} new`, 1),
  m("gateway", "fim", "c_30 to the EU region, sticky", 1),

  // Step 2: a key lands before the ghost text; the next request supersedes the first.
  m("dev", "plugin", "types a space, 120 ms after ;", 2),
  m("plugin", "gateway", "c_31, supersedes: c_30", 2),
  m("gateway", "fim", "abort c_30 (mid-prefill)", 2),
  m("gateway", "fim", "c_31", 2),

  // Step 3: ghost text; a typed-through key; Tab.
  m("fim", "gateway", "first line, drafted from the prefix", 3, "return"),
  m("gateway", "plugin", "i < lines.length; i++) {", 3, "return"),
  m("plugin", "dev", `ghost text at ${COMPLETION_BUDGET.p50} ms`, 3, "return"),
  m("dev", "plugin", "types i (matches the ghost text)", 3),
  m("dev", "plugin", "Tab: 24 characters accepted", 3),
  m("plugin", "gateway", "events: shown, accepted (batched)", 3, "async"),
];

const firstOf = (step: number) => messages.findIndex((x) => x.step === step);

const notes: SequenceNote[] = [
  {
    lane: "plugin",
    text: `${COMPLETION_BUDGET.debounce} ms quiet; not typed-through; the gate passes`,
    step: 1,
    at: firstOf(1) + 0.5,
  },
  {
    lane: "fim",
    text: `aborted: about half a request; ${pct(FUNNEL.cancelShare)} of sent requests end like this`,
    step: 2,
    at: firstOf(2) + 2.5,
  },
  {
    lane: "fim",
    text: `KV prefix reused: ${n(COMPLETION_CONTEXT.reusedAvg)} of ${n(COMPLETION_CONTEXT.total)} tokens, salted per organisation`,
    step: 2,
    at: firstOf(2) + 3.5,
  },
  { lane: "plugin", text: "filter: score 0.62, show", step: 3, at: firstOf(3) + 1.5 },
  { lane: "plugin", text: "trimmed on screen: no request", step: 3, at: firstOf(3) + 3.5 },
];

const spec: SequenceSpec = {
  kind: "sequence",
  title: `One completion: the next key cancels the last request, and the ghost text lands at ${COMPLETION_BUDGET.p50} ms`,
  width: 1000,
  lanes: [
    { id: "dev", label: "Developer", icon: "users", tone: SEQUENCE_LANE.person },
    { id: "plugin", label: "IDE plugin", icon: "browser", tone: SEQUENCE_LANE.check },
    { id: "gateway", label: "Gateway", icon: "gateway", tone: SEQUENCE_LANE.harness },
    { id: "fim", label: "FIM server", icon: "model", tone: SEQUENCE_LANE.model },
  ],
  steps: [
    { title: `Type ";", wait ${COMPLETION_BUDGET.debounce} ms, pass the gate: c_30 leaves` },
    { title: "A space 120 ms later: c_31 supersedes c_30, which is aborted mid-prefill" },
    { title: `Ghost text at ${COMPLETION_BUDGET.p50} ms; a matching key needs no request; Tab` },
  ],
  messages,
  notes,
};

export default spec;
