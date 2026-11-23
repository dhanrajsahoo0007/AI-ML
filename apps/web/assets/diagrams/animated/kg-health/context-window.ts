import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { contextBar, type ContextKind, type ContextSegment } from "@/components/diagrams/presets/agents";
import { CONTEXT, COST, KH_PRICES, SIZES, NETWORK } from "@/components/diagrams/presets/gcase-kghealth";
import { fmt } from "@/components/diagrams/presets/rag";

// The answer call's context window for one drug-safety question (kg-healthcare-case-study, design sheet §11). Eight
// blocks from CONTEXT in presets/gcase-kghealth.ts, in prompt order (stable first, so the provider can cache them):
//   instructions 900 + output format and two examples 400                              = CONTEXT.stable 1,300 (≥ 512)
//   question, resolved drug and planner notes 100 + patient facts, structured and pseudonymised 590 (8 meds × 25 +
//   2 allergies × 30 + 10 conditions × 15 + 6 labs × 20 + age, sex, weight, renal 40 + indication and dose 20) + rule
//   results and coverage 340 (2 alerts × 120 + 100) + graph paths and rule criteria 300 (10 × 30) + 8 passage headers
//   240 + 8 FDA label and openly licensed guideline passages 1,600                     = CONTEXT.changing 3,170
//   total CONTEXT.total = 4,470 tokens; output 250 (10 sentences of 25). The whole prompt is written to the 5-minute
//   cache so a restart reads it back (a covered feature under the BAA, F69; the cache holds PHI for its TTL).
// The whole chart instead: SIZES.codedFactsPerPatient 850 × 25 + 20 notes × NETWORK.noteTokens 700 = CONTEXT.wholeChart
//   35,250 tokens (7.9×); the difference 30,780 × KH_PRICES.mid.input 2.00 per million ≈ 0.062 USD a call.
// Cost: 1,300 × 0.10 + 3,170 × 2.50 + 250 × 10.00 per million = COST.safetyAnswer ≈ 0.0106 USD; with the planner share
//   and 0.56 restarts COST.safety ≈ 0.0110 USD a safety question.
// Steps: 1 the stable prefix with its "cached" bracket · 2 the changing blocks with theirs · 3 the whole chart as a
// ghost bar on its own scale.
// Layout (880 wide): contextBar() from presets/agents.ts at x 30, 800 wide (≈ 0.18 px a token), brackets above, labels
// of narrow blocks below; the ghost bar 800 wide for 35,250 tokens, with this call's 4,470 drawn to scale at its start.
// Colours (the agents context legend): instructions and format neutral, the question orange (the clinician's words),
// patient facts violet (state), rule results, paths, headers and passages blue (results and retrieved text).

const X = 30;
const W = 800;
const BAR_Y = 62;
const BAR_H = 50;

const KIND: Record<(typeof CONTEXT.blocks)[number]["id"], { kind: ContextKind; label: string }> = {
  instructions: { kind: "instructions", label: "Instructions, rules" },
  format: { kind: "instructions", label: "Format" },
  question: { kind: "task", label: "Question" },
  patient: { kind: "memory", label: "Patient facts" },
  alerts: { kind: "results", label: "Rule results" },
  paths: { kind: "results", label: "Paths" },
  headers: { kind: "files", label: "Headers" },
  passages: { kind: "files", label: "8 label passages" },
};

const segments: ContextSegment[] = CONTEXT.blocks.map((b) => ({
  kind: KIND[b.id].kind,
  label: KIND[b.id].label,
  tokens: b.tokens,
  step: b.stable ? 1 : 2,
}));

const bar = contextBar("ctx", X, BAR_Y, segments, { total: CONTEXT.total, w: W, h: BAR_H, free: false });

