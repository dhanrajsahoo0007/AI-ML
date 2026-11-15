import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";

// GPU memory to self-host a 70B dense model, for "Closed APIs versus open-weight models" on the Choosing a Model page.
// Memory = weights + KV cache (+ headroom for activations and the runtime, not drawn).
//
// Facts checked against the Llama 3.1 70B config.json on Hugging Face (meta-llama/Llama-3.1-70B, read 2026-11-15):
// num_hidden_layers 80, num_attention_heads 64, num_key_value_heads 8, hidden_size 8192 (head dim 8192 / 64 = 128),
// max_position_embeddings 131072, torch_dtype bfloat16. The model card lists it as a 70B model.
//
// Working (GB = 10^9 bytes):
//   Weights = parameters × bytes per parameter
//     16-bit: 70e9 × 2   = 140 GB
//     4-bit:  70e9 × 0.5 =  35 GB (real 4-bit formats also store scales, so files run a few GB larger)
//   KV cache per token = 2 (K and V) × 80 layers × 8 KV heads × 128 dims × 2 bytes = 327,680 B ≈ 0.33 MB
//   Workload A: 16 concurrent requests × 4,096 tokens = 65,536 tokens × 327,680 B = 21.47 GB
//   Workload B: one request at the full 131,072-token window = 131,072 × 327,680 B = 42.95 GB
//   Totals: 16-bit + A = 161.5 GB; 4-bit + A = 56.5 GB; 4-bit + B = 77.9 GB
//   On 80 GB GPUs: 161.5 GB needs at least 3 by memory; tensor parallelism splits heads evenly, and 3 does not
//   divide 64 query heads or 8 KV heads, so 4 GPUs in practice. 56.5 GB fits one. 77.9 GB fills one to 97%,
//   leaving about 2 GB for activations and the runtime.
//
// Scale: 240 GB → 600 px (2.5 px per GB). Weights violet, KV cache teal (keys teal, as in the Transformer legend).

const PARAMS = 70e9;
const LAYERS = 80;
const KV_HEADS = 8;
const HEAD_DIM = 128;
const KV_BYTES = 2;
const GB = 1e9;
const GPU_GB = 80;

const KV_PER_TOKEN = 2 * LAYERS * KV_HEADS * HEAD_DIM * KV_BYTES; // 327,680 B
if (KV_PER_TOKEN !== 327_680) throw new Error(`KV per token should be 327,680 B, got ${KV_PER_TOKEN}`);
const TOK_A = 16 * 4_096; // 65,536
const TOK_B = 131_072;
const kvGB = (tokens: number) => (tokens * KV_PER_TOKEN) / GB;

interface Row {
  id: string;
  name: string;
  sub: string;
  weights: number;
  kv: number;
  verdict: string;
  tone: LayoutTone;
}
const ROWS: Row[] = [
  {
    id: "bf16",
    name: "16-bit weights",
    sub: "16 × 4,096-token requests",
    weights: (PARAMS * 2) / GB,
    kv: kvGB(TOK_A),
    verdict: "",
    tone: "red",
  },
  {
    id: "int4",
    name: "4-bit weights",
    sub: "16 × 4,096-token requests",
    weights: (PARAMS * 0.5) / GB,
    kv: kvGB(TOK_A),
    verdict: "",
    tone: "green",
  },
  {
    id: "int4-long",
    name: "4-bit weights",
    sub: "1 × 131,072-token request",
    weights: (PARAMS * 0.5) / GB,
    kv: kvGB(TOK_B),
    verdict: "",
    tone: "orange",
  },
];
const totalGB = (r: Row) => r.weights + r.kv;
ROWS[0].verdict = `${totalGB(ROWS[0]).toFixed(1)} GB: ≥ ${Math.ceil(totalGB(ROWS[0]) / GPU_GB)} GPUs, 4 in practice`;
ROWS[1].verdict = `${totalGB(ROWS[1]).toFixed(1)} GB: fits one GPU`;
ROWS[2].verdict = `${totalGB(ROWS[2]).toFixed(1)} GB: one GPU, ${Math.round((totalGB(ROWS[2]) / GPU_GB) * 100)}% full`;

const fmt = (n: number) => (Number.isInteger(n) ? `${n}` : n.toFixed(1));

