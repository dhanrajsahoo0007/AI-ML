import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { ROLE_TONE, block } from "@/components/diagrams/presets/transformer";

// One block of a decoder-only LLM (GPT-style, Llama-style), drawn bottom to top like the paper's Figure 1. Pre-norm:
// RMSNorm before each sub-layer, the residual adds the untouched input back after it. Replaces the Mermaid sketch
// "Inside one decoder-only block" on the Transformer architecture page.
//
// Facts checked:
// - Decoder-only blocks keep masked (causal) self-attention and the feed-forward network and drop cross-attention,
//   because there is no encoder (GPT, Radford et al. 2018; GPT-2 2019).
// - Llama (Touvron et al., 2023, arXiv 2302.13971 §2.2): pre-normalisation with RMSNorm (Zhang and Sennrich, 2019) on
//   the input of each sub-layer, SwiGLU activation in the feed-forward network (Shazeer, 2020), rotary embeddings
//   (RoPE, Su et al., 2021) applied to queries and keys at every layer instead of absolute positional embeddings.
// - Pre-norm block: h = x + Attn(RMSNorm(x)); out = h + FFN(RMSNorm(h)). Neither skip passes through a norm.

const CX = 250;
/** x of the residual lines' vertical run, right of the column (as in the paper's decoder). */
const RES_X = CX + 110;
/** Annotations start here, right of the group. */
const NOTE_X = 410;
const NOTE_W = 250;

const text = (id: string, x: number, y: number, w: number, h: number, label: string): LayoutShape => ({
  id,
  type: "text",
  x,
  y,
  w,
  h,
  label,
  tone: "neutral",
});

const adder = (id: string, cy: number): LayoutShape => ({
  id,
  type: "circle",
  x: CX,
  y: cy,
  w: 24,
  symbol: "plus",
  tone: ROLE_TONE.block,
  label: "Add",
});

const arrow = (id: string, from: string, to: string): LayoutShape => ({ id, type: "arrow", x: 0, y: 0, from, to });

/** A free arrow from (x, y) by (w, h); `head: false` draws a plain line. */
const free = (id: string, x: number, y: number, w: number, h: number, head = true): LayoutShape => ({
  id,
  type: "arrow",
  x,
  y,
  w,
  h,
  head: head ? undefined : false,
});

/**
 * A residual line from the tap at y on the main line, out right to RES_X, up and into the adder's right side.
 * (The preset's residual() aims at a box's middle from its height; a circle's y is already its centre.)
 */
const skip = (id: string, y: number, add: LayoutShape): LayoutShape => ({
  id,
  type: "arrow",
  x: CX,
  y,
  to: add.id,
  via: [
    [RES_X, y],
    [RES_X, add.y],
  ],
});

// Top to bottom (the data flows bottom to top).
const out = text("out", CX - 100, 16, 200, 36, "Token vectors\nto the next block");
const add2 = adder("add2", 104);
const ffn = block("ffn", "ffn", CX - 75, 146, { label: "Feed-forward\n(SwiGLU)" });
const norm2 = block("norm2", "norm", CX - 75, 220, { h: 30, label: "RMSNorm" });
const TAP2 = 268;
const add1 = adder("add1", 298);
const attn = block("attn", "attention", CX - 75, 340, {
  h: 52,
  label: "Causal multi-head\nself-attention\nRoPE on Q and K",
});
/** The attention input fans out into queries, keys and values just below the block. */
const FAN_Y = 426;
const FAN_DX = 45;
const norm1 = block("norm1", "norm", CX - 75, 446, { h: 30, label: "RMSNorm" });
const TAP1 = 500;
const input = text("in", CX - 100, 540, 200, 36, "Token vectors\nfrom the previous block");

const rise = attn.y + (attn.h ?? 0) + 4 - FAN_Y;

const shapes: LayoutShape[] = [
  out,
  add2,
  ffn,
  norm2,
  add1,
  attn,
  norm1,
  input,
  arrow("in>norm1", "in", "norm1"),
  { id: "norm1-trunk", type: "arrow", x: CX, y: FAN_Y, w: 0, h: 0, from: "norm1", head: false },
  free("fan-q", CX, FAN_Y, -FAN_DX, rise),
  free("fan-k", CX, FAN_Y, 0, rise),
  free("fan-v", CX, FAN_Y, FAN_DX, rise),
  arrow("attn>add1", "attn", "add1"),
  skip("res1", TAP1, add1),
  arrow("add1>norm2", "add1", "norm2"),
  arrow("norm2>ffn", "norm2", "ffn"),
  arrow("ffn>add2", "ffn", "add2"),
  skip("res2", TAP2, add2),
  arrow("add2>out", "add2", "out"),
  // Annotations, right of the block they describe.
  text("note-ffn", NOTE_X, 150, NOTE_W, 36, "Each token is transformed on its own;\nmost of the parameters live here"),
  text(
    "note-attn",
    NOTE_X,
    348,
    NOTE_W,
    36,
    "Each token reads itself and earlier tokens;\nthe causal mask hides later ones"
  ),
  text("note-res", NOTE_X, 440, NOTE_W, 36, "Pre-norm: the residual path\nnever passes through a norm."),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "Inside one decoder-only block",
  width: 760,
  height: 590,
  groups: [{ id: "block", title: "Block × N", tone: ROLE_TONE.block, x: 110, y: 70, w: 290, h: 450 }],
  shapes,
};

export default spec;
