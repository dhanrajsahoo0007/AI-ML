import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { ROLE_TONE } from "@/components/diagrams/presets/transformer";

// The absorption trick of Multi-head Latent Attention, drawn as matrix products, for the MLA page (Core concepts).
// A stepper, because each step rewrites the one before it.
// Step 1 (naive): head i's score against cached token j is q_i^T · (W_UK,i · c_j): rebuild the key k_j first.
// Step 2 (absorbed): regroup as (q_i^T · W_UK,i) · c_j = q′_i^T · c_j. q′_i is computed once per new token, and each
//   cached token then costs one 512-number dot product. Matrix multiplication is associative, so the score is equal.
// Step 3 (values): o_i = Σ_j a_ij · W_UV,i c_j = W_UV,i · (Σ_j a_ij c_j): mix the latents first, up-project once.
// Step 4 (RoPE): with RoPE on the key, (R_t q)^T (R_j W_UK c_j) = q^T R(j − t) W_UK c_j. The rotation depends on j,
//   so no single q′ exists. DeepSeek-V2's fix: score = q′^T c_j + q_R^T k_R,j, with RoPE only on the 64-dim part.
//
// Facts checked against DeepSeek-V2 (arXiv 2405.04434):
// - §2.1.2: "since W^UK can be absorbed into W^Q, and W^UV can be absorbed into W^O, we even do not need to compute
//   keys and values out for attention"; Appendix C: "due to the associative law of matrix multiplication".
// - §2.1.3: with RoPE on k_C, "a RoPE matrix related to the currently generating token will lie between W^Q and
//   W^UK and matrix multiplication does not obey a commutative law"; the fix is decoupled q_R (per head) and a
//   shared k_R, each d_h^R = 64 wide (eqs. 14–18).
// - Sizes per head (§3.1.2): q_C,i 128; W_UK,i and W_UV,i 128 × 512 (d_h × d_c); c_j 512; q′_i 512.
// - RoPE rotations compose: R_t^T R_j = R(j − t) (Su et al., RoFormer), so the matrix in the middle depends on
//   the distance j − t and changes for every cached token.
// - vLLM's MLA code does the same regrouping at run time (q_nope · W_UK, then attention over the 512-wide latents,
//   then · W_UV), rather than pre-multiplying weight matrices.
//
// Working: rebuilding one key or value costs 128 × 512 = 65,536 multiply-adds per cached token, per head, per step.
// Absorbed: 65,536 once per new token per head, then 512 per cached token (plus 64 for the RoPE part).
//
// Drawn to scale at 0.2 px per dimension (512 → 102.4 px, 128 → 25.6 px, 64 → 12.8 px); the 1-wide side of a
// vector is drawn 18 px (14 px for the column vectors) so it can be seen. Colours: queries blue, projections violet
// (Linear), the latent pink (as in mla-cache-per-token and mla-data-path), keys teal, failure red.

const S = 0.2;
const D_C = 512;
const D_H = 128;
const D_R = 64;
const L = D_C * S; // 102.4
const HD = D_H * S; // 25.6
const KR = D_R * S; // 12.8
const ROW_T = 18; // thickness of a row vector
const COL_T = 14; // thickness of a column vector
const MACS = D_H * D_C; // 65,536

const text = (
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  step: number,
  tone: LayoutTone = "neutral",
  quiet = true
): LayoutShape => ({ id, type: "text", x, y, w, h, label, tone, step, quiet });

const cell = (
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  tone: LayoutTone,
  step: number,
  label?: string,
  quiet = true
): LayoutShape => ({ id, type: "cell", x, y, w, h, tone, fill: "pastel", label, step, quiet });

const matrix = (id: string, x: number, mid: number, label: string, step: number, quiet = true): LayoutShape => ({
  id,
  type: "box",
  x,
  y: mid - HD / 2,
  w: L,
  h: HD,
  label,
  tone: ROLE_TONE.linear,
  fill: "pastel",
  step,
  quiet,
});

const dot = (id: string, x: number, mid: number, step: number, sym = "·") => text(id, x, mid - 9, 16, 18, sym, step);

/** A bracket under [x1, x2] at y, with a note below it. */
const bracket = (id: string, x1: number, x2: number, y: number, note: string, step: number): LayoutShape[] => [
  {
    id,
    type: "path",
    x: 0,
    y: 0,
    points: [
      [x1, y - 5],
      [x1, y],
      [x2, y],
      [x2, y - 5],
    ],
    step,
    quiet: true,
  },
  text(`${id}-note`, (x1 + x2) / 2 - 110, y + 3, 220, 18, note, step),
];

