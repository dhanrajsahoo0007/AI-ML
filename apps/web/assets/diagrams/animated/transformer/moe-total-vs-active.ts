import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { ROLE_TONE } from "@/components/diagrams/presets/transformer";

// Total vs active parameters in Mixtral 8x7B, as two bars on one scale. New figure for "Total vs active parameters"
// on the Mixture of Experts page. Top bar: everything stored (shared parts + 8 expert FFNs). Bottom bar: what one token
// uses (shared parts + the 2 experts the router picks in each layer); the other 6 are drawn as empty outlines.
//
// Facts checked against Mixtral of Experts (Jiang et al., 2024, arXiv 2401.04088): Table 1 gives dim 4096,
// n_layers 32, head_dim 128, hidden_dim 14336, n_heads 32, n_kv_heads 8, vocab_size 32000, num_experts 8,
// top_k_experts 2; §2.1: "each token has access to 47B parameters, but only uses 13B active parameters during
// inference". Mistral AI's release note gives the finer figures, 46.7B total and 12.9B per token; the count below
// reproduces both from Table 1.
//
// Working (SwiGLU experts have three d × hidden matrices; attention uses grouped-query K and V of 8 × 128 = 1024):
//   one expert in one layer   = 3 × 4096 × 14336                          = 176,160,768
//   one expert slot, 32 layers = 176,160,768 × 32                         = 5,637,144,576  (≈ 5.6B)
//   all 8 experts              = 5,637,144,576 × 8                        = 45,097,156,608 (≈ 45.1B)
//   attention, 32 layers       = (4096 × (4096 + 1024 + 1024) + 4096 × 4096) × 32 = 1,342,177,280
//   embedding + output head    = 2 × 32000 × 4096 (not tied)             = 262,144,000
//   routers                    = 4096 × 8 × 32                            = 1,048,576
//   RMSNorm weights            = (2 × 32 + 1) × 4096                      = 266,240
//   shared total               = 1,605,636,096 (≈ 1.6B)
//   total  = 1,605,636,096 + 45,097,156,608 = 46,702,792,704 ≈ 46.7B ("about 47B")
//   active = 1,605,636,096 + 2 × 5,637,144,576 = 12,879,925,248 ≈ 12.9B ("about 13B")
// The bars share one scale: 640 px for the total, so the shared part is 22 px and each expert slot 77 px.
// Memory, quoted on the page: at 16 bits (2 bytes) per parameter the weights alone take 46,702,792,704 × 2 =
// 93,405,585,408 bytes ≈ 93.4 GB, more than one 80 GB GPU holds; the active 12,879,925,248 × 2 ≈ 25.8 GB.
// Total over active: 46.7 / 12.9 ≈ 3.6×.

const D = 4096;
const HIDDEN = 14336;
const LAYERS = 32;
const VOCAB = 32000;
const KV_DIM = 8 * 128;
const N_EXPERTS = 8;
const TOP_K = 2;

const EXPERT = 3 * D * HIDDEN * LAYERS; // one expert slot across all layers
const ATTENTION = (D * (D + 2 * KV_DIM) + D * D) * LAYERS;
const EMBED = 2 * VOCAB * D;
const ROUTER = D * N_EXPERTS * LAYERS;
const NORMS = (2 * LAYERS + 1) * D;
const SHARED = ATTENTION + EMBED + ROUTER + NORMS;
const TOTAL = SHARED + N_EXPERTS * EXPERT;
const ACTIVE = SHARED + TOP_K * EXPERT;

const B = (n: number) => `${(n / 1e9).toFixed(1)}B`;

const BAR_X = 210;
const BAR_W = 640;
const BAR_H = 44;
const px = (n: number) => (n / TOTAL) * BAR_W;
const SHARED_W = px(SHARED);
const EXPERT_W = px(EXPERT);
const Y = { title: 14, legend1: 48, legend2: 72, total: 112, totalText: 162, active: 214, activeText: 264, axis: 300 };

const text = (id: string, x: number, y: number, w: number, h: number, label: string, tone: LayoutTone = "neutral") =>
  ({ id, type: "text", x, y, w, h, label, tone }) as LayoutShape;