// ── Grid ───────────────────────────────────────────────────────────────────────────────────────────────────────
const BAR_X = 230;
const PX_PER_GB = 2.5;
const SCALE_GB = 240;
const BAR_H = 34;
const RULER_Y = 96;
const FIRST = 160;
const ROW_STEP = 74;
const NAME_X = 16;
const NAME_W = 206;
const BOTTOM = FIRST + ROWS.length * ROW_STEP - 20;

const text = (
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  tone: LayoutTone = "neutral"
): LayoutShape => ({ id, type: "text", x, y, w, h, label, tone });

/** A text box as wide as its longest line (about 6.2 px per character), so a centred label reads left-aligned. */
const hug = (label: string) => Math.round(Math.max(...label.split("\n").map((l) => l.length)) * 6.2) + 8;

const shapes: LayoutShape[] = [];

// Dashed GPU boundaries first, so the bars draw over them and they show between rows.
for (let k = 1; k <= SCALE_GB / GPU_GB; k++) {
  const x = BAR_X + k * GPU_GB * PX_PER_GB;
  shapes.push({
    id: `gpu-line-${k}`,
    type: "path",
    x: 0,
    y: 0,
    points: [
      [x, RULER_Y + 30],
      [x, BOTTOM],
    ],
    tone: "neutral",
    weight: 0.35,
    dashed: true,
  });
}

// The ruler: three 80 GB GPUs on the same scale.
for (let k = 0; k < SCALE_GB / GPU_GB; k++) {
  shapes.push({
    id: `gpu-${k + 1}`,
    type: "cell",
    x: BAR_X + k * GPU_GB * PX_PER_GB,
    y: RULER_Y,
    w: GPU_GB * PX_PER_GB,
    h: 30,
    tone: "neutral",
    fill: "paper",
    label: `GPU ${k + 1} · ${GPU_GB} GB`,
  });
}
shapes.push(text("ruler-name", NAME_X, RULER_Y, NAME_W, 30, "80 GB GPUs, same scale"));

ROWS.forEach((r, i) => {
  const y = FIRST + i * ROW_STEP;
  const wW = r.weights * PX_PER_GB;
  const wK = Math.round(r.kv * PX_PER_GB * 10) / 10;
  shapes.push(
    text(`${r.id}-name`, NAME_X, y - 6, NAME_W, 22, r.name),
    text(`${r.id}-sub`, NAME_X, y + 16, NAME_W, 20, r.sub),
    {
      id: `${r.id}-w`,
      type: "cell",
      x: BAR_X,
      y,
      w: wW,
      h: BAR_H,
      tone: "violet",
      fill: "pastel",
      label:
        `weights ${fmt(r.weights)} GB`.length * 6.2 <= wW - 8 ? `weights ${fmt(r.weights)} GB` : `${fmt(r.weights)} GB`,
      quiet: true,
    },
    {
      id: `${r.id}-kv`,
      type: "cell",
      x: BAR_X + wW,
      y,
      w: wK,
      h: BAR_H,
      tone: "teal",
      fill: "pastel",
      label: `KV ${r.kv.toFixed(1)} GB`.length * 6.2 <= wK - 8 ? `KV ${r.kv.toFixed(1)} GB` : `KV ${r.kv.toFixed(1)}`,
      quiet: true,
    },
    text(`${r.id}-verdict`, BAR_X, y + BAR_H + 2, hug(r.verdict), 20, r.verdict, r.tone)
  );
});

shapes.push(
  text(
    "title",
    16,
    16,
    848,
    20,
    "Self-hosting a 70B dense model (Llama 3.1 70B shape: 80 layers, 8 KV heads of 128 dims)"
  ),
  text(
    "formula",
    16,
    42,
    848,
    20,
    "Memory ≈ parameters × bytes per parameter + KV cache, plus headroom for activations and the runtime"
  ),
  text(
    "kv-working",
    16,
    BOTTOM + 14,
    848,
    36,
    `KV cache per token = 2 × ${LAYERS} layers × ${KV_HEADS} KV heads × ${HEAD_DIM} dims × 2 bytes = ` +
      `${KV_PER_TOKEN.toLocaleString("en-US")} B ≈ 0.33 MB.\n` +
      "Tensor parallelism splits the 64 query heads and 8 KV heads evenly, so 3 GPUs do not work: use 4.",
    "neutral"
  )
);

const spec: LayoutSpec = {
  kind: "layout",
  title: "GPU memory for a 70B model: 16-bit vs 4-bit, plus KV cache",
  width: 880,
  height: BOTTOM + 14 + 36 + 16,
  shapes,
};

export default spec;
