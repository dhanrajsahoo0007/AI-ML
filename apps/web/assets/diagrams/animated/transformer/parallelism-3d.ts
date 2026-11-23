import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { ROLE_TONE, matrix } from "@/components/diagrams/presets/transformer";

// How one large training job is split across GPUs: 3D parallelism.
// - Data parallel: two replicas of the whole model side by side (more are implied by "…"). Each one reads a
//   different batch (A, B); after the backward pass each stage averages its gradients with the same stage in every
//   other replica (an all-reduce). ZeRO / FSDP shard optimizer states, gradients and weights across those replicas.
// - Pipeline parallel: each replica is a pipeline of 3 stages holding layers 1–20, 21–40 and 41–60 (a 60-layer model,
//   as on the page). A batch is cut into 4 micro-batches that flow through the stages one after another.
// - Tensor parallel: inside one stage (a server of 4 GPUs) a weight matrix is split column-wise. Every GPU holds the
//   same input X, multiplies it by its own column block W_i, and gets the matching slice Y_i of Y = X W; an all-gather
//   joins the slices (Megatron-LM, Shoeybi et al., 2019, arXiv 1909.08053, §3: "column parallel" first GEMM of the
//   MLP; the next GEMM is split by rows and ends in an all-reduce instead).
//
// Pipeline schedule (forward pass only, GPipe style): micro-batch m (1..4) runs on stage s (1..3) at time slot
// t = m + s − 1, so the pass takes 4 + 3 − 1 = 6 slots. Of 3 × 6 = 18 stage-slots, 12 do work and 6 sit idle: the
// bubble is (stages − 1) / (micro-batches + stages − 1) = 2 / 6 = one third (GPipe, Huang et al., 2019,
// arXiv 1811.06965, gives the bubble overhead as O((K − 1) / (M + K − 1))).
//
// The weight shades are illustrative only: cell (r, c) of block g has weight 0.25 + 0.5 · |sin(1.3 r + 0.9 c + 2 g)|.

const STAGES = [
  { label: "Stage 1", layers: "layers 1–20" },
  { label: "Stage 2", layers: "layers 21–40" },
  { label: "Stage 3", layers: "layers 41–60" },
];
const MICRO = 4;
const GPUS = 4;
const SLOTS = MICRO + STAGES.length - 1; // 6
const BUBBLE = `${(STAGES.length - 1).toString()} / ${SLOTS}`; // "2 / 6"

const MB_TONE: LayoutTone = "blue"; // micro-batches, at the top of each replica and in the schedule
const W_TONE: LayoutTone = ROLE_TONE.linear; // a Linear layer's weight matrix, violet as in the Transformer legend

const text = (id: string, x: number, y: number, w: number, label: string, h = 20, tone: LayoutTone = "neutral") =>
  ({ id, type: "text", x, y, w, h, label, tone }) as LayoutShape;
const arrow = (id: string, x: number, y: number, w: number, h: number, extra: Partial<LayoutShape> = {}) =>
  ({ id, type: "arrow", x, y, w, h, ...extra }) as LayoutShape;
const path = (id: string, points: [number, number][], extra: Partial<LayoutShape> = {}) =>
  ({ id, type: "path", x: 0, y: 0, points, ...extra }) as LayoutShape;

// ── Replicas (data parallel), each a pipeline of three stages ────────────────────────────────────────────────
const REP = { y: 40, w: 200, h: 314 };
const REP_X = [24, 360];
const ST = { w: 160, h: 48, y0: 140, pitch: 74 };
const stageY = (s: number) => ST.y0 + s * ST.pitch;
const MB_CELL = 26;
const MB_Y = 86;
const ZOOM_REP = 1; // the replica whose stage 2 is zoomed
const ZOOM_STAGE = 1;