const r1 = (v: number) => Math.round(v * 10) / 10;
/** Text is centred in its box, so a box sized to the words (about 6 px per character at 12.5 px) reads as left-aligned. */
const CHAR = 6;
const legend = (id: string, y: number, label: string, tone: LayoutTone): LayoutShape[] => [
  { id, type: "cell", x: BAR_X, y: y + 2, w: 16, h: 16, tone, fill: "pastel" },
  text(`${id}-text`, BAR_X + 24, y, Math.ceil(label.length * CHAR) + 4, 20, label, tone),
];

/** One bar: the shared part, then 8 expert slots; `used` slots are filled, the rest drawn as empty outlines. */
function bar(id: string, y: number, used: number): LayoutShape[] {
  const out: LayoutShape[] = [
    { id: `${id}-shared`, type: "cell", x: BAR_X, y, w: r1(SHARED_W), h: BAR_H, tone: "neutral", fill: "pastel" },
  ];
  for (let e = 0; e < N_EXPERTS; e++) {
    const on = e < used;
    out.push({
      id: `${id}-e${e}`,
      type: "cell",
      x: r1(BAR_X + SHARED_W + e * EXPERT_W),
      y,
      w: r1(EXPERT_W),
      h: BAR_H,
      label: on ? (used === N_EXPERTS ? `Expert ${e + 1}` : "picked") : undefined,
      sub: on ? `≈ ${B(EXPERT)}` : undefined,
      tone: on ? ROLE_TONE.ffn : "neutral",
      fill: on ? "pastel" : "paper",
    });
  }
  return out;
}

const shapes: LayoutShape[] = [
  text(
    "title",
    16,
    Y.title,
    848,
    22,
    `Mixtral 8x7B: ${LAYERS} layers, ${N_EXPERTS} expert FFNs per layer, top-${TOP_K} routing`
  ),
  // Legend.
  ...legend(
    "legend-shared",
    Y.legend1,
    `Shared by every token: attention, embeddings, routers, norms (≈ ${B(SHARED)})`,
    "neutral"
  ),
  ...legend(
    "legend-expert",
    Y.legend2,
    `One expert slot: that expert's FFN in all ${LAYERS} layers (≈ ${B(EXPERT)})`,
    ROLE_TONE.ffn
  ),
  // Total.
  text("total-label", 16, Y.total, 180, BAR_H, "Total parameters\nabout 47B (memory)"),
  ...bar("total", Y.total, N_EXPERTS),
  text(
    "total-sum",
    BAR_X,
    Y.totalText,
    BAR_W,
    20,
    `${B(SHARED)} shared + ${N_EXPERTS} × ${B(EXPERT)} experts = ${B(TOTAL)}, all held in GPU memory`
  ),
  // Active.
  text("active-label", 16, Y.active, 180, BAR_H, "Active per token\nabout 13B (compute)", ROLE_TONE.ffn),
  ...bar("active", Y.active, TOP_K),
  text(
    "active-sum",
    BAR_X,
    Y.activeText,
    BAR_W,
    20,
    `${B(SHARED)} shared + ${TOP_K} × ${B(EXPERT)} experts = ${B(ACTIVE)}; the other ${N_EXPERTS - TOP_K} slots sit idle`,
    ROLE_TONE.ffn
  ),
  // Scale.
  {
    id: "axis",
    type: "path",
    x: 0,
    y: 0,
    points: [
      [BAR_X, Y.axis],
      [BAR_X + BAR_W, Y.axis],
    ],
  },
];
for (let b = 0; b * 1e10 <= TOTAL; b++) {
  const x = r1(BAR_X + px(b * 1e10));
  shapes.push(
    {
      id: `tick-${b}`,
      type: "path",
      x: 0,
      y: 0,
      points: [
        [x, Y.axis],
        [x, Y.axis + 6],
      ],
    },
    text(`tick-label-${b}`, x - 24, Y.axis + 8, 48, 18, `${b * 10}B`)
  );
}
shapes.push(
  text(
    "note",
    16,
    Y.axis + 42,
    848,
    36,
    "Memory pays for all 47B; compute per token is close to a 13B dense model.\n" +
      `Not 8 × 7B = 56B: only the FFNs are copied ${N_EXPERTS} times, and attention and embeddings are shared.`
  )
);

const spec: LayoutSpec = {
  kind: "layout",
  title: "Mixtral 8x7B: total vs active parameters",
  width: 880,
  height: Y.axis + 90,
  shapes,
};

export default spec;
