import type { SequenceMessage, SequenceNote, SequenceSpec } from "@/components/diagrams/types";
import { SEQUENCE_LANE } from "@/components/diagrams/presets/genai-case";
import { n } from "@/components/diagrams/presets/production";
import { LEGAL, TARGETS, WALKTHROUGH, WALK_SAFETY } from "@/components/diagrams/presets/gcase-moderation";

// Two walk-throughs from the design sheet §9 (content-moderation-system, v3; preset WALKTHROUGH, WALK_SAFETY, LEGAL):
//   Steps 1–2, a German comment in the hate family, p50. A Cyrillic look-alike and a zero-width joiner hide a slur.
//     1 the post service calls /v1/check; the raw text scores WALKTHROUGH.rawP = 0.02 (below the band's lower edge
//       pLo 0.0417: it would have been allowed); the normaliser folds it and the hate head gives P = 0.30, inside the
//       global band 0.0417–0.942 (τ = 8 ÷ 14 = 0.571); decision "limited" at WALKTHROUGH.prePublishMs ≈ 34 ms; the small
//       model with the cached hate policy and German addendum returns violates H2.3, local_illegal [DE] by
//       WALKTHROUGH.modelMs ≈ 1.2 s; the posterior after a "yes" is 0.30 × 0.92 ÷ (0.30 × 0.92 + 0.70 × 0.03) = 0.929
//       ≥ 0.571, so the comment is removed worldwide under the terms (the DE ground recorded second); strike 1.
//     2 the statement of reasons is built from the record and reaches the user and, in a 15-minute batch of
//       LEGAL.euPerBatch ≈ 4,487, the DSA database; next day the user appeals; a German-pool reviewer who did not decide
//       first sees the comment, its parent, rule H2.3 and the user's statement (the model's rationale only on request)
//       and upholds.
//   Step 3, "tonight I end it, nobody will miss me" (threats and self-harm), P = 0.30 ≥ the release line
//     WALK_SAFETY.edges.pHi ≈ 0.170: held at once (the author sees the post as posted, nobody else sees it), no model
//     call; support resources at once; the urgent pool in the author's language within 10 min p95
//     (WALK_SAFETY.urgentWaitP95s); imminent risk → a welfare referral, otherwise released with a resources label.
// Lanes (SEQUENCE_LANE, section tones only, labels ≤ 15 characters): User orange (user), Post API neutral (harness),
// Check service teal (check), Policy model green (model), Reviewer orange (person), Notices teal-blue (tool: it acts).

const p = (v: number, d = 3) => v.toFixed(d).replace(/0+$/, "").replace(/\.$/, "");
const E = WALKTHROUGH.edges;
const S = WALK_SAFETY.edges;

const m = (from: string, to: string, label: string, step: number, kind?: SequenceMessage["kind"]): SequenceMessage => ({
  from,
  to,
  label,
  step,
  kind,
});

const messages: SequenceMessage[] = [
  // Step 1: inside the request, then the model after publish.
  m("user", "post", "German comment, a Cyrillic look-alike", 1),
  m("post", "check", "POST /v1/check", 1),
  m("check", "post", `limited at ≈ ${Math.round(WALKTHROUGH.prePublishMs)} ms`, 1, "return"),
  m("post", "user", "posted; not recommended", 1, "return"),
  m("check", "model", "hate policy + DE addendum + thread", 1, "async"),
  m("model", "check", "violates: H2.3, local_illegal: [DE]", 1, "return"),

  // Step 2: act, tell, appeal to a different person.
  m("check", "notices", "remove worldwide, ToS H2.3; strike 1", 2),
  m("notices", "user", "statement of reasons", 2, "return"),
  m("user", "notices", "appeal, next day", 2),
  m("notices", "reviewer", "German pool, not the first decider", 2),
  m("reviewer", "notices", "upheld", 2, "return"),

  // Step 3: a held threat goes straight to the urgent pool.
  m("user", "post", "“tonight I end it, nobody will miss me”", 3),
  m("post", "check", "POST /v1/check", 3),
  m("check", "post", "hold: only the author sees it", 3, "return"),
  m("post", "user", "support resources, a helpline", 3, "return"),
  m("check", "reviewer", "urgent pool, author's language", 3),
  m("reviewer", "notices", "welfare referral, or release", 3),
];

const firstOf = (step: number) => messages.findIndex((x) => x.step === step);

const notes: SequenceNote[] = [
  {
    lane: "check",
    text: `raw P ${p(WALKTHROUGH.rawP)} → folded P ${WALKTHROUGH.p.toFixed(2)}; band ${E.pLo.toFixed(4)}–${E.pHi.toFixed(3)}`,
    step: 1,
    at: firstOf(1) + 1.5,
  },
  {
    lane: "model",
    text: `small model ≈ ${p(WALKTHROUGH.modelMs / 1000, 1)} s; 1,100 tokens cached`,
    step: 1,
    at: firstOf(1) + 4.5,
  },
  {
    lane: "check",
    text: `posterior after “yes” ${p(WALKTHROUGH.posteriorYes)} ≥ τ ${p(E.tau)}`,
    step: 1,
    at: firstOf(1) + 5.5,
  },
  {
    lane: "notices",
    text: `DSA batch every 15 min, ≈ ${n(Math.round(LEGAL.euPerBatch))} a batch`,
    step: 2,
    at: firstOf(2) + 1.5,
  },
  { lane: "reviewer", text: "the model's rationale only on request", step: 2, at: firstOf(2) + 3.5 },
  {
    lane: "check",
    text: `P ${WALK_SAFETY.p.toFixed(2)} ≥ release line ${S.pHi.toFixed(3)}: no model call`,
    step: 3,
    at: firstOf(3) + 2.5,
  },
  {
    lane: "reviewer",
    text: `≤ ${WALK_SAFETY.urgentWaitP95s / 60} min p95 (target ${TARGETS.humanP95Hours.safety * 60} min)`,
    step: 3,
    at: firstOf(3) + 4.5,
  },
];

const spec: SequenceSpec = {
  kind: "sequence",
  title: `A German hate comment limited in ≈ ${Math.round(WALKTHROUGH.prePublishMs)} ms, removed after the model's “yes”, appealed and upheld; a held threat`,
  width: 1000,
  lanes: [
    { id: "user", label: "User", icon: "users", tone: SEQUENCE_LANE.user },
    { id: "post", label: "Post API", icon: "gateway", tone: SEQUENCE_LANE.harness },
    { id: "check", label: "Check service", icon: "shield", tone: SEQUENCE_LANE.check },
    { id: "model", label: "Policy model", icon: "model", tone: SEQUENCE_LANE.model },
    { id: "reviewer", label: "Reviewer", icon: "users", tone: SEQUENCE_LANE.person },
    { id: "notices", label: "Notices", icon: "bell", tone: SEQUENCE_LANE.tool },
  ],
  steps: [
    {
      title: `Limited at ≈ ${Math.round(WALKTHROUGH.prePublishMs)} ms; the model's “yes” removes it at ≈ ${p(WALKTHROUGH.modelMs / 1000, 1)} s`,
    },
    { title: "A statement of reasons; the appeal goes to a different person" },
    { title: "A held threat: no model call, straight to the urgent pool" },
  ],
  messages,
  notes,
};

export default spec;
