import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { ROLE_TONE, matrix, vector } from "@/components/diagrams/presets/transformer";
import { BALANCE, BATCH_CHOICE, BATCH_PROBS } from "@/components/diagrams/presets/llm-moe";

// The Switch Transformer load-balancing loss, computed on the batch that `moe-capacity` routes. New figure for
// "Load balancing, step by step" on the Mixture of Experts page (the plan's "moe-router" candidate; named for what it
// shows, next to `moe-routing`). Left: the router's probabilities for 8 tokens over 4 experts (green, shaded by
// value) and each token's top-1 pick (blue). Below: Pᵢ, the mean of each column; fᵢ, each expert's share of picks;
// their products and the sum, times N. Right: the same loss for an even batch, this batch and a collapsed one, on one
// scale, and the gradient that pushes the router back toward even.
//
// Facts checked against Switch Transformers (Fedus et al., 2021, arXiv 2101.03961) §2.2, eq. 4–6:
// loss = α · N · Σᵢ fᵢ · Pᵢ, fᵢ = (1/T) Σ 1{argmax p(x) = i}, Pᵢ = (1/T) Σ pᵢ(x); "minimized under a uniform
// distribution"; "the P-vector is differentiable, but the f-vector is not"; scaled by N so that uniform routing gives
// Σ = 1/N whatever N is; α = 10⁻² throughout the paper.
//
// Working (all in presets/llm-moe.ts, which holds the logits; probabilities rounded here):
//   picks 3, 2, 2, 1 → f = 0.375, 0.250, 0.250, 0.125;  P = 0.300, 0.260, 0.252, 0.189
//   fᵢ · Pᵢ = 0.112, 0.065, 0.063, 0.024 → Σ = 0.264 → × 4 = 1.06
//   even picks: 4 × ¼ × ΣPᵢ = 1.00; all tokens and probability on one expert: 4 × 1 × 1 = 4.00
//   ∂loss/∂Pᵢ = N · fᵢ = 1.5, 1.0, 1.0, 0.5 (before α)
// Bars share one scale: 230 px for a loss of 4.

const N = BALANCE.experts;
const T = BALANCE.tokens;
const r2 = (v: number) => v.toFixed(2);
const r3 = (v: number) => v.toFixed(3).replace(/^0\./, ".");

// ── Geometry ─────────────────────────────────────────────────────────────────────────────────────────────────
const CELL = 44;
const MX = 150; // matrix left
const MY = 96; // matrix top
const PICK_X = MX + N * CELL + 18;
const ROW = { P: MY + T * CELL + 30, f: 0, fp: 0, sum: 0 };
ROW.f = ROW.P + CELL + 8;
ROW.fp = ROW.f + CELL + 8;
ROW.sum = ROW.fp + CELL + 30;
const RIGHT = 476;
const BAR_X = 640;
const BAR_MAX = 230;
const barW = (loss: number) => Math.round((loss / BALANCE.collapsed) * BAR_MAX);

const text = (id: string, x: number, y: number, w: number, h: number, label: string, tone: LayoutTone = "neutral") =>
  ({ id, type: "text", x, y, w, h, label, tone }) as LayoutShape;

const shapes: LayoutShape[] = [];

// ── Router probabilities and picks ───────────────────────────────────────────────────────────────────────────
shapes.push(
  text("probs-title", MX - 70, MY - 52, 300, 20, "Router probabilities p(x), softmax per token"),
  ...matrix("p", MX, MY, BATCH_PROBS, ROLE_TONE.weight, {
    cell: CELL,
    showValues: true,
    rowLabels: BATCH_PROBS.map((_, t) => `t${t + 1}`),
    colLabels: BATCH_PROBS[0].map((_, e) => `E${e + 1}`),
  }),
  text("pick-title", PICK_X - 4, MY - 22, CELL + 8, 20, "pick"),
  ...vector("pick", PICK_X, MY, T, ROLE_TONE.ffn, {
    cell: CELL,
    vertical: true,
    labels: BATCH_CHOICE.map((e) => `E${e + 1}`),
  })
);

