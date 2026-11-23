import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { AGENT_TONE, CODING_CONTEXT, contextBar, type ContextSegment } from "@/components/diagrams/presets/agents";
import { COMPACTION, COMPACTION_TOTALS } from "@/components/diagrams/presets/agents-compact";

// Compaction on context-compaction-resets-and-state (Core concepts, the hero): the bug-fix coding agent's window
// (running example B) fills, is compacted, and the session carries on. Four bars drawn to the same illustrative
// 32,000-token budget (CODING_CONTEXT via COMPACTION):
// - Step 1: instructions 2,000 + tool definitions 1,500 + the task 300 = 3,800 tokens, 12 %.
// - Step 9: + files 6,400 + history 4,000 + tool results 9,800 = 24,000 tokens, 75 %: the harness's trigger, marked
//   by a tick above the bar.
// - Compacted: files, history and tool results are replaced by a 1,500-token summary (ringed) and the file being
//   edited, parser.ts, 3,200: 8,500 tokens, 27 %.
// - The follow-up (CRLF) runs in the freed space: parser.test.ts is read again (files 6,400 in all), history 1,500,
//   tool results 2,600: 15,800 tokens, 49 %.
//
// Four build steps, one bar each. Layout: a label block on the left (x 16, 136 wide) and the bars from x 160, 700 wide
// (about 46 tokens per unit). Rows at y 40 | 150 | 260 | 370. A scale line under the last bar names the budget.
//
// Colour (agents legend, four tones plus neutral): instructions neutral, tool definitions teal, the task and the
// history orange, files and tool results blue, the summary violet (state), free space on paper.

const X = 160;
const W = 700;
const total = COMPACTION.budget;
const k = COMPACTION.kept;
const f = COMPACTION.followUp;
const s9 = CODING_CONTEXT.step9;
const fmt = (n: number) => n.toLocaleString("en-GB");
const pct = (n: number) => `${Math.round((n / total) * 100)} %`;

const ROWS = [40, 150, 260, 370] as const;

const prefix = (step: number): ContextSegment[] => [
  { kind: "instructions", tokens: k.instructions, step },
  { kind: "tools", tokens: k.tools, label: "Tools", step },
  { kind: "task", tokens: k.task, step },
];

const used1 = k.instructions + k.tools + k.task;

const bar1 = contextBar("b1", X, ROWS[0], prefix(1), { total, w: W, step: 1 });
const bar2 = contextBar(
  "b2",
  X,
  ROWS[1],
  [
    ...prefix(2),
    { kind: "files", tokens: s9.files, step: 2 },
    { kind: "history", tokens: s9.history, step: 2 },
    { kind: "results", tokens: s9.results, step: 2 },
  ],
  { total, w: W, step: 2 }
);
const bar3 = contextBar(
  "b3",
  X,
  ROWS[2],
  [
    ...prefix(3),
    { kind: "memory", tokens: k.summary, label: "Summary", highlight: true, step: 3 },
    { kind: "files", tokens: k.file, label: "File", step: 3 },
  ],
  { total, w: W, step: 3 }
);
const bar4 = contextBar(
  "b4",
  X,
  ROWS[3],
  [
    ...prefix(4),
    { kind: "memory", tokens: k.summary, label: "Summary", step: 4 },
    { kind: "files", tokens: f.files, step: 4 },
    { kind: "history", tokens: f.history, step: 4 },
    { kind: "results", tokens: f.results, step: 4 },
  ],
  { total, w: W, step: 4 }
);

const label = (id: string, y: number, text: string, step: number): LayoutShape => ({
  id,
  type: "text",
  x: 16,
  y,
  w: 136,
  h: 44,
  label: text,
  tone: AGENT_TONE.infra,
  step,
});

// The trigger: a short tick above the step-9 bar at 75 % of the budget, with its label to the left.
const triggerX = Math.round(X + (COMPACTION.trigger / total) * W);
const scaleY = ROWS[3] + bar4.height + 16;

const spec: LayoutSpec = {
  kind: "layout",
  title: "Compaction: the window fills, is summarised, and the work goes on",
  width: 880,
  height: scaleY + 30,
  steps: [
    { title: `Step 1: ${fmt(used1)} tokens, ${pct(used1)} of the budget` },
    { title: `Step 9: ${fmt(COMPACTION.before)} tokens, the ${pct(COMPACTION.trigger)} trigger` },
    { title: `Compact: a ${fmt(k.summary)}-token summary replaces the history` },
    { title: `Continue: the follow-up runs in the freed space` },
  ],
  shapes: [
    label("l1", ROWS[0], `Step 1\n${fmt(used1)} · ${pct(used1)}`, 1),
    ...bar1.shapes,
    label("l2", ROWS[1], `Step 9\n${fmt(COMPACTION.before)} · ${pct(COMPACTION.before)}`, 2),
    ...bar2.shapes,
    {
      id: "trigger-t",
      type: "text",
      x: triggerX - 196,
      y: ROWS[1] - 32,
      w: 188,
      h: 18,
      label: `compact at ${fmt(COMPACTION.trigger)}`,
      tone: AGENT_TONE.infra,
      step: 2,
    },
    {
      id: "trigger",
      type: "arrow",
      x: triggerX,
      y: ROWS[1] - 34,
      w: 0,
      h: 30,
      dashed: true,
      step: 2,
    },
    label("l3", ROWS[2], `Compacted\n${fmt(COMPACTION_TOTALS.after)} · ${pct(COMPACTION_TOTALS.after)}`, 3),
    ...bar3.shapes,
    label(
      "l4",
      ROWS[3],
      `Follow-up done\n${fmt(COMPACTION_TOTALS.continued)} · ${pct(COMPACTION_TOTALS.continued)}`,
      4
    ),
    ...bar4.shapes,
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
