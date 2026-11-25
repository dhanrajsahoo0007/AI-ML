import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { ARCH, architectureShapes } from "@/components/diagrams/presets/transformer";

// Figure 1 of "Attention Is All You Need" (Vaswani et al., 2017), redrawn in the site's colour legend and walked
// through in ten steps with one translation example: English "I love tea" → German "Ich liebe Tee". The decoder has
// produced "<s> Ich liebe" so far (the target shifted right by one start token), and predicts "Tee" next.
//
// Facts drawn here, checked against the paper (arXiv 1706.03762 v7):
// - §3.1: N = 6 identical layers in both the encoder and the decoder; every sub-layer is wrapped as
//   LayerNorm(x + Sublayer(x)) (Post-LN, the "Add & Norm" blocks).
// - §3.1, §3.2.3: the decoder's first attention is masked so position i only sees positions before i; its second
//   attention takes queries from the previous decoder layer and keys and values from the encoder output.
// - §3.4: a linear layer and a softmax turn the decoder output into next-token probabilities.
// - §3.5: positional encodings (sinusoids) are added to the input and output embeddings at the bottom of each stack.

const E = ARCH.encX;
const D = ARCH.decX;

/** Step in which each part of Figure 1 appears (by shape id). Anything not listed is step 1. */
const STEP: Record<string, number> = {
  "enc-pe": 2,
  "enc-add": 2,
  "enc-emb>add": 2,
  "enc-pe>add": 2,
  "enc-mha": 3,
  "enc-in-trunk": 3,
  "enc-in-q": 3,
  "enc-in-k": 3,
  "enc-in-v": 3,
  "enc-norm1": 4,
  "enc-res1": 4,
  "enc-mha>norm1": 4,
  "enc-ffn": 5,
  "enc-norm2": 5,
  "enc-norm1>ffn": 5,
  "enc-res2": 5,
  "enc-ffn>norm2": 5,
  "dec-emb": 6,
  "dec-pe": 6,
  "dec-add": 6,
  "dec-emb>add": 6,
  "dec-pe>add": 6,
  "dec-mmha": 7,
  "dec-in-trunk": 7,
  "dec-in-q": 7,
  "dec-in-k": 7,
  "dec-in-v": 7,
  "dec-norm1": 7,
  "dec-res1": 7,
  "dec-mmha>norm1": 7,
  "dec-xattn": 8,
  "enc-out": 8,
  "enc-out-kv": 8,
  "enc-out-k": 8,
  "enc-out-v": 8,
  "dec-q": 8,
  "dec-res2": 8,
  "dec-norm2": 8,
  "dec-xattn>norm2": 8,
  "dec-ffn": 9,
  "dec-norm3": 9,
  "dec-norm2>ffn": 9,
  "dec-res3": 9,
  "dec-ffn>norm3": 9,
  linear: 10,
  softmax: 10,
  "dec-norm3>linear": 10,
  "linear>softmax": 10,
};

const figure = architectureShapes(STEP);

const text = (id: string, x: number, y: number, w: number, label: string, step: number, h = 36): LayoutShape => ({
  id,
  type: "text",
  x,
  y,
  w,
  h,
  label,
  tone: "neutral",
  step,
});

const notes: LayoutShape[] = [
  text("inputs", E - 90, 796, 180, 'Inputs\n"I love tea"', 1),
  { id: "inputs>emb", type: "arrow", x: 0, y: 0, from: "inputs", to: "enc-emb", step: 1 },
  text("enc-pe-label", 8, 680, 84, "Positional\nencoding", 2, 32),
  text("outputs", D - 110, 796, 220, 'Outputs (shifted right)\n"<s> Ich liebe"', 6),
  { id: "outputs>emb", type: "arrow", x: 0, y: 0, from: "outputs", to: "dec-emb", step: 6 },
  text("dec-pe-label", 688, 680, 84, "Positional\nencoding", 6, 32),
  text("probs", D - 110, 14, 220, 'Output probabilities\nnext token: "Tee"', 10),
  { id: "softmax>probs", type: "arrow", x: 0, y: 0, from: "softmax", to: "probs", step: 10 },
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "The Transformer, encoder and decoder",
  width: ARCH.width,
  height: ARCH.height,
  groups: figure.groups,
  shapes: [...figure.shapes, ...notes],
  steps: [
    { title: "Source tokens become vectors" },
    { title: "Position is added" },
    { title: "Every source token looks at every other one" },
    { title: "Add the input back and normalise" },
    { title: "Each token is refined on its own; the block repeats 6 times" },
    { title: "The target so far, shifted right, is embedded" },
    { title: "Masked attention: no looking ahead" },
    { title: "Cross-attention reads the encoder output" },
    { title: "Feed-forward, then the block repeats 6 times" },
    { title: "Linear and softmax give next-token probabilities" },
  ],
};

export default spec;
