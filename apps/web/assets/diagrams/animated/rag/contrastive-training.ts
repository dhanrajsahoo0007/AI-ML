import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { QUESTIONS, RAG_TONE, RESULTS } from "@/components/diagrams/presets/rag";

// Contrastive training on one example from the running example. The anchor is the main question; the positive is the
// chunk "Lost phone: use a backup code" (RESULTS rank 4, cosine 0.77); the hard negative is "Change your password"
// (RESULTS rank 1, cosine 0.82: the near miss that today outranks the answer); two easy negatives from other topics
// ("Track a parcel" 0.30, "Return an item" 0.25, illustrative) stand in for the in-batch negatives.
//
// Step 1, left panel: today's space, the hard negative sits closer to the question than the positive. Step 2: the
// loss pulls the positive in and pushes the hard negative out; the easy negatives barely move. Step 3, right panel:
// after training on such examples the positive is nearest (0.85) and the hard negative falls back (0.60); both
// "after" scores are illustrative.
//
// Distance from the question is drawn as (1 − cosine) × 200 viewBox units, so the picture matches the scores.
//
// The loss (InfoNCE, softmax over the positive and the negatives with temperature TAU, illustrative):
//   before: logits 0.77/0.05 = 15.4, 0.82/0.05 = 16.4, 6, 5; p(positive) = 0.269; loss = −ln 0.269 = 1.31
//   after:  logits 17, 12, 6, 5; p(positive) = 0.993; loss = 0.007 ≈ 0.01
//   easy negatives only (before): p(positive) = 0.9999; loss = 0.0001: nothing left to learn, hence hard negatives.
//
// Tones (four plus neutral): the question orange, the embedding points pink, the chunk texts blue, the loss and its
// pull and push arrows lime.

/** Softmax temperature for the worked loss (illustrative; models choose their own). */
const TAU = 0.05;

const score = (title: string) => RESULTS.find((r) => r.title === title)!.score;
const POS = { title: "Lost phone: use a backup code", before: score("Lost phone: use a backup code"), after: 0.85 };
const HARD = { title: "Change your password", before: score("Change your password"), after: 0.6 };
const EASY = [
  { title: "Track a parcel", cos: 0.3 },
  { title: "Return an item", cos: 0.25 },
] as const;

function infoNce(pos: number, negs: number[]) {
  const e = [pos, ...negs].map((s) => Math.exp(s / TAU));
  return -Math.log(e[0] / e.reduce((a, b) => a + b, 0));
}
const LOSS_BEFORE = infoNce(POS.before, [HARD.before, ...EASY.map((e) => e.cos)]);
const LOSS_AFTER = infoNce(POS.after, [HARD.after, ...EASY.map((e) => e.cos)]);

const SCALE = 200;
// Unit directions from the question to each point (fixed across panels, so only the distance changes).
const DIR = {
  pos: [-0.87, 0.5],
  hard: [0.83, -0.55],
  easy0: [0.95, 0.3],
  easy1: [-0.87, -0.5],
} as const;

const at = (cx: number, cy: number, dir: readonly [number, number] | readonly number[], cos: number) =>
  [Math.round(cx + dir[0] * (1 - cos) * SCALE), Math.round(cy + dir[1] * (1 - cos) * SCALE)] as const;

const dot = (id: string, p: readonly [number, number], kind: "q" | "rel" | "neg", step?: number): LayoutShape => ({
  id,
  type: "circle",
  x: p[0],
  y: p[1],
  w: kind === "q" ? 18 : 14,
  tone: kind === "q" ? RAG_TONE.query : RAG_TONE.embedding,
  fill: kind === "neg" ? "soft" : "pastel",
  step,
});
const text = (
  id: string,
  x: number,
  y: number,
  label: string,
  opts: { step?: number; tone?: LayoutShape["tone"]; w?: number } = {}
): LayoutShape => ({
  id,
  type: "text",
  x,
  y,
  w: opts.w ?? label.length * 7 + 6,
  h: 18,
  label,
  tone: opts.tone ?? RAG_TONE.infra,
  step: opts.step,
});