// ── P, f, their products, the sum ────────────────────────────────────────────────────────────────────────────
const rowLabel = (id: string, y: number, label: string) => text(id, 8, y + 12, MX - 16, 20, label);
shapes.push(
  rowLabel("P-label", ROW.P, "Pᵢ, column mean"),
  ...vector("P", MX, ROW.P, N, ROLE_TONE.weight, { cell: CELL, labels: BALANCE.P.map(r3) }),
  rowLabel("f-label", ROW.f, "fᵢ, share of picks"),
  ...vector("f", MX, ROW.f, N, ROLE_TONE.ffn, { cell: CELL, labels: BALANCE.f.map(r3) }),
  rowLabel("fp-label", ROW.fp, "fᵢ × Pᵢ"),
  ...vector("fp", MX, ROW.fp, N, ROLE_TONE.linear, { cell: CELL, labels: BALANCE.terms.map(r3) }),
  text("f-note", PICK_X - 10, ROW.f + 4, RIGHT - PICK_X - 10, 36, `${BALANCE.routed.join(", ")} of ${T}\npicks`),
  {
    id: "sum",
    type: "box",
    x: 8,
    y: ROW.sum,
    w: RIGHT - 30,
    h: 44,
    label: `Σ = ${BALANCE.terms.map(r3).join(" + ")} = ${BALANCE.sum.toFixed(3)}`,
    sub: `× N = ${N} → loss ${r2(BALANCE.loss)}  (× α = ${BALANCE.alpha} → ${BALANCE.added.toFixed(4)})`,
    tone: "neutral",
    fill: "pastel",
  }
);
for (let e = 0; e < N; e++) {
  const cx = MX + e * CELL + CELL / 2;
  shapes.push({ id: `p>P-${e}`, type: "arrow", x: cx, y: MY + T * CELL, w: 0, h: ROW.P - MY - T * CELL });
}
shapes.push({
  id: "fp>sum",
  type: "arrow",
  x: MX + (N * CELL) / 2,
  y: ROW.fp + CELL,
  w: 0,
  h: ROW.sum - ROW.fp - CELL,
});

// ── Right: three batches on one scale ────────────────────────────────────────────────────────────────────────
const BARS = [
  { id: "even", label: "Even: 2, 2, 2, 2", loss: BALANCE.balanced },
  { id: "this", label: `This batch: ${BALANCE.routed.join(", ")}`, loss: BALANCE.loss },
  { id: "collapsed", label: "Collapsed: 8, 0, 0, 0", loss: BALANCE.collapsed },
];
const BAR_Y = MY + 6;
shapes.push(text("bars-title", RIGHT, MY - 52, 392, 20, "N · Σ fᵢ · Pᵢ for three batches (tokens per expert)"));
BARS.forEach((b, i) => {
  const y = BAR_Y + i * 48;
  shapes.push(text(`${b.id}-label`, RIGHT, y + 6, BAR_X - RIGHT - 10, 20, b.label), {
    id: `${b.id}-bar`,
    type: "box",
    x: BAR_X,
    y,
    w: barW(b.loss),
    h: 32,
    label: r2(b.loss),
    tone: b.id === "this" ? ROLE_TONE.linear : "neutral",
    fill: "pastel",
    highlight: b.id === "this",
  });
});
shapes.push(
  text(
    "bars-note",
    RIGHT,
    BAR_Y + 3 * 48 + 2,
    392,
    36,
    "The minimum is 1.00 for any even batch;\nall tokens on one expert gives N = 4."
  ),
  text(
    "grad",
    RIGHT,
    ROW.f - 4,
    392,
    52,
    `Gradient on Pᵢ is N · fᵢ = ${BALANCE.grad.map((g) => g.toFixed(1)).join(", ")}:\nE1's probability is pushed down 3× harder\nthan E4's. f itself has no gradient.`
  ),
  text(
    "t5",
    RIGHT,
    BAR_Y + 3 * 48 + 74,
    392,
    52,
    `t5 is a close call: E1 ${r2(BATCH_PROBS[4][0])}, E4 ${r2(BATCH_PROBS[4][3])}.\nA small shift sends it to E4, which has\na free slot at capacity 2.`
  ),
  text(
    "formula",
    16,
    14,
    848,
    22,
    `Load-balancing loss = N · Σ fᵢ · Pᵢ = ${N} × ${BALANCE.sum.toFixed(3)} = ${r2(BALANCE.loss)}   (Switch Transformer, α = ${BALANCE.alpha})`
  )
);

const spec: LayoutSpec = {
  kind: "layout",
  title: "The load-balancing loss on one batch",
  width: 880,
  height: ROW.sum + 64,
  shapes,
};

export default spec;
