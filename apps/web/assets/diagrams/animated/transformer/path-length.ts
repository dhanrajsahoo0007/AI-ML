import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { ROLE_TONE } from "@/components/diagrams/presets/transformer";

// Maximum path length between two positions, the last column of Table 1 in "Attention Is All You Need" (Vaswani et
// al., 2017), drawn for n = 6 tokens.
//
// Left, a recurrent layer: token t is folded into hidden state h_t, and h_t is computed from h_(t-1). For token 1 to
// influence token 6, its signal passes h1 → h2 → h3 → h4 → h5 → h6: n − 1 = 5 sequential steps, so the path grows as
// O(n), and the steps cannot run in parallel.
// Right, self-attention: every position attends to every position directly. There are n(n − 1)/2 = 15 pairs, each
// one arc, and every pair is 1 step apart, so the path length is O(1).
//
// Facts checked against arXiv 1706.03762 v7, Table 1 and §4: maximum path length O(n) for recurrent layers and O(1)
// for self-attention; sequential operations O(n) for recurrent and O(1) for self-attention.
//
// The first-to-last route is drawn in the attention tone in both panels so the two paths compare at a glance.

const N = 6;
const HL = ROLE_TONE.attention;

// Shared rows: token circles sit on one baseline in both panels.
const TOKEN_Y = 248;
const TOKEN_D = 34;
const STEP_X = 66;

// Left panel (recurrent).
const L = { x: 24, w: 410 };
const lx = (i: number) => L.x + 40 + i * STEP_X;
const H_Y = 150;
const H_W = 40;
const H_H = 32;

// Right panel (self-attention).
const R = { x: 446, w: 410 };
const rx = (i: number) => R.x + 40 + i * STEP_X;

const sub = (i: number) => "₁₂₃₄₅₆"[i];
const isEnd = (i: number) => i === 0 || i === N - 1;

const token = (id: string, x: number, i: number): LayoutShape => ({
  id,
  type: "circle",
  x,
  y: TOKEN_Y,
  w: TOKEN_D,
  label: `x${sub(i)}`,
  tone: isEnd(i) ? HL : "neutral",
});

const text = (id: string, x: number, y: number, w: number, label: string, h = 36, tone = "neutral"): LayoutShape => ({
  id,
  type: "text",
  x,
  y,
  w,
  h,
  label,
  tone: tone as LayoutShape["tone"],
});

/** A pill with no visible line: a 0.1 px arrow, so the label sits exactly on a curve's peak. */
const pill = (id: string, x: number, y: number, label: string): LayoutShape => ({
  id,
  type: "arrow",
  x,
  y,
  w: 0.1,
  h: 0,
  head: false,
  label,
  tone: HL,
});

// ── Left: a chain of hidden states ───────────────────────────────────────────────────────────────────────────

const rnn: LayoutShape[] = [];
for (let i = 0; i < N; i++) {
  rnn.push(token(`rnn-x${i}`, lx(i), i));
  rnn.push({
    id: `rnn-h${i}`,
    type: "box",
    x: lx(i) - H_W / 2,
    y: H_Y,
    w: H_W,
    h: H_H,
    label: `h${sub(i)}`,
    tone: "neutral",
    fill: "pastel",
  });
  rnn.push({
    id: `rnn-x${i}>h${i}`,
    type: "arrow",
    x: 0,
    y: 0,
    from: `rnn-x${i}`,
    to: `rnn-h${i}`,
    tone: i === 0 ? HL : "neutral",
  });
  if (i > 0)
    rnn.push({
      id: `rnn-h${i - 1}>h${i}`,
      type: "arrow",
      x: 0,
      y: 0,
      from: `rnn-h${i - 1}`,
      to: `rnn-h${i}`,
      tone: HL,
    });
}
// A bracket over h1 … h6 with the step count on it.
const BR_Y = 116;
rnn.push(
  {
    id: "rnn-span",
    type: "path",
    x: 0,
    y: 0,
    points: [
      [lx(0), BR_Y + 10],
      [lx(0), BR_Y],
      [lx(N - 1), BR_Y],
      [lx(N - 1), BR_Y + 10],
    ],
    tone: HL,
  },
  pill("rnn-steps", (lx(0) + lx(N - 1)) / 2, BR_Y, "5 steps"),
  text(
    "rnn-note",
    L.x + 10,
    290,
    L.w - 20,
    "Token 1 reaches token 6 through n − 1 = 5 hidden-state\nupdates, one after another: O(n)."
  )
);

// ── Right: every pair connected directly ─────────────────────────────────────────────────────────────────────

const ARC_BASE = TOKEN_Y - TOKEN_D / 2 - 2;
/** Arc height grows with the distance between the two tokens. */
const arcHeight = (d: number) => 22 + 24 * d;

/** A half-ellipse from token i to token j, sampled at 13 points and drawn smooth. */
function arcPoints(i: number, j: number): [number, number][] {
  const a = rx(i);
  const b = rx(j);
  const h = arcHeight(j - i);
  return Array.from({ length: 13 }, (_, k) => {
    const t = (Math.PI * k) / 12;
    const x = (a + b) / 2 - ((b - a) / 2) * Math.cos(t);
    return [Math.round(x * 10) / 10, Math.round((ARC_BASE - h * Math.sin(t)) * 10) / 10];
  });
}

const attn: LayoutShape[] = [];
for (let i = 0; i < N; i++) attn.push(token(`att-x${i}`, rx(i), i));
for (let i = 0; i < N; i++)
  for (let j = i + 1; j < N; j++) {
    const first = i === 0 && j === N - 1;
    attn.push({
      id: `att-arc-${i}-${j}`,
      type: "path",
      x: 0,
      y: 0,
      points: arcPoints(i, j),
      smooth: true,
      tone: first ? HL : "neutral",
      weight: first ? 0.75 : 0.12,
    });
  }
attn.push(
  pill("att-step", (rx(0) + rx(N - 1)) / 2, ARC_BASE - arcHeight(N - 1), "1 step"),
  text(
    "att-note",
    R.x + 10,
    290,
    R.w - 20,
    "Every pair of tokens is linked directly, and all\n15 pairs are computed at once: O(1)."
  )
);

const spec: LayoutSpec = {
  kind: "layout",
  title: "Path length: recurrence versus self-attention",
  width: 880,
  height: 346,
  groups: [
    { id: "g-rnn", title: "Recurrent layer", tone: "neutral", x: L.x, y: 40, w: L.w, h: 290 },
    { id: "g-att", title: "Self-attention", tone: HL, x: R.x, y: 40, w: R.w, h: 290 },
  ],
  shapes: [...rnn, ...attn],
};

export default spec;
