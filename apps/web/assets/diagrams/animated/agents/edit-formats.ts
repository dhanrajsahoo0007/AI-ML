import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { AGENT_TONE, CODING_TASK } from "@/components/diagrams/presets/agents";
import { EDIT_TOKENS, FIX } from "@/components/diagrams/presets/agents-coding";

// Three edit formats for one fix (coding-agents, Core concepts "Edit formats and tools"): the first edit of running
// example B, the loop bound in src/parser.ts (line 18 of 128), written as a whole file, a unified diff and a
// search-and-replace. Aider's edit-format docs name the same three families (whole, udiff, diff = search/replace
// blocks); Claude's text editor tool (str_replace) and OpenAI's apply_patch (V4A diff) are the API versions. Token
// counts are illustrative (EDIT_TOKENS).
//
// Three steps, one row each: 1 whole file · 2 unified diff · 3 search and replace.
//
// Layout: three rows; in each, the format and its output size (x 20, 190 wide), what the model writes as code cells
// (x 230, 400 wide, 24 high every 28), and when the format breaks (x 650, 200 wide). Rows start at y 44, 208, 372.
//
// Colour (agents legend, one tone plus neutral): the changed lines teal (the action); unchanged lines, the format and
// the failure notes neutral. The whole-file format is ringed: it writes 80 times more for the same change.

const FMT_X = 20;
const FMT_W = 190;
const CODE_X = 230;
const CODE_W = 400;
const NOTE_X = 650;
const NOTE_W = 200;
const LINE_H = 24;
const GAP = 4;
const ROW_Y = [44, 208, 372] as const;
const fmt = (n: number) => n.toLocaleString("en-GB");

interface Line {
  text: string;
  changed?: boolean;
  /** Height in units of LINE_H + GAP (default 1), for a cell that stands for many lines. */
  rows?: number;
}

const FORMATS: { name: string; tokens: number; breaks: string; lines: Line[] }[] = [
  {
    name: "Whole file",
    tokens: EDIT_TOKENS.whole,
    breaks: "Slow and costly on\nlong files; lines can\ngo missing",
    lines: [
      { text: `lines 1–${FIX.line - 1}, re-typed unchanged`, rows: 1.5 },
      { text: `  ${FIX.after}`, changed: true },
      { text: `lines ${FIX.line + 1}–${FIX.fileLines}, re-typed unchanged`, rows: 2.5 },
    ],
  },
  {
    name: "Unified diff",
    tokens: EDIT_TOKENS.diff,
    breaks: "Line numbers or context\nno longer match the\nfile",
    lines: [
      { text: `--- a/${CODING_TASK.file}` },
      { text: `+++ b/${CODING_TASK.file}` },
      { text: `@@ -${FIX.line} +${FIX.line} @@` },
      { text: `-  ${FIX.before}`, changed: true },
      { text: `+  ${FIX.after}`, changed: true },
    ],
  },
  {
    name: "Search and replace",
    tokens: EDIT_TOKENS.replace,
    breaks: "Old text not found,\nor found twice",
    lines: [
      { text: `path: ${CODING_TASK.file}` },
      { text: `old: ${FIX.before}`, changed: true },
      { text: `new: ${FIX.after}`, changed: true },
    ],
  },
];

const rowHeight = (lines: Line[]) => lines.reduce((s, l) => s + (l.rows ?? 1) * (LINE_H + GAP), 0) - GAP;

const shapes: LayoutShape[] = FORMATS.flatMap((f, r) => {
  const step = r + 1;
  const y0 = ROW_Y[r];
  const h = rowHeight(f.lines);
  let y = y0;
  const code: LayoutShape[] = f.lines.map((l, i) => {
    const ch = (l.rows ?? 1) * (LINE_H + GAP) - GAP;
    const cell: LayoutShape = {
      id: `c${r}-${i}`,
      type: "cell",
      x: CODE_X,
      y,
      w: CODE_W,
      h: ch,
      label: l.text,
      tone: l.changed ? AGENT_TONE.action : AGENT_TONE.infra,
      fill: l.changed ? "pastel" : "soft",
      quiet: i > 0 ? true : undefined,
      step,
    };
    y += ch + GAP;
    return cell;
  });
  return [
    {
      id: `f${r}`,
      type: "box" as const,
      x: FMT_X,
      y: y0,
      w: FMT_W,
      h,
      label: f.name,
      sub: `~${fmt(f.tokens)} tokens out`,
      tone: AGENT_TONE.infra,
      fill: "pastel" as const,
      highlight: r === 0 ? true : undefined,
      step,
    },
    ...code,
    {
      id: `n${r}`,
      type: "box" as const,
      x: NOTE_X,
      y: y0,
      w: NOTE_W,
      h,
      label: f.breaks,
      tone: AGENT_TONE.infra,
      step,
    },
  ];
});

const heading = (id: string, x: number, w: number, label: string): LayoutShape => ({
  id,
  type: "text",
  x,
  y: 12,
  w,
  h: 24,
  label,
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "One fix, three edit formats",
  width: 870,
  height: ROW_Y[2] + rowHeight(FORMATS[2].lines) + 20,
  steps: [
    { title: `Whole file: ~${fmt(EDIT_TOKENS.whole)} tokens` },
    { title: `Unified diff: ~${EDIT_TOKENS.diff} tokens` },
    { title: `Search and replace: ~${EDIT_TOKENS.replace} tokens` },
  ],
  shapes: [
    heading("h0", FMT_X, FMT_W, "Format"),
    heading("h1", CODE_X, CODE_W, "What the model writes for the same fix"),
    heading("h2", NOTE_X, NOTE_W, "Breaks when"),
    ...shapes,
  ],
};

export default spec;
