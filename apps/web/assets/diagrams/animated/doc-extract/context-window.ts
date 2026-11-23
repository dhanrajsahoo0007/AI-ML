import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { contextBar, type ContextKind, type ContextSegment } from "@/components/diagrams/presets/agents";
import { CONTEXT, PAGE, PRICES, UNIT } from "@/components/diagrams/presets/gcase-docextract";
import { fmt } from "@/components/diagrams/presets/rag";

// The extraction call's context window for a 2-page invoice on route B (design sheet §11). Five blocks from CONTEXT in
// presets/gcase-docextract.ts, in prompt order (stable first, so the cache prefix holds):
//   instructions 900 + schema 600                                      = CONTEXT.stable 1,500 (≥ 512: cached, F39)
//   supplier hints 400 + page images 2 × PAGE.imageTokens 2,835 (150 DPI A4: 45 × 63) = 5,670
//   + OCR words 2 × PAGE.wordTokens 2,800 (350 words × 8 tokens: id, text, line, x, y) = 5,600
//                                                                      = CONTEXT.changing 11,670
//   total CONTEXT.total = 13,170 tokens in; output CONTEXT.output ≈ 1,300 (37 fields × ≈ 35).
// Images invalidate the cache from where they appear, so they sit after the cached prefix (F39).
// Cost: small VLM 1,500 × 0.01 + 11,670 × 0.10 + 1,300 × 0.50 per million = UNIT.smallVlm ≈ 0.0018 USD; the mid VLM on
// route C is too sparse to read the cache and pays the write: UNIT.midVlm ≈ 0.0401. Route A sends no images
// (CONTEXT.wordsOnlyChanging = 6,000 changing); the tie-break sends no words (CONTEXT.imageOnlyChanging = 6,070).
// Two steps: 1 the stable prefix with its "cached" bracket · 2 the changing blocks with theirs and the cost lines.
// Layout (880 wide): contextBar() from presets/agents.ts at x 30, 800 wide (≈ 0.061 px a token), brackets above, labels
// of narrow blocks below, three footer lines (the answer-engine context figure's layout).
// Colours (the agents context legend): instructions neutral, the schema teal (it constrains the output like a tool
// definition), supplier hints violet (memory from corrections), page images and OCR words blue (the document).

const X = 30;
const W = 800;
const BAR_Y = 62;
const BAR_H = 50;

const KIND: Record<(typeof CONTEXT.blocks)[number]["id"], { kind: ContextKind; label: string }> = {
  instructions: { kind: "instructions", label: "Instructions" },
  schema: { kind: "tools", label: "Schema" },
  hints: { kind: "memory", label: "Hints" },
  images: { kind: "files", label: "2 page images, 150 DPI" },
  words: { kind: "results", label: "OCR words with ids" },
};

const segments: ContextSegment[] = CONTEXT.blocks.map((b) => ({
  kind: KIND[b.id].kind,
  label: KIND[b.id].label,
  tokens: b.tokens,
  step: b.stable ? 1 : 2,
}));

const bar = contextBar("ctx", X, BAR_Y, segments, { total: CONTEXT.total, w: W, h: BAR_H, free: false });

const xAt = (tokens: number) => X + Math.round((tokens / CONTEXT.total) * W);
const bracket = (id: string, from: number, to: number, label: string, step: number): LayoutShape[] => {
  const x1 = xAt(from) + 2;
  const x2 = xAt(to) - 2;
  const y = BAR_Y - 10;
  return [
    {
      id,
      type: "path",
      x: 0,
      y: 0,
      points: [
        [x1, y + 6],
        [x1, y],
        [x2, y],
        [x2, y + 6],
      ],
      step,
    },
    {
      id: `${id}-label`,
      type: "text",
      x: Math.min(x1, X + W - 200),
      y: y - 26,
      w: Math.max(x2 - x1, 200),
      h: 20,
      label,
      tone: "neutral",
      step,
    },
  ];
};

const usd = (v: number, d = 4) => v.toFixed(d);
const FOOT_Y = BAR_Y + bar.height + 22;
const foot = (id: string, y: number, label: string): LayoutShape => ({
  id,
  type: "text",
  x: X,
  y,
  w: W,
  h: 20,
  label,
  tone: "neutral",
  step: 2,
});

const s = PRICES.small;

const spec: LayoutSpec = {
  kind: "layout",
  title: "One extraction call's context: 13,170 tokens, a 1,500-token cached prefix, then images and words",
  width: 880,
  height: FOOT_Y + 74,
  steps: [
    { title: `Stable prefix: ${fmt(CONTEXT.stable)} tokens, cached` },
    { title: `Changing blocks: ${fmt(CONTEXT.changing)} tokens of hints, images and OCR words` },
  ],
  shapes: [
    ...bracket("stable", 0, CONTEXT.stable, `Stable, cached: ${fmt(CONTEXT.stable)}`, 1),
    ...bracket("changing", CONTEXT.stable, CONTEXT.total, `Changing every invoice: ${fmt(CONTEXT.changing)}`, 2),
    ...bar.shapes,
    foot(
      "foot-1",
      FOOT_Y,
      `${fmt(CONTEXT.total)} tokens in, ≈ ${fmt(CONTEXT.output)} out. A page: ${fmt(PAGE.imageTokens)} image tokens + ${PAGE.wordsPerPage} words × ${PAGE.tokensPerWord} = ${fmt(PAGE.wordTokens)}.`
    ),
    foot(
      "foot-2",
      FOOT_Y + 22,
      `Small VLM: ${fmt(CONTEXT.stable)} × ${s.cached.toFixed(2)} + ${fmt(CONTEXT.changing)} × ${s.input.toFixed(2)} + ${fmt(CONTEXT.output)} × ${s.output.toFixed(2)} per million ≈ ${usd(UNIT.smallVlm)} USD; mid VLM ≈ ${usd(UNIT.midVlm)}.`
    ),
    foot(
      "foot-3",
      FOOT_Y + 44,
      `Route A drops the images (${fmt(CONTEXT.wordsOnlyChanging)} changing); the tie-break drops the words (${fmt(CONTEXT.imageOnlyChanging)}).`
    ),
  ],
};

export default spec;
