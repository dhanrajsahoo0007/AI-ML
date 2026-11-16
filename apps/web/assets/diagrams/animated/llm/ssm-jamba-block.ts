import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { block, ROLE_TONE } from "@/components/diagrams/presets/transformer";

// One Jamba block: 8 layers, read bottom to top. Seven layers mix tokens with Mamba, one with attention, and every
// second layer replaces its MLP with a mixture-of-experts layer.
//
// Facts checked:
// - Lieber et al. (2024), "Jamba: A Hybrid Transformer-Mamba Language Model", arXiv 2403.19887, Section 2–3:
//   a Jamba block has l = 8 layers; attention-to-Mamba ratio a : m = 1 : 7; MoE every e = 2 layers; n = 16 experts,
//   top K = 2 per token; the released model stacks 4 blocks; 12B active of 52B available parameters; RMSNorm
//   before each mixer and MLP (and inside Mamba layers for stability); no explicit positional encoding needed.
// - Hugging Face config for ai21labs/Jamba-v0.1: num_hidden_layers 32, attn_layer_offset 4, attn_layer_period 8
//   (attention at 0-based layer 4, so layer 5 of 8 here), expert_layer_offset 1, expert_layer_period 2 (MoE at
//   0-based layers 1, 3, 5, 7, so layers 2, 4, 6, 8 here), num_experts 16, num_experts_per_tok 2,
//   num_attention_heads 32, num_key_value_heads 8, mamba_d_state 16.
// - Totals for 4 blocks: 4 × 8 = 32 layers, 4 attention, 28 Mamba, 16 MoE.
// Residual additions around each mixer and each MLP are not drawn, to keep the stack readable; the caption says so.
//
// Colours: attention orange, MLP and MoE blue, RMSNorm lime (ROLE_TONE); Mamba (SSM) layers teal, the tone used
// for SSM state across the ssm-* figures.

const SSM: LayoutTone = "teal";
const LAYERS = 8;
const ATTN = 5; // 1-based
const isMoE = (layer: number) => layer % 2 === 0;

const TOP = 104;
const PITCH = 72;
const rowY = (layer: number) => TOP + (LAYERS - layer) * PITCH; // layer 8 on top
const NORM_W = 86;
const NORM_H = 30;
const X_NORM1 = 120;
const X_MIX = 236;
const X_NORM2 = 416;
const X_FFN = 532;
const MIX_W = 150;
const FFN_W = 150;
const FFN_CX = X_FFN + FFN_W / 2;
const NORM1_CX = X_NORM1 + NORM_W / 2;

const text = (id: string, x: number, y: number, w: number, label: string, tone: LayoutTone = "neutral", h = 20) =>
  ({ id, type: "text", x, y, w, h, label, tone }) as LayoutShape;

const shapes: LayoutShape[] = [];

for (let layer = 1; layer <= LAYERS; layer++) {
  const y = rowY(layer);
  const attn = layer === ATTN;
  shapes.push(
    text(`name-${layer}`, 30, y + 12, 80, `Layer ${layer}`),
    block(`norm1-${layer}`, "norm", X_NORM1, y + 7, { w: NORM_W, h: NORM_H, label: "RMSNorm" }),
    attn
      ? block(`mix-${layer}`, "attention", X_MIX, y, { w: MIX_W, label: "Attention", sub: "32 heads, 8 KV heads" })
      : {
          id: `mix-${layer}`,
          type: "box",
          x: X_MIX,
          y,
          w: MIX_W,
          h: 44,
          label: "Mamba",
          sub: "selective SSM",
          tone: SSM,
          fill: "pastel",
        },
    block(`norm2-${layer}`, "norm", X_NORM2, y + 7, { w: NORM_W, h: NORM_H, label: "RMSNorm" }),
    block(`ffn-${layer}`, "ffn", X_FFN, y, {
      w: FFN_W,
      label: isMoE(layer) ? "MoE" : "MLP",
      sub: isMoE(layer) ? "16 experts, top-2" : "dense",
    }),
    { id: `a1-${layer}`, type: "arrow", x: 0, y: 0, from: `norm1-${layer}`, to: `mix-${layer}`, tone: "neutral" },
    { id: `a2-${layer}`, type: "arrow", x: 0, y: 0, from: `mix-${layer}`, to: `norm2-${layer}`, tone: "neutral" },
    { id: `a3-${layer}`, type: "arrow", x: 0, y: 0, from: `norm2-${layer}`, to: `ffn-${layer}`, tone: "neutral" }
  );
  if (layer < LAYERS) {
    // Up out of this layer's MLP, back left through the gap between rows, up into the next layer's first norm.
    const gapY = y - (PITCH - 44) / 2;
    shapes.push({
      id: `up-${layer}`,
      type: "arrow",
      x: 0,
      y: 0,
      from: `ffn-${layer}`,
      to: `norm1-${layer + 1}`,
      via: [
        [FFN_CX, gapY],
        [NORM1_CX, gapY],
      ],
      tone: "neutral",
    });
  }
}

// Into and out of the block.
const BOTTOM = rowY(1) + 44;
shapes.push(
  { id: "in", type: "arrow", x: NORM1_CX, y: BOTTOM + 52, w: 0, h: -57, tone: "neutral" },
  text("in-label", NORM1_CX + 10, BOTTOM + 34, 200, "from the previous block"),
  { id: "out", type: "arrow", x: FFN_CX, y: TOP, w: 0, h: -56, tone: "neutral" },
  text("out-label", FFN_CX + 10, TOP - 52, 160, "to the next block")
);

// Notes on the right, level with the rows they describe.
const NOTE_X = 704;
shapes.push(
  text("note-attn", NOTE_X, rowY(ATTN) - 4, 170, "1 attention layer\nin 8 (a : m = 1 : 7)", ROLE_TONE.attention, 40),
  text("note-moe", NOTE_X, rowY(6) - 4, 170, "MoE every 2nd layer\n(e = 2)", ROLE_TONE.ffn, 40),
  text("note-ssm", NOTE_X, rowY(2) - 4, 170, "7 Mamba layers:\nfixed state, no KV cache", SSM, 40),
  text(
    "note-total",
    NOTE_X,
    rowY(8) - 4,
    170,
    "Jamba stacks 4 blocks:\n32 layers, 4 attention,\n28 Mamba, 16 MoE",
    "neutral",
    56
  )
);

const spec: LayoutSpec = {
  kind: "layout",
  title: "One Jamba block: 7 Mamba layers, 1 attention layer, MoE every other layer",
  width: 880,
  height: BOTTOM + 70,
  groups: [
    {
      id: "g-block",
      title: "One Jamba block (8 layers)",
      tone: "neutral",
      x: 20,
      y: TOP - 24,
      w: 672,
      h: BOTTOM - TOP + 40,
    },
  ],
  shapes,
};

export default spec;