function replica(r: number): LayoutShape[] {
  const gx = REP_X[r];
  const cx = gx + REP.w / 2;
  const batch = r === 0 ? "A" : "B";
  const out: LayoutShape[] = [
    text(`r${r}-batch`, gx + 10, 60, REP.w - 20, `batch ${batch}: ${MICRO} micro-batches`),
    ...Array.from({ length: MICRO }, (_, m): LayoutShape => ({
      id: `r${r}-mb${m}`,
      type: "cell",
      x: cx - (MICRO * MB_CELL) / 2 + m * MB_CELL,
      y: MB_Y,
      w: MB_CELL,
      h: 22,
      label: String(m + 1),
      tone: MB_TONE,
      fill: "pastel",
    })),
    arrow(`r${r}-in`, cx, MB_Y + 26, 0, stageY(0) - 4 - (MB_Y + 26)),
  ];
  STAGES.forEach((st, s) => {
    const zoomed = r === ZOOM_REP && s === ZOOM_STAGE;
    out.push({
      id: `r${r}-s${s}`,
      type: "box",
      x: cx - ST.w / 2,
      y: stageY(s),
      w: ST.w,
      h: ST.h,
      label: st.label,
      sub: `${st.layers} · ${GPUS} GPUs`,
      tone: zoomed ? W_TONE : "neutral",
      fill: "pastel",
    });
    if (s > 0)
      out.push({ id: `r${r}-s${s - 1}>s${s}`, type: "arrow", x: 0, y: 0, from: `r${r}-s${s - 1}`, to: `r${r}-s${s}` });
  });
  return out;
}

// Gradient averaging: a two-way link between the same stage of the two replicas (two arrows on one line).
const gradX1 = REP_X[0] + REP.w / 2 + ST.w / 2 + 4;
const gradX2 = REP_X[1] + REP.w / 2 - ST.w / 2 - 4;
const gradients: LayoutShape[] = STAGES.flatMap((_, s) => {
  const y = stageY(s) + ST.h / 2;
  return [
    arrow(`grad${s}-r`, gradX1, y, gradX2 - gradX1, 0),
    // The label rides on the second arrow, which is drawn last, so the first line does not cross its pill.
    arrow(`grad${s}-l`, gradX2, y, gradX1 - gradX2, 0, { label: s === 1 ? "average gradients" : undefined }),
  ];
});

// ── Zoom: tensor parallel inside one stage ───────────────────────────────────────────────────────────────────
const Z = { x: 600, y: 80, w: 264, h: 320 };
const W_CELL = 18;
const W_ROWS = 5;
const W_COLS = 2; // per GPU
const BLOCK_W = W_COLS * W_CELL; // 36
const BLOCK_GAP = 22;
const blocksW = GPUS * BLOCK_W + (GPUS - 1) * BLOCK_GAP; // 210
const bx0 = Z.x + (Z.w - blocksW) / 2 + 8; // nudged right to leave room for the "W" label
const blockX = (g: number) => bx0 + g * (BLOCK_W + BLOCK_GAP);
const blockCx = (g: number) => blockX(g) + BLOCK_W / 2;
const X_Y = Z.y + 36;
const W_Y = X_Y + 52;
const GPU_Y = W_Y + W_ROWS * W_CELL + 4;
const Y_Y = GPU_Y + 40;
const weights = (g: number) =>
  Array.from({ length: W_ROWS }, (_, r) =>
    Array.from(
      { length: W_COLS },
      (_, c) => Math.round((0.25 + 0.5 * Math.abs(Math.sin(1.3 * r + 0.9 * c + 2 * g))) * 100) / 100
    )
  );

const zoomStage = { x: REP_X[ZOOM_REP] + REP.w / 2 + ST.w / 2, y: stageY(ZOOM_STAGE) };
const zoom: LayoutShape[] = [
  // Dashed lines from the zoomed stage to the panel.
  path(
    "zoom-top",
    [
      [zoomStage.x + 2, zoomStage.y],
      [Z.x, Z.y],
    ],
    { dashed: true }
  ),
  path(
    "zoom-bottom",
    [
      [zoomStage.x + 2, zoomStage.y + ST.h],
      [Z.x, Z.y + Z.h],
    ],
    { dashed: true }
  ),
  {
    id: "x",
    type: "box",
    x: bx0,
    y: X_Y,
    w: blocksW,
    h: 30,
    label: "X: the same input on every GPU",
    tone: "neutral",
  },
  text("w-label", bx0 - 30, W_Y, 24, "W", W_ROWS * W_CELL, W_TONE),
  ...Array.from({ length: GPUS }, (_, g): LayoutShape[] => [
    arrow(`x>w${g}`, blockCx(g), X_Y + 34, 0, W_Y - 4 - (X_Y + 34)),
    ...matrix(`w${g}`, blockX(g), W_Y, weights(g), W_TONE, { cell: W_CELL }),
    text(`gpu${g}`, blockX(g) - 10, GPU_Y, BLOCK_W + 20, `GPU ${g + 1}`, 18, W_TONE),
    arrow(`w${g}>y`, blockCx(g), GPU_Y + 20, 0, Y_Y - 4 - (GPU_Y + 20)),
    {
      id: `y${g}`,
      type: "cell",
      x: blockX(g),
      y: Y_Y,
      w: BLOCK_W,
      h: 26,
      label: `Y${"₁₂₃₄"[g]}`,
      tone: "neutral",
      fill: "soft",
    },
  ]).flat(),
  text(
    "tp-note",
    Z.x + 12,
    Y_Y + 36,
    Z.w - 24,
    "Each GPU multiplies X by its own\ncolumns; an all-gather over the\nserver's fast links joins Y.",
    52
  ),
];

