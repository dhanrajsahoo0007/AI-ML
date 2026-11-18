import type { SequenceMessage, SequenceNote, SequenceSpec } from "@/components/diagrams/types";
import { SEQUENCE_LANE } from "@/components/diagrams/presets/genai-case";
import { n } from "@/components/diagrams/presets/production";
import { CONTEXT, LATENCY, REASONING, STATS } from "@/components/diagrams/presets/gcase-kgsemi";

// One investigation, end to end (kg-semiconductor-case-study, Steps 4–5 and the walk-through in design sheet §9):
// "Why did yield drop on lots PX7-1022 to PX7-1031?", typed (the slower route), p50. The story is INVENTED and
// illustrative; every time is a stage of LATENCY.stages in presets/gcase-kgsemi.ts (estimates):
//   edge 50 (SSO groups → yield-eng/etch/PX7 roles, one audit record); planner first token 300 + REASONING.low 80
//   reasoning tokens (800 ms at 100 a second) + 60-token plan JSON (600) → 1,750; link 20 + resolve lots, child lots
//   and wafers 80 → `plan` at LATENCY.planTextOnly.p50 = 1,850 ms.
//   Cohort ‖ sort data (slower ≈ 500) → 2,350; within-lot max-T ‖ test-side check (1,000) → 3,350; FDC indicators
//   600 + cluster 50 → 4,000; evidence in parallel, slowest ≈ 2,745 (graph context, what else changed, WIP at risk ‖
//   3 trace summaries ‖ past cases ‖ change-points) → 6,745; held-out confirmation 300 + rank 30 → `hypotheses` at
//   LATENCY.hypothesesText.p50 ≈ 7,075 ms; writer first token 600 + 80 reasoning (800) + 130 tokens (1,300) + check 20
//   → first hypothesis text ≈ 9,795; + the other 410 tokens → complete at LATENCY.explanationText.p50 ≈ 13,895 ms.
//   Statistics (STATS): the time-matched cohort is STATS.cohortLots 80 lots, STATS.cohortWafers 2,000 wafers that
//   passed step 412 in process days 0–10; STATS.withinLot 5,360 + STATS.lotLevel 440 candidates, 10,000 permutations,
//   max-T; held-out: chamber B 80% of 125 wafers [70–87%, lot-cluster-adjusted] against 4.0% of 375 sister-chamber
//   wafers [1.8–8.8%] in the same 20 ETCH04 lots; WET07's residual 4.0% vs 4.0%. No p-value is shown to the engineer.
//   Test side: largest probe card 22% of signature wafers vs 20% of wafers tested; 0 of 30 recovered on retest.
// Steps: 1 scope, then the plan · 2 the time-matched cohort, test side first · 3 within-lot max-T over 5,800
// candidates, a coverage gap · 4 evidence in parallel · 5 held-out confirmation; the table before any text · 6 the
// writer explains; numbers checked.
// Lanes (SEQUENCE_LANE, section tones only; labels ≤ 15 characters): Engineer orange, Gateway and Orchestrator
// neutral (harness), Model green, Columnar and Graph violet (stores), Trace API teal (a tool). The statistics engine
// runs inside the orchestrator's call to the columnar store (notes say so).

const ms = (v: number) => `${n(Math.round(v))} ms`;
const pct = (v: number, d = 0) => `${(v * 100).toFixed(d)}%`;
const sumTo = (stages: readonly { p50: number }[], k: number) => stages.slice(0, k).reduce((s, x) => s + x.p50, 0);

const plan = LATENCY.stages.planText;
const mid = LATENCY.stages.middle;
const t = {
  edge: plan[0].p50,
  planned: sumTo(plan, 4), // ≈ 1,750
  plan: LATENCY.planTextOnly.p50, // 1,850
  cohort: LATENCY.planTextOnly.p50 + sumTo(mid, 1), // ≈ 2,350
  tests: LATENCY.planTextOnly.p50 + sumTo(mid, 2), // ≈ 3,350
  evidenceStart: LATENCY.planTextOnly.p50 + sumTo(mid, 4), // ≈ 4,000
  evidence: LATENCY.planTextOnly.p50 + sumTo(mid, 5), // ≈ 6,745
  hypotheses: LATENCY.hypothesesText.p50, // ≈ 7,075
  firstText: LATENCY.hypothesesText.p50 + 600 + REASONING.low * 10 + 130 * 10 + 20, // ≈ 9,795
  complete: LATENCY.explanationText.p50, // ≈ 13,895
};

const b = STATS.heldOutBCluster;
const s = STATS.heldOutSisterCluster;
const range = (ci: { low: number; high: number }, d = 0) =>
  `${(ci.low * 100).toFixed(d)}–${(ci.high * 100).toFixed(d)}%`;

const m = (from: string, to: string, label: string, step: number, kind?: SequenceMessage["kind"]): SequenceMessage => ({
  from,
  to,
  label,
  step,
  kind,
});

