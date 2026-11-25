import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PATTERN_TONE, n } from "@/components/diagrams/presets/patterns";

// Answering the prefix "ke" two ways (tries-and-typeahead, Core concepts "Top-k stored at every node"): walk the
// whole subtree and sort, or read a top-3 list stored at the prefix node.
// Four steps: 1 find the prefix node: root, k, e (3 visits) · 2 without stored lists, visit the 7 nodes below "ke"
// (numbered in depth-first order) and sort the 5 queries found · 3 with a top-3 list stored at every node, read the
// list at "ke": no visits below it, whatever the subtree's size · 4 the cost: every node carries a list (21 entries for
// 6 queries), and a new count can change the list on every node from the query up to the root.
// Working (computed below): visits below "ke" = 7; queries below = 5; list entries = sum over nodes of min(3, queries
// below the node) = 21; the path from "bell" (kettlebell) to the root has 6 nodes. Counts are illustrative,
// the same six queries as trie-structure.
// Layout (880 × 450): the tree on the left (levels 66 px apart from y 40; leaves at x 70, 195, 315, 435, 555); a panel
// from x 630 with one box per step.
// Colours (PATTERN_TONE): the typed path and the walk orange (traffic), nodes that end a query violet (store), inner
// nodes neutral paper, the stored lists green (the pattern). Three tones plus neutral.

const QUERIES: [string, number][] = [
  ["kettle", 4_100],
  ["kettlebell", 1_800],
  ["ketchup", 900],
  ["keyboard", 2_400],
  ["keyring", 700],
  ["kitchen scale", 1_200],
];
const COUNT = new Map(QUERIES);
const K = 3;

interface TNode {
  id: string;
  edge: string;
  parent?: string;
  level: number;
  x: number;
  w?: number;
}
const COL = [70, 195, 315, 435, 555];
const mid = (a: number, b: number) => (a + b) / 2;
const E_X = mid(mid(COL[1], COL[2]), mid(COL[3], COL[4]));
const NODES: TNode[] = [
  { id: "root", edge: "root", level: 0, x: mid(COL[0], E_X) },
  { id: "k", edge: "k", parent: "root", level: 1, x: mid(COL[0], E_X) },
  { id: "itchen", edge: "itchen scale", parent: "k", level: 2, x: COL[0], w: 130 },
  { id: "e", edge: "e", parent: "k", level: 2, x: E_X },
  { id: "t", edge: "t", parent: "e", level: 3, x: mid(COL[1], COL[2]) },
  { id: "tle", edge: "tle", parent: "t", level: 4, x: COL[1] },
  { id: "bell", edge: "bell", parent: "tle", level: 5, x: COL[1] },
  { id: "chup", edge: "chup", parent: "t", level: 4, x: COL[2] },
  { id: "y", edge: "y", parent: "e", level: 3, x: mid(COL[3], COL[4]) },
  { id: "board", edge: "board", parent: "y", level: 4, x: COL[3] },
  { id: "ring", edge: "ring", parent: "y", level: 4, x: COL[4] },
];
const byId = new Map(NODES.map((d) => [d.id, d]));
const prefixOf = (d: TNode): string =>
  d.id === "root" ? "" : prefixOf(byId.get(d.parent as string) as TNode) + d.edge;
const queriesBelow = (d: TNode) => QUERIES.filter(([q]) => q.startsWith(prefixOf(d))).sort((a, b) => b[1] - a[1]);
const TYPED = ["root", "k", "e"];
const E = byId.get("e") as TNode;
// Depth-first order of the nodes below "ke" (NODES is listed in that order).
const WALK = NODES.filter((d) => d.level > 2 && prefixOf(d).startsWith("ke"));
const TOP_KE = queriesBelow(E).slice(0, K);
const LIST_ENTRIES = NODES.reduce((s, d) => s + Math.min(K, queriesBelow(d).length), 0); // 21
const pathToRoot = (id: string): string[] => {
  const d = byId.get(id) as TNode;
  return d.parent ? [id, ...pathToRoot(d.parent)] : [id];
};
const UPDATE_PATH = pathToRoot("bell").length; // 6

const LEVEL_Y = (l: number) => 40 + l * 66;
const BOX_W = 96;
const BOX_H = 44;
const shapes: LayoutShape[] = [];

NODES.forEach((d) => {
  const w = d.w ?? BOX_W;
  const p = prefixOf(d);
  const count = COUNT.get(p);
  const typed = TYPED.includes(d.id);
  shapes.push({
    id: d.id,
    type: "box",
    x: d.x - w / 2,
    y: LEVEL_Y(d.level),
    w,
    h: BOX_H,
    label: d.edge,
    sub: d.id === "root" ? undefined : count ? `${p} ${n(count)}` : p,
    tone: typed ? PATTERN_TONE.traffic : count ? PATTERN_TONE.store : PATTERN_TONE.infra,
    fill: typed || count ? "pastel" : "paper",
    quiet: !typed || undefined,
    highlight: d.id === "e" || undefined,
  });
  if (d.parent) {
    shapes.push({ id: `edge-${d.id}`, type: "arrow", x: 0, y: 0, from: d.parent, to: d.id, head: false, quiet: true });
  }
});

