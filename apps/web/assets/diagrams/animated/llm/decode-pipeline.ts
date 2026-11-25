import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { ROLE_TONE, block } from "@/components/diagrams/presets/transformer";

// One decoding step, for "Architecture" on the Decoding & Sampling page. The decoder stack runs on the newest token
// (reusing the KV cache), the output head (Linear) turns the last position's vector into one logit per vocabulary
// token, a chain of logits processors edits those logits, softmax turns them into probabilities, one token is
// sampled (or the arg-max is taken), and that token is appended to the input for the next step.
//
// Facts:
// - Output head: Linear then softmax over the vocabulary (Vaswani et al., 2017, §3.4); at inference only the last
//   position's distribution is used.
// - Temperature divides the logits before the softmax (Holtzman et al., 2019, eq. 4).
// - Top-k (Fan et al., 2018), top-p (Holtzman et al., 2019, eq. 2) and min-p (Nguyen et al., 2024, eq. 1–2) each
//   remove tokens before sampling, which is the same as setting their logits to −∞; they are drawn as one mask block.
// - Grammar masks: Willard & Louf (2023), §2–3 (a boolean mask over the vocabulary at each step).
// - Repetition penalty: Keskar et al. (2019), CTRL, §4.1; frequency and presence penalties and logit bias: OpenAI
//   API reference (chat completions parameters).
// - The order of the processors differs between libraries; the min-p paper (§3) notes that Hugging Face Transformers
//   and vLLM apply temperature before the min-p threshold. The drawn order is one common choice, not a standard.

const W = 140;
const COL = [24, 244, 464, 684];
const ROW1 = 96;
const ROW2 = 236;
const H = 44;

const shapes: LayoutShape[] = [
  block("decoder", "block", COL[0], ROW1, { w: W, label: "Decoder\nstack" }),
  block("linear", "linear", COL[1], ROW1, { w: W, label: "Linear\n(output head)" }),
  {
    id: "penalties",
    type: "box",
    x: COL[2],
    y: ROW1,
    w: W,
    h: H,
    label: "Penalties\n& logit bias",
    tone: "neutral",
    fill: "pastel",
  },
  block("grammar", "mask", COL[3], ROW1, { w: W, label: "Grammar\nmask" }),
  block("temp", "scale", COL[3], ROW2, { w: W, label: "÷ T", sub: "temperature" }),
  block("truncate", "mask", COL[2], ROW2, { w: W, label: "Top-k / top-p\n/ min-p" }),
  block("softmax", "softmax", COL[1], ROW2, { w: W, label: "Softmax" }),
  block("sample", "softmax", COL[0], ROW2, { w: W, label: "Sample\none token" }),
  { id: "decoder>linear", type: "arrow", x: 0, y: 0, from: "decoder", to: "linear" },
  { id: "linear>penalties", type: "arrow", x: 0, y: 0, from: "linear", to: "penalties", label: "logits" },
  { id: "penalties>grammar", type: "arrow", x: 0, y: 0, from: "penalties", to: "grammar" },
  { id: "grammar>temp", type: "arrow", x: 0, y: 0, from: "grammar", to: "temp" },
  { id: "temp>truncate", type: "arrow", x: 0, y: 0, from: "temp", to: "truncate" },
  { id: "truncate>softmax", type: "arrow", x: 0, y: 0, from: "truncate", to: "softmax" },
  { id: "softmax>sample", type: "arrow", x: 0, y: 0, from: "softmax", to: "sample", label: "p" },
  { id: "sample>decoder", type: "arrow", x: 0, y: 0, from: "sample", to: "decoder", label: "append; KV cache" },
  {
    id: "out",
    type: "text",
    x: COL[0] - 4,
    y: ROW2 + H + 34,
    w: W + 8,
    h: 20,
    label: "streamed to the user",
    tone: "neutral",
  },
  { id: "sample>out", type: "arrow", x: COL[0] + W / 2, y: ROW2 + H, w: 0, h: 32 },
  {
    id: "note",
    type: "text",
    x: COL[1] - 10,
    y: ROW2 + H + 26,
    w: 620,
    h: 36,
    label:
      "Each processor edits logits; a removed token gets −∞, so the softmax gives it 0.\nGreedy decoding skips the sampling and takes the arg-max.",
    tone: "neutral",
  },
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "One decoding step",
  width: 868,
  height: ROW2 + H + 76,
  groups: [
    {
      id: "g-processors",
      title: "Logits processors (order varies)",
      tone: ROLE_TONE.mask,
      x: COL[2] - 20,
      y: ROW1 - 40,
      w: COL[3] + W + 20 - (COL[2] - 20),
      h: ROW2 + H + 16 - (ROW1 - 40),
    },
  ],
  shapes,
};

export default spec;
