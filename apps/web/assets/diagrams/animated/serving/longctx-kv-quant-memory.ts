import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { PROD_TONE, meter, n } from "@/components/diagrams/presets/production";
import {
  BUDGET_GB,
  KV_BITS,
  KV_MODEL,
  LONG_PROMPT,
  bytesPerToken,
  seqGB,
  tokensThatFit,
} from "@/components/diagrams/presets/production-longctx";

// KV-cache quantisation in memory (long-context-ring-attention-and-kv-quantization). The model is the one behind
// transformer/kv-cache-growth: 80 layers, 64 KV heads (full multi-head attention), head size 128, so one token's cache
// holds 2 × 80 × 64 × 128 = 1,310,720 values (numbers live in presets/production-longctx.ts).
//
// Steps: 1 bytes per token at 16, 8 and 4 bits: 2,621,440 · 1,310,720 · 655,360 bytes = 2.62 · 1.31 · 0.66 MB (half and
// a quarter) · 2 one 128,000-token sequence against a 200 GB KV budget (illustrative): 128,000 × 2.62 MB = 335.5 GB
// (135.5 GB over, red), 167.8 GB (fits), 83.9 GB (fits with room) · 3 the tokens that fit in 200 GB:
// ⌊200e9 ÷ 2,621,440⌋ = 76,293; ⌊200e9 ÷ 1,310,720⌋ = 152,587; ⌊200e9 ÷ 655,360⌋ = 305,175 (2×, 4×), against the
// marker at 128,000.
// Scales and zero points are not drawn: at a group size of 128 with a 16-bit scale and zero point they add
// 32 ÷ 128 = 0.25 bit per value.
//
// Layout (860 × 800): three dotted groups. A: bars from x 130, 520 px for 2.62 MB (198 px per MB). B: three meters,
// 600 wide, one scale 0–340 GB. C: bars from x 130, 560 px for 305,175 tokens. Tones: the cache is violet (a store);
// what does not fit is red (the meter's overrun cell); neutral for frames. One highlight: the 16-bit overrun cell in B.

const W = 860;
const text = (
  id: string,
  x: number,
  y: number,
  w: number,
  label: string,
  step: number,
  tone: LayoutTone = "neutral",
  h = 18
) => ({ id, type: "text", x, y, w, h, label, tone, step, quiet: true }) as LayoutShape;
const MB = (bits: number) => (bytesPerToken(bits) / 1e6).toFixed(2);
const r1 = (v: number) => Math.round(v * 10) / 10;

// ── Step 1: bytes per token ─────────────────────────────────────────────────────────────────────────────────────
const A_BAR = { x: 130, max: 520, h: 26, pitch: 34, y: 64 };
const perToken: LayoutShape[] = [];
KV_BITS.forEach((bits, i) => {
  const y = A_BAR.y + i * A_BAR.pitch;
  perToken.push(text(`a-label-${bits}`, 40, y + 4, 80, `${bits}-bit`, 1), {
    id: `a-bar-${bits}`,
    type: "box",
    x: A_BAR.x,
    y,
    w: Math.round((A_BAR.max * bytesPerToken(bits)) / bytesPerToken(16)),
    h: A_BAR.h,
    label: `${MB(bits)} MB`,
    tone: PROD_TONE.store,
    fill: "pastel",
    step: 1,
  });
});
perToken.push(
  text(
    "a-note",
    A_BAR.x + 180,
    A_BAR.y + 34 + 2,
    520,
    "half the bytes per token at 8 bits, a quarter at 4 bits",
    1,
    "neutral"
  )
);

