import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { CORPUS, RAG_TONE, fmt, stripX } from "@/components/diagrams/presets/rag";

// The same 1,100-token article ("Recover two-factor access") split four ways, one row per strategy, on one token
// axis so the cuts line up. The key sentence "If you lost your phone, use a backup code" sits at tokens 385–415
// (illustrative, as in chunk-overlap).
//
// Row 1, fixed size: cuts every 400 tokens (0, 400, 800); the cut at 400 splits the sentence (red).
// Row 2, by structure: one chunk per section. Section boundaries (illustrative): intro 0–180, "If you lost your
//   phone" 180–620, "No backup codes" 620–1,000, "Contact support" 1,000–1,100. The sentence is whole.
// Row 3, semantic: cuts where the meaning of neighbouring sentences shifts (illustrative cuts at 260 and 600).
// Row 4, parent and child: the section "If you lost your phone" is the parent (returned to the model); four children
//   of 110 tokens each (searched) cover it: 180–290, 290–400, 400–510, 510–620.
//
// Tones (two): chunks blue (pastel = what is embedded and searched, paper = the parent that is returned), the split
// red.

const X0 = 160;
const WIDTH = 680;
const TOK = CORPUS.articleTokens;
const x = (t: number) => stripX(t, X0, { tokens: TOK, width: WIDTH });
const SENT = [385, 415] as const;

const box = (
  id: string,
  from: number,
  to: number,
  y: number,
  label: string,
  step: number,
  opts: Partial<LayoutShape> = {}
): LayoutShape => ({
  id,
  type: "box",
  x: x(from),
  y,
  w: Math.round((x(to) - x(from)) * 10) / 10,
  h: 36,
  label,
  tone: RAG_TONE.text,
  fill: "pastel",
  step,
  ...opts,
});

const rowLabel = (id: string, y: number, label: string, step: number): LayoutShape => ({
  id,
  type: "text",
  x: 4,
  y,
  w: 148,
  h: 36,
  label,
  tone: RAG_TONE.infra,
  step,
});

const bracket = (id: string, y: number, tone: "red" | "blue", step: number): LayoutShape => ({
  id,
  type: "path",
  x: 0,
  y: 0,
  points: [
    [x(SENT[0]), y - 5],
    [x(SENT[0]), y],
    [x(SENT[1]), y],
    [x(SENT[1]), y - 5],
  ],
  tone,
  step,
});

const note = (id: string, y: number, label: string, tone: "red" | "neutral", step: number): LayoutShape => ({
  id,
  type: "text",
  x: x(SENT[1]) + 8,
  y: y - 10,
  w: label.length * 7 + 4,
  h: 18,
  label,
  tone,
  step,
});

const CHILD = 110;
const children: LayoutShape[] = [0, 1, 2, 3].map((i) =>
  box(`c${i + 1}`, 180 + i * CHILD, 180 + (i + 1) * CHILD, 310, `Child ${i + 1}`, 4)
);

const spec: LayoutSpec = {
  kind: "layout",
  title: "Four ways to chunk the same article",
  width: 860,
  height: 386,
  steps: [
    { title: "Fixed size: cut every 400 tokens" },
    { title: "By structure: one chunk per section" },
    { title: "Semantic: cut where the meaning shifts" },
    { title: "Parent and child: search small, return big" },
  ],
  shapes: [
    {
      id: "axis",
      type: "text",
      x: X0,
      y: 8,
      w: WIDTH,
      h: 20,
      label: `"Recover two-factor access": tokens 0 to ${fmt(TOK)}`,
      tone: RAG_TONE.infra,
    },
    // Row 1: fixed size
    rowLabel("l1", 36, "Fixed size\n400 tokens", 1),
    box("f1", 0, 400, 36, "Chunk 1", 1),
    box("f2", 400, 800, 36, "Chunk 2", 1),
    box("f3", 800, TOK, 36, "Chunk 3", 1),
    bracket("s1", 82, "red", 1),
    note("n1", 82, "key sentence split at 400", "red", 1),

    // Row 2: by structure
    rowLabel("l2", 112, "By structure\n(headings)", 2),
    box("h1", 0, 180, 112, "Intro", 2),
    box("h2", 180, 620, 112, "Lost your phone", 2),
    box("h3", 620, 1000, 112, "No backup codes", 2),
    box("h4", 1000, TOK, 112, "Help", 2),
    bracket("s2", 158, "blue", 2),
    note("n2", 158, "whole, in its own section", "neutral", 2),

    // Row 3: semantic
    rowLabel("l3", 188, "Semantic\n(meaning shifts)", 3),
    box("m1", 0, 260, 188, "Chunk 1", 3),
    box("m2", 260, 600, 188, "Chunk 2", 3),
    box("m3", 600, TOK, 188, "Chunk 3", 3),

    // Row 4: parent and child
    rowLabel("l4", 262, "Parent and\nchild", 4),
    box("parent", 180, 620, 262, "Parent: the whole section", 4, { fill: "paper" }),
    ...children,
    {
      id: "pc-note",
      type: "text",
      x: X0,
      y: 356,
      w: WIDTH,
      h: 20,
      label: "Search the 110-token children; send the 440-token parent to the model",
      tone: RAG_TONE.infra,
      step: 4,
    },
  ],
};

export default spec;
