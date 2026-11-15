import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { AGENT_TONE } from "@/components/diagrams/presets/agents";
import { TREE } from "@/components/diagrams/presets/agents-summary";

// A summary tree on memory-summarization-compression (Core concepts): summaries of summaries for a very long history.
// 400 turns in 8 raw blocks of 50 turns (6,000 illustrative tokens each) are summarised in pairs: 8 blocks → 4
// level-1 summaries → 2 level-2 summaries → 1 root, 400 tokens each. Every block goes through 3 summaries (log2 8);
// a rolling chain that folds one block per pass would put block 1 through 8.
// - Step 1: the 8 raw blocks.
// - Step 2: level 1, each summary reads two blocks (12,000 tokens) and writes 400.
// - Step 3: level 2, each reads two level-1 summaries (800 tokens).
// - Step 4: the root, the only node the prompt carries by default.
// - Step 5: turn 401 asks about the photo from turn 3; the agent follows the tree down to turns 1–50 and
//   reads the raw turns. The question is the ringed shape.
//
// Layout: level labels on the left (x 16, w 110); the tree from x 140. Leaves w 84 at x 140 + 90 × i (centres
// 182 + 90 × i); each parent is centred over its two children. Rows at y 70 (root), 160, 250, 340.
//
// Colour (agents legend, two tones plus neutral): raw turns and the customer's question orange, summaries violet,
// labels and arrows neutral.

const LEAF_W = 84;
const H = 46;
const ROW = { root: 70, l2: 160, l1: 250, leaf: 340 } as const;
const fmt = (n: number) => n.toLocaleString("en-GB");
const leafCentre = (i: number) => 182 + 90 * i;
const turnsOf = (first: number, blocks: number) =>
  `${first * TREE.turnsPerLeaf + 1}–${(first + blocks) * TREE.turnsPerLeaf}`;

const leaves: LayoutShape[] = Array.from({ length: TREE.leaves }, (_, i) => ({
  id: `leaf-${i}`,
  type: "box",
  x: 140 + 90 * i,
  y: ROW.leaf,
  w: LEAF_W,
  h: H,
  label: turnsOf(i, 1),
  sub: fmt(TREE.leafTokens),
  tone: AGENT_TONE.task,
  fill: "pastel",
  step: 1,
}));

/** A summary node over `span` leaves starting at leaf `first`, centred over them. */
const node = (id: string, first: number, span: number, y: number, w: number, step: number): LayoutShape => {
  const cx = (leafCentre(first) + leafCentre(first + span - 1)) / 2;
  return {
    id,
    type: "box",
    x: cx - w / 2,
    y,
    w,
    h: H,
    label: `Summary ${turnsOf(first, span)}`,
    sub: `${TREE.nodeTokens} tokens`,
    tone: AGENT_TONE.memory,
    fill: "pastel",
    step,
  };
};

const l1 = [0, 1, 2, 3].map((j) => node(`l1-${j}`, 2 * j, 2, ROW.l1, 150, 2));
const l2 = [0, 1].map((k) => node(`l2-${k}`, 4 * k, 4, ROW.l2, 200, 3));
const root = node("root", 0, 8, ROW.root, 220, 4);

const edge = (from: string, to: string, step: number): LayoutShape => ({
  id: `${from}-${to}`,
  type: "arrow",
  x: 0,
  y: 0,
  from,
  to,
  step,
});

const edges: LayoutShape[] = [
  ...leaves.map((l, i) => edge(l.id, `l1-${Math.floor(i / 2)}`, 2)),
  ...l1.map((n, j) => edge(n.id, `l2-${Math.floor(j / 2)}`, 3)),
  ...l2.map((n) => edge(n.id, "root", 4)),
];

const level = (id: string, y: number, text: string, step: number): LayoutShape => ({
  id,
  type: "text",
  x: 16,
  y,
  w: 110,
  h: H,
  label: text,
  tone: AGENT_TONE.infra,
  step,
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "A summary tree: summaries of summaries for a long history",
  width: 880,
  height: ROW.leaf + H + 34,
  steps: [
    { title: `${fmt(TREE.totalTurns)} turns in ${TREE.leaves} blocks of ${TREE.turnsPerLeaf}` },
    { title: "Level 1: each summary covers two blocks" },
    { title: "Level 2: summaries of summaries" },
    { title: `The root: ${TREE.nodeTokens} tokens for all ${TREE.totalTurns} turns` },
    { title: "Turn 401: follow the tree down to the raw turns" },
  ],
  shapes: [
    level("lv-leaf", ROW.leaf, `Raw turns\n${TREE.leaves} × ${fmt(TREE.leafTokens)}`, 1),
    ...leaves,
    level("lv-l1", ROW.l1, `Level 1\n4 × ${TREE.nodeTokens}`, 2),
    ...l1,
    level("lv-l2", ROW.l2, `Level 2\n2 × ${TREE.nodeTokens}`, 3),
    ...l2,
    level("lv-root", ROW.root, `Root\n${TREE.nodeTokens} tokens`, 4),
    root,
    ...edges,
    {
      id: "question",
      type: "box",
      x: 640,
      y: ROW.root - 8,
      w: 224,
      h: 62,
      label: "Turn 401: what did\nthe photo show?",
      sub: `look in turns ${turnsOf(0, 1)}`,
      tone: AGENT_TONE.task,
      fill: "pastel",
      highlight: true,
      step: 5,
    },
  ],
};

export default spec;
