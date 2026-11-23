import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { ROLE_TONE } from "@/components/diagrams/presets/transformer";

// Grammar-constrained decoding for one step of JSON output, for "Constrained and grammar-guided decoding" on the
// Decoding & Sampling page. The schema is an object with one boolean field, "rain"; the model has written {"rain":
// and must now produce a boolean. Six candidate tokens stand for the vocabulary.
// Step 1: the unconstrained softmax. The most likely token, Yes, would break the JSON.
// Step 2: the grammar mask sets the logit of every token the grammar cannot accept to −∞, so only true and false
//         remain, and the softmax renormalizes over them.
//
// Method checked against Willard & Louf (2023), "Efficient Guided Generation for Large Language Models", arXiv
// 2307.09702, §2–3: generation is guided by a finite-state machine built from a regular expression (or, §4, a
// pushdown automaton for a context-free grammar such as JSON); at each step a boolean mask over the vocabulary
// removes the tokens that the current state cannot accept, before sampling; an index from states to allowed tokens
// is built ahead of time so the per-step cost is O(1) on average instead of a scan of the whole vocabulary.
//
// Working (computed below), logits Yes 2.6, true 2.1, "yes" 1.8, false 0.9, } 0.4, maybe 0.2:
//   exp = 13.46, 8.17, 6.05, 2.46, 1.49, 1.22; sum 32.85
//   unconstrained p = 0.410, 0.249, 0.184, 0.075, 0.045, 0.037 → shown 0.41, 0.25, 0.18, 0.07, 0.05, 0.04 (sum 1.00)
//   valid mass (true + false) = 0.323, so 0.677 of the mass would produce invalid JSON
//   masked p: true 8.17 / (8.17 + 2.46) = 0.769, false 0.231 → shown 0.77, 0.23 (sum 1.00)
// (Leading spaces inside tokens are ignored here; real tokenizers often attach them, which the mask also handles.)

const CANDIDATES: { token: string; logit: number; valid: boolean }[] = [
  { token: "Yes", logit: 2.6, valid: false },
  { token: "true", logit: 2.1, valid: true },
  { token: '"yes"', logit: 1.8, valid: false },
  { token: "false", logit: 0.9, valid: true },
  { token: "}", logit: 0.4, valid: false },
  { token: "maybe", logit: 0.2, valid: false },
];

const softmax = (z: number[]) => {
  const e = z.map((v) => Math.exp(v));
  const s = e.reduce((a, b) => a + b, 0);
  return e.map((v) => v / s);
};
const RAW = softmax(CANDIDATES.map((c) => c.logit));
const MASKED = softmax(CANDIDATES.map((c) => (c.valid ? c.logit : -Infinity)));
const INVALID_MASS = RAW.reduce((a, p, i) => a + (CANDIDATES[i].valid ? 0 : p), 0);
const fmt = (p: number) => p.toFixed(2);

// ── Grid ─────────────────────────────────────────────────────────────────────────────────────────────────────
const ROW_TOP = 196;
const ROW_STEP = 34;
const BAR_H = 20;
const rowTop = (i: number) => ROW_TOP + i * ROW_STEP;
const ROWS_BOTTOM = rowTop(CANDIDATES.length - 1) + ROW_STEP;
const GROUP_Y = ROW_TOP - 52;
const BAR_PX = 220;
const X = { token: 16, logit: 104, rawGroup: 186, rawBar: 200, mask: 440, maskedGroup: 560, maskedBar: 574 };
const RAW_W = 230;
const MASKED_W = 290;
const PROB: LayoutTone = ROLE_TONE.softmax;
const LOGIT: LayoutTone = ROLE_TONE.linear;
const MASK: LayoutTone = ROLE_TONE.mask;

const text = (
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  tone: LayoutTone,
  step: number,
  quiet = true
): LayoutShape => ({ id, type: "text", x, y, w, h, label, tone, step, quiet: quiet || undefined });

const bar = (id: string, x: number, i: number, p: number, step: number): LayoutShape[] => {
  const w = Math.max(3, Math.round(p * BAR_PX));
  return [
    { id, type: "cell", x, y: rowTop(i), w, h: BAR_H, tone: PROB, fill: "pastel", step, quiet: true },
    text(`${id}-v`, x + w + 4, rowTop(i), 40, BAR_H, fmt(p), PROB, step),
  ];
};

