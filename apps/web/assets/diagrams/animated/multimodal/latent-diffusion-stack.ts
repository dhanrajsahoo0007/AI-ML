import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { MODALITY_TONE, PROD_TONE, n } from "@/components/diagrams/presets/production";
import { latentSize } from "@/components/diagrams/presets/production-multimodal";

// "The latent diffusion stack" on the Image & Video Generation page. Latent diffusion (Rombach et al., 2022, arXiv
// 2112.10752) runs the denoising loop in the compressed latent space of an autoencoder instead of in pixels, with the
// text prompt entering the denoiser through cross-attention. Stable Diffusion v1 uses a downsampling factor f = 8 and 4
// latent channels (model card), so
//   512 × 512 × 3 = 786,432 pixel values; latent 512 ÷ 8 = 64: 64 × 64 × 4 = 16,384 values; 786,432 ÷ 16,384 = 48.
// Three parts: a text encoder, a denoiser (a U-Net in the paper, a transformer in DiT, Peebles and Xie, 2022, arXiv
// 2212.09748), and a VAE decoder. The VAE encoder is used in training only (image → latent).
//
// Steps: 1 the prompt becomes embeddings · 2 start from noise in latent space, text steers by cross-attention · 3 the
// denoiser loops · 4 the VAE decoder makes pixels.
// Grid: row 1 y 40 (prompt x 20, text encoder x 260, embeddings x 470); row 2 y 190 (noise x 20, denoiser x 230,
// clean latent x 490, VAE decoder x 690); row 3 y 330 (numbers).
// Colours (MODALITY_TONE): prompt orange (text), latents and image blue, models green, embeddings pink.

const L = latentSize(512);

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

const shapes: LayoutShape[] = [
  box("prompt", 20, 40, 200, 56, "Prompt", "“a kettle on a white shelf”", MODALITY_TONE.text, 1),
  box("tenc", 260, 40, 150, 56, "Text encoder", "prompt to vectors", MODALITY_TONE.model, 1, true),
  box("emb", 470, 40, 190, 56, "Text embeddings", "one vector per token", MODALITY_TONE.embedding, 1),
  link("a1", "prompt", "tenc", 1),
  link("a2", "tenc", "emb", 1),

  box("noise", 20, 190, 160, 64, "Noise latent", `${L.lat} × ${L.lat} × ${L.channels}`, MODALITY_TONE.image, 2),
  box("den", 230, 190, 210, 64, "Denoiser", "U-Net or transformer", MODALITY_TONE.model, 3, true),
  link("a3", "noise", "den", 2),
  link("a4", "emb", "den", 2, "cross-attention"),
  box("clean", 490, 190, 160, 64, "Clean latent", `${L.lat} × ${L.lat} × ${L.channels}`, MODALITY_TONE.image, 3),
  link("a5", "den", "clean", 3, "× steps"),
  text("loop", 230, 262, 210, "predict the noise, remove some, repeat", 3),

  box("vae", 690, 190, 160, 64, "VAE decoder", "latent to pixels", MODALITY_TONE.model, 4, true),
  link("a6", "clean", "vae", 4),
  box("img", 690, 320, 160, 56, "Image", `${L.side} × ${L.side} × 3`, MODALITY_TONE.image, 4),
  link("a7", "vae", "img", 4),

  text("n1", 20, 290, 200, `latent: ${n(L.latentValues)} values`, 2, MODALITY_TONE.image),
  text("n2", 20, 312, 260, `pixels: ${n(L.pixelValues)} values`, 4, MODALITY_TONE.image),
  text(
    "n3",
    20,
    340,
    560,
    `${n(L.pixelValues)} ÷ ${n(L.latentValues)} = ${L.ratio}× fewer values to denoise`,
    4,
    MODALITY_TONE.image
  ),
  text("n4", 20, 362, 560, `downsampling f = 8, ${L.channels} latent channels (Stable Diffusion v1)`, 4),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "Latent diffusion: text encoder, denoiser, VAE decoder",
  width: 880,
  height: 400,
  steps: [
    { title: "The text encoder turns the prompt into vectors" },
    { title: "Start from noise in the small latent space" },
    { title: "The denoiser loops, steered by the text" },
    { title: "The VAE decoder turns the latent into pixels" },
  ],
  shapes,
};

export default spec;
