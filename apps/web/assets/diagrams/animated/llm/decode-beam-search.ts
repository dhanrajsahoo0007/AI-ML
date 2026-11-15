import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { ROLE_TONE } from "@/components/diagrams/presets/transformer";

// Beam search with beam width 2 over 3 decoding steps, for the "Greedy and beam search" concept on the Decoding &
// Sampling page. The prompt is "The sky"; a toy model (the table MODEL below) gives the next-token probabilities of
// 3 candidates after each prefix. Each step expands every kept sequence by its 3 candidates, scores each new
// sequence by its total log-probability (the sum of log p of its tokens), and keeps the 2 best.
// Step 1: 3 candidates after "The sky"; keep "is" and "was".
// Step 2: expand both (6 sequences); keep "was gray" and "is very".
// Step 3: expand both; keep "was gray today" (best) and "is very gray" (greedy's answer).
//
// Working (natural logs, computed below):
//   t = 1: is ln 0.50 = −0.693, was ln 0.40 = −0.916, looks ln 0.10 = −2.303 → keep is, was
//   t = 2: is very −0.693 − 0.916 = −1.609; is gray −0.693 − 1.050 = −1.743; is so −0.693 − 1.386 = −2.079;
//          was gray −0.916 − 0.223 = −1.139; was dark −0.916 − 1.897 = −2.813; was very −0.916 − 2.996 = −3.912
//          → keep was gray (−1.14), is very (−1.61)
//   t = 3: is very gray −1.609 − 0.511 = −2.120; … dark −2.813; … bright −3.912;
//          was gray today −1.139 − 0.357 = −1.496; … again −2.749; … and −3.442
//          → keep was gray today (−1.50, p = 0.4 × 0.8 × 0.7 = 0.224) and is very gray (−2.12, p = 0.120)
//   Greedy (arg-max at every step): is (0.50) → very (0.40) → gray (0.60): −2.12, so beam search finds a sequence
//   with higher total probability because it kept "was" alive after step 1.
// Beam search as the standard decoder for sequence models: Vaswani et al. (2017), §6.1 (beam size 4, length penalty
// α = 0.6); Wu et al. (2016), §7 (length normalization). All sequences here have the same length, so no length
// penalty is needed.

type Dist = [string, number][];
const MODEL: Record<string, Dist> = {
  "": [
    ["is", 0.5],
    ["was", 0.4],
    ["looks", 0.1],
  ],
  is: [
    ["very", 0.4],
    ["gray", 0.35],
    ["so", 0.25],
  ],
  was: [
    ["gray", 0.8],
    ["dark", 0.15],
    ["very", 0.05],
  ],
  "is very": [
    ["gray", 0.6],
    ["dark", 0.3],
    ["bright", 0.1],
  ],
  "was gray": [
    ["today", 0.7],
    ["again", 0.2],
    ["and", 0.1],
  ],
};
const WIDTH = 2;
const STEPS = 3;

interface Hyp {
  id: string;
  prefix: string; // tokens after the prompt, space-separated
  token: string;
  logp: number; // log p of the last token
  score: number; // total log-probability
  parent: string;
  depth: number;
  kept: boolean;
}

const hyps: Hyp[] = [];
let beams: Hyp[] = [{ id: "root", prefix: "", token: "", logp: 0, score: 0, parent: "", depth: 0, kept: true }];
for (let d = 1; d <= STEPS; d++) {
  const cand: Hyp[] = beams.flatMap((b) =>
    MODEL[b.prefix].map(([tok, p], j) => ({
      id: `${b.id}-${j}`,
      prefix: b.prefix ? `${b.prefix} ${tok}` : tok,
      token: tok,
      logp: Math.log(p),
      score: b.score + Math.log(p),
      parent: b.id,
      depth: d,
      kept: false,
    }))
  );
  const keep = [...cand].sort((a, b) => b.score - a.score).slice(0, WIDTH);
  keep.forEach((h) => (h.kept = true));
  hyps.push(...cand);
  beams = keep;
}
const BEST = beams[0];
let greedy = "";
let greedyScore = 0;
for (let d = 0; d < STEPS; d++) {
  const [tok, p] = [...MODEL[greedy]].sort((a, b) => b[1] - a[1])[0];
  greedy = greedy ? `${greedy} ${tok}` : tok;
  greedyScore += Math.log(p);
}
const neg = (v: number) => v.toFixed(2).replace("-", "−");

