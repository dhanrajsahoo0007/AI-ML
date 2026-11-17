import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { AGENT_TONE } from "@/components/diagrams/presets/agents";

// Choosing a prompting technique on prompt-engineering-types (Architecture). It replaces the page's Mermaid decision
// tree with the same questions, branches and leaves, cheapest technique first:
// New task → 1 Clear, single-step task? Yes → zero-shot with a precise format.
//            No → 2 Needs a specific style or label set? Yes → few-shot examples.
//            No → 3 Multi-step reasoning? Yes → chain-of-thought (+ self-consistency if accuracy-critical).
//            No → 4 Needs external facts or actions? Yes → ReAct with tools or RAG (the accent).
//                                                     No → prompt chaining with structured outputs.
// Every leaf then goes to "Evaluate on a labeled set". 12 shapes as in the Mermaid: 1 start, 4 questions, 5 leaves,
// 1 evaluation box (plus 14 arrows: 1 start, 4 yes, 4 no, 5 into the evaluation). Static figure, no steps.
//
// Layout (the compact-or-reset approach): questions in the left column (x 24, 300 wide, centre x 174), techniques in
// the middle column (x 400, 280 wide), one tall evaluation box on the right (x 744, 120 wide) spanning every
// technique row. Rows 96 apart from y 96, boxes 56 tall. "Yes" runs right, "No" runs down; the "No" from question 4
// drops to the fifth row and turns right into "Prompt chaining". The arrows into the evaluation box are drawn from
// point to point (not by shape id) so each one stays horizontal into the tall box.
//
// Colour (agents legend, four tones plus neutral): the new task orange (task), questions neutral, prompt-only
// techniques green (the model does the work), ReAct teal (tools and actions), evaluation lime (check). Arrows neutral.

const Q = { x: 24, w: 300 } as const;
const T = { x: 400, w: 280 } as const;
const E = { x: 744, w: 120 } as const;
const ROW = [96, 192, 288, 384, 480] as const;
const H = 56;
const Q_CENTRE = Q.x + Q.w / 2;

const box = (
  id: string,
  col: { x: number; w: number },
  row: number,
  label: string,
  tone: LayoutTone,
  extra: Partial<LayoutShape> = {}
): LayoutShape => ({ id, type: "box", x: col.x, y: ROW[row], w: col.w, h: H, label, tone, ...extra });

const arrow = (id: string, from: string, to: string, label: string, extra: Partial<LayoutShape> = {}): LayoutShape => ({
  id,
  type: "arrow",
  x: 0,
  y: 0,
  from,
  to,
  label,
  ...extra,
});

const questions = [
  "Clear, single-step task?",
  "Needs a specific style\nor label set?",
  "Multi-step reasoning?",
  "Needs external facts\nor actions?",
] as const;

const techniques: { id: string; label: string; sub?: string; tone: LayoutTone; highlight?: boolean }[] = [
  { id: "zero-shot", label: "Zero-shot with a\nprecise format", tone: AGENT_TONE.model },
  { id: "few-shot", label: "Few-shot examples", tone: AGENT_TONE.model },
  {
    id: "cot",
    label: "Chain-of-thought",
    sub: "+ self-consistency if accuracy-critical",
    tone: AGENT_TONE.model,
  },
  { id: "react", label: "ReAct with tools or RAG", tone: AGENT_TONE.action, highlight: true },
  { id: "chain", label: "Prompt chaining", sub: "with structured outputs", tone: AGENT_TONE.model },
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "Pick the cheapest prompting technique that fits",
  width: 880,
  height: ROW[4] + H + 24,
  shapes: [
    {
      id: "start",
      type: "box",
      x: Q.x + 50,
      y: 20,
      w: Q.w - 100,
      h: 44,
      label: "New task",
      tone: AGENT_TONE.task,
      fill: "pastel",
    },
    {
      id: "eval",
      type: "box",
      x: E.x,
      y: ROW[0],
      w: E.w,
      h: ROW[4] + H - ROW[0],
      label: "Evaluate on\na labeled set",
      tone: AGENT_TONE.check,
      fill: "pastel",
    },
    ...questions.map((label, i) => box(`q${i + 1}`, Q, i, label, AGENT_TONE.infra)),
    ...techniques.map((t, i) =>
      box(t.id, T, i, t.label, t.tone, {
        fill: "pastel",
        ...(t.sub ? { sub: t.sub } : {}),
        ...(t.highlight ? { highlight: true } : {}),
      })
    ),
    arrow("start-q1", "start", "q1", ""),
    ...techniques.slice(0, 4).map((t, i) => arrow(`q${i + 1}-yes`, `q${i + 1}`, t.id, "Yes")),
    ...[1, 2, 3].map((i) => arrow(`q${i}-no`, `q${i}`, `q${i + 1}`, "No")),
    arrow("q4-no", "q4", "chain", "No", { via: [[Q_CENTRE, ROW[4] + H / 2]] }),
    ...techniques.map((t, i): LayoutShape => ({
      id: `${t.id}-eval`,
      type: "arrow",
      x: T.x + T.w,
      y: ROW[i] + H / 2,
      w: E.x - (T.x + T.w),
      h: 0,
    })),
  ],
};

export default spec;
