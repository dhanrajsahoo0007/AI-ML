import type { SequenceMessage, SequenceNote, SequenceSpec } from "@/components/diagrams/types";
import { SEQUENCE_LANE } from "@/components/diagrams/presets/genai-case";
import { n } from "@/components/diagrams/presets/production";
import { CONTEXT, COPYRIGHT, LATENCY, RETRIEVAL } from "@/components/diagrams/presets/gcase-answer";

// One quick answer on the own-index path, end to end (ai-answer-engine, Step 5 and the walk-through in design sheet
// §9): "Is HTTP/3 faster than HTTP/2 on mobile?". Times are p50 from LATENCY in presets/gcase-answer.ts:
//   edge, screen and cache lookup 30 (+10 lookup, a miss); planner 250 → 280; index 80 → 360; cheap 30 → 390;
//   cross-encoder 80 → `sources` at LATENCY.sourcesOwn = 470; assembly 10 → 480; first token 500 → LATENCY.firstTokenOwn
//   = 980; first sentence 25 tokens at 80 a second = 312.5 → 1,293; checks 60 → first verified sentence at
//   LATENCY.ownP50 ≈ 1,353 ms (N3 ≤ 1,500).
//   Prompt CONTEXT.total = 4,105 tokens; 12 spans (RETRIEVAL.spansInPrompt).
//   Copyright state after sentence 1: a 9-word verbatim run from RFC 9114; run 9 of COPYRIGHT.runCapWords 25, origin
//   total 9 of COPYRIGHT.totalCapWords 50 (the sheet's walk-through).
//   Sentence 4 ("HTTP/3 is always twice as fast") fails support; re-citing finds no span; dropped, never shown; the
//   model restarts from sentence 3 with the claim excluded, cached prompt, next token ≈ 300 ms (LATENCY.restartExtra
//   includes it).
//   Done: 11 sentences shown; the full answer ≈ LATENCY.fullAnswerOwnMean ≈ 5.1 s; cached for 24 h.
// Steps: 1 question to sources · 2 write and check sentence 1 · 3 a drop and a restart · 4 done and cached.
// Lanes (SEQUENCE_LANE, section tones only; labels ≤ 15 characters): User orange, Gateway and Orchestrator neutral
// (harness), Retrieval violet (the index and ranker, store tone), Answer model green, Checks teal.

const sec = (ms: number) => `${(ms / 1_000).toFixed(1)} s`;
const firstSentenceEnd = Math.round(LATENCY.firstTokenOwn + LATENCY.sentenceMs);

const m = (from: string, to: string, label: string, step: number, kind?: SequenceMessage["kind"]): SequenceMessage => ({
  from,
  to,
  label,
  step,
  kind,
});

const messages: SequenceMessage[] = [
  // Step 1: question to sources.
  m("user", "gateway", "Is HTTP/3 faster on mobile?", 1),
  m("gateway", "orch", "screened; cache miss", 1),
  m("orch", "retrieval", "3 hybrid queries (planned by 280 ms)", 1),
  m("retrieval", "orch", `${RETRIEVAL.spansInPrompt} ranked spans`, 1, "return"),
  m("orch", "gateway", `sources [1]–[12] at ${LATENCY.sourcesOwn} ms`, 1, "return"),
  m("gateway", "user", "sources first", 1, "return"),

  // Step 2: write and check sentence 1.
  m("orch", "model", `${n(CONTEXT.total)}-token prompt`, 2),
  m("model", "orch", `sentence 1 [1][2] at ${n(firstSentenceEnd)} ms`, 2, "return"),
  m("orch", "checks", "check sentence 1", 2),
  m("checks", "orch", "support ✓ harm ✓ copy ✓", 2, "return"),
  m("orch", "gateway", `sentence 1 at ${n(Math.round(LATENCY.ownP50))} ms`, 2, "return"),
  m("gateway", "user", "first verified sentence", 2, "return"),

  // Step 3: a drop and a restart.
  m("model", "orch", '"always twice as fast" [3]', 3, "return"),
  m("orch", "checks", "check sentence 4", 3),
  m("checks", "orch", "unsupported; no span to re-cite", 3, "return"),
  m("orch", "model", "restart after sentence 3, claim out", 3),
  m("model", "orch", "next token ≈ 300 ms (cached prompt)", 3, "return"),

  // Step 4: done and cached.
  m("orch", "gateway", `done: 11 shown, 1 dropped, ≈ ${sec(LATENCY.fullAnswerOwnMean)}`, 4, "return"),
  m("gateway", "user", "done", 4, "return"),
];

const firstOf = (step: number) => messages.findIndex((x) => x.step === step);

const notes: SequenceNote[] = [
  { lane: "retrieval", text: "600 → 400 → 300 → 60 → 12 spans", step: 1, at: firstOf(1) + 2.5 },
  {
    lane: "checks",
    text: `copy state: run 9 of ${COPYRIGHT.runCapWords}, origin 9 of ${COPYRIGHT.totalCapWords} words`,
    step: 2,
    at: firstOf(2) + 3.5,
  },
  { lane: "orch", text: "dropped: never shown, never retracted", step: 3, at: firstOf(3) + 2.5 },
  { lane: "orch", text: "cached 24 h; evicted if a cited span changes", step: 4, at: messages.length },
];

const spec: SequenceSpec = {
  kind: "sequence",
  title: "One quick answer: sources at 470 ms, the first verified sentence at 1,353 ms, a dropped sentence restarts",
  width: 1000,
  lanes: [
    { id: "user", label: "User", icon: "users", tone: SEQUENCE_LANE.user },
    { id: "gateway", label: "Gateway", icon: "gateway", tone: SEQUENCE_LANE.harness },
    { id: "orch", label: "Orchestrator", icon: "coordinator", tone: SEQUENCE_LANE.harness },
    { id: "retrieval", label: "Retrieval", icon: "vector-index", tone: SEQUENCE_LANE.store },
    { id: "model", label: "Answer model", icon: "model", tone: SEQUENCE_LANE.model },
    { id: "checks", label: "Checks", icon: "shield-check", tone: SEQUENCE_LANE.check },
  ],
  steps: [
    { title: `Question to sources: ${LATENCY.sourcesOwn} ms` },
    { title: `Write and check: the first verified sentence at ${n(Math.round(LATENCY.ownP50))} ms` },
    { title: "An unsupported sentence is dropped and generation restarts" },
    { title: "Done, and cached with eviction rules" },
  ],
  messages,
  notes,
};

export default spec;
