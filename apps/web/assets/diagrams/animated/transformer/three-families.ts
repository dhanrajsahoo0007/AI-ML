import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { ROLE_TONE, block } from "@/components/diagrams/presets/transformer";

// The three Transformer families as mini stacks, each showing which of the 2017 blocks it keeps, with a 4 × 4
// attention pattern under each attention stack (green = may attend, neutral = masked). Sits above the families table.
//
// Facts checked:
// - Encoder-only, BERT (Devlin et al., 2018, arXiv 1810.04805): the Transformer encoder, bidirectional
//   self-attention, every token attends to every token.
// - Encoder-decoder, the original Transformer (Vaswani et al., 2017, §3.1) and T5 (Raffel et al., 2019,
//   arXiv 1910.10683): a bidirectional encoder; a decoder with masked (causal) self-attention, cross-attention whose
//   keys and values come from the encoder output, and a feed-forward layer.
// - Decoder-only, GPT (Radford et al., 2018), Llama, Claude: the decoder without cross-attention; causal
//   self-attention, so position i attends to positions 1..i (lower triangle, diagonal included).
// - Norms, residuals, embeddings and output heads are left out (footnote); every family keeps them.

/** Panels: x, width, and the column centres inside them. */
const P1 = { x: 24, w: 244, cx: 146 };
const P2 = { x: 288, w: 304, enc: 360, dec: 520 };
const P3 = { x: 612, w: 244, cx: 734 };
const GROUP_Y = 60;
const GROUP_H = 392;

/** Top of each block row, bottom (row 1) to top (row 3); blocks are 44 tall. */
const ROW = [276, 206, 136];
const IN_Y = 352;
const PATTERN_Y = 390;
const CELL = 11;

const text = (id: string, x: number, y: number, w: number, label: string, h = 20): LayoutShape => ({
  id,
  type: "text",
  x,
  y,
  w,
  h,
  label,
  tone: "neutral",
});

const arrow = (id: string, from: string, to: string): LayoutShape => ({ id, type: "arrow", x: 0, y: 0, from, to });

/** A 4 × 4 attention pattern with its top-left at (x, y): green where row i may attend to column j. */
const pattern = (id: string, x: number, y: number, causal: boolean): LayoutShape[] =>
  [0, 1, 2, 3].flatMap((r) =>
    [0, 1, 2, 3].map((c): LayoutShape => {
      const on = !causal || c <= r;
      return {
        id: `${id}-${r}-${c}`,
        type: "cell",
        x: x + c * CELL,
        y: y + r * CELL,
        w: CELL,
        h: CELL,
        tone: on ? ROLE_TONE.weight : ROLE_TONE.masked,
        weight: on ? 0.7 : undefined,
      };
    })
  );

/** One stack: input text at the bottom, blocks upwards, output text above the top block. */
function stack(
  id: string,
  cx: number,
  w: number,
  parts: { role: "attention" | "ffn"; label?: string }[],
  input: string,
  output?: { label: string; y: number }
): LayoutShape[] {
  const blocks = parts.map((p, i) => block(`${id}-${i}`, p.role, cx - w / 2, ROW[i], { w, label: p.label }));
  const shapes: LayoutShape[] = [text(`${id}-in`, cx - 70, IN_Y, 140, input), ...blocks];
  shapes.push(arrow(`${id}-in>0`, `${id}-in`, `${id}-0`));
  blocks.slice(1).forEach((b, i) => shapes.push(arrow(`${id}-${i}>${i + 1}`, blocks[i].id, b.id)));
  if (output) {
    shapes.push(text(`${id}-out`, cx - 80, output.y, 160, output.label));
    shapes.push(arrow(`${id}-top>out`, blocks[blocks.length - 1].id, `${id}-out`));
  }
  return shapes;
}

/** Corner where the encoder output turns down towards the cross-attention, in the gap between the columns. */
const BRIDGE = { x: (P2.enc + P2.dec) / 2, y: ROW[1] - 16 };

const BIDI = "Bidirectional\nself-attention";
const CAUSAL = "Causal\nself-attention";

// Encoder-only: bidirectional self-attention and feed-forward.
const encoderOnly: LayoutShape[] = [
  text("p1-eg", P1.x, 80, P1.w, "BERT"),
  ...stack("bert", P1.cx, 150, [{ role: "attention", label: BIDI }, { role: "ffn" }], "all tokens", {
    label: "a vector per token",
    y: 160,
  }),
  ...pattern("p1-pat", P1.cx - 64, PATTERN_Y, false),
  text("p1-pat-label", P1.cx - 12, PATTERN_Y + 4, 116, "every token sees\nevery token", 36),
];

// Encoder-decoder: an encoder stack, and a decoder stack with cross-attention reading the encoder output.
const encoderDecoder: LayoutShape[] = [
  text("p2-eg", P2.x, 80, P2.w, "T5, the original Transformer"),
  ...stack("enc", P2.enc, 120, [{ role: "attention", label: BIDI }, { role: "ffn" }], "source tokens"),
  ...stack(
    "dec",
    P2.dec,
    120,
    [{ role: "attention", label: CAUSAL }, { role: "attention", label: "Cross-\nattention" }, { role: "ffn" }],
    "target so far",
    { label: "next target token", y: 104 }
  ),
  // The encoder output: up from its feed-forward block, across, down the gap and into the cross-attention's side.
  // Two pieces so the "K, V" pill sits in the middle of the run across. A free arrow end stops 4 short of its
  // point, so each piece reaches 4.8 past the corner to meet the other without a gap.
  {
    id: "enc-out",
    type: "arrow",
    x: BRIDGE.x + 4.8,
    y: BRIDGE.y,
    from: "enc-1",
    via: [[P2.enc, BRIDGE.y]],
    head: false,
    label: "K, V",
  },
  { id: "enc-out>xattn", type: "arrow", x: BRIDGE.x, y: BRIDGE.y - 4.8, to: "dec-1", via: [[BRIDGE.x, ROW[1] + 22]] },
  ...pattern("p2-enc-pat", P2.enc - 22, PATTERN_Y, false),
  ...pattern("p2-dec-pat", P2.dec - 22, PATTERN_Y, true),
];

// Decoder-only: causal self-attention and feed-forward, no cross-attention.
const decoderOnly: LayoutShape[] = [
  text("p3-eg", P3.x, 80, P3.w, "GPT, Llama, Claude"),
  ...stack("gpt", P3.cx, 150, [{ role: "attention", label: CAUSAL }, { role: "ffn" }], "tokens so far", {
    label: "next token",
    y: 160,
  }),
  ...pattern("p3-pat", P3.cx - 64, PATTERN_Y, true),
  text("p3-pat-label", P3.cx - 12, PATTERN_Y + 4, 116, "sees itself and\nearlier tokens", 36),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "Three Transformer families",
  width: 880,
  height: 494,
  groups: [
    { id: "p1", title: "Encoder-only", tone: ROLE_TONE.block, x: P1.x, y: GROUP_Y, w: P1.w, h: GROUP_H },
    { id: "p2", title: "Encoder-decoder", tone: ROLE_TONE.block, x: P2.x, y: GROUP_Y, w: P2.w, h: GROUP_H },
    { id: "p3", title: "Decoder-only", tone: ROLE_TONE.block, x: P3.x, y: GROUP_Y, w: P3.w, h: GROUP_H },
  ],
  shapes: [
    ...encoderOnly,
    ...encoderDecoder,
    ...decoderOnly,
    text(
      "foot",
      24,
      464,
      832,
      "Each stack repeats N times. Norms, residuals, embeddings and output heads are left out."
    ),
  ],
};

export default spec;
