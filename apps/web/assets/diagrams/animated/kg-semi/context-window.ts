import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { contextBar, type ContextKind, type ContextSegment } from "@/components/diagrams/presets/agents";
import { CONTEXT, REASONING } from "@/components/diagrams/presets/gcase-kgsemi";
import { fmt } from "@/components/diagrams/presets/rag";

// The investigation writer's context window (kg-semiconductor-case-study, design sheet §11). Eight blocks from
// CONTEXT.writer in presets/gcase-kgsemi.ts, in prompt order (stable first, so the model server's prefix cache holds
// them):
//   instructions 1,000 (hypotheses, never "the root cause is"; cite an evidence id; numbers only from evidence; no
//   p-value; name gaps; report and FMEA text is quoted data) + output format and one example 300 = CONTEXT.writerStable
//   1,300 (prefix cache on the on-site server)
//   scope 150 (question, lots, cohort rule, metric id, watermarks) + populations and coverage per candidate kind 200 +
//   3 hypotheses × 900 = 2,700 (effects and intervals 150, timing and change-point 150, what else changed 200,
//   mechanism path 150, sensor and metrology 120, past case 130) + "checked and not supported" 250 + 6 passages (FMEA
//   rows, 8D excerpts) 1,500 + evidence headers 300 = 5,100 changing
//   total CONTEXT.writerIn = 6,400; output REASONING.low = 80 hidden reasoning tokens + CONTEXT.writerOut = 540 visible
//   (3 hypotheses × 130 + a 150-token summary).
// Ghost bars (not sent): the whole schema CONTEXT.fullSchema = 120 types × 25 + 900 properties × 12 = 13,800 tokens;
//   one lot's raw history CONTEXT.lotHistory = 800 steps × 40 = 32,000 tokens (5× this call). Generated queries get a
//   2,500-token schema subset instead.
// Steps: 1 the stable prefix with its "cached" bracket · 2 the changing blocks · 3 what is left out, on one scale.
// Layout (880 wide): contextBar() from presets/agents.ts at x 30, 800 wide (0.125 px a token), brackets above, labels
// of narrow blocks below; step 3 draws three cells on one scale (800 px = 32,000 tokens): this call, the whole schema
// and one lot's history.
// Colours (the agents context legend): instructions and format neutral, scope orange (the engineer's question),
// populations, hypotheses and the ruled-out list blue (results computed by code), passages and headers blue (files);
// the ghost cells neutral, this call blue.

const X = 30;
const W = 800;
const BAR_Y = 62;
const BAR_H = 50;

const BLOCKS: { id: keyof typeof CONTEXT.writer; kind: ContextKind; label: string; stable: boolean }[] = [
  { id: "instructions", kind: "instructions", label: "Instructions", stable: true },
  { id: "format", kind: "instructions", label: "Format", stable: true },
  { id: "scope", kind: "task", label: "Scope", stable: false },
  { id: "populations", kind: "results", label: "Populations", stable: false },
  { id: "hypotheses", kind: "results", label: "3 hypotheses", stable: false },
  { id: "ruledOut", kind: "results", label: "Ruled out", stable: false },
  { id: "passages", kind: "files", label: "6 passages", stable: false },
  { id: "headers", kind: "files", label: "Headers", stable: false },
];

const segments: ContextSegment[] = BLOCKS.map((b) => ({
  kind: b.kind,
  label: b.label,
  tokens: CONTEXT.writer[b.id],
  step: b.stable ? 1 : 2,
}));

const total = CONTEXT.writerIn;
const changing = total - CONTEXT.writerStable;
const bar = contextBar("ctx", X, BAR_Y, segments, { total, w: W, h: BAR_H, free: false });

const xAt = (tokens: number) => X + Math.round((tokens / total) * W);
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

const FOOT_Y = BAR_Y + bar.height + 22;
const GHOST_Y = FOOT_Y + 84;
const ROW_H = 34;
const GAP = 10;
const scale = W / CONTEXT.lotHistory;
const ghost = (id: string, i: number, tokens: number, label: string, tone: "blue" | "neutral"): LayoutShape => ({
  id,
  type: "cell",
  x: X,
  y: GHOST_Y + i * (ROW_H + GAP),
  w: Math.round(tokens * scale),
  h: ROW_H,
  label,
  tone,
  fill: tone === "blue" ? "pastel" : "soft",
  step: 3,
});
const ratio = (CONTEXT.lotHistory / total).toFixed(0);

const spec: LayoutSpec = {
  kind: "layout",
  title: "The writer's context: 6,400 tokens of evidence chosen by code, not a 32,000-token lot history",
  width: 880,
  height: GHOST_Y + 3 * (ROW_H + GAP) + 40,
  steps: [
    { title: `Stable prefix: ${fmt(CONTEXT.writerStable)} tokens, cached on the server` },
    { title: `Changing blocks: ${fmt(changing)} tokens selected by code` },
    { title: "What is left out: the whole schema and one lot's raw history" },
  ],
  shapes: [
    ...bracket("stable", 0, CONTEXT.writerStable, `Stable, cached: ${fmt(CONTEXT.writerStable)}`, 1),
    ...bracket("changing", CONTEXT.writerStable, total, `Changing every investigation: ${fmt(changing)}`, 2),
    ...bar.shapes,
    foot(
      "foot-1",
      FOOT_Y,
      `${fmt(total)} tokens in. Out: ${REASONING.low} hidden reasoning (low effort) + ${CONTEXT.writerOut} visible = 3 hypotheses × 130 + a 150-token summary.`,
      2
    ),
    foot(
      "foot-2",
      FOOT_Y + 22,
      "Every number the writer may quote is in an evidence block; report and FMEA text is quoted data, never instructions.",
      2
    ),

    // Step 3: on one scale, 800 px = 32,000 tokens.
    foot("ghost-head", GHOST_Y - 28, `Not sent, one scale (${fmt(CONTEXT.lotHistory)} tokens = ${W} px)`, 3),
    ghost("ghost-call", 0, total, `This call ${fmt(total)}`, "blue"),
    ghost("ghost-schema", 1, CONTEXT.fullSchema, `Whole schema ${fmt(CONTEXT.fullSchema)}`, "neutral"),
    ghost(
      "ghost-lot",
      2,
      CONTEXT.lotHistory,
      `One lot's raw history: ${fmt(CONTEXT.lotHistory)} (${ratio}×)`,
      "neutral"
    ),
    foot(
      "foot-3",
      GHOST_Y + 3 * (ROW_H + GAP) + 6,
      "Generated queries get a 2,500-token schema subset; the writer gets evidence that code selected and checked.",
      3
    ),
  ],
};

export default spec;
