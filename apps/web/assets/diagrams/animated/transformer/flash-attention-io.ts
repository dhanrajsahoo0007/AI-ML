import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { ROLE_TONE } from "@/components/diagrams/presets/transformer";

// What FlashAttention avoids, replacing the Mermaid under "What FlashAttention avoids" on the Efficient Attention page.
// Two panels over the same two-level GPU memory: on-chip SRAM (top, small and fast) and HBM (bottom, large and slow).
// Every arrow between the two rows is memory traffic; heavy arrows carry an n × n matrix, thin arrows n × d data.
//
// Facts checked against Dao et al., 2022, "FlashAttention" (arXiv 2205.14135):
// - Figure 1 / §2.1: A100 SRAM ≈ 19 TB/s and 20 MB in total (192 KB per each of 108 SMs); HBM 1.5 TB/s and 40 GB
//   (40–80 GB, 1.5–2.0 TB/s across A100 models). SRAM is an order of magnitude faster and many orders smaller.
// - Algorithm 0 (standard attention): 1. load Q, K, compute S = QKᵀ, write S to HBM; 2. read S, compute
//   P = softmax(S), write P to HBM; 3. load P and V, compute O = PV, write O to HBM. So an n × n matrix crosses
//   between SRAM and HBM four times: write S, read S, write P, read P (the heavy arrows, numbered in the pills).
// - Algorithm 1: Q, K, V are split into blocks (tiles) that fit in SRAM; scores S_ij = Q_i K_jᵀ are computed per
//   tile; a running row max m and row sum ℓ (the online softmax) rescale the partial output, so the n × n matrices are
//   never written to HBM. Only Q, K, V, O and the O(n) statistics m, ℓ cross. Loop order: FlashAttention (v1) loops
//   over K, V blocks outside and Q blocks inside; FlashAttention-2 swaps them. The drawing shows the idea common to
//   both: per Q tile, a loop over K, V tiles that accumulates the output tile.
// - Theorem 1: exact, O(n² d) FLOPs, O(n) additional memory beyond inputs and output.
// - Theorem 2: standard attention Θ(n d + n²) HBM accesses; FlashAttention Θ(n² d² / M) with SRAM size M, many times
//   fewer for d = 64–128 and M ≈ 100 KB.
// - §3.1, recomputation: the backward pass recomputes S and P on chip from Q, K, V and the stored statistics instead
//   of reading them from HBM.
//
// Drawing: n × d matrices are 4 cells tall and 1 wide; n × n matrices 4 × 4 (so n is drawn as 4 tiles of rows).

const CELL = 16;
const N = 4; // rows (tiles) drawn
const MAT_Y = 330; // top of the HBM matrices
const OP_Y = 120; // top of the SRAM operation boxes
const OP_H = 44;
const UP_TOP = OP_Y + OP_H + 4; // where arrows into SRAM end (just under the boxes)
const DOWN_END = MAT_Y - 4; // where arrows into HBM end
const SRAM = { y: 76, h: 108 };
const HBM = { y: 300, h: 150 };
const LEFT = { x: 16, w: 448 };
const RIGHT = { x: 480, w: 384 };

const text = (id: string, x: number, y: number, w: number, label: string, tone: LayoutTone = "neutral", h = 18) =>
  ({ id, type: "text", x, y, w, h, label, tone }) as LayoutShape;

/** An n × cols matrix of touching pastel cells; with `tile` set, only that row is pastel (the tile in use). */
function mat(id: string, x: number, cols: number, tone: LayoutTone, tile?: number): LayoutShape[] {
  const out: LayoutShape[] = [];
  for (let r = 0; r < N; r++)
    for (let c = 0; c < cols; c++)
      out.push({
        id: `${id}-${r}-${c}`,
        type: "cell",
        x: x + c * CELL,
        y: MAT_Y + r * CELL,
        w: CELL,
        h: CELL,
        tone,
        fill: tile === undefined || tile === r ? "pastel" : "soft",
        quiet: true,
      });
  return out;
}

const op = (id: string, x: number, w: number, label: string, tone: LayoutTone, sub?: string): LayoutShape => ({
  id,
  type: "box",
  x,
  y: OP_Y,
  w,
  h: OP_H,
  label,
  sub,
  tone,
  fill: "pastel",
});

/** A thin n × d transfer: up from HBM into SRAM, or down. */
const thin = (id: string, x: number, up: boolean, label?: string): LayoutShape => ({
  id,
  type: "arrow",
  x,
  y: up ? DOWN_END : UP_TOP,
  w: 0,
  h: up ? UP_TOP - DOWN_END : DOWN_END - UP_TOP,
  tone: "neutral",
  label,
});

