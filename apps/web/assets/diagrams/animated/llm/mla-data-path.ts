import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { ROLE_TONE, block, vector } from "@/components/diagrams/presets/transformer";

// One token's path through Multi-head Latent Attention, for the "Architecture" section of the MLA page. A stepper,
// because the order matters: what is cached is made first, and per-head keys and values come from it later.
// Step 1: h_t is down-projected to the latent c_KV (512 numbers), which goes into the cache.
// Step 2: a separate key k_R (64 numbers) is made from h_t, rotated by RoPE, and cached too.
// Step 3: at attention time, W_UK and W_UV up-project c_KV to per-head keys and values; k_R joins every head's key.
// Step 4: queries (via their own latent c_Q) meet keys and values in 128 heads; W_O maps the heads back to 5120.
//
// Facts checked against DeepSeek-V2 (arXiv 2405.04434), §2.1.2–2.1.3, Appendix C and §3.1.2:
// - c_KV = W_DKV h_t (eq. 9), k_C = W_UK c_KV (eq. 10), v_C = W_UV c_KV (eq. 11); d_c = 512, hidden size 5120.
// - k_R = RoPE(W_KR h_t) (eq. 15), "a shared key", d_h^R = 64; k_{t,i} = [k_C_{t,i}; k_R_t] (eq. 17).
// - Queries: c_Q = W_DQ h_t (eq. 12, d'_c = 1536), q_C = W_UQ c_Q, q_R = RoPE(W_QR c_Q), q_{t,i} = [q_C; q_R].
// - Scores are scaled by sqrt(d_h + d_h^R) = sqrt(128 + 64) (eq. 18); u_t = W_O [o_1; …; o_128] (eq. 19).
// - "During inference, the decoupled key should also be cached": the cache holds c_KV and k_R, (d_c + d_h^R) = 576
//   numbers per token per layer. DeepSeek-V3 (arXiv 2412.19437, §4.2) uses the same 128 / 128 / 512 / 1536 / 64.
// - Not drawn: the RMSNorm after each latent and the extra scaling factors (§3.1.2), and the absorption of W_UK and
//   W_UV at inference (shown in mla-absorption).
//
// Drawn to scale where it is a vector: c_KV is 8 cells and k_R 1 cell (512 : 64 = 8 : 1). h_t is not to scale.
// Colours: Linear projections violet, attention orange, queries blue, keys teal, values violet (Transformer legend);
// the latent c_KV is pink (a compressed token representation, see mla-cache-per-token).

const D_MODEL = 5120;
const D_C = 512;
const D_CQ = 1536;
const D_R = 64;
const HEADS = 128;
const D_H = 128;
const CELL = 16;

// ── Grid (row centres, column lefts) ─────────────────────────────────────────────────────────────────────────
const Y = { q: 80, v: 170, c: 220, k: 270, r: 360 };
const X = { h: 24, bus: 56, proj: 80, rope: 236, cache: 290, up: 480, heads: 630, attn: 780 };
const PROJ_W = 124;
const UP_W = 110;
const HEADS_W = 120;
const ATTN_W = 86;
const H = 44;
const top = (cy: number, h = H) => cy - h / 2;

const text = (
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  step: number,
  tone: LayoutTone = "neutral"
): LayoutShape => ({ id, type: "text", x, y, w, h, label, tone, step, quiet: true });

const free = (id: string, x: number, y: number, w: number, h: number, step: number, label?: string): LayoutShape => ({
  id,
  type: "arrow",
  x,
  y,
  w,
  h,
  label,
  step,
  quiet: true,
});

const line = (id: string, points: [number, number][], step: number): LayoutShape => ({
  id,
  type: "path",
  x: 0,
  y: 0,
  points,
  step,
  quiet: true,
});

const quiet = (s: LayoutShape): LayoutShape => ({ ...s, quiet: true });

const H_CELLS = 12; // h_t drawn as 12 cells (not to scale), centred on the latent row
const hTop = Y.c - (H_CELLS * CELL) / 2;
const NOTE_W = 416;