const shapes: LayoutShape[] = [
  text("schema", 16, 12, 836, 20, "Schema: an object with one boolean field, “rain”", "neutral", 1),
  {
    id: "so-far",
    type: "box",
    x: X.token,
    y: 48,
    w: 150,
    h: 44,
    label: '{"rain":',
    sub: "output so far",
    tone: "neutral",
    fill: "pastel",
    step: 1,
  },
  text("h-token", X.token, ROW_TOP - 30, 76, 20, "token", "neutral", 1),
  text("h-logit", X.logit - 8, ROW_TOP - 30, 64, 20, "logit", LOGIT, 1),
  text("h-raw", X.rawBar - 4, ROW_TOP - 30, 120, 20, "p", PROB, 1),
  text(
    "raw-note",
    X.rawGroup - 20,
    ROWS_BOTTOM + 12,
    RAW_W + 40,
    36,
    `${fmt(INVALID_MASS)} of the mass is on tokens\nthat break the JSON.`,
    "red",
    1
  ),
];

CANDIDATES.forEach((c, i) => {
  shapes.push(
    text(`tok-${i}`, X.token, rowTop(i), 76, BAR_H, c.token, "neutral", 1),
    text(`logit-${i}`, X.logit, rowTop(i), 48, BAR_H, c.logit.toFixed(1), LOGIT, 1),
    ...bar(`raw-${i}`, X.rawBar, i, RAW[i], 1),
    text(`mask-${i}`, X.mask, rowTop(i), 80, BAR_H, c.valid ? "keep" : "−∞", c.valid ? PROB : "neutral", 2)
  );
  if (c.valid) shapes.push(...bar(`masked-${i}`, X.maskedBar, i, MASKED[i], 2));
  else shapes.push(text(`masked-${i}-v`, X.maskedBar - 12, rowTop(i), 40, BAR_H, "0", "neutral", 2));
});

// ── Step 2: the grammar mask ─────────────────────────────────────────────────────────────────────────────────
shapes.push(
  {
    id: "mask",
    type: "box",
    x: X.mask - 35,
    y: 48,
    w: 150,
    h: 44,
    label: "Grammar mask",
    sub: "next: true or false",
    tone: MASK,
    fill: "pastel",
    step: 2,
  },
  {
    id: "so-far>mask",
    type: "arrow",
    x: 0,
    y: 0,
    from: "so-far",
    to: "mask",
    label: "parser state",
    step: 2,
    quiet: true,
  },
  {
    id: "mask>col",
    type: "arrow",
    x: X.mask + 40,
    y: 92,
    w: 0,
    h: ROW_TOP - 36 - 92,
    step: 2,
    quiet: true,
  },
  text("h-mask", X.mask, ROW_TOP - 30, 80, 20, "mask", "neutral", 2),
  text("h-masked", X.maskedBar - 4, ROW_TOP - 30, 160, 20, "p after the mask", PROB, 2),
  text(
    "masked-note",
    X.maskedGroup,
    ROWS_BOTTOM + 12,
    MASKED_W,
    36,
    "Every possible draw is valid JSON;\nthe model still chooses between true and false.",
    "neutral",
    2
  )
);

const spec: LayoutSpec = {
  kind: "layout",
  title: "Grammar-constrained decoding masks invalid tokens",
  width: 868,
  height: ROWS_BOTTOM + 60,
  steps: [
    { title: "Unconstrained: the top token breaks the JSON" },
    { title: "The grammar mask leaves only valid tokens" },
  ],
  groups: [
    {
      id: "g-raw",
      title: "Without a mask",
      tone: "neutral",
      x: X.rawGroup,
      y: GROUP_Y,
      w: RAW_W,
      h: ROWS_BOTTOM - GROUP_Y,
    },
    {
      id: "g-masked",
      title: "With the mask",
      tone: PROB,
      x: X.maskedGroup,
      y: GROUP_Y,
      w: MASKED_W,
      h: ROWS_BOTTOM - GROUP_Y,
    },
  ],
  shapes,
};

export default spec;
