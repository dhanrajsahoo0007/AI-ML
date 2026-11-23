// Constants and arithmetic shared by the Vision-Language Models and Image & Video Generation pages (specs in
// assets/diagrams/animated/multimodal/). Every number the figures and the pages share comes from here.
//
// Sources (checked 15 November 2026):
//   LLaVA-1.5 (Liu et al., 2023, arXiv 2310.03744): CLIP-ViT-L at 336 px, a two-layer MLP connector, Vicuna 13 B.
//     ViT-L/14 cuts the image into 14 px patches, so 336 ÷ 14 = 24 per side, 24 × 24 = 576 visual tokens (the paper
//     does not print 576; it follows from the patch size).
//   CLIP (Radford et al., 2021, arXiv 2103.00020): 400 M image-text pairs, batch 32,768, symmetric cross entropy over
//     the N × N similarity matrix, temperature τ initialised to 0.07.
//   Flamingo (Alayrac et al., 2022, arXiv 2204.14198): Perceiver Resampler outputs 64 visual tokens; gated
//     cross-attention blocks added between frozen LM layers (every 4th in the 9 B model, every 7th in the 80 B).
//   OpenAI image guide, tile-based models (gpt-4o and gpt-4.1 rows), read 15 November 2026: detail high = scale to fit
//     2048 × 2048, then scale the shortest side down to 768 if it is longer, count 512 px tiles; tokens = 85 + 170 ×
//     tiles.
//   Latent diffusion (Rombach et al., 2022, arXiv 2112.10752) and the Stable Diffusion v1 model card: the autoencoder
//     downsamples by f = 8 and has 4 latent channels. DiT (Peebles and Xie, 2022, arXiv 2212.09748): a 256 × 256 × 3
//     image becomes a 32 × 32 × 4 latent; patch size p = 2 gives (32 ÷ 2)² = 256 tokens.
//   DDPM (Ho et al., 2020, arXiv 2006.11239): T = 1000 steps, β rising linearly from 1e-4 to 0.02.
//   Wan 2.1 (Wan Team, 2025, arXiv 2503.20314): video VAE compresses time × height × width by 4 × 8 × 8 into 16
//     channels; latent frames = 1 + T ÷ 4; the diffusion transformer patchifies 1 × 2 × 2.

import { BRIGHTPOST, TOKENS } from "./production";

/** The customer's photo of the cracked kettle (a phone photo; the size is an assumption, labelled on the figures). */
export const KETTLE_PHOTO = { width: 4032, height: 3024, label: "photo of the cracked kettle" } as const;

// ── Patches to tokens (LLaVA-1.5) ──────────────────────────────────────────────────────────────────────────────────

/** CLIP ViT-L/14 at 336 px: 336 ÷ 14 = 24 patches per side; 24 × 24 = 576 patches, each becomes one visual token. */
export const VLM = {
  inputPx: 336,
  patchPx: 14,
  perSide: 336 / 14,
  tokens: (336 / 14) ** 2,
  connector: "two-layer MLP",
} as const;

// ── Image tiles and token cost (one provider, dated) ───────────────────────────────────────────────────────────────

export const TILE_RULE = {
  asOf: "15 November 2026",
  models: "gpt-4o and gpt-4.1",
  maxSide: 2048,
  shortSide: 768,
  tilePx: 512,
  baseTokens: 85,
  tileTokens: 170,
} as const;

/**
 * The high-detail rule, step by step. For 4032 × 3024:
 *   fit inside 2048 × 2048: scale 2048 ÷ 4032 = 0.508 → 2048 × 1536
 *   shortest side 1536 > 768: scale 768 ÷ 1536 = 0.5 → 1024 × 768
 *   tiles: ceil(1024 ÷ 512) × ceil(768 ÷ 512) = 2 × 2 = 4
 *   tokens: 85 + 4 × 170 = 765
 */
export function tileCost(width: number, height: number) {
  const r = TILE_RULE;
  const fit = Math.min(1, r.maxSide / Math.max(width, height));
  const w1 = Math.floor(width * fit);
  const h1 = Math.floor(height * fit);
  const short = Math.min(w1, h1);
  const s2 = short > r.shortSide ? r.shortSide / short : 1;
  const w2 = Math.floor(w1 * s2);
  const h2 = Math.floor(h1 * s2);
  const tilesX = Math.ceil(w2 / r.tilePx);
  const tilesY = Math.ceil(h2 / r.tilePx);
  const tiles = tilesX * tilesY;
  return {
    fit: { w: w1, h: h1 },
    scaled: { w: w2, h: h2 },
    tilesX,
    tilesY,
    tiles,
    tokens: r.baseTokens + tiles * r.tileTokens,
    lowTokens: r.baseTokens,
  };
}

/** The kettle photo's cost, and the share of a Brightpost text prompt (2,200 tokens) it adds: 765 ÷ 2,200 = 35 %. */
export const KETTLE_COST = (() => {
  const c = tileCost(KETTLE_PHOTO.width, KETTLE_PHOTO.height);
  return { ...c, shareOfPrompt: c.tokens / TOKENS.inputPerRequest };
})();