/** A heavy n × n transfer: a thick path with an arrowhead. */
const heavy = (id: string, x: number, up: boolean, tone: LayoutTone): LayoutShape => ({
  id,
  type: "path",
  x: 0,
  y: 0,
  points: up
    ? [
        [x, DOWN_END],
        [x, UP_TOP + 4],
      ]
    : [
        [x, UP_TOP],
        [x, DOWN_END - 4],
      ],
  head: true,
  weight: 0.85,
  tone,
});

/** A label pill with no visible line, centred on (x, y). */
const pill = (id: string, x: number, y: number, label: string, tone: LayoutTone): LayoutShape => ({
  id,
  type: "arrow",
  x,
  y,
  w: 0.1,
  h: 0,
  head: false,
  label,
  tone,
});

const MID = (UP_TOP + DOWN_END) / 2; // 245
const HBM_NOTE = "GPU memory: large, slow";

// ── Left: standard attention ─────────────────────────────────────────────────────────────────────────────────

const L = {
  q: 88,
  k: 112,
  s: 168,
  p: 288,
  v: 392,
  o: 416,
};
const S_TONE = ROLE_TONE.score;
const P_TONE = ROLE_TONE.weight;

const standard: LayoutShape[] = [
  op("l-op1", 80, 112, "S = QKᵀ", ROLE_TONE.matmul),
  op("l-op2", 208, 108, "P = softmax(S)", ROLE_TONE.softmax),
  op("l-op3", 330, 110, "O = PV", ROLE_TONE.matmul),
  ...mat("l-q", L.q, 1, ROLE_TONE.query),
  ...mat("l-k", L.k, 1, ROLE_TONE.key),
  ...mat("l-s", L.s, 4, S_TONE),
  ...mat("l-p", L.p, 4, P_TONE),
  ...mat("l-v", L.v, 1, ROLE_TONE.value),
  ...mat("l-o", L.o, 1, "neutral"),
  text("l-q-name", L.q - 4, MAT_Y + 68, 24, "Q", ROLE_TONE.query),
  text("l-k-name", L.k - 4, MAT_Y + 68, 24, "K", ROLE_TONE.key),
  text("l-s-name", L.s - 8, MAT_Y + 68, 80, "S (n × n)", S_TONE),
  text("l-p-name", L.p - 8, MAT_Y + 68, 80, "P (n × n)", P_TONE),
  text("l-v-name", L.v - 4, MAT_Y + 68, 24, "V", ROLE_TONE.value),
  text("l-o-name", L.o - 4, MAT_Y + 68, 24, "O", "neutral"),
  // n × d traffic.
  thin("l-q-up", L.q + 8, true),
  thin("l-k-up", L.k + 8, true),
  thin("l-v-up", L.v + 8, true),
  thin("l-o-down", L.o + 8, false),
  // n × n traffic: write S, read S, write P, read P.
  heavy("l-s-write", L.s + 12, false, S_TONE),
  heavy("l-s-read", L.s + 52, true, S_TONE),
  heavy("l-p-write", L.p + 12, false, P_TONE),
  heavy("l-p-read", L.p + 52, true, P_TONE),
  pill("l-s-write-pill", L.s + 12, MID - 16, "1 write S", S_TONE),
  pill("l-s-read-pill", L.s + 52, MID + 16, "2 read S", S_TONE),
  pill("l-p-write-pill", L.p + 12, MID - 16, "3 write P", P_TONE),
  pill("l-p-read-pill", L.p + 52, MID + 16, "4 read P", P_TONE),
  text("l-hbm-note", LEFT.x + 16, HBM.y + HBM.h - 28, LEFT.w - 32, HBM_NOTE),
];

// ── Right: FlashAttention ────────────────────────────────────────────────────────────────────────────────────

const R = { q: 560, k: 600, v: 798, o: 830 };
const B1 = { x: 540, w: 110 };
const B3 = { x: 786, w: 72 };
const LOOP_Y = 105;

