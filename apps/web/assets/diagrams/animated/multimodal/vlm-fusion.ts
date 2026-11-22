import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { MODALITY_TONE, PROD_TONE } from "@/components/diagrams/presets/production";
import { ROLE_TONE, block } from "@/components/diagrams/presets/transformer";

// "Two ways to let a language model see" on the Vision-Language Models and Multimodal & Voice AI pages (the second
// page reuses this spec by id). Left, the projector design of LLaVA-1.5 (Liu et al., 2023, arXiv 2310.03744): a vision
// encoder and a small projector turn the photo into 576 visual tokens that join the question's tokens, so the LLM's own
// self-attention reads both. Right, the cross-attention design of Flamingo (Alayrac et al., 2022, arXiv 2204.14198): a
// Perceiver Resampler turns the image features into a fixed 64 visual tokens; new gated cross-attention blocks, trained
// from scratch, sit between the frozen LM blocks (every 4th layer in the 9 B model, every 7th in the 80 B model); text
// provides the queries, the visual tokens provide the keys and values. The sequence length stays the text's own.
//
// Steps: 1 the projector design · 2 the cross-attention design.
// Grid: left panel x 8-428 (blocks x 130-340), right panel x 452-872. Rows bottom to top: photo y 328, encoder y 268,
// tokens y 208 (left) / resampler y 208 (right), blocks above.
// Colours: Transformer legend ROLE_TONE (attention orange, feed-forward blue, tokens/vectors pink, frozen blocks
// neutral); photo blue (image) and the vision encoder green (MODALITY_TONE). Four tones plus neutral.

const text = (
  id: string,
  x: number,
  y: number,
  w: number,
  label: string,
  step: number,
  tone: LayoutTone = PROD_TONE.infra
): LayoutShape => ({ id, type: "text", x, y, w, h: 18, label, tone, step, quiet: true });

const box = (
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  tone: LayoutTone,
  step: number,
  sub?: string
): LayoutShape => ({ id, type: "box", x, y, w, h, label, sub, tone, fill: "pastel", step });

const up = (id: string, x: number, y: number, h: number, step: number, label?: string): LayoutShape => ({
  id,
  type: "arrow",
  x,
  y,
  w: 0,
  h: -h,
  step,
  label,
});

const L = 130;
const R = 660;
const shapes: LayoutShape[] = [
  // ── Left: tokens in the sequence ─────────────────────────────────────────────────────────────────────────────────
  box("l-photo", 20, 330, 90, 40, "Photo", MODALITY_TONE.image, 1),
  box("l-enc", 20, 262, 150, 44, "Vision encoder\n+ projector", MODALITY_TONE.model, 1),
  up("l-a1", 65, 328, 20, 1),
  box("l-vis", 20, 196, 150, 44, "576 visual tokens", ROLE_TONE.embedding, 1),
  up("l-a2", 95, 260, 20, 1),
  box("l-txt", 250, 196, 150, 44, "Question tokens", ROLE_TONE.embedding, 1),
  block("l-att", "attention", L + 80, 120, {
    w: 210,
    label: "Self-attention\nover all tokens",
    step: 1,
    highlight: true,
  }),
  block("l-ffn", "ffn", L + 80, 62, { w: 210, label: "Feed forward", step: 1 }),
  { id: "l-a3", type: "arrow", x: 0, y: 0, from: "l-vis", to: "l-att", step: 1 },
  { id: "l-a4", type: "arrow", x: 0, y: 0, from: "l-txt", to: "l-att", step: 1 },
  { id: "l-a5", type: "arrow", x: 0, y: 0, from: "l-att", to: "l-ffn", step: 1 },
  text("l-note1", 20, 384, 400, "image tokens join the sequence; the LLM's blocks repeat N times", 1),
  text("l-note2", 20, 406, 400, "cost: +576 positions in every layer", 1, ROLE_TONE.attention),

  // ── Right: cross-attention layers ────────────────────────────────────────────────────────────────────────────────
  box("r-photo", 470, 330, 90, 40, "Image", MODALITY_TONE.image, 2),
  box("r-enc", 470, 262, 120, 44, "Vision\nencoder", MODALITY_TONE.model, 2),
  up("r-a1", 515, 328, 20, 2),
  box("r-res", 470, 196, 130, 44, "64 visual tokens", ROLE_TONE.embedding, 2, "Perceiver Resampler"),
  up("r-a2", 535, 260, 20, 2),
  box("r-txt", R + 20, 330, 160, 40, "Text tokens", ROLE_TONE.embedding, 2),
  block("r-lm1", "block", R + 20, 262, { w: 160, h: 40, label: "Frozen LM block", step: 2 }),
  block("r-x1", "attention", R + 20, 196, {
    w: 160,
    h: 44,
    label: "Gated cross-\nattention (new)",
    step: 2,
    highlight: true,
  }),
  block("r-lm2", "block", R + 20, 130, { w: 160, h: 40, label: "Frozen LM block", step: 2 }),
  block("r-x2", "attention", R + 20, 64, { w: 160, h: 44, label: "Gated cross-\nattention (new)", step: 2 }),
  up("r-a3", R + 100, 328, 24, 2),
  up("r-a4", R + 100, 262, 20, 2),
  up("r-a5", R + 100, 196, 24, 2),
  up("r-a6", R + 100, 130, 20, 2),
  { id: "r-kv1", type: "arrow", x: 0, y: 0, from: "r-res", to: "r-x1", step: 2, label: "K, V" },
  { id: "r-kv2", type: "arrow", x: 580, y: 206, w: 0, h: 0, step: 2, head: false },
  {
    id: "r-kv3",
    type: "arrow",
    x: 0,
    y: 0,
    from: "r-res",
    to: "r-x2",
    via: [
      [612, 218],
      [612, 86],
    ],
    step: 2,
  },
  text("r-note1", 460, 384, 410, "image tokens feed new layers; frozen blocks keep their weights", 2),
  text("r-note2", 460, 406, 410, "cost: 64 keys per layer; text length unchanged", 2, ROLE_TONE.attention),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "Two ways to feed an image to a language model",
  width: 880,
  height: 436,
  groups: [
    { id: "g-left", title: "Projector (LLaVA)", tone: PROD_TONE.infra, x: 8, y: 18, w: 424, h: 416 },
    { id: "g-right", title: "Cross-attention (Flamingo)", tone: PROD_TONE.infra, x: 444, y: 18, w: 428, h: 416 },
  ],
  steps: [
    { title: "Projector design: image tokens join the sequence" },
    { title: "Cross-attention design: image tokens feed new layers" },
  ],
  shapes: shapes.filter((s) => s.id !== "r-kv2"),
};

export default spec;