// ── Step 2: one 128,000-token sequence against the budget ──────────────────────────────────────────────────────
const B_Y = 204;
const B_MAX = r1(seqGB(16)); // 335.5: the 16-bit bar ends the scale
const meters: LayoutShape[] = KV_BITS.flatMap((bits, i) =>
  meter(`b-${bits}`, 40, B_Y + 30 + i * 80, {
    label: `${bits}-bit cache: ${n(LONG_PROMPT)} × ${MB(bits)} MB`,
    used: r1(seqGB(bits)),
    limit: BUDGET_GB,
    unit: "GB",
    width: 600,
    max: B_MAX,
    tone: PROD_TONE.store,
    limitLabel: `${BUDGET_GB} GB budget`,
    step: 2,
  }).map((shape) => ({ ...shape, quiet: true, highlight: shape.id === "b-16-over" ? true : undefined }))
);
const overBy = r1(seqGB(16) - BUDGET_GB);

// ── Step 3: tokens that fit ─────────────────────────────────────────────────────────────────────────────────────
const C_Y = 540;
const C_BAR = { x: 130, max: 560, h: 28, pitch: 38, y: C_Y + 40 };
const fitMax = tokensThatFit(4);
const px = (tokens: number) => Math.round((tokens / fitMax) * C_BAR.max);
const fit: LayoutShape[] = [];
KV_BITS.forEach((bits, i) => {
  const y = C_BAR.y + i * C_BAR.pitch;
  const tokens = tokensThatFit(bits);
  fit.push(text(`c-label-${bits}`, 40, y + 5, 80, `${bits}-bit`, 3), {
    id: `c-bar-${bits}`,
    type: "box",
    x: C_BAR.x,
    y,
    w: px(tokens),
    h: C_BAR.h,
    label: `${n(tokens)} tokens`,
    tone: PROD_TONE.store,
    fill: "pastel",
    step: 3,
  });
});
const markerX = C_BAR.x + px(LONG_PROMPT);
fit.push(
  {
    id: "c-marker",
    type: "path",
    x: 0,
    y: 0,
    points: [
      [markerX, C_BAR.y - 10],
      [markerX, C_BAR.y + 2 * C_BAR.pitch + C_BAR.h + 8],
    ],
    dashed: true,
    tone: PROD_TONE.infra,
    step: 3,
  },
  text("c-marker-label", markerX - 70, C_BAR.y + 2 * C_BAR.pitch + C_BAR.h + 10, 140, `${n(LONG_PROMPT)} tokens`, 3)
);

const spec: LayoutSpec = {
  kind: "layout",
  title: "Quantising the KV cache: bytes per token, and what fits",
  width: W,
  height: 800,
  steps: [
    { title: "Bytes of cache per token" },
    { title: "One 128,000-token sequence against the budget" },
    { title: "Tokens of context that fit" },
  ],
  groups: [
    {
      id: "per-token",
      title: `Per token: 2 × ${KV_MODEL.layers} layers × ${KV_MODEL.kvHeads} KV heads × ${KV_MODEL.dHead} dims × bits ÷ 8`,
      tone: PROD_TONE.store,
      x: 16,
      y: 16,
      w: 828,
      h: 150,
    },
    {
      id: "sequence",
      title: `One ${n(LONG_PROMPT)}-token sequence against a ${BUDGET_GB} GB KV budget`,
      tone: PROD_TONE.store,
      x: 16,
      y: B_Y - 18,
      w: 828,
      h: 318,
    },
    {
      id: "fit",
      title: `Context that fits in ${BUDGET_GB} GB`,
      tone: PROD_TONE.store,
      x: 16,
      y: C_Y - 18,
      w: 828,
      h: 200,
    },
  ],
  shapes: [
    ...perToken,
    ...meters,
    text(
      "b-over",
      40,
      B_Y + 30 + 3 * 80 - 4,
      600,
      `At 16 bits the cache alone is ${overBy} GB past the budget; at 8 bits it fits.`,
      2,
      PROD_TONE.failure
    ),
    ...fit,
    text(
      "footnote",
      20,
      C_Y + 194,
      W - 40,
      "Full multi-head attention (the KV cache growth example). The 200 GB budget is illustrative.\n" +
        "Scales and zero points add about 0.25 bit per value at group size 128 and are not drawn.",
      1,
      "neutral",
      40
    ),
  ],
};

export default spec;
