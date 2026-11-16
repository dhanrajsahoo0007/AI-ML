import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { AGENT_TONE, CODING_CONTEXT, contextBar, type ContextSegment } from "@/components/diagrams/presets/agents";

// The bug-fix coding agent's context window at step 1 and at step 9 (running example B; first used on
// harness-engineering, reused by the context-engineering, coding-agent and loop pages, so it stands alone). Both bars
// are drawn to the same 32,000-token budget the harness sets for the task (CODING_CONTEXT, illustrative).
//
// Step 1: instructions 2,000 + tool definitions 1,500 + the task 300 = 3,800 tokens, 12 % of the budget.
// Step 9: the same 3,800 + files 6,400 (parser.ts and its test) + history 4,000 (the model's own calls) + tool results
// 9,800 = 24,000 tokens, 75 %. Tool results are the biggest slice and are ringed: they are what compaction trims first.
//
// Two build steps, one bar each. Layout: a label block on the left (x 20, 130 wide) and the bar from x 160, 640 wide
// (20 tokens per unit). A scale line under the second bar marks the budget.
//
// Colour (agents legend, three tones plus neutral): instructions neutral, tool definitions teal, the task and the
// history orange, files and tool results blue, free space on paper.

const X = 160;
const W = 640;
const total = CODING_CONTEXT.budget;
const s1 = CODING_CONTEXT.step1;
const s9 = CODING_CONTEXT.step9;
const used1 = s1.instructions + s1.tools + s1.task;
const used9 = s9.instructions + s9.tools + s9.task + s9.files + s9.history + s9.results;
const pct = (n: number) => `${Math.round((n / total) * 100)} %`;
const fmt = (n: number) => n.toLocaleString("en-GB");

const base = (step: number): ContextSegment[] => [
  { kind: "instructions", tokens: s1.instructions, step },
  { kind: "tools", tokens: s1.tools, label: "Tools", step },
  { kind: "task", tokens: s1.task, step },
];

const ROW1 = 40;
const ROW9 = 150;

const bar1 = contextBar("b1", X, ROW1, base(1), { total, w: W, step: 1 });
const bar9 = contextBar(
  "b9",
  X,
  ROW9,
  [
    ...base(2),
    { kind: "files", tokens: s9.files, step: 2 },
    { kind: "history", tokens: s9.history, step: 2 },
    { kind: "results", tokens: s9.results, highlight: true, step: 2 },
  ],
  { total, w: W, step: 2 }
);

const label = (id: string, y: number, text: string, step: number): LayoutShape => ({
  id,
  type: "text",
  x: 20,
  y,
  w: 130,
  h: 44,
  label: text,
  tone: AGENT_TONE.infra,
  step,
});

const scaleY = ROW9 + bar9.height + 16;

const spec: LayoutSpec = {
  kind: "layout",
  title: "What fills a coding agent's context window",
  width: 820,
  height: scaleY + 30,
  steps: [
    { title: `Step 1: ${fmt(used1)} tokens, ${pct(used1)} of the budget` },
    { title: `Step 9: ${fmt(used9)} tokens, ${pct(used9)} of the budget` },
  ],
  shapes: [
    label("l1", ROW1, `Step 1\n${fmt(used1)} · ${pct(used1)}`, 1),
    ...bar1.shapes,
    label("l9", ROW9, `Step 9\n${fmt(used9)} · ${pct(used9)}`, 2),
    ...bar9.shapes,
    {
      id: "scale",
      type: "arrow",
      x: X,
      y: scaleY,
      w: W,
      h: 0,
      head: false,
      label: `budget: ${fmt(total)} tokens (illustrative)`,
    },
  ],
};

export default spec;