const fmt = (n: number) => n.toLocaleString("en-US");

// ── Panel A: keys ────────────────────────────────────────────────────────────────────────────────────────────
const A1 = 106; // top of row 1's formula band (the column vector c_j spans it)
const A2 = 280;
const m1 = A1 + L / 2;
const m2 = A2 + L / 2;

const keys: LayoutShape[] = [
  // Step 1: q^T · (W_UK · c_j)
  text("a1-title", 24, 80, 412, 18, "1 · Naive: rebuild every cached key", 1),
  text("a1-eq", 24, m1 - 9, 60, 18, "score =", 1),
  text("a1-q-l", 80, m1 - 32, 42, 16, "q_i", 1, ROLE_TONE.query),
  cell("a1-q", 88, m1 - ROW_T / 2, HD, ROW_T, ROLE_TONE.query, 1),
  dot("a1-d1", 116, m1, 1),
  matrix("a1-wuk", 134, m1, "W_UK", 1, false),
  dot("a1-d2", 238, m1, 1),
  cell("a1-c", 256, A1, COL_T, L, ROLE_TONE.embedding, 1),
  text("a1-c-l", 272, m1 - 9, 30, 18, "c_j", 1, ROLE_TONE.embedding),
  ...bracket("a1-br", 134, 270, A1 + L + 8, `= k_j (${D_H}), rebuilt per token`, 1),
  text(
    "a1-cost",
    306,
    A1 + 8,
    136,
    54,
    `every cached token,\nevery head, every step:\n${fmt(MACS)} multiply-adds`,
    1,
    ROLE_TONE.blocked
  ),

  // Step 2: (q^T · W_UK) · c_j = q′^T · c_j
  text("a2-title", 24, 254, 412, 18, "2 · Absorbed: fold W_UK into the query once", 2),
  text("a2-eq", 24, m2 - 9, 60, 18, "score =", 2),
  text("a2-q-l", 80, m2 - 32, 42, 16, "q_i", 2, ROLE_TONE.query),
  cell("a2-q", 88, m2 - ROW_T / 2, HD, ROW_T, ROLE_TONE.query, 2),
  dot("a2-d1", 116, m2, 2),
  matrix("a2-wuk", 134, m2, "W_UK", 2),
  ...bracket("a2-br", 88, 236, m2 + HD / 2 + 8, "once per new token", 2),
  { id: "a2-arrow", type: "arrow", x: 242, y: m2, w: 22, h: 0, step: 2, quiet: true },
  cell("a2-qp", 270, m2 - ROW_T / 2, L, ROW_T, ROLE_TONE.query, 2, `q′_i · ${D_C}`, false),
  dot("a2-d2", 374, m2, 2),
  cell("a2-c", 390, A2, COL_T, L, ROLE_TONE.embedding, 2),
  text("a2-c-l", 406, m2 - 9, 30, 18, "c_j", 2, ROLE_TONE.embedding),
  text(
    "a2-cost",
    24,
    390,
    412,
    18,
    `then ${D_C} multiply-adds per cached token: one dot product with c_j`,
    2,
    ROLE_TONE.softmax
  ),
];

// ── Panel B: values ──────────────────────────────────────────────────────────────────────────────────────────
const BX = 474;
const values: LayoutShape[] = [
  text("b1-title", BX, 80, 384, 18, "3 · Naive: rebuild every cached value", 3),
  text("b1-eq", BX, m1 - 9, 116, 18, "o_i = Σ_j a_ij ·", 3),
  matrix("b1-wuv", BX + 120, m1, "W_UV", 3),
  dot("b1-d", BX + 224, m1, 3),
  cell("b1-c", BX + 242, A1, COL_T, L, ROLE_TONE.embedding, 3),
  text("b1-c-l", BX + 258, m1 - 9, 30, 18, "c_j", 3, ROLE_TONE.embedding),
  ...bracket("b1-br", BX + 120, BX + 256, A1 + L + 8, `= v_j (${D_H}), rebuilt per token`, 3),
  text("b1-cost", BX + 292, A1 + 8, 100, 54, `${fmt(MACS)}\nper token,\nper head`, 3, ROLE_TONE.blocked),

  text("b2-title", BX, 254, 384, 18, "3 · Absorbed: mix the latents, then up-project", 3),
  text("b2-eq", BX, m2 - 9, 46, 18, "o_i =", 3),
  matrix("b2-wuv", BX + 50, m2, "W_UV", 3, false),
  dot("b2-d", BX + 154, m2, 3),
  cell("b2-mix", BX + 172, A2, COL_T, L, ROLE_TONE.embedding, 3),
  text("b2-mix-l", BX + 190, m2 - 18, 120, 36, `Σ_j a_ij c_j\n${D_C} numbers`, 3, ROLE_TONE.embedding),
  text("b2-cost", BX, 390, 384, 18, `one ${D_H} × ${D_C} product per head; W_O follows as usual`, 3, ROLE_TONE.softmax),
];