function panel(prefix: string, cx: number, cy: number, pos: number, hard: number, step?: number): LayoutShape[] {
  const p = at(cx, cy, DIR.pos, pos);
  const h = at(cx, cy, DIR.hard, hard);
  const e0 = at(cx, cy, DIR.easy0, EASY[0].cos);
  const e1 = at(cx, cy, DIR.easy1, EASY[1].cos);
  const posLabel = `positive ${pos.toFixed(2)}`;
  return [
    dot(`${prefix}-q`, [cx, cy], "q", step),
    text(`${prefix}-q-label`, cx - 4, cy + 12, "question", { tone: RAG_TONE.query, step }),
    dot(`${prefix}-pos`, p, "rel", step),
    text(`${prefix}-pos-label`, p[0] - 9 - (posLabel.length * 7 + 6), p[1] - 9, posLabel, { step }),
    dot(`${prefix}-hard`, h, "neg", step),
    text(`${prefix}-hard-label`, h[0] + 9, h[1] - 9, `hard negative ${hard.toFixed(2)}`, { step }),
    dot(`${prefix}-e0`, e0, "neg", step),
    text(`${prefix}-e0-label`, e0[0] - 40, e0[1] + 10, `easy ${EASY[0].cos.toFixed(2)}`, { step }),
    dot(`${prefix}-e1`, e1, "neg", step),
    text(`${prefix}-e1-label`, e1[0] + 9, e1[1] - 9, `easy ${EASY[1].cos.toFixed(2)}`, { step }),
  ];
}

const L = { cx: 215, cy: 165 } as const;
const R = { cx: 645, cy: 165 } as const;
const hardL = at(L.cx, L.cy, DIR.hard, HARD.before);

const legend = (
  id: string,
  x: number,
  y: number,
  w: number,
  label: string,
  sub: string,
  tone: LayoutShape["tone"],
  fill: LayoutShape["fill"]
): LayoutShape => ({ id, type: "box", x, y, w, h: 44, label, sub, tone, fill });

const spec: LayoutSpec = {
  kind: "layout",
  title: "Contrastive training: pull the answer in, push the near miss out",
  width: 860,
  height: 430,
  steps: [
    { title: "One training example: the question, its answer and negatives" },
    { title: "The loss pulls the positive in and pushes the hard negative out" },
    { title: "After training, the answer is the nearest chunk" },
  ],
  groups: [
    { id: "g-before", title: "Today: the near miss is closest", tone: RAG_TONE.infra, x: 10, y: 24, w: 410, h: 270 },
    {
      id: "g-after",
      title: "After training on such examples",
      tone: RAG_TONE.infra,
      x: 440,
      y: 24,
      w: 410,
      h: 270,
    },
  ],
  shapes: [
    ...panel("l", L.cx, L.cy, POS.before, HARD.before),
    // Step 2: pull and push on the left panel.
    { id: "pull", type: "arrow", x: 0, y: 0, from: "l-pos", to: "l-q", tone: RAG_TONE.rank, step: 2 },
    text("pull-label", 150, 140, "pull", { step: 2, tone: RAG_TONE.rank }),
    {
      id: "push",
      type: "arrow",
      x: hardL[0] + 9,
      y: hardL[1] - 6,
      w: 28,
      h: -19,
      tone: RAG_TONE.rank,
      step: 2,
    },
    text("push-label", hardL[0] + 4, hardL[1] - 52, "push", { step: 2, tone: RAG_TONE.rank }),
    {
      id: "loss-before",
      type: "cell",
      x: 30,
      y: 250,
      w: 120,
      h: 30,
      label: `loss ${LOSS_BEFORE.toFixed(2)}`,
      tone: RAG_TONE.rank,
      step: 2,
    },
    text("easy-note", 160, 256, "easy negatives: almost no push", { step: 2 }),

    ...panel("r", R.cx, R.cy, POS.after, HARD.after, 3),
    {
      id: "loss-after",
      type: "cell",
      x: 460,
      y: 250,
      w: 120,
      h: 30,
      label: `loss ${LOSS_AFTER.toFixed(2)}`,
      tone: RAG_TONE.rank,
      step: 3,
    },

    // What each point is.
    legend("k-q", 20, 312, 400, QUESTIONS.main, "anchor: the question", RAG_TONE.query, "pastel"),
    legend("k-pos", 440, 312, 400, POS.title, "positive: the chunk that answers it", RAG_TONE.text, "pastel"),
    legend("k-hard", 20, 368, 400, HARD.title, "hard negative: looks relevant, is not", RAG_TONE.text, "paper"),
    legend(
      "k-easy",
      440,
      368,
      400,
      `${EASY[0].title}, ${EASY[1].title}`,
      "easy negatives: other questions' answers in the batch",
      RAG_TONE.text,
      "paper"
    ),
  ],
};

export default spec;
