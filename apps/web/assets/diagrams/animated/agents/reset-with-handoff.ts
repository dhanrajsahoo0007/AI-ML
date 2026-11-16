import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import {
  AGENT_TONE,
  CODING_CONTEXT,
  CODING_TASK,
  contextBar,
  type ContextSegment,
} from "@/components/diagrams/presets/agents";
import { RESET, RESET_TOTALS } from "@/components/diagrams/presets/agents-compact";

// A context reset with a handoff note on context-compaction-resets-and-state (Core concepts, "Clean context resets
// with structured handoffs"). The same moment as the compaction figure: the bug-fix coding agent (running example B)
// is at step 9, 24,000 of an illustrative 32,000 tokens, and the developer asks for a follow-up. Instead of
// compacting, the harness ends the session. Session 1 writes HANDOFF.md (600 tokens: done, decisions, open debt,
// next) and commits; its window is thrown away. Session 2 starts from instructions 2,000 + tools 1,500 + the note 600
// + the new task 300 = 4,400 tokens, 14 %, and its first actions read the note and the git log and run the tests.
//
// Three build steps: 1 session 1's full window · 2 the handoff note, four sections · 3 session 2 starts from the note
// (the note's slice is the highlight).
//
// Layout: a label block on the left (x 16, 136 wide), bars and the note from x 160, 700 wide. Session 1's bar at
// y 40; the note as a group at y 140 (four cells at y 172, 166 wide, 12 apart); session 2's bar at y 290 with its
// first actions under it. Two short vertical arrows: bar → note (x 580, under the tool results) and note → the note's
// slice in session 2's bar.
//
// Colour (agents legend, four tones plus neutral): instructions neutral, tool definitions teal, the task and the
// history orange, files and tool results blue, the handoff note violet (state), free space on paper.

const X = 160;
const W = 700;
const total = CODING_CONTEXT.budget;
const s9 = CODING_CONTEXT.step9;
const fmt = (n: number) => n.toLocaleString("en-GB");
const pct = (n: number) => `${Math.round((n / total) * 100)} %`;
const used9 = Object.values(s9).reduce((a, b) => a + b, 0);

const ROW_A = 40;
const NOTE = { y: 140, h: 96, cellY: 172, cellH: 50, gap: 12 };
const ROW_C = 290;

const bar1 = contextBar(
  "s1",
  X,
  ROW_A,
  [
    { kind: "instructions", tokens: s9.instructions },
    { kind: "tools", tokens: s9.tools, label: "Tools" },
    { kind: "task", tokens: s9.task },
    { kind: "files", tokens: s9.files },
    { kind: "history", tokens: s9.history },
    { kind: "results", tokens: s9.results },
  ],
  { total, w: W, step: 1 }
);

const prefix: ContextSegment[] = [
  { kind: "instructions", tokens: s9.instructions },
  { kind: "tools", tokens: s9.tools, label: "Tools" },
];
const bar2 = contextBar(
  "s2",
  X,
  ROW_C,
  [
    ...prefix,
    { kind: "memory", tokens: RESET.noteTokens, label: "Handoff note", highlight: true },
    { kind: "task", tokens: RESET.task, label: "New task" },
  ],
  { total, w: W, step: 3 }
);

const cellW = (W - 3 * NOTE.gap) / 4;
const cells: LayoutShape[] = RESET.sections.map((s, i) => ({
  id: `note-${s.id}`,
  type: "cell",
  x: X + i * (cellW + NOTE.gap),
  y: NOTE.cellY,
  w: cellW,
  h: NOTE.cellH,
  label: s.label,
  sub: s.sub,
  tone: AGENT_TONE.memory,
  fill: "pastel",
  step: 2,
  quiet: i > 0 ? true : undefined,
}));

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

// The note's slice in session 2's bar starts after instructions and tools.
const noteSliceX = Math.round(X + ((s9.instructions + s9.tools + RESET.noteTokens / 2) / total) * W);
const firstY = ROW_C + bar2.height + 10;

const spec: LayoutSpec = {
  kind: "layout",
  title: "A context reset: a fresh window started from a handoff note",
  width: 880,
  height: firstY + 34,
  steps: [
    { title: `Session 1 at step 9: ${fmt(used9)} tokens, ${pct(used9)}` },
    { title: `Before the reset: write ${RESET.note} and commit` },
    { title: `Session 2 starts from the note: ${fmt(RESET_TOTALS.start)} tokens, ${pct(RESET_TOTALS.start)}` },
  ],
  groups: [
    {
      id: "note",
      title: `${RESET.note} · ${RESET.noteTokens} tokens`,
      tone: AGENT_TONE.memory,
      x: X - 8,
      y: NOTE.y,
      w: W + 16,
      h: NOTE.h,
    },
  ],
  shapes: [
    label("l1", ROW_A, `Session 1, step 9\n${fmt(used9)} · ${pct(used9)}`, 1),
    ...bar1.shapes,
    label("l2", NOTE.cellY, "Session 1 writes\nnote + git commit", 2),
    ...cells,
    { id: "write", type: "arrow", x: 580, y: ROW_A + 46, w: 0, h: NOTE.y - ROW_A - 48, step: 2 },
    label("l3", ROW_C, `Session 2, start\n${fmt(RESET_TOTALS.start)} · ${pct(RESET_TOTALS.start)}`, 3),
    { id: "read", type: "arrow", x: noteSliceX, y: NOTE.y + NOTE.h + 2, w: 0, h: ROW_C - NOTE.y - NOTE.h - 4, step: 3 },
    ...bar2.shapes,
    {
      id: "first",
      type: "text",
      x: X,
      y: firstY,
      w: W,
      h: 22,
      label: `First actions: read ${RESET.note} and the git log, run the ${CODING_TASK.testsTotal} tests`,
      tone: AGENT_TONE.infra,
      step: 3,
    },
  ],
};

export default spec;