const xAt = (tokens: number) => X + Math.round((tokens / CONTEXT.total) * W);
const bracket = (id: string, from: number, to: number, label: string, step: number): LayoutShape[] => {
  const x1 = xAt(from) + 2;
  const x2 = xAt(to) - 2;
  const y = BAR_Y - 10;
  return [
    {
      id,
      type: "path",
      x: 0,
      y: 0,
      points: [
        [x1, y + 6],
        [x1, y],
        [x2, y],
        [x2, y + 6],
      ],
      step,
    },
    { id: `${id}-label`, type: "text", x: x1, y: y - 26, w: x2 - x1, h: 20, label, tone: "neutral", step },
  ];
};

const usd = (v: number, d = 4) => v.toFixed(d);
const FOOT_Y = BAR_Y + bar.height + 22;
const GHOST_Y = FOOT_Y + 74;
const GHOST_H = 40;
const thisCallW = Math.round((CONTEXT.total / CONTEXT.wholeChart) * W);
const ratio = (CONTEXT.wholeChart / CONTEXT.total).toFixed(1);
const saved = CONTEXT.wholeChart - CONTEXT.total;

const foot = (id: string, y: number, label: string, step: number): LayoutShape => ({
  id,
  type: "text",
  x: X,
  y,
  w: W,
  h: 20,
  label,
  tone: "neutral",
  step,
});

const p = KH_PRICES.mid;

const spec: LayoutSpec = {
  kind: "layout",
  title:
    "One safety answer's context: 4,470 tokens of selected facts, rule results and passages, not a 35,250-token chart",
  width: 880,
  height: GHOST_Y + GHOST_H + 60,
  steps: [
    { title: `Stable prefix: ${fmt(CONTEXT.stable)} tokens, cached` },
    { title: `Changing blocks: ${fmt(CONTEXT.changing)} tokens chosen by the rules` },
    { title: `The whole chart would be ${fmt(CONTEXT.wholeChart)} tokens, ${ratio}×` },
  ],
  shapes: [
    ...bracket("stable", 0, CONTEXT.stable, `Stable, cached: ${fmt(CONTEXT.stable)}`, 1),
    ...bracket("changing", CONTEXT.stable, CONTEXT.total, `Changing every question: ${fmt(CONTEXT.changing)}`, 2),
    ...bar.shapes,
    foot(
      "foot-1",
      FOOT_Y,
      `${fmt(CONTEXT.total)} tokens in, ${CONTEXT.outputTokens} out. Structured facts pseudonymised ("the patient", relative dates); no name or record number.`,
      2
    ),
    foot(
      "foot-2",
      FOOT_Y + 22,
      `${fmt(CONTEXT.stable)} × ${p.cached.toFixed(2)} + ${fmt(CONTEXT.changing)} × ${p.cacheWrite.toFixed(2)} + ${CONTEXT.outputTokens} × ${p.output.toFixed(2)} per million = ${usd(COST.safetyAnswer)} USD; with planner and restarts ${usd(COST.safety)}.`,
      2
    ),

    // Step 3: the whole chart, as a ghost bar on its own scale.
    foot(
      "ghost-head",
      GHOST_Y - 26,
      `Whole chart: ${SIZES.codedFactsPerPatient} coded facts × 25 + 20 notes × ${NETWORK.noteTokens} = ${fmt(CONTEXT.wholeChart)} tokens (own scale)`,
      3
    ),
    {
      id: "ghost-call",
      type: "cell",
      x: X,
      y: GHOST_Y,
      w: thisCallW,
      h: GHOST_H,
      label: fmt(CONTEXT.total),
      tone: "blue",
      fill: "pastel",
      step: 3,
    },
    {
      id: "ghost-rest",
      type: "cell",
      x: X + thisCallW,
      y: GHOST_Y,
      w: W - thisCallW,
      h: GHOST_H,
      label: `${fmt(saved)} more tokens the rules leave out`,
      tone: "neutral",
      fill: "soft",
      step: 3,
    },
    foot(
      "foot-3",
      GHOST_Y + GHOST_H + 12,
      `${ratio}× the tokens: ${fmt(saved)} × ${p.input.toFixed(2)} per million ≈ ${usd((saved * p.input) / 1e6, 3)} USD more a call, more PHI sent, and the alerts diluted.`,
      3
    ),
  ],
};

export default spec;