const messages: SequenceMessage[] = [
  // Step 1: scope before data; the model plans a typed question.
  m("user", "gateway", '"Why did yield drop on PX7-1022 to 1031?"', 1),
  m("gateway", "orch", `roles yield-eng/etch/PX7; audit (${t.edge} ms)`, 1),
  m("orch", "model", `plan: ${REASONING.low} reasoning + 60 tokens`, 1),
  m("model", "orch", `investigation, 10 lots at ${ms(t.planned)}`, 1, "return"),
  m("orch", "graph", "resolve lots: 2 child lots, 250 wafers", 1),
  m("graph", "orch", "master ids, genealogy", 1, "return"),
  m("orch", "gateway", `plan + watermarks at ${ms(t.plan)}`, 1, "return"),
  m("gateway", "user", "plan: lots, metric, cohort rule", 1, "return"),

  // Step 2: the time-matched cohort; the test side first.
  m("orch", "columnar", `cohort: ${STATS.cohortLots} lots, ${n(STATS.cohortWafers)} wafers, days 0–10`, 2),
  m("columnar", "orch", `cohort ‖ sort data by ${ms(t.cohort)}`, 2, "return"),

  // Step 3: within-lot max-T over two ordered families; a coverage gap.
  m("orch", "columnar", `${n(STATS.withinLot)} within lot + ${STATS.lotLevel} lot level`, 3),
  m("columnar", "orch", `max-T done by ${ms(t.tests)}`, 3, "return"),
  m("orch", "gateway", "gap: slurry lot known for 58% < 80%", 3, "async"),

  // Step 4: evidence in parallel.
  m("orch", "graph", "what else changed, paths, WIP at risk", 4),
  m("orch", "trace", "3 trace summaries, by reference", 4),
  m("graph", "orch", "WO-55120 day 0; PR-552; WET07; FMEA 3311", 4, "return"),
  m("trace", "orch", `DC bias +${STATS.traceShiftPct}% after the swap`, 4, "return"),

  // Step 5: held-out confirmation; the ranked table before any text.
  m("orch", "columnar", `top ${STATS.preRegistered} only, on 50 held-out lots`, 5),
  m(
    "columnar",
    "orch",
    `B ${pct(STATS.heldOutB.p)} [${range(b)}] vs ${pct(STATS.heldOutSister.p, 1)} [${range(s, 1)}]`,
    5,
    "return"
  ),
  m("orch", "gateway", `hypotheses table at ${ms(t.hypotheses)}`, 5, "return"),
  m("gateway", "user", "ranked, with effect sizes; no p-value", 5, "return"),

  // Step 6: the model explains; every number checked.
  m("orch", "model", `${n(CONTEXT.writerIn)}-token evidence context`, 6),
  m("model", "orch", `hypothesis 1 text at ${ms(t.firstText)}`, 6, "return"),
  m("orch", "gateway", `numbers checked; complete ${ms(t.complete)}`, 6, "return"),
  m("gateway", "user", "explanation + confirmation checks", 6, "return"),
];

const firstOf = (step: number) => messages.findIndex((x) => x.step === step);

const notes: SequenceNote[] = [
  { lane: "trace", text: "test side first: card 22% vs 20%", step: 2, at: firstOf(2) + 1.5 },
  { lane: "trace", text: "10,000 within-lot permutations", step: 3, at: firstOf(3) + 1 },
  { lane: "trace", text: `slowest of 6 ≈ ${ms(mid[4].p50)}`, step: 4, at: firstOf(4) + 3.5 },
  { lane: "trace", text: "WET07 residual 4.0% vs 4.0%", step: 5, at: firstOf(5) + 1.5 },
  { lane: "user", text: "the engineer decides in MES", step: 6, at: messages.length },
];

const spec: SequenceSpec = {
  kind: "sequence",
  title: "One investigation: the plan at 1.85 s, ranked hypotheses at 7.1 s, the explanation complete at 13.9 s",
  width: 1120,
  lanes: [
    { id: "user", label: "Engineer", icon: "users", tone: SEQUENCE_LANE.user },
    { id: "gateway", label: "Gateway", icon: "gateway", tone: SEQUENCE_LANE.harness },
    { id: "orch", label: "Orchestrator", icon: "coordinator", tone: SEQUENCE_LANE.harness },
    { id: "model", label: "Model", icon: "model", tone: SEQUENCE_LANE.model },
    { id: "columnar", label: "Columnar", icon: "database", tone: SEQUENCE_LANE.store },
    { id: "graph", label: "Graph", icon: "graph", tone: SEQUENCE_LANE.store },
    { id: "trace", label: "Trace API", icon: "signal", tone: SEQUENCE_LANE.tool },
  ],
  steps: [
    { title: `Scope before data; the model plans; the plan at ${ms(t.plan)}` },
    { title: "A time-matched cohort; the test side first" },
    { title: `Within-lot max-T over ${n(STATS.tests)} candidates; a coverage gap` },
    { title: `Evidence in parallel, done by ${ms(t.evidence)}` },
    { title: `Held-out confirmation; the ranked table at ${ms(t.hypotheses)}, before any text` },
    { title: `The model explains; numbers checked; complete at ${ms(t.complete)}` },
  ],
  messages,
  notes,
};

export default spec;
