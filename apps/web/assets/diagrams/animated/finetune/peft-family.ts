import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { FINETUNE_TONE as T } from "@/components/diagrams/presets/production";
import { blockBox, link, note } from "@/components/diagrams/presets/production-finetune";

// "Where each PEFT method sits in a decoder block" on the LoRA, QLoRA & PEFT page (Architecture). One decoder block
// drawn bottom to top (as transformer/decoder-only-block; norms and residual adds left out so the trained pieces
// stand out), every base weight frozen (neutral); each method adds orange pieces:
//   1 Prompt tuning (Lester et al. 2021): learned vectors prepended to the input embeddings; nothing else trained.
//   2 Prefix tuning (Li and Liang 2021): learned key and value vectors prepended in every layer's attention.
//   3 Adapters (Houlsby et al. 2019): a small down-project, non-linearity, up-project block after a sub-layer, its
//     output added back to the stream.
//   4 LoRA (Hu et al. 2021): B·A beside a weight matrix (here Wq and Wv; QLoRA applies it to all linear layers),
//     merged into W after training.
//   5 DoRA (Liu et al. 2024, arXiv 2402.09353): W' = m · (W0 + BA) ÷ ‖W0 + BA‖_c: LoRA moves the direction, a trained
//     vector m (one number per column) sets the magnitude; mergeable, no inference latency.
// Steps: one per method. Grid: block column x 170–370; left pieces x 20–150; right pieces x 420–560; notes x 600.
// Colours: frozen weights neutral, trained pieces orange, one set of notes per step stacked down the right edge.

const COL_X = 170;
const COL_W = 200;
const NOTE_X = 590;
const NOTE_W = 260;
const noteY = (step: number) => 40 + (step - 1) * 108;

const shapes: LayoutShape[] = [
  blockBox("embed", COL_X, 520, COL_W, 44, "Token embeddings", T.frozen, { sub: "frozen" }),
  blockBox("attn", COL_X, 380, COL_W, 72, "Attention", T.frozen, { sub: "Wq  Wk  Wv  Wo, frozen" }),
  blockBox("ffn", COL_X, 220, COL_W, 72, "Feed-forward", T.frozen, { sub: "frozen" }),
  note("out", COL_X, 140, COL_W, "to the next block"),
  link("embed>attn", "embed", "attn"),
  link("attn>ffn", "attn", "ffn"),
  link("ffn>out", "ffn", "out"),

  // 1 Prompt tuning: virtual tokens at the input.
  ...[0, 1, 2].map((i): LayoutShape => ({
    id: `pt-${i}`,
    type: "cell",
    x: 20 + i * 38,
    y: 525,
    w: 34,
    h: 34,
    tone: T.trained,
    fill: "pastel",
    step: 1,
    quiet: true,
  })),
  note("pt-label", 20, 563, 150, "learned vectors", { tone: T.trained, step: 1 }),
  { ...link("pt>embed", "pt-2", "embed", { step: 1 }) },
  note(
    "n1",
    NOTE_X,
    noteY(1),
    NOTE_W,
    "1  Prompt tuning\nLearned vectors at the input only;\nevery layer below stays as it was.",
    {
      tone: T.trained,
      step: 1,
      h: 54,
    }
  ),

  // 2 Prefix tuning: key/value prefixes in every layer.
  blockBox("prefix", 420, 418, 140, 42, "Key and value\nprefix", T.trained, { step: 2 }),
  link("prefix>attn", "prefix", "attn", { step: 2 }),
  note("n2", NOTE_X, noteY(2), NOTE_W, "2  Prefix tuning\nLearned keys and values in the\nattention of every layer.", {
    tone: T.trained,
    step: 2,
    h: 54,
  }),

  // 3 Adapters: a small block after a sub-layer, added back into the stream.
  blockBox("adapter", 420, 318, 140, 42, "Adapter\ndown, up", T.trained, { step: 3 }),
  link("attn>adapter", "attn", "adapter", { step: 3 }),
  link("adapter>ffn", "adapter", "ffn", { step: 3, via: [[490, 256]] }),
  note(
    "n3",
    NOTE_X,
    noteY(3),
    NOTE_W,
    "3  Adapters\nA small bottleneck after a sub-layer;\nits output joins the stream.",
    {
      tone: T.trained,
      step: 3,
      h: 54,
    }
  ),

  // 4 LoRA: B·A beside a weight matrix.
  blockBox("lora", 20, 395, 120, 42, "B·A beside\nWq and Wv", T.trained, { step: 4 }),
  link("lora>attn", "lora", "attn", { step: 4 }),
  note("n4", NOTE_X, noteY(4), NOTE_W, "4  LoRA\nTwo thin matrices beside a weight;\nmerged into it after training.", {
    tone: T.trained,
    step: 4,
    h: 54,
  }),

  // 5 DoRA: LoRA plus a trained magnitude.
  blockBox("dora", 20, 304, 120, 42, "DoRA adds a\nmagnitude m", T.trained, { step: 5 }),
  link("dora>lora", "dora", "lora", { step: 5 }),
  note("n5", NOTE_X, noteY(5), NOTE_W, "5  DoRA\nLoRA moves the direction; a trained\nvector m sets the length.", {
    tone: T.trained,
    step: 5,
    h: 54,
  }),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "Where each PEFT method sits in a decoder block",
  width: 870,
  height: 600,
  groups: [{ id: "block", title: "× N", tone: T.frozen, x: 150, y: 190, w: 240, h: 290 }],
  steps: [
    { title: "Prompt tuning: learned vectors at the input" },
    { title: "Prefix tuning: learned keys and values in every layer" },
    { title: "Adapters: a small block after a sub-layer" },
    { title: "LoRA: two thin matrices beside a weight" },
    { title: "DoRA: LoRA plus a trained magnitude" },
  ],
  shapes,
};

export default spec;
