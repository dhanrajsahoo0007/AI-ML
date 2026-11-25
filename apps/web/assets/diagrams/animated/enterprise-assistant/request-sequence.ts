import type { SequenceMessage, SequenceNote, SequenceSpec } from "@/components/diagrams/types";
import { SEQUENCE_LANE } from "@/components/diagrams/presets/genai-case";
import { BRIGHTPOST } from "@/components/diagrams/presets/agents";
import { n } from "@/components/diagrams/presets/production";
import { CONTEXT, COST, LATENCY, RETRIEVAL, WALKTHROUGH } from "@/components/diagrams/presets/gcase-enterprise";

// One permission-filtered answer, end to end (conversational-assistant-design, the walk-through in design sheet §9 and
// the latency budget in §12): Priya, a support team lead, asks about order 4471; a helpdesk case is in the top 8, so the
// answer takes the sensitive path and the live check overlaps the cross-encoder. Times are p50 from LATENCY in
// presets/gcase-enterprise.ts:
//   edge, Entra token, account status, principal set 20 → router 300 → `status` at LATENCY.statusAt = 320;
//   embed 15 + filtered BM25 and ANN 40 + ACL-store re-check 5 + personal ranker 10 → 390, where live checks start;
//   cross-encoder 120 → 8 chunks at LATENCY.sourcesAt = 510;
//   the slowest of the chosen 3 live checks ≈ 260 ms from 390 (LATENCY.liveSlowestP50 = 259.5) → residual wait ≈ 140
//   → `sources` at 650; injection screen 25 + assembly 10; first token 600 → LATENCY.answerSensitive.p50 = 1,285;
//   250 tokens at 80 a second → complete ≈ 4.4 s (LATENCY.answerSensitiveDone.p50 = 4,409.5).
//   Prompt CONTEXT.total = 7,876 tokens, CONTEXT.stable = 3,486 cached; cost COST.byType.answer ≈ 0.0121 USD.
//   Principal set WALKTHROUGH.principalSetId with 140 principals (illustrative); Tom's set has no helpdesk-agents.
// Steps: 1 identity and route · 2 filtered retrieval, live check started · 3 the check passes, sources sent ·
// 4 the answer · 5 Tom asks the same question.
// Lanes (SEQUENCE_LANE, section tones only; labels ≤ 15 characters): Employee orange (user), Gateway and Orchestrator
// neutral (harness), Retrieval blue (data), Helpdesk teal (tool: called live as the user), Answer model green.

/** The sheet rounds walk-through times to 5 ms (649.5 → 650, 1,284.5 → 1,285, 139.5 → 140). */
const r5 = (v: number) => Math.round(v / 5) * 5;
const ms = (v: number) => `${n(r5(v))} ms`;
const stage = (id: string) => LATENCY.answerSensitive.stages.find((s) => s.id === id)?.p50 ?? 0;
const liveStart = LATENCY.sourcesAt - stage("cross"); // 390
const sourcesSent = LATENCY.sourcesAt + stage("live"); // 649.5
const firstToken = LATENCY.answerSensitive.p50; // 1,284.5
const done = LATENCY.answerSensitiveDone.p50 / 1_000; // 4.4
const ps = WALKTHROUGH.principalSetId;
const ORDER = BRIGHTPOST.orderId;

const m = (from: string, to: string, label: string, step: number, kind?: SequenceMessage["kind"]): SequenceMessage => ({
  from,
  to,
  label,
  step,
  kind,
});