const shapes: LayoutShape[] = [
  // ── Step 1: h_t → W_DKV → c_KV (cached) ──────────────────────────────────────────────────────────────────
  ...vector("h", X.h, hTop, H_CELLS, "neutral", { cell: CELL, vertical: true, step: 1 }),
  text("h-label", 0, hTop + H_CELLS * CELL + 4, 64, 34, `h_t\n${D_MODEL}`, 1),
  free("h>dkv", X.h + CELL, Y.c, X.proj - X.h - CELL, 0, 1),
  block("dkv", "linear", X.proj, top(Y.c), { w: PROJ_W, label: "Down-project\nW_DKV", step: 1 }),
  free("dkv>c", X.proj + PROJ_W, Y.c, X.cache - X.proj - PROJ_W, 0, 1),
  ...vector("c", X.cache, Y.c - CELL / 2, D_C / 64, ROLE_TONE.embedding, { cell: CELL, step: 1 }),
  text("c-label", X.cache - 8, Y.c + CELL / 2 + 4, 144, 18, `c_KV · ${D_C} numbers`, 1, ROLE_TONE.embedding),
  text(
    "note-1",
    16,
    432,
    NOTE_W,
    36,
    `1. One ${D_C}-number latent stands in for ${HEADS} keys and ${HEADS} values\n(${(2 * HEADS * D_H).toLocaleString("en-US")} numbers in plain multi-head attention).`,
    1
  ),

  // ── Step 2: h_t → W_KR → RoPE → k_R (cached, shared by every head) ───────────────────────────────────────
  line(
    "bus-r",
    [
      [X.bus, Y.c],
      [X.bus, Y.r],
    ],
    2
  ),
  free("bus>kr", X.bus, Y.r, X.proj - X.bus, 0, 2),
  block("kr", "linear", X.proj, top(Y.r), { w: PROJ_W, label: "RoPE key\nW_KR", step: 2 }),
  {
    id: "rope",
    type: "circle",
    x: X.rope,
    y: Y.r,
    w: 28,
    symbol: "sine",
    tone: ROLE_TONE.position,
    label: "RoPE",
    step: 2,
    quiet: true,
  },
  free("kr>rope", X.proj + PROJ_W, Y.r, X.rope - 14 - X.proj - PROJ_W, 0, 2),
  free("rope>r", X.rope + 14, Y.r, X.cache - X.rope - 14, 0, 2),
  ...vector("r", X.cache, Y.r - CELL / 2, D_R / 64, ROLE_TONE.key, { cell: CELL, step: 2 }),
  text("r-label", X.cache - 8, Y.r + CELL / 2 + 4, 144, 18, `k_R · ${D_R} numbers`, 2, ROLE_TONE.key),
  text("cache-total", X.cache - 8, 396, 144, 18, `= ${D_C + D_R} per token, per layer`, 2),
  text(
    "note-2",
    448,
    432,
    NOTE_W,
    36,
    `2. Position rides on a separate ${D_R}-number key, rotated by RoPE\nand shared by all ${HEADS} heads. It is cached too.`,
    2
  ),

  // ── Step 3: up-project c_KV to per-head keys and values; k_R joins every key ─────────────────────────────
  {
    id: "c>uv",
    type: "arrow",
    x: X.cache + (D_C / 64) * CELL,
    y: Y.c,
    to: "uv",
    via: [
      [452, Y.c],
      [452, Y.v],
    ],
    step: 3,
    quiet: true,
  },
  {
    id: "c>uk",
    type: "arrow",
    x: 452,
    y: Y.c,
    to: "uk",
    via: [[452, Y.k]],
    step: 3,
    quiet: true,
  },
  block("uk", "linear", X.up, top(Y.k), { w: UP_W, label: "Up-project\nW_UK", step: 3 }),
  quiet(block("uv", "linear", X.up, top(Y.v), { w: UP_W, label: "Up-project\nW_UV", step: 3 })),
  free("uv>v", X.up + UP_W, Y.v, X.heads - X.up - UP_W, 0, 3),
  free("uk>k", X.up + UP_W, Y.k, X.heads - X.up - UP_W, 0, 3),
  quiet(
    block("vh", "value", X.heads, top(Y.v), {
      w: HEADS_W,
      label: `v_i: ${HEADS} heads`,
      sub: `${D_H} numbers each`,
      step: 3,
    })
  ),
  quiet(
    block("kh", "key", X.heads, top(Y.k), {
      w: HEADS_W,
      label: `k_i: ${HEADS} heads`,
      sub: `${D_H} + ${D_R} (k_R)`,
      step: 3,
    })
  ),
  {
    id: "r>kh",
    type: "arrow",
    x: X.cache + CELL,
    y: Y.r,
    to: "kh",
    via: [[X.heads + HEADS_W / 2, Y.r]],
    label: "same k_R for every head",
    step: 3,
    quiet: true,
  },
  text(
    "note-3",
    16,
    476,
    NOTE_W,
    36,
    "3. At attention time, W_UK and W_UV rebuild each head's key and value\nfrom c_KV. In decoding they are absorbed instead (next figure).",
    3
  ),

  // ── Step 4: queries, attention per head, output projection ──────────────────────────────────────────────
  line(
    "bus-q",
    [
      [X.bus, Y.c],
      [X.bus, Y.q],
    ],
    4
  ),
  free("bus>q", X.bus, Y.q, X.proj - X.bus, 0, 4),
  quiet(block("qp", "linear", X.proj, top(Y.q), { w: PROJ_W, label: "Query path\nvia c_Q", step: 4 })),
  free("qp>q", X.proj + PROJ_W, Y.q, X.heads - X.proj - PROJ_W, 0, 4, `c_Q · ${D_CQ} numbers, not cached`),
  quiet(
    block("qh", "query", X.heads, top(Y.q), {
      w: HEADS_W,
      label: `q_i: ${HEADS} heads`,
      sub: `${D_H} + ${D_R} (q_R, RoPE)`,
      step: 4,
    })
  ),
  block("attn", "attention", X.attn, top(Y.q), {
    w: ATTN_W,
    h: Y.k + H / 2 - top(Y.q),
    label: "Attention\nper head\n× 128",
    step: 4,
  }),
  free("q>attn", X.heads + HEADS_W, Y.q, X.attn - X.heads - HEADS_W, 0, 4),
  free("v>attn", X.heads + HEADS_W, Y.v, X.attn - X.heads - HEADS_W, 0, 4),
  free("k>attn", X.heads + HEADS_W, Y.k, X.attn - X.heads - HEADS_W, 0, 4),
  quiet(block("wo", "linear", X.attn, 320, { w: ATTN_W, h: 30, label: "W_O", step: 4 })),
  free("attn>wo", X.attn + ATTN_W / 2, Y.k + H / 2, 0, 320 - Y.k - H / 2, 4),
  free("wo>out", X.attn + ATTN_W / 2, 350, 0, 26, 4),
  text("out", X.attn - 10, 378, ATTN_W + 20, 34, `output u_t\n${D_MODEL}`, 4),
  text(
    "note-4",
    448,
    476,
    NOTE_W,
    36,
    `4. Each head scores q_i · k_i / √(${D_H} + ${D_R}), mixes its values,\nand W_O maps the ${HEADS} head outputs back to ${D_MODEL}.`,
    4
  ),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "The MLA data path: what is cached and what is rebuilt",
  width: 880,
  height: 524,
  steps: [
    { title: "Compress h_t into the latent c_KV and cache it" },
    { title: "Make a small RoPE key k_R and cache it too" },
    { title: "Up-project c_KV to per-head keys and values" },
    { title: "Queries meet keys and values in 128 heads" },
  ],
  groups: [
    {
      id: "g-cache",
      title: "KV cache",
      tone: ROLE_TONE.key,
      x: 268,
      y: 186,
      w: 172,
      h: 236,
    },
  ],
  shapes,
};

export default spec;