// Step 1: the typed path.
const PANEL_X = 630;
const PANEL_W = 240;
shapes.push({
  id: "p1",
  type: "text",
  x: PANEL_X,
  y: 30,
  w: PANEL_W,
  h: 20,
  label: `typed “ke”: ${TYPED.length} node visits`,
  tone: PATTERN_TONE.traffic,
});

// Step 2: walk the subtree, visits numbered.
WALK.forEach((d, i) => {
  shapes.push({
    id: `visit-${d.id}`,
    type: "circle",
    x: d.x - (d.w ?? BOX_W) / 2,
    y: LEVEL_Y(d.level),
    w: 20,
    label: String(i + 1),
    tone: PATTERN_TONE.traffic,
    fill: "pastel",
    step: 2,
    quiet: true,
  });
});
shapes.push({
  id: "p2",
  type: "box",
  x: PANEL_X,
  y: 60,
  w: PANEL_W,
  h: 50,
  label: "No stored lists",
  sub: `${WALK.length} more visits, sort ${queriesBelow(E).length} queries`,
  tone: PATTERN_TONE.traffic,
  fill: "pastel",
  step: 2,
});

// Step 3: the top-3 list stored at "ke".
const LIST_Y = 150;
shapes.push({
  id: "list-title",
  type: "text",
  x: PANEL_X,
  y: LIST_Y,
  w: PANEL_W,
  h: 20,
  label: `top ${K} stored at “ke”`,
  tone: PATTERN_TONE.pattern,
  step: 3,
  quiet: true,
});
TOP_KE.forEach(([q, c], i) => {
  shapes.push({
    id: `list-${i}`,
    type: "cell",
    x: PANEL_X,
    y: LIST_Y + 24 + i * 30,
    w: PANEL_W,
    h: 28,
    label: `${i + 1}. ${q}  ${n(c)}`,
    tone: PATTERN_TONE.pattern,
    fill: "pastel",
    step: 3,
    quiet: i > 0,
  });
});
shapes.push(
  {
    id: "list-arrow",
    type: "arrow",
    x: 0,
    y: 0,
    from: "e",
    to: "list-1",
    step: 3,
    quiet: true,
  },
  {
    id: "p3",
    type: "box",
    x: PANEL_X,
    y: LIST_Y + 24 + K * 30 + 12,
    w: PANEL_W,
    h: 50,
    label: "Stored lists",
    sub: "0 more visits, 1 list read",
    tone: PATTERN_TONE.pattern,
    fill: "pastel",
    step: 3,
    quiet: true,
  }
);

// Step 4: every node carries a list.
NODES.forEach((d) => {
  shapes.push({
    id: `pill-${d.id}`,
    type: "circle",
    x: d.x + (d.w ?? BOX_W) / 2,
    y: LEVEL_Y(d.level),
    w: 20,
    label: String(Math.min(K, queriesBelow(d).length)),
    tone: PATTERN_TONE.pattern,
    fill: "pastel",
    step: 4,
    quiet: true,
  });
});
const P4_Y = LIST_Y + 24 + K * 30 + 80;
shapes.push(
  {
    id: "p4",
    type: "text",
    x: PANEL_X,
    y: P4_Y,
    w: PANEL_W,
    h: 20,
    label: `${LIST_ENTRIES} list entries for ${QUERIES.length} queries`,
    tone: PATTERN_TONE.pattern,
    step: 4,
  },
  {
    id: "p4b",
    type: "text",
    x: PANEL_X,
    y: P4_Y + 24,
    w: PANEL_W,
    h: 20,
    label: `a new count for kettlebell can change`,
    tone: PATTERN_TONE.infra,
    step: 4,
    quiet: true,
  },
  {
    id: "p4c",
    type: "text",
    x: PANEL_X,
    y: P4_Y + 46,
    w: PANEL_W,
    h: 20,
    label: `${UPDATE_PATH} lists, from its node to the root`,
    tone: PATTERN_TONE.infra,
    step: 4,
    quiet: true,
  }
);

const spec: LayoutSpec = {
  kind: "layout",
  title: "Walking the subtree against a stored top 3",
  width: 880,
  height: LEVEL_Y(5) + BOX_H + 24,
  shapes,
  steps: [
    { title: "Find the prefix node" },
    { title: "No lists: walk the subtree" },
    { title: "Read the top 3 stored there" },
    { title: "Pay in memory and updates" },
  ],
};

export default spec;