const messages: SequenceMessage[] = [
  // Step 1: identity and route.
  m("employee", "gateway", `Order ${ORDER}: cracked, £${BRIGHTPOST.price}. Refund?`, 1),
  m("gateway", "orch", `${ps}: ${WALKTHROUGH.principals} principals`, 1),
  m("orch", "gateway", `status at ${ms(LATENCY.statusAt)}`, 1, "return"),
  m("gateway", "employee", "searching…", 1, "return"),

  // Step 2: filtered retrieval; the live check starts with the cross-encoder.
  m("orch", "retrieval", `rewrite + ${ps} inside the search`, 2),
  m("retrieval", "helpdesk", `check case ${ORDER} as Priya`, 2, "async"),
  m("retrieval", "orch", `${RETRIEVAL.chunksInPrompt} chunks at ${ms(LATENCY.sourcesAt)}`, 2, "return"),

  // Step 3: the check passes; sources go out.
  m("helpdesk", "retrieval", "allowed (slowest of 3 ≈ 260 ms)", 3, "return"),
  m("retrieval", "orch", `case ${ORDER} cleared`, 3, "return"),
  m("orch", "gateway", `sources [1]–[3] at ${ms(sourcesSent)}`, 3, "return"),
  m("gateway", "employee", "sources first", 3, "return"),

  // Step 4: the answer.
  m("orch", "model", `${n(CONTEXT.total)} tokens, ${n(CONTEXT.stable)} cached`, 4),
  m("model", "orch", `first token at ${ms(firstToken)}`, 4, "return"),
  m("orch", "gateway", `“over £${BRIGHTPOST.approvalLimit} needs an approver” [1][2]`, 4, "return"),
  m("gateway", "employee", "streamed answer", 4, "return"),
  m("model", "orch", `done ≈ ${done.toFixed(1)} s; grounding check passes`, 4, "return"),

  // Step 5: Tom asks the same question.
  m("employee", "gateway", "Tom (warehouse): same question", 5),
  m("gateway", "orch", `his set: no ${WALKTHROUGH.missingGroupForTom}`, 5),
  m("orch", "retrieval", "same query, Tom's principal set", 5),
  m("retrieval", "orch", `case ${ORDER} is never a candidate`, 5, "return"),
];

const firstOf = (step: number) => messages.findIndex((x) => x.step === step);

const notes: SequenceNote[] = [
  { lane: "orch", text: `router ${stage("router")} ms: answer path, no live search`, step: 1, at: firstOf(1) + 1.5 },
  {
    lane: "retrieval",
    text: `embed ${stage("embed")} · search ${stage("search")} · re-check ${stage("recheck")} · ranker ${stage("personal")} → ${ms(liveStart)}`,
    step: 2,
    at: firstOf(2) + 0.5,
  },
  {
    lane: "retrieval",
    text: `cross-encoder 50 → ${RETRIEVAL.chunksInPrompt} meanwhile (${stage("cross")} ms)`,
    step: 2,
    at: firstOf(2) + 1.5,
  },
  {
    lane: "orch",
    text: `waits ≈ ${r5(stage("live"))} ms for the check; deadline ${RETRIEVAL.live.deadline} ms`,
    step: 3,
    at: firstOf(3) + 1.5,
  },
  {
    lane: "orch",
    text: `screen ${stage("screen")} + context ${stage("assemble")}; audit: ${ps}, chunk ids + acl_version, ${COST.byType.answer.toFixed(4)} USD`,
    step: 4,
    at: firstOf(5) - 0.5,
  },
];

const spec: SequenceSpec = {
  kind: "sequence",
  title: `One permission-filtered answer: sources at ${ms(sourcesSent)} after a live check, first token at ${ms(firstToken)}`,
  width: 1000,
  lanes: [
    { id: "employee", label: "Employee", icon: "users", tone: SEQUENCE_LANE.user },
    { id: "gateway", label: "Gateway", icon: "gateway", tone: SEQUENCE_LANE.harness },
    { id: "orch", label: "Orchestrator", icon: "coordinator", tone: SEQUENCE_LANE.harness },
    { id: "retrieval", label: "Retrieval", icon: "search", tone: SEQUENCE_LANE.data },
    { id: "helpdesk", label: "Helpdesk", icon: "ticket", tone: SEQUENCE_LANE.tool },
    { id: "model", label: "Answer model", icon: "model", tone: SEQUENCE_LANE.model },
  ],
  steps: [
    { title: `Identity and route: status at ${ms(LATENCY.statusAt)}` },
    { title: `Retrieval with the principal set inside; the live check starts at ${ms(liveStart)}` },
    { title: `The check passes: sources at ${ms(sourcesSent)}` },
    { title: `The answer: first token at ${ms(firstToken)}, done ≈ ${done.toFixed(1)} s` },
    { title: "Tom asks the same question: the case is never a candidate" },
  ],
  messages,
  notes,
};

export default spec;