const flash: LayoutShape[] = [
  op("r-op1", B1.x, B1.w, "S = QKᵀ", ROLE_TONE.matmul, "one score tile"),
  op("r-op2", 666, 104, "online softmax", ROLE_TONE.softmax, "running max, sum"),
  op("r-op3", B3.x, B3.w, "O += PV", ROLE_TONE.matmul, "output tile"),
  { id: "r-op1>op2", type: "arrow", x: 0, y: 0, from: "r-op1", to: "r-op2", tone: "neutral" },
  { id: "r-op2>op3", type: "arrow", x: 0, y: 0, from: "r-op2", to: "r-op3", tone: "neutral" },
  // The loop over K, V tiles: from the output tile back to the score tile, over the top.
  {
    id: "r-loop",
    type: "arrow",
    x: B3.x + B3.w / 2,
    y: OP_Y - 4,
    w: B1.x + B1.w / 2 - (B3.x + B3.w / 2),
    h: 0,
    via: [
      [B3.x + B3.w / 2, LOOP_Y],
      [B1.x + B1.w / 2, LOOP_Y],
    ],
    tone: "neutral",
    label: "next K, V tile",
  },
  ...mat("r-q", R.q, 1, ROLE_TONE.query, 0),
  ...mat("r-k", R.k, 1, ROLE_TONE.key, 0),
  ...mat("r-v", R.v, 1, ROLE_TONE.value, 0),
  ...mat("r-o", R.o, 1, "neutral", 0),
  text("r-q-name", R.q - 4, MAT_Y + 68, 24, "Q", ROLE_TONE.query),
  text("r-k-name", R.k - 4, MAT_Y + 68, 24, "K", ROLE_TONE.key),
  text("r-v-name", R.v - 4, MAT_Y + 68, 24, "V", ROLE_TONE.value),
  text("r-o-name", R.o - 4, MAT_Y + 68, 24, "O", "neutral"),
  text("r-no-nn", 644, MAT_Y + 14, 136, "no n × n matrix\nis ever stored here", "neutral", 36),
  thin("r-q-up", R.q + 8, true),
  thin("r-k-up", R.k + 8, true),
  thin("r-v-up", R.v + 8, true),
  thin("r-o-down", R.o + 8, false),
  pill("r-q-pill", R.q + 8, MID - 16, "Q tile", ROLE_TONE.query),
  pill("r-k-pill", R.k + 8, MID + 16, "K tile", ROLE_TONE.key),
  pill("r-v-pill", R.v + 8, MID - 16, "V tile", ROLE_TONE.value),
  pill("r-o-pill", R.o + 8, MID + 16, "O tile", "neutral"),
  text("r-hbm-note", RIGHT.x + 16, HBM.y + HBM.h - 28, RIGHT.w - 32, HBM_NOTE),
];

const heading = (id: string, panel: { x: number; w: number }, label: string): LayoutShape => ({
  id,
  type: "box",
  x: panel.x + (panel.w - 200) / 2,
  y: 12,
  w: 200,
  h: 32,
  label,
  tone: "neutral",
});

const SUM_Y = HBM.y + HBM.h + 14;

const spec: LayoutSpec = {
  kind: "layout",
  title: "Standard attention vs FlashAttention: memory traffic",
  width: 880,
  height: SUM_Y + 98,
  groups: [
    { id: "l-sram", title: "On-chip SRAM: small, fast", tone: "neutral", x: LEFT.x, y: SRAM.y, w: LEFT.w, h: SRAM.h },
    { id: "l-hbm", title: "HBM", tone: "neutral", x: LEFT.x, y: HBM.y, w: LEFT.w, h: HBM.h },
    { id: "r-sram", title: "On-chip SRAM: small, fast", tone: "neutral", x: RIGHT.x, y: SRAM.y, w: RIGHT.w, h: SRAM.h },
    { id: "r-hbm", title: "HBM", tone: "neutral", x: RIGHT.x, y: HBM.y, w: RIGHT.w, h: HBM.h },
  ],
  shapes: [
    heading("l-title", LEFT, "Standard attention"),
    heading("r-title", RIGHT, "FlashAttention"),
    ...standard,
    ...flash,
    text("l-sum", LEFT.x, SUM_Y, LEFT.w, "S and P (n × n) each go to HBM and back: 4 transfers.", ROLE_TONE.blocked),
    text("r-sum", RIGHT.x, SUM_Y, RIGHT.w, "Only Q, K, V and O cross, one tile at a time.", ROLE_TONE.weight),
    text(
      "note",
      16,
      SUM_Y + 36,
      848,
      'Same arithmetic, far less memory traffic: that is what "IO-aware" means. FlashAttention is exact and needs only\n' +
        "O(n) extra memory (a running max and sum per row); the backward pass recomputes S and P tile by tile.\n" +
        "Heavy arrows carry an n × n matrix, thin arrows n × d data. On an A100, SRAM is about 20 MB at 19 TB/s; HBM is 40 GB at 1.5 TB/s.",
      "neutral",
      50
    ),
  ],
};

export default spec;
