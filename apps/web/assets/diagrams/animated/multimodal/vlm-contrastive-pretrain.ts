import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { MODALITY_TONE, PROD_TONE } from "@/components/diagrams/presets/production";
import { matrix } from "@/components/diagrams/presets/transformer";

// "How CLIP learns a shared space" on the Vision-Language Models page. A batch holds N matching (image, caption)
// pairs. An image encoder and a text encoder turn them into vectors; the N × N grid of cosine similarities has the
// true pairs on the diagonal. Training raises the diagonal and lowers the other N² − N cells with a symmetric cross
// entropy over the grid, with a temperature τ (CLIP initialises τ to 0.07; batch N = 32,768; 400 M pairs; Radford et
// al., 2021, arXiv 2103.00020). The batch drawn is N = 4 with made-up 4-number embeddings (illustrative).
//   Cosine = a·b ÷ (|a| |b|), computed below. Row 1 becomes probabilities with softmax(cosine ÷ τ):
//   p_j = e^(s_1j ÷ 0.07) ÷ Σ e^(s_1k ÷ 0.07); the loss for row 1 is −ln p_1.
// The same grid read by columns gives the text-to-image half of the loss.
//
// Steps: 1 a batch of four pairs · 2 the similarity grid · 3 one row as probabilities and its loss.
// Grid: matrix of 4 × 4 cells of 72 px at x 262, y 112; row labels x 20 (w 220); column labels above the grid;
// probability bars at x 650, y 140, 34 px apart.
// Colours (MODALITY_TONE): images blue, captions orange, similarities and probabilities pink (embedding).

const IMAGES = [
  { label: "Photo: cracked kettle", v: [0.9, 0.4, 0.3, 0.2] },
  { label: "Photo: parcel label", v: [0.3, 0.9, 0.4, 0.3] },
  { label: "Photo: order receipt", v: [0.3, 0.3, 0.9, 0.4] },
  { label: "Photo: delivery box", v: [0.4, 0.3, 0.3, 0.9] },
];
const CAPTIONS = [
  { label: "“cracked\nkettle”", v: [0.8, 0.5, 0.4, 0.3] },
  { label: "“parcel\nlabel”", v: [0.4, 0.8, 0.5, 0.4] },
  { label: "“order\nreceipt”", v: [0.4, 0.4, 0.8, 0.5] },
  { label: "“delivery\nbox”", v: [0.5, 0.4, 0.4, 0.8] },
];
const TAU = 0.07;
const cos = (a: number[], b: number[]) =>
  a.reduce((s, x, i) => s + x * b[i], 0) / (Math.hypot(...a) * Math.hypot(...b));
const sim = IMAGES.map((i) => CAPTIONS.map((c) => cos(i.v, c.v)));
const lo = 0.7; // shade scale: cosine 0.7 → 0, 1.0 → 1
const shade = sim.map((row) => row.map((s) => Math.max(0, (s - lo) / (1 - lo))));
const expRow = sim[0].map((s) => Math.exp(s / TAU));
const probs = expRow.map((e) => e / expRow.reduce((a, b) => a + b, 0));
const loss = -Math.log(probs[0]);

const CELL = 72;
const GX = 262;
const GY = 112;

const text = (
  id: string,
  x: number,
  y: number,
  w: number,
  label: string,
  step: number,
  tone: LayoutTone = PROD_TONE.infra,
  h = 18
): LayoutShape => ({ id, type: "text", x, y, w, h, label, tone, step, quiet: true });

const shapes: LayoutShape[] = [
  text("title", 20, 24, 240, "A batch of N = 4 pairs (CLIP: N = 32,768)", 1),
  ...IMAGES.map((im, r): LayoutShape => ({
    id: `im-${r}`,
    type: "box",
    x: 20,
    y: GY + r * CELL + 12,
    w: 220,
    h: CELL - 24,
    label: im.label,
    tone: MODALITY_TONE.image,
    fill: "pastel",
    step: 1,
  })),
  ...CAPTIONS.map((c, k): LayoutShape => ({
    id: `cap-${k}`,
    type: "box",
    x: GX + k * CELL + 3,
    y: GY - 52,
    w: CELL - 6,
    h: 44,
    label: c.label,
    tone: MODALITY_TONE.text,
    fill: "pastel",
    step: 1,
  })),
  text("sub-1", GX, GY + 4 * CELL + 14, 4 * CELL, "each photo and caption becomes one vector", 1),
  ...matrix("sim", GX, GY, shade, MODALITY_TONE.embedding, { cell: CELL, step: 2 }).map((s) => {
    const m = /^sim-(\d)-(\d)$/.exec(s.id);
    return m
      ? { ...s, label: sim[+m[1]][+m[2]].toFixed(2), highlight: m[1] === m[2] || undefined, quiet: m[1] !== m[2] }
      : s;
  }),
  text(
    "sub-2",
    GX,
    GY + 4 * CELL + 36,
    4 * CELL,
    "cosine similarity; the diagonal holds the true pairs",
    2,
    MODALITY_TONE.embedding
  ),

  text("p-title", 580, 56, 290, "Row 1 as probabilities (τ = 0.07)", 3),
  ...probs.map((p, k): LayoutShape => ({
    id: `p-bar-${k}`,
    type: "box",
    x: 650,
    y: 96 + k * 38,
    w: Math.max(6, Math.round(p * 200)),
    h: 24,
    tone: MODALITY_TONE.embedding,
    fill: "pastel",
    step: 3,
    highlight: k === 0 || undefined,
  })),
  ...probs.map((p, k) => text(`p-lab-${k}`, 580, 99 + k * 38, 64, `caption ${k + 1}`, 3)),
  ...probs.map((p, k) =>
    text(
      `p-val-${k}`,
      656 + Math.max(6, Math.round(p * 200)),
      99 + k * 38,
      44,
      p.toFixed(2),
      3,
      MODALITY_TONE.embedding
    )
  ),
  text(
    "p-loss",
    580,
    260,
    290,
    `loss for row 1 = −ln ${probs[0].toFixed(2)} = ${loss.toFixed(2)}`,
    3,
    MODALITY_TONE.embedding
  ),
  text("p-note1", 580, 290, 290, "Training pushes the diagonal up and the", 3),
  text("p-note2", 580, 308, 290, "other 12 cells down (N² − N, here 12).", 3),
  text("p-note3", 580, 326, 290, "Columns give the same loss the other way.", 3),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "Contrastive pre-training: matching pairs on the diagonal",
  width: 880,
  height: 472,
  steps: [
    { title: "A batch of matching photo and caption pairs" },
    { title: "Every photo is compared with every caption" },
    { title: "Each row becomes a probability for the right caption" },
  ],
  shapes,
};

export default spec;
