import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PATTERN_TONE, SHOP, n } from "@/components/diagrams/presets/patterns";

// Merkle-tree repair between two replicas of one key range (gossip-and-failure-detection, Technical mechanics).
// Four steps, one per level: 1 the roots differ · 2 of the two children, the left pair matches (skip that half) and
// the right pair differs · 3 one level down, the same again · 4 at the leaves, the sixth leaf (index 5) differs: only its keys are sent.
// Working (computed below): 8 leaves, depth log2 8 = 3; comparisons = 1 (roots) + 2 per level × 3 = 7, and only one
// leaf's keys cross the network. For the catalogue's 1,000,000 products hashed into 2^20 = 1,048,576 leaves (depth
// 20), one differing key costs 1 + 2 × 20 = 41 hash comparisons instead of sending 1,000,000 hashes.
// Hash values are illustrative two-character stand-ins.
// Layout (880 × 400): two trees of 8 leaves, 44 px apart, at x 20 and x 400; levels at y 90, 160, 230, 300; the
// per-level count in a column from x 770.
// Colours (PATTERN_TONE): hashes pink (ids and hashes), a matching pair lime (a check that passed), a differing pair
// red (the replicas have diverged); lines and text neutral.
// Fact check (2026-11-16, DeCandia et al., Dynamo, SOSP 2007 §4.7): leaves are hashes of individual keys' values,
// parents hash their children; equal roots mean no sync, otherwise the nodes exchange children's hashes down to the
// leaves; each node keeps a separate Merkle tree for each key range it hosts.

const LEAVES = 8;
const GAP = 44;
const D = 36;
const TREE_X = [20, 400];
const LEVEL_Y = [90, 160, 230, 300];
const BAD_LEAF = 5;
const COMPARISONS = 1 + 2 * Math.log2(LEAVES); // 7
const DEPTH = 20;
const BIG = 1 + 2 * DEPTH; // 41

// Hashes per level, root first. Replica 2 differs on the path to leaf 5.
const H1 = [["7c"], ["2a", "d4"], ["91", "5e", "c3", "08"], ["a1", "3f", "6b", "e2", "47", "b9", "0d", "f6"]];
const H2 = [["e1"], ["2a", "8b"], ["91", "5e", "7f", "08"], ["a1", "3f", "6b", "e2", "47", "c5", "0d", "f6"]];

// x centre of node i on level l (0 = root) of tree t.
const cx = (t: number, l: number, i: number) => {
  const span = LEAVES / 2 ** l; // leaves under this node
  const first = i * span;
  return TREE_X[t] + GAP / 2 + ((first + first + span - 1) / 2) * GAP;
};
const id = (t: number, l: number, i: number) => `t${t}-l${l}-${i}`;

const shapes: LayoutShape[] = [];

["Replica on node 12", "Replica on node 87"].forEach((title, t) => {
  shapes.push({
    id: `title-${t}`,
    type: "text",
    x: TREE_X[t],
    y: 30,
    w: LEAVES * GAP,
    h: 20,
    label: title,
    tone: PATTERN_TONE.infra,
  });
});

[H1, H2].forEach((hashes, t) => {
  hashes.forEach((level, l) =>
    level.forEach((h, i) => {
      shapes.push({
        id: id(t, l, i),
        type: "circle",
        x: cx(t, l, i),
        y: LEVEL_Y[l],
        w: D,
        label: h,
        tone: PATTERN_TONE.id,
        fill: "soft",
        quiet: !(l === 0 && i === 0),
      });
      if (l > 0) {
        shapes.push({
          id: `edge-${t}-${l}-${i}`,
          type: "arrow",
          x: 0,
          y: 0,
          from: id(t, l - 1, Math.floor(i / 2)),
          to: id(t, l, i),
          head: false,
          quiet: true,
        });
      }
    })
  );
});

// Which nodes each step compares: the pair under the differing parent. Step 1 compares the roots.
const pathIndex = (l: number) => Math.floor(BAD_LEAF / 2 ** (3 - l)); // index of the differing node on level l
for (let l = 0; l <= 3; l++) {
  const compared = l === 0 ? [0] : [2 * pathIndex(l - 1), 2 * pathIndex(l - 1) + 1];
  compared.forEach((i) => {
    const differs = i === pathIndex(l);
    [0, 1].forEach((t) => {
      shapes.push({
        id: `cmp-${t}-${l}-${i}`,
        type: "circle",
        x: cx(t, l, i),
        y: LEVEL_Y[l],
        w: D,
        label: (t === 0 ? H1 : H2)[l][i],
        tone: differs ? PATTERN_TONE.fail : PATTERN_TONE.check,
        fill: "pastel",
        step: l + 1,
        quiet: !(t === 1 && differs),
      });
    });
  });
  shapes.push({
    id: `count-${l}`,
    type: "text",
    x: 770,
    y: LEVEL_Y[l] - 10,
    w: 100,
    h: 20,
    label: l === 0 ? "roots: 1" : `level ${l}: +2`,
    tone: PATTERN_TONE.infra,
    step: l + 1,
    quiet: true,
  });
}

shapes.push(
  {
    id: "sum-8",
    type: "text",
    x: 20,
    y: 340,
    w: 840,
    h: 20,
    label: `${COMPARISONS} comparisons find the one differing leaf (${H1[3][BAD_LEAF]} against ${H2[3][BAD_LEAF]}); only its keys are sent`,
    tone: PATTERN_TONE.fail,
    step: 4,
    quiet: true,
  },
  {
    id: "sum-big",
    type: "text",
    x: 20,
    y: 366,
    w: 840,
    h: 20,
    label: `${n(SHOP.catalogueProducts)} products, depth ${DEPTH}: 1 + 2 × ${DEPTH} = ${BIG} comparisons, not ${n(SHOP.catalogueProducts)} hashes`,
    tone: PATTERN_TONE.infra,
    step: 4,
    quiet: true,
  }
);

const spec: LayoutSpec = {
  kind: "layout",
  title: "Two replicas find the one differing leaf in log n steps",
  width: 880,
  height: 400,
  shapes,
  steps: [
    { title: "The roots differ" },
    { title: "Left half matches: skip it" },
    { title: "Go down the differing side" },
    { title: "One leaf differs: send its keys" },
  ],
};

export default spec;
