import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { MODALITY_TONE, PROD_TONE, n } from "@/components/diagrams/presets/production";
import { KETTLE_BITMAP, VLM } from "@/components/diagrams/presets/production-multimodal";
import { vector } from "@/components/diagrams/presets/transformer";

// "From a photo to tokens in the LLM's sequence" on the Vision-Language Models page. A vision-language model reads a
// picture by cutting it into square patches, turning each patch into a vector with a vision encoder, passing the
// vectors through a small projector so they match the language model's width, and putting them in the sequence in
// front of the question's text tokens. The count is computed for LLaVA-1.5 (Liu et al., 2023, arXiv 2310.03744):
// CLIP ViT-L/14 at 336 px, a two-layer MLP connector. 336 ÷ 14 = 24 patches a side, 24 × 24 = 576 visual tokens.
// (The paper does not print 576; it follows from the patch size.)
//
// Steps: 1 the photo at 336 px · 2 cut into 14 px patches: 24 × 24 = 576 · 3 the vision encoder gives one vector per
// patch · 4 the projector maps them to LLM width · 5 they sit in the sequence before the text tokens.
// Grid: photo of 24 × 24 cells of 7 px at x 24, y 40 (168 px square); encoder x 236, y 74; patch vectors x 470, y 92;
// projector x 470, y 214; sequence row y 312: visual box x 24 (w 500), question box x 540 (w 150), LLM x 720 (w 140).
// Colours (MODALITY_TONE): photo blue (image), text orange, vectors pink (embedding), models green; arrows neutral.

const CELLS = VLM.perSide; // 24
const CELL = 7;
const PHOTO = { x: 24, y: 40 } as const;

// The photo: the 8 × 8 kettle bitmap upsampled 3×, so each of the 576 cells is one patch (its average shade).
const photo: LayoutShape[] = [];
for (let r = 0; r < CELLS; r++) {
  for (let c = 0; c < CELLS; c++) {
    const dark = KETTLE_BITMAP[Math.floor(r / 3)][Math.floor(c / 3)] === "#";
    photo.push({
      id: `ph-${r}-${c}`,
      type: "cell",
      x: PHOTO.x + c * CELL,
      y: PHOTO.y + r * CELL,
      w: CELL,
      h: CELL,
      tone: MODALITY_TONE.image,
      weight: dark ? 1 : 0.02,
      step: 1,
      quiet: true,
    });
  }
}

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
  sub: string | undefined,
  tone: LayoutTone,
  step: number,
  highlight = false
): LayoutShape => ({ id, type: "box", x, y, w, h, label, sub, tone, fill: "pastel", step, highlight });

const arrow = (id: string, from: string, to: string, step: number, label?: string): LayoutShape => ({
  id,
  type: "arrow",
  x: 0,
  y: 0,
  from,
  to,
  label,
  step,
});

const shapes: LayoutShape[] = [
  ...photo,
  box("photo-tag", 24, 214, 168, 28, "Photo, 336 × 336 px", undefined, MODALITY_TONE.image, 1, true),
  text("grid-note", 24, 246, 190, "each cell = one 14 × 14 px patch", 2, MODALITY_TONE.image),
  text(
    "grid-count",
    24,
    264,
    190,
    `${VLM.perSide} × ${VLM.perSide} = ${n(VLM.tokens)} patches`,
    2,
    MODALITY_TONE.image
  ),

  box("enc", 236, 80, 180, 64, "Vision encoder", "CLIP ViT-L/14", MODALITY_TONE.model, 3, true),
  { id: "a-photo-enc", type: "arrow", x: 196, y: 112, w: 38, h: 0, step: 3 },
  ...vector("pv", 470, 100, 6, MODALITY_TONE.embedding, { step: 3 }),
  text("pv-dots", 558, 100, 24, "…", 3),
  text("pv-label", 470, 120, 200, `${n(VLM.tokens)} patch vectors, one each`, 3, MODALITY_TONE.embedding),
  { id: "a-enc-pv", type: "arrow", x: 416, y: 112, w: 52, h: 0, step: 3 },

  box("proj", 470, 176, 190, 56, "Projector", `${VLM.connector} (LLaVA-1.5)`, MODALITY_TONE.model, 4, true),
  { id: "a-pv-proj", type: "arrow", x: 520, y: 124, w: 0, h: 50, step: 4 },
  text("proj-note", 680, 190, 190, "maps each vector to the", 4),
  text("proj-note2", 680, 208, 190, "LLM's width, so it reads", 4),
  text("proj-note3", 680, 226, 190, "like a word embedding", 4),

  box(
    "vis",
    24,
    312,
    480,
    50,
    `${n(VLM.tokens)} visual tokens`,
    "one per patch, in reading order",
    MODALITY_TONE.embedding,
    5
  ),
  box("q", 520, 312, 170, 50, "Question tokens", "“Is the kettle safe to use?”", MODALITY_TONE.text, 5),
  box("llm", 724, 306, 148, 62, "LLM", "reads the whole sequence", MODALITY_TONE.model, 5, true),
  { id: "a-proj-vis", type: "arrow", x: 0, y: 0, from: "proj", to: "vis", step: 5 },
  arrow("a-vis-q", "vis", "q", 5),
  arrow("a-q-llm", "q", "llm", 5),
  text("seq-title", 24, 288, 300, "The sequence the language model sees", 5),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "From a photo to visual tokens in the LLM's sequence",
  width: 880,
  height: 384,
  steps: [
    { title: "A photo of the cracked kettle, resized to 336 px" },
    { title: "Cut into 14 px patches: 24 × 24 = 576" },
    { title: "The vision encoder turns each patch into a vector" },
    { title: "The projector maps the vectors to the LLM's width" },
    { title: "Visual tokens sit in the sequence before the question" },
  ],
  shapes,
};

export default spec;