/** Illustrative input price for the cost line: £ is not used; dollars per million tokens, labelled "illustrative". */
export const ILLUSTRATIVE_PRICE_PER_M = 2.5;

// ── Latent diffusion sizes ──────────────────────────────────────────────────────────────────────────────────────────

/** Stable Diffusion v1 style: f = 8 downsampling, 4 latent channels. 512 × 512 × 3 = 786,432; 64 × 64 × 4 = 16,384. */
export function latentSize(side: number, f = 8, channels = 4) {
  const lat = side / f;
  const pixelValues = side * side * 3;
  const latentValues = lat * lat * channels;
  return { side, lat, channels, pixelValues, latentValues, ratio: pixelValues / latentValues };
}

// ── The denoising grid ──────────────────────────────────────────────────────────────────────────────────────────────

/** DDPM linear schedule: ᾱ_t = ∏ (1 − β_s), β from 1e-4 to 0.02 over T = 1000 steps. */
export function alphaBar(t: number, T = 1000, b0 = 1e-4, b1 = 0.02) {
  let a = 1;
  for (let s = 1; s <= t; s++) a *= 1 - (b0 + ((b1 - b0) * (s - 1)) / (T - 1));
  return a;
}

/** A deterministic pseudo-random number in (0, 1) so the figure never changes between builds (mulberry32). */
export function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (((t ^ (t >>> 14)) >>> 0) + 0.5) / 4294967296;
  };
}

/** Standard-normal noise for an n-cell grid (Box–Muller from the seeded generator). */
export function gaussians(count: number, seed = 7) {
  const rnd = seeded(seed);
  return Array.from({ length: count }, () => Math.sqrt(-2 * Math.log(rnd())) * Math.cos(2 * Math.PI * rnd()));
}

/** An 8 × 8 toy "image" of a kettle: 1 is a dark cell. */
export const KETTLE_BITMAP = [
  "...##...",
  "..####..",
  ".######.",
  "########",
  "########",
  "########",
  ".######.",
  "..####..",
] as const;

/**
 * The noisy image at step t: x_t = √ᾱ_t · x0 + √(1 − ᾱ_t) · ε, with x0 = ±1 (dark/light), ε standard normal. The
 * cell shade is x_t mapped from about [−2, 2] to [0, 1] and clamped.
 */
export function noisyGrid(t: number, noise: number[]) {
  const ab = alphaBar(t);
  const out: number[][] = [];
  KETTLE_BITMAP.forEach((row, r) => {
    out.push(
      [...row].map((ch, c) => {
        const x0 = ch === "#" ? 1 : -1;
        const x = Math.sqrt(ab) * x0 + Math.sqrt(1 - ab) * noise[r * 8 + c];
        return Math.min(1, Math.max(0, (x + 2) / 4));
      })
    );
  });
  return { ab, signal: Math.sqrt(ab), noiseShare: Math.sqrt(1 - ab), grid: out };
}

// ── Classifier-free guidance ───────────────────────────────────────────────────────────────────────────────────────

/**
 * Four numbers stand for the denoiser's noise prediction for four latent cells (illustrative values).
 *   ε = ε_uncond + w · (ε_cond − ε_uncond).  w = 1 gives ε_cond; w > 1 pushes past it.
 * The classifier-free guidance paper writes (1 + w′) ε_cond − w′ ε_uncond, the same thing with w = 1 + w′.
 */
export const GUIDANCE = {
  uncond: [0.1, -0.2, 0.3, 0.0],
  cond: [0.3, -0.1, 0.2, 0.4],
  scales: [1, 7.5],
} as const;
export const guided = (w: number) => GUIDANCE.uncond.map((u, i) => u + w * (GUIDANCE.cond[i] - u));

// ── Video tokens (Wan 2.1 rules, an illustrative clip) ─────────────────────────────────────────────────────────────

/**
 * 81 frames of 832 × 480 (illustrative clip; the paper gives the rules, not this size).
 *   latent frames = 1 + 80 ÷ 4 = 21; latent height = 480 ÷ 8 = 60; latent width = 832 ÷ 8 = 104 (16 channels)
 *   patches of 1 × 2 × 2: 21 × 30 × 52 = 32,760 tokens
 *   one 512 × 512 image in a DiT with p = 2: (64 ÷ 2)² = 1,024 tokens at f = 8; DiT's own 256 × 256 case: 256 tokens
 */
export const VIDEO = (() => {
  const frames = 81;
  const w = 832;
  const h = 480;
  const latT = 1 + (frames - 1) / 4;
  const latH = h / 8;
  const latW = w / 8;
  const tokens = latT * (latH / 2) * (latW / 2);
  const imageTokens = 256;
  return {
    frames,
    w,
    h,
    latT,
    latH,
    latW,
    channels: 16,
    tokens,
    imageTokens,
    tokenRatio: tokens / imageTokens,
    attentionRatio: (tokens / imageTokens) ** 2,
  };
})();

export const BRIGHTPOST_PHOTO_NOTE = `${BRIGHTPOST.item} photo, order ${BRIGHTPOST.orderId}`;