// ── Layout: one column per step; children of a kept sequence sit in a block of 3 rows ─────────────────────────
const COL_X = [16, 196, 416, 636];
const NODE_W = 116;
const NODE_H = 40;
const ROW_STEP = 50;
const GAP = 24;
const TOP = 112;
const rowY = (r: number) => TOP + r * ROW_STEP + (r >= 3 ? GAP : 0);
const PROB: LayoutTone = ROLE_TONE.softmax;

// Rows: depth 1 puts its two kept sequences at rows 1 and 4 (the middle of their children) and the pruned one at
// row 6; deeper columns put the children of the k-th kept parent at rows 3k … 3k + 2.
const rowOf = new Map<string, number>();
for (let d = 1; d <= STEPS; d++) {
  const col = hyps.filter((h) => h.depth === d);
  if (d === 1) {
    const order = [...col].sort((a, b) => b.score - a.score);
    order.forEach((h, k) => rowOf.set(h.id, [1, 4, 6][k]));
  } else {
    const parents = [...new Set(col.map((h) => h.parent))].sort((a, b) => rowOf.get(a)! - rowOf.get(b)!);
    col.forEach((h) => rowOf.set(h.id, parents.indexOf(h.parent) * 3 + (Number(h.id.split("-").pop()) % 3)));
  }
}
const nodeY = (h: Hyp) => rowY(rowOf.get(h.id)!);
const ROOT_Y = (rowY(1) + rowY(4)) / 2;
const BOTTOM = rowY(6) + NODE_H;

const text = (
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  tone: LayoutTone,
  step: number,
  quiet = true
): LayoutShape => ({ id, type: "text", x, y, w, h, label, tone, step, quiet: quiet || undefined });

const shapes: LayoutShape[] = [
  text(
    "rule",
    16,
    12,
    836,
    20,
    `Beam width ${WIDTH}: after each step keep the ${WIDTH} sequences with the highest total log-probability`,
    "neutral",
    1
  ),
  {
    id: "root",
    type: "box",
    x: COL_X[0],
    y: ROOT_Y,
    w: 120,
    h: NODE_H,
    label: "“The sky”",
    sub: "prompt",
    tone: "neutral",
    fill: "pastel",
    step: 1,
    quiet: true,
  },
];
for (let d = 1; d <= STEPS; d++) {
  shapes.push(
    text(`h-${d}`, COL_X[d] - 12, TOP - 54, NODE_W + 24, 40, `t = ${d}\ntoken · total log p`, PROB, d, false)
  );
}

hyps.forEach((h) => {
  const best = h.depth === STEPS && h.id === BEST.id;
  shapes.push(
    {
      id: h.id,
      type: "box",
      x: COL_X[h.depth],
      y: nodeY(h),
      w: NODE_W,
      h: NODE_H,
      label: h.token,
      sub: `Σ ${neg(h.score)}`,
      tone: h.kept ? PROB : "neutral",
      fill: h.kept ? "pastel" : "soft",
      highlight: best || undefined,
      step: h.depth,
      quiet: true,
    },
    {
      id: `${h.parent}>${h.id}`,
      type: "arrow",
      x: 0,
      y: 0,
      from: h.parent,
      to: h.id,
      label: neg(h.logp),
      dashed: h.kept ? undefined : true,
      step: h.depth,
      quiet: true,
    }
  );
});

shapes.push(
  text(
    "note-beam",
    16,
    BOTTOM + 18,
    836,
    20,
    `Beam: “The sky ${BEST.prefix}”, Σ ${neg(BEST.score)} (p = ${Math.exp(BEST.score).toFixed(3)})`,
    PROB,
    3
  ),
  text(
    "note-greedy",
    16,
    BOTTOM + 42,
    836,
    20,
    `Greedy, the top token at every step: “The sky ${greedy}”, Σ ${neg(greedyScore)} (p = ${Math.exp(greedyScore).toFixed(3)})`,
    "neutral",
    3
  ),
  text(
    "legend",
    COL_X[0],
    BOTTOM - NODE_H,
    170,
    40,
    "Gray, dashed: pruned.\nArrow label: log p of that token.",
    "neutral",
    1
  )
);

const spec: LayoutSpec = {
  kind: "layout",
  title: "Beam search with beam width 2",
  width: 868,
  height: BOTTOM + 76,
  steps: [
    { title: "Three candidates after “The sky”; keep the best 2" },
    { title: "Expand both beams; keep the best 2 of 6" },
    { title: "Expand again; the best beam beats greedy" },
  ],
  shapes,
};

export default spec;