// ── Pipeline schedule for one replica (forward pass) ─────────────────────────────────────────────────────────
const S = { x: 24, y: 410, w: 536, h: 150 };
const SC = { x: 110, y: 456, w: 40, h: 24 };
const schedule: LayoutShape[] = [
  ...Array.from({ length: SLOTS }, (_, t) => text(`t${t}`, SC.x + t * SC.w, SC.y - 22, SC.w, `t${t + 1}`, 18)),
  ...STAGES.flatMap((st, s): LayoutShape[] => [
    text(`row${s}`, S.x + 12, SC.y + s * SC.h, SC.x - S.x - 20, st.label, SC.h),
    ...Array.from({ length: SLOTS }, (_, t): LayoutShape => {
      const m = t - s + 1; // the micro-batch on stage s at slot t, if any
      const busy = m >= 1 && m <= MICRO;
      return {
        id: `slot${s}-${t}`,
        type: "cell",
        x: SC.x + t * SC.w,
        y: SC.y + s * SC.h,
        w: SC.w,
        h: SC.h,
        label: busy ? String(m) : undefined,
        tone: busy ? MB_TONE : "neutral",
        fill: busy ? "pastel" : "paper",
      };
    }),
  ]),
  text(
    "bubble-note",
    SC.x + SLOTS * SC.w + 16,
    SC.y - 4,
    S.x + S.w - (SC.x + SLOTS * SC.w + 16) - 8,
    `Empty cells are the bubble:\nidle GPUs, ${BUBBLE} of the slots here.\nMore micro-batches shrink it.`,
    56
  ),
  path(
    "time-axis",
    [
      [SC.x, SC.y + STAGES.length * SC.h + 10],
      [SC.x + SLOTS * SC.w, SC.y + STAGES.length * SC.h + 10],
    ],
    { head: true }
  ),
  text("time-label", SC.x, SC.y + STAGES.length * SC.h + 14, SLOTS * SC.w, "time", 18),
];

const summary = text(
  "summary",
  Z.x,
  S.y + 10,
  Z.w,
  "Tensor parallel: inside a server.\nPipeline parallel: across servers.\nData parallel: across replicas.",
  52
);
const summary2 = text("summary2", Z.x, S.y + 70, Z.w, "Together: 3D parallelism.");

const spec: LayoutSpec = {
  kind: "layout",
  title: "Data, pipeline and tensor parallelism in one training job",
  width: 880,
  height: S.y + S.h + 16,
  groups: [
    ...REP_X.map((x, r) => ({
      id: `rep${r}`,
      title: `Replica ${r + 1}`,
      tone: "neutral" as LayoutTone,
      x,
      y: REP.y,
      w: REP.w,
      h: REP.h,
    })),
    { id: "zoom", title: "Stage 2: tensor parallel", tone: W_TONE, ...Z },
    { id: "schedule", title: "Pipeline schedule: forward pass", tone: "neutral", ...S },
  ],
  shapes: [
    ...replica(0),
    ...replica(1),
    text("more", REP_X[1] + REP.w + 2, REP.y - 12, 34, "…", 24),
    ...gradients,
    text("zero", gradX1, stageY(1) + ST.h / 2 + 14, gradX2 - gradX1, "sharded with\nZeRO / FSDP", 36),
    ...zoom,
    ...schedule,
    summary,
    summary2,
  ],
};

export default spec;