// ── Panel C: RoPE blocks the fold; the decoupled key fixes it ────────────────────────────────────────────────
const C1 = 486;
const mc = C1 + L / 2;
const RX = 470; // the fix, on the right
const C2 = 496;
const mf = C2 + L / 2;

const rope: LayoutShape[] = [
  text("c-eq", 24, mc - 9, 60, 18, "score =", 4),
  text("c-q-l", 80, mc - 32, 42, 16, "q_i", 4, ROLE_TONE.query),
  cell("c-q", 88, mc - ROW_T / 2, HD, ROW_T, ROLE_TONE.query, 4),
  dot("c-d1", 116, mc, 4),
  text("c-r-l", 106, mc + HD / 2 + 6, 82, 18, "R(j − t)", 4, ROLE_TONE.blocked),
  cell("c-r", 134, mc - HD / 2, HD, HD, ROLE_TONE.blocked, 4, "R", false),
  dot("c-d2", 162, mc, 4),
  matrix("c-wuk", 180, mc, "W_UK", 4),
  dot("c-d3", 284, mc, 4),
  cell("c-c", 302, C1, COL_T, L, ROLE_TONE.embedding, 4),
  text("c-c-l", 318, mc - 9, 30, 18, "c_j", 4, ROLE_TONE.embedding),
  text(
    "c-why",
    24,
    C1 + L + 10,
    420,
    36,
    "With RoPE on the key, a rotation that depends on the distance j − t\nsits in the middle and changes for every cached token: nothing to fold.",
    4,
    ROLE_TONE.blocked
  ),

  text("f-title", RX, 466, 390, 18, "DeepSeek-V2's fix: a separate 64-number RoPE key", 4),
  text("f-eq", RX, mf - 9, 60, 18, "score =", 4),
  text("f-qp-l", RX + 64, mf - 32, L, 16, "q′_i", 4, ROLE_TONE.query),
  cell("f-qp", RX + 64, mf - ROW_T / 2, L, ROW_T, ROLE_TONE.query, 4),
  dot("f-d1", RX + 168, mf, 4),
  cell("f-c", RX + 186, C2, COL_T, L, ROLE_TONE.embedding, 4),
  dot("f-plus", RX + 204, mf, 4, "+"),
  text("f-qr-l", RX + 214, mf - 32, 36, 16, "q_R", 4, ROLE_TONE.query),
  cell("f-qr", RX + 226, mf - ROW_T / 2, KR, ROW_T, ROLE_TONE.query, 4),
  dot("f-d2", RX + 240, mf, 4),
  cell("f-kr", RX + 258, mf - KR / 2, COL_T, KR, ROLE_TONE.key, 4),
  text("f-kr-l", RX + 248, mf + 12, 36, 16, "k_R", 4, ROLE_TONE.key),
  text(
    "f-note",
    RX,
    C2 + L + 10,
    390,
    36,
    "Position lives only in the small q_R · k_R term,\nso the 512-number part stays absorbed.",
    4,
    ROLE_TONE.softmax
  ),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "Weight absorption in MLA, as matrix products",
  width: 880,
  height: 664,
  steps: [
    { title: "Naive: rebuild every cached key" },
    { title: "Absorbed: fold W_UK into the query once" },
    { title: "Values: mix the latents first, then up-project" },
    { title: "RoPE blocks the fold; a separate key fixes it" },
  ],
  groups: [
    { id: "g-keys", title: "Keys: head i scores cached token j", tone: ROLE_TONE.key, x: 12, y: 44, w: 440, h: 372 },
    { id: "g-values", title: "Values: head i's output", tone: ROLE_TONE.value, x: 464, y: 44, w: 404, h: 372 },
    { id: "g-rope", title: "Why the RoPE key is separate", tone: ROLE_TONE.block, x: 12, y: 440, w: 856, h: 212 },
  ],
  shapes: [...keys, ...values, ...rope],
};

export default spec;
