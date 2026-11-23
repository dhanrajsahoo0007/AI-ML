import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { ROLE_TONE } from "@/components/diagrams/presets/transformer";
import { BUDGET, KV } from "@/components/diagrams/presets/llm-efficient";

// The KV cache at a real context length and batch, against the memory of one GPU node. Efficient Attention page,
// "KV cache at scale". The page's model (80 layers, d_head 128, 16-bit; the shape of Llama 2 70B) serving 8
// sequences of 32,768 tokens on 8 GPUs × 80 GB = 640 GB, with full multi-head attention (64 KV heads), grouped-query
// attention (8) and multi-query attention (1). All numbers come from `presets/llm-efficient.ts`, whose header comment
// has the working and the sources:
//   cache, batch 8: MHA 687.2 GB · GQA 85.9 GB · MQA 10.7 GB; weights 140 GB (70B × 2 bytes)
//   total: MHA 827.2 GB, 187.2 GB over the node's 640 GB · GQA 225.9 GB · MQA 150.7 GB
//   largest batch at 32,768 tokens in the 500 GB left after the weights: MHA 5 · GQA 46 · MQA 372
//
// Geometry: one horizontal bar per design on one scale, 0.64 px per GB from x = 200, so the node's 640 GB ends at
// x = 609.6 (a dashed tick through each bar). Each bar is the weights (neutral), then the cache, half keys (teal) and
// half values (violet); the part of MHA's bar past 640 GB is red (blocked: it does not fit). Bars are 28 px tall,
// rows 100 px apart; the working sits under each bar.

const X0 = 200;
const PX_PER_GB = 0.64;
const BAR_H = 28;
const ROW_Y = [92, 192, 292];
const GB = 1e9;
const px = (bytes: number) => (bytes / GB) * PX_PER_GB;
const CAP_X = X0 + px(BUDGET.node); // 609.6
const gb = (bytes: number) => (bytes / GB).toFixed(1);

const text = (id: string, x: number, y: number, w: number, label: string, tone: LayoutTone = "neutral", h = 18) =>
  ({ id, type: "text", x, y, w, h, label, tone }) as LayoutShape;

const cell = (id: string, x: number, y: number, w: number, tone: LayoutTone, label?: string): LayoutShape => ({
  id,
  type: "cell",
  x: Math.round(x * 10) / 10,
  y,
  w: Math.round(w * 10) / 10,
  h: BAR_H,
  label,
  tone,
  fill: "pastel",
  quiet: true,
});

/** A bar segment from x0 to x1, split at the node's capacity: the part past it is red. */
function segment(id: string, x0: number, x1: number, y: number, tone: LayoutTone): LayoutShape[] {
  if (x1 <= CAP_X) return [cell(id, x0, y, x1 - x0, tone)];
  if (x0 >= CAP_X) return [cell(`${id}-over`, x0, y, x1 - x0, ROLE_TONE.blocked)];
  return [cell(id, x0, y, CAP_X - x0, tone), cell(`${id}-over`, CAP_X, y, x1 - CAP_X, ROLE_TONE.blocked)];
}

function row(r: number): LayoutShape[] {
  const v = KV.variants[r];
  const b = BUDGET.rows[r];
  const y = ROW_Y[r];
  const wEnd = X0 + px(BUDGET.weights);
  const kEnd = wEnd + px(v.batchBytes) / 2;
  const end = wEnd + px(v.batchBytes);
  const over = b.total - BUDGET.node;
  return [
    text(`${v.id}-name`, 16, y - 4, 168, `${v.name}\n${v.hKv} KV head${v.hKv > 1 ? "s" : ""}`, ROLE_TONE.key, 36),
    cell(`${v.id}-weights`, X0, y, wEnd - X0, "neutral", "weights"),
    ...segment(`${v.id}-k`, wEnd, kEnd, y, ROLE_TONE.key),
    ...segment(`${v.id}-v`, kEnd, end, y, ROLE_TONE.value),
    text(
      `${v.id}-total`,
      end + 8,
      b.fits ? y + 5 : y - 4,
      b.fits ? 120 : 128,
      b.fits ? `${gb(b.total)} GB: fits` : `${gb(b.total)} GB\n${gb(over)} GB over`,
      b.fits ? "neutral" : ROLE_TONE.blocked,
      b.fits ? 18 : 36
    ),
    {
      id: `${v.id}-cap`,
      type: "path",
      x: 0,
      y: 0,
      points: [
        [CAP_X, y - 8],
        [CAP_X, y + BAR_H + 8],
      ],
      dashed: true,
      tone: "neutral",
    },
    text(
      `${v.id}-working`,
      X0,
      y + BAR_H + 12,
      648,
      `cache 2 × ${KV.layers} × ${v.hKv} × ${KV.dHead} × ${KV.bytes} B × ${KV.seq.toLocaleString("en-US")} × ${KV.batch}` +
        ` = ${gb(v.batchBytes)} GB · largest batch that fits: ${b.maxBatch}`
    ),
  ];
}

const LEGEND_Y = 400;
const legend = (id: string, x: number, tone: LayoutTone, label: string, w: number): LayoutShape[] => [
  { id, type: "cell", x, y: LEGEND_Y, w: 16, h: 16, tone, fill: "pastel", quiet: true },
  text(`${id}-text`, x + 20, LEGEND_Y - 1, w, label, tone === "neutral" ? "neutral" : tone),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "KV cache at 32,768 tokens and batch 8 on one 640 GB node",
  width: 880,
  height: 490,
  shapes: [
    text(
      "head",
      16,
      14,
      848,
      `The page's model (${KV.layers} layers, d_head ${KV.dHead}, 16-bit) serving ${KV.batch} sequences of ` +
        `${KV.seq.toLocaleString("en-US")} tokens on 8 GPUs × 80 GB`
    ),
    text("cap-label", CAP_X - 110, 56, 220, `node memory: ${gb(BUDGET.node).replace(".0", "")} GB`),
    ...ROW_Y.flatMap((_, r) => row(r)),
    ...legend("leg-w", 200, "neutral", "weights, 140 GB", 100),
    ...legend("leg-k", 340, ROLE_TONE.key, "keys", 40),
    ...legend("leg-v", 420, ROLE_TONE.value, "values", 52),
    ...legend("leg-over", 512, ROLE_TONE.blocked, "past the node's memory", 150),
    text(
      "note",
      16,
      LEGEND_Y + 32,
      848,
      `Bars share one scale. Weights: 70B parameters × 2 bytes = 140 GB; activations ignored.\n` +
        `Fewer KV heads leave room for ${BUDGET.rows[1].maxBatch} sequences (GQA) instead of ${BUDGET.rows[0].maxBatch} (MHA).`,
      "neutral",
      36
    ),
  ],
};

export default spec;
