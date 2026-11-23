import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PATTERN_TONE, n } from "@/components/diagrams/presets/patterns";

// A radix trie of six Brightpost search queries with their counts (tries-and-typeahead, Core concepts "A trie and a
// radix trie"). Each box is one node: its label is the text on the edge into it, its second line the prefix spelled
// so far, or the finished query and how many times it was searched. The path a shopper types, "ke", is orange.
// One frame, no steps.
// Working (computed below): a plain trie keeps one node per distinct prefix: 36 for these six queries (kettle 6,
// kettlebell +4, ketchup +4, keyboard +6, keyring +4, kitchen scale +12). The radix trie merges every chain of
// single-child nodes into one edge: 10 nodes. Below "ke" sit 5 of the 6 queries. Counts are illustrative
// numbers.
// Layout (880 × 470): a top-down tree, levels 70 px apart from y 30; leaf columns at x 100, 270, 440, 610, 780; each
// parent is centred over its children.
// Colours (PATTERN_TONE): inner nodes neutral paper (plumbing of the index), nodes that end a query violet (the store:
// they hold the query and its count), the typed prefix orange (traffic). Two tones plus neutral.

const QUERIES: [string, number][] = [
  ["kettle", 4_100],
  ["kettlebell", 1_800],
  ["ketchup", 900],
  ["keyboard", 2_400],
  ["keyring", 700],
  ["kitchen scale", 1_200],
];
const COUNT = new Map(QUERIES);

// Plain trie: one node per distinct non-empty prefix.
const prefixes = new Set<string>();
QUERIES.forEach(([q]) => {
  for (let i = 1; i <= q.length; i++) prefixes.add(q.slice(0, i));
});
const PLAIN_NODES = prefixes.size; // 36

interface TNode {
  id: string;
  edge: string;
  parent?: string;
  level: number;
  x: number;
  w?: number;
}
const COL = [100, 270, 440, 610, 780];
const mid = (a: number, b: number) => (a + b) / 2;
const NODES: TNode[] = [
  { id: "root", edge: "root", level: 0, x: mid(mid(mid(COL[0], COL[1]), mid(COL[2], COL[3])), COL[4]) },
  { id: "k", edge: "k", parent: "root", level: 1, x: mid(mid(mid(COL[0], COL[1]), mid(COL[2], COL[3])), COL[4]) },
  { id: "e", edge: "e", parent: "k", level: 2, x: mid(mid(COL[0], COL[1]), mid(COL[2], COL[3])) },
  { id: "itchen", edge: "itchen scale", parent: "k", level: 2, x: COL[4], w: 156 },
  { id: "t", edge: "t", parent: "e", level: 3, x: mid(COL[0], COL[1]) },
  { id: "y", edge: "y", parent: "e", level: 3, x: mid(COL[2], COL[3]) },
  { id: "tle", edge: "tle", parent: "t", level: 4, x: COL[0] },
  { id: "chup", edge: "chup", parent: "t", level: 4, x: COL[1] },
  { id: "board", edge: "board", parent: "y", level: 4, x: COL[2] },
  { id: "ring", edge: "ring", parent: "y", level: 4, x: COL[3] },
  { id: "bell", edge: "bell", parent: "tle", level: 5, x: COL[0] },
];
const RADIX_NODES = NODES.length - 1; // 10, not counting the root
const byId = new Map(NODES.map((d) => [d.id, d]));
const prefixOf = (d: TNode): string =>
  d.id === "root" ? "" : prefixOf(byId.get(d.parent as string) as TNode) + d.edge;
const below = (d: TNode) => QUERIES.filter(([q]) => q.startsWith(prefixOf(d))).length;
const TYPED = new Set(["root", "k", "e"]);

const LEVEL_Y = (l: number) => 30 + l * 70;
const BOX_W = 140;
const BOX_H = 46;
const shapes: LayoutShape[] = [];

NODES.forEach((d) => {
  const w = d.w ?? BOX_W;
  const p = prefixOf(d);
  const count = COUNT.get(p);
  shapes.push({
    id: d.id,
    type: "box",
    x: d.x - w / 2,
    y: LEVEL_Y(d.level),
    w,
    h: BOX_H,
    label: d.id === "root" ? "root" : d.edge,
    sub: d.id === "root" ? "empty prefix" : count ? `${p} · ${n(count)}` : `prefix ${p}`,
    tone: TYPED.has(d.id) ? PATTERN_TONE.traffic : count ? PATTERN_TONE.store : PATTERN_TONE.infra,
    fill: TYPED.has(d.id) || count ? "pastel" : "paper",
    highlight: d.id === "e" || undefined,
  });
  if (d.parent) {
    shapes.push({
      id: `edge-${d.id}`,
      type: "arrow",
      x: 0,
      y: 0,
      from: d.parent,
      to: d.id,
      head: false,
      quiet: true,
    });
  }
});

const e = byId.get("e") as TNode;
shapes.push(
  {
    id: "ke-note",
    type: "text",
    x: e.x + BOX_W / 2 + 14,
    y: LEVEL_Y(2) + 13,
    w: 250,
    h: 20,
    label: `typed “ke”: ${below(e)} of ${QUERIES.length} queries below`,
    tone: PATTERN_TONE.traffic,
  },
  {
    id: "sum",
    type: "text",
    x: 280,
    y: LEVEL_Y(5) + 6,
    w: 590,
    h: 20,
    label: `${QUERIES.length} queries: a plain trie needs ${PLAIN_NODES} nodes, one per letter; this radix trie needs ${RADIX_NODES}`,
    tone: PATTERN_TONE.infra,
  },
  {
    id: "sum-2",
    type: "text",
    x: 280,
    y: LEVEL_Y(5) + 30,
    w: 590,
    h: 20,
    label: "violet nodes end a query and hold its count",
    tone: PATTERN_TONE.store,
  }
);

const spec: LayoutSpec = {
  kind: "layout",
  title: "A radix trie of six search queries",
  width: 880,
  height: LEVEL_Y(5) + BOX_H + 40,
  shapes,
};

export default spec;
