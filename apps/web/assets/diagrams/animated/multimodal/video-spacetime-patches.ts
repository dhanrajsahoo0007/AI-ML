import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { MODALITY_TONE, PROD_TONE, n } from "@/components/diagrams/presets/production";
import { VIDEO } from "@/components/diagrams/presets/production-multimodal";
import { vector } from "@/components/diagrams/presets/transformer";

// "From a clip to spacetime patches" on the Image & Video Generation page. Video diffusion transformers compress the
// clip with a video VAE, cut the latent into patches that span time as well as space, and treat every patch as one
// token (OpenAI's Sora report, "Video generation models as world simulators", February 2024, describes transformers on
// "spacetime patches" of video latents). Arithmetic from the Wan 2.1 report (Wan Team, 2025, arXiv 2503.20314): the
// VAE compresses time × height × width by 4 × 8 × 8 into 16 channels, latent frames = 1 + T ÷ 4, and the diffusion
// transformer patchifies 1 × 2 × 2. The clip below, 81 frames of 832 × 480, is an illustrative size (the report gives
// the rules, not this clip):
//   latent frames = 1 + 80 ÷ 4 = 21; latent height 480 ÷ 8 = 60; latent width 832 ÷ 8 = 104; 16 channels
//   patches of 1 × 2 × 2: 21 × (60 ÷ 2) × (104 ÷ 2) = 21 × 30 × 52 = 32,760 tokens
//   one 256 × 256 image in DiT (Peebles and Xie, 2022): 32 × 32 latent, p = 2: (32 ÷ 2)² = 256 tokens
//   32,760 ÷ 256 = 128 times the tokens; attention compares every pair, so 128² = 16,384 times the pairs
//   (the exact ratio 16,376 rounds to about 16,000).
//
// Steps: 1 the clip · 2 the video VAE compresses 4 × 8 × 8 · 3 patches of 1 × 2 × 2 become tokens · 4 attention cost.
// Grid: row 1 y 40: clip box x 20, VAE x 270, latent x 440 (w 200), patchify x 680; row 2 y 140: token strip;
// row 3 y 250: two bars at 0.012 px per token.
// Colours (MODALITY_TONE): video and latents blue, models green, tokens pink.

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

const link = (id: string, from: string, to: string, step: number, label?: string): LayoutShape => ({
  id,
  type: "arrow",
  x: 0,
  y: 0,
  from,
  to,
  step,
  label,
});

const BAR = 0.012;
const barW = (tokens: number) => Math.max(4, Math.round(tokens * BAR));

const shapes: LayoutShape[] = [
  box(
    "clip",
    20,
    40,
    200,
    70,
    "Video clip",
    `${VIDEO.frames} frames × ${VIDEO.h} × ${VIDEO.w}`,
    MODALITY_TONE.image,
    1
  ),
  ...vector("frames", 30, 124, 10, MODALITY_TONE.image, { cell: 16, step: 1 }),
  text("frames-dots", 196, 124, 20, "…", 1),
  text("frames-note", 20, 146, 200, "one cell per frame (drawn: 10 of 81)", 1),

  box("vae", 262, 40, 150, 70, "Video VAE", "4 × 8 × 8 smaller", MODALITY_TONE.model, 2, true),
  link("a1", "clip", "vae", 2),
  box(
    "lat",
    452,
    40,
    200,
    70,
    "Latent video",
    `${VIDEO.latT} frames × ${VIDEO.latH} × ${VIDEO.latW} × ${VIDEO.channels}`,
    MODALITY_TONE.image,
    2
  ),
  link("a2", "vae", "lat", 2),
  text("lat-note", 452, 116, 200, `${VIDEO.latT} = 1 + ${VIDEO.frames - 1} ÷ 4`, 2, MODALITY_TONE.image),

  box("patch", 692, 40, 170, 70, "Patchify", "1 × 2 × 2 patches", MODALITY_TONE.model, 3, true),
  link("a3", "lat", "patch", 3),
  ...vector("tok", 692, 130, 8, MODALITY_TONE.embedding, { cell: 16, step: 3 }),
  text("tok-dots", 822, 130, 20, "…", 3),
  text(
    "tok-l1",
    560,
    154,
    300,
    `${VIDEO.latT} × ${VIDEO.latH / 2} × ${VIDEO.latW / 2} = ${n(VIDEO.tokens)} tokens`,
    3,
    MODALITY_TONE.embedding
  ),

  text("cost-title", 20, 214, 500, "Tokens the transformer attends over", 4),
  {
    id: "bar-img",
    type: "box",
    x: 330,
    y: 242,
    w: barW(VIDEO.imageTokens),
    h: 24,
    tone: MODALITY_TONE.image,
    fill: "pastel",
    step: 4,
  },
  text("bar-img-l", 20, 245, 300, "one 256 × 256 image (DiT, p = 2)", 4),
  text("bar-img-v", 330 + barW(VIDEO.imageTokens) + 8, 245, 60, n(VIDEO.imageTokens), 4, MODALITY_TONE.image),
  {
    id: "bar-vid",
    type: "box",
    x: 330,
    y: 280,
    w: barW(VIDEO.tokens),
    h: 24,
    tone: MODALITY_TONE.embedding,
    fill: "pastel",
    step: 4,
    highlight: true,
  },
  text("bar-vid-l", 20, 283, 300, "the 81-frame clip", 4),
  text("bar-vid-v", 330 + barW(VIDEO.tokens) + 8, 283, 60, n(VIDEO.tokens), 4, MODALITY_TONE.embedding),
  text(
    "cost-1",
    20,
    324,
    800,
    `${n(VIDEO.tokens)} ÷ ${VIDEO.imageTokens} = ${Math.round(VIDEO.tokenRatio)}× the tokens`,
    4,
    MODALITY_TONE.embedding
  ),
  text(
    "cost-2",
    20,
    346,
    800,
    `attention compares every pair: ${Math.round(VIDEO.tokenRatio)}² ≈ ${n(Math.round(VIDEO.attentionRatio / 1000) * 1000)}× the pairs (illustrative clip)`,
    4,
    MODALITY_TONE.embedding
  ),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "From a clip to spacetime patches",
  width: 880,
  height: 384,
  steps: [
    { title: "A clip is a stack of frames" },
    { title: "The video VAE compresses time and space" },
    { title: "Patches that span time become tokens" },
    { title: "Attention cost grows with the square of the tokens" },
  ],
  shapes,
};

export default spec;
