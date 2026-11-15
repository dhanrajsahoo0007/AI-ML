import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { MODALITY_TONE, PROD_TONE, TOKENS, n } from "@/components/diagrams/presets/production";
import {
  ILLUSTRATIVE_PRICE_PER_M,
  KETTLE_COST,
  KETTLE_PHOTO,
  TILE_RULE,
} from "@/components/diagrams/presets/production-multimodal";

// "What the kettle photo costs" on the Vision-Language Models page: a phone photo goes through one provider's
// tile rule and becomes input tokens. Rule: OpenAI's image guide, tile-based models (gpt-4o, gpt-4.1), detail "high",
// read 15 November 2026: scale to fit 2048 × 2048; if the shortest side is over 768 px, scale it to 768; count 512 px
// tiles; tokens = 85 + 170 × tiles. (Newer models in the same guide count 32 px patches with a multiplier; see page.)
//   The photo: 4032 × 3024 (a typical 12 MP phone photo; assumed).
//   fit in 2048: 4032 → 2048, scale 0.508 → 2048 × 1536
//   shortest side 1536 > 768: scale 0.5 → 1024 × 768
//   tiles: ceil(1024 ÷ 512) × ceil(768 ÷ 512) = 2 × 2 = 4
//   tokens: 85 + 4 × 170 = 85 + 680 = 765. Detail "low": 85 tokens. A Brightpost text prompt is 2,200 tokens, so the
//   photo adds 765 ÷ 2,200 = 35 %. At an illustrative 2.50 dollars per million input tokens, 765 tokens = 0.0019 dollars.
//
// Steps: 1 the phone photo · 2 fit inside 2048 · 3 shortest side to 768 · 4 four tiles = 765 tokens · 5 against the
// text prompt. Row 1 (y 36-190): shapes drawn at 0.05 px per image pixel; row 2 (y 290+): bars at 0.22 px per token.
// Colours (MODALITY_TONE): photo and tiles blue (image), the Brightpost prompt orange (text), the token bars blue.

const text = (
  id: string,
  x: number,
  y: number,
  w: number,
  label: string,
  step: number,
  tone: LayoutTone = PROD_TONE.infra
): LayoutShape => ({ id, type: "text", x, y, w, h: 18, label, tone, step, quiet: true });

const S = 0.05;
const c = KETTLE_COST;
const sizeBox = (id: string, x: number, w: number, h: number, step: number, highlight = false): LayoutShape => ({
  id,
  type: "box",
  x,
  y: 40,
  w: Math.round(w * S),
  h: Math.round(h * S),
  tone: MODALITY_TONE.image,
  fill: "pastel",
  step,
  highlight,
});

const TILE = 58;
const TX = 640;
const tiles: LayoutShape[] = [];
for (let r = 0; r < c.tilesY; r++) {
  for (let k = 0; k < c.tilesX; k++) {
    tiles.push({
      id: `tile-${r}-${k}`,
      type: "cell",
      x: TX + k * TILE,
      y: 40 + r * TILE,
      w: TILE,
      h: TILE,
      label: String(TILE_RULE.tileTokens),
      tone: MODALITY_TONE.image,
      weight: 0.35,
      step: 4,
      quiet: true,
    });
  }
}

const BAR = 0.22;
const bar = (
  id: string,
  y: number,
  label: string,
  tokens: number,
  tone: LayoutTone,
  step: number,
  hi = false
): LayoutShape[] => [
  text(`${id}-l`, 20, y + 3, 250, label, step),
  {
    id,
    type: "box",
    x: 280,
    y,
    w: Math.max(8, Math.round(tokens * BAR)),
    h: 26,
    tone,
    fill: "pastel",
    step,
    highlight: hi || undefined,
  },
  text(`${id}-v`, 288 + Math.max(8, Math.round(tokens * BAR)), y + 3, 70, n(tokens), step, tone),
];

const shapes: LayoutShape[] = [
  sizeBox("b1", 20, KETTLE_PHOTO.width, KETTLE_PHOTO.height, 1, true),
  text(
    "b1-l",
    20,
    40 + Math.round(KETTLE_PHOTO.height * S) + 8,
    220,
    `${KETTLE_PHOTO.width} × ${KETTLE_PHOTO.height} (assumed)`,
    1
  ),
  { id: "a1", type: "arrow", x: 232, y: 80, w: 44, h: 0, step: 2, label: "fit 2048" },
  sizeBox("b2", 290, c.fit.w, c.fit.h, 2, true),
  text("b2-l", 280, 40 + Math.round(c.fit.h * S) + 8, 140, `${n(c.fit.w)} × ${n(c.fit.h)}`, 2),
  { id: "a2", type: "arrow", x: 404, y: 70, w: 42, h: 0, step: 3, label: "short ≤ 768" },
  sizeBox("b3", 460, c.scaled.w, c.scaled.h, 3, true),
  text("b3-l", 440, 40 + Math.round(c.scaled.h * S) + 8, 130, `${n(c.scaled.w)} × ${c.scaled.h}`, 3),

  ...tiles,
  text("t-l1", 600, 40 + 2 * TILE + 8, 200, `${c.tiles} tiles of ${TILE_RULE.tilePx} px`, 4, MODALITY_TONE.image),
  text(
    "t-l2",
    560,
    40 + 2 * TILE + 28,
    300,
    `${TILE_RULE.baseTokens} + ${c.tiles} × ${TILE_RULE.tileTokens} = ${c.tokens} tokens`,
    4,
    MODALITY_TONE.image
  ),
  text("rule", 20, 230, 560, `Rule: ${TILE_RULE.models}, detail high, OpenAI image guide, ${TILE_RULE.asOf}`, 2),

  text("cmp-title", 20, 270, 400, "Against a Brightpost text prompt (input tokens)", 5),
  ...bar("bar-text", 300, "Text prompt (RAG)", TOKENS.inputPerRequest, MODALITY_TONE.text, 5),
  ...bar("bar-high", 336, "Kettle photo, detail high", c.tokens, MODALITY_TONE.image, 5, true),
  ...bar("bar-low", 372, "Kettle photo, detail low", c.lowTokens, MODALITY_TONE.image, 5),
  text(
    "cmp-note",
    20,
    412,
    760,
    `${c.tokens} ÷ ${n(TOKENS.inputPerRequest)} = ${Math.round(c.shareOfPrompt * 100)} % added to the prompt; at an illustrative $${ILLUSTRATIVE_PRICE_PER_M.toFixed(2)} per million tokens, ${c.tokens} tokens ≈ $${((c.tokens * ILLUSTRATIVE_PRICE_PER_M) / 1e6).toFixed(4)}`,
    5,
    MODALITY_TONE.image
  ),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "From a phone photo to input tokens",
  width: 880,
  height: 440,
  steps: [
    { title: "A phone photo of the kettle: 4032 × 3024" },
    { title: "Fit inside 2048 × 2048" },
    { title: "Shrink the shortest side to 768" },
    { title: "Count 512 px tiles: four tiles, 765 tokens" },
    { title: "Compare with a text prompt" },
  ],
  shapes,
};

export default spec;
