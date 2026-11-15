import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { RAG_TONE, scatter, type ScatterPoint } from "@/components/diagrams/presets/rag";

// One embedding space for text and pictures. Left: how such a space is trained, in the style of CLIP (Radford et al.,
// 2021, arXiv 2103.00020): an image encoder and a text encoder see a batch of image-caption pairs and learn to predict
// which caption goes with which image, so each picture is pulled towards its own caption (the diagonal) and pushed
// away from the others. CLIP trained on 400 million (image, text) pairs collected from the internet.
// Right: Brightpost's help centre in that space as a 2-D sketch (positions illustrative). Text chunks are circles,
// images are squares; both cluster by topic. The question "Where is the backup code button?" lands inside the dashed
// ring next to the sign-in screenshot and the chunk "Lost phone: use a backup code" (a RESULTS title), so a text
// question can retrieve a picture.
//
// Steps: 1 the training grid · 2 text chunks land by topic · 3 images land beside the text about the same thing ·
// 4 the question and its top-k ring.
// Layout: grid panel x 8-312; plot x 340-868, y 44-374. Labels sit right of their point, outside the ring.
// Tones (two plus neutral): embeddings pink (circles, squares, grid weights), the question orange.

/** The figure's own question (not in presets/rag.ts): a question whose best answer is a picture. */
const QUESTION = "Where is the backup code button?";

const PLOT = { x: 340, y: 44, w: 528, h: 330 } as const;
const fx = (x: number) => (x - PLOT.x) / PLOT.w;
const fy = (y: number) => (y - PLOT.y) / PLOT.h;

/** A text-chunk point at absolute (x, y). */
const chunk = (id: string, x: number, y: number, kind: ScatterPoint["kind"] = "chunk"): ScatterPoint => ({
  id,
  x: fx(x),
  y: fy(y),
  kind,
  step: 2,
});

const Q = { x: 470, y: 182 } as const;
const RING_R = 46;

const points: ScatterPoint[] = [
  // Sign-in and account.
  chunk("s0", 392, 108),
  chunk("s1", 436, 94),
  chunk("s2", 372, 160),
  chunk("s3", 398, 214),
  chunk("s4", 474, 116),
  chunk("hit", 494, 164, "relevant"),
  // Orders and delivery.
  chunk("o0", 712, 98),
  chunk("o1", 760, 84),
  chunk("o2", 806, 112),
  chunk("o3", 770, 196),
  chunk("o4", 790, 168),
  // Returns and refunds.
  chunk("r0", 640, 290),
  chunk("r1", 690, 270),
  chunk("r2", 742, 300),
  chunk("r3", 662, 336),
  // The question.
  { id: "q", x: fx(Q.x), y: fy(Q.y), kind: "query", step: 4 },
];

const text = (
  id: string,
  x: number,
  y: number,
  label: string,
  step: number,
  tone: LayoutTone = RAG_TONE.infra,
  w = label.length * 7 + 8
): LayoutShape => ({ id, type: "text", x, y, w, h: 18, label, tone, step });

/** An image point: a pastel pink square centred on (x, y) with its label to the right. */
const image = (id: string, x: number, y: number, label: string, labelX = x + 14): LayoutShape[] => [
  { id, type: "cell", x: x - 8, y: y - 8, w: 16, h: 16, tone: RAG_TONE.embedding, fill: "pastel", step: 3 },
  text(`${id}-label`, labelX, y - 9, label, 3),
];

// The training grid: three pictures (rows) against their three captions (columns).
const GRID = { x: 124, y: 112, cw: 60, ch: 48 } as const;
const ROWS = ["Sign-in screen", "Parcel tracker", "Returns label"];
const COLS = ["sign-in", "tracking", "returns"];
const grid: LayoutShape[] = [
  ...ROWS.flatMap((_, r) =>
    COLS.map((_, c): LayoutShape => ({
      id: `g-${r}-${c}`,
      type: "cell",
      x: GRID.x + c * GRID.cw,
      y: GRID.y + r * GRID.ch,
      w: GRID.cw,
      h: GRID.ch,
      label: r === c ? "pull" : "push",
      tone: RAG_TONE.embedding,
      weight: r === c ? 0.85 : 0.08,
    }))
  ),
  ...ROWS.map((label, r) => text(`g-row-${r}`, 16, GRID.y + r * GRID.ch + 15, label, 1, RAG_TONE.infra, 104)),
  ...COLS.map((label, c) => text(`g-col-${c}`, GRID.x + c * GRID.cw, GRID.y - 22, label, 1, RAG_TONE.infra, GRID.cw)),
  text("g-axis", 16, 62, "picture (row) vs caption (column)", 1, RAG_TONE.infra, 288),
  text("g-note1", 16, 276, "CLIP: 400 million image-caption", 1, RAG_TONE.infra, 288),
  text("g-note2", 16, 296, "pairs; pull each picture to its", 1, RAG_TONE.infra, 288),
  text("g-note3", 16, 316, "own caption, push the rest away", 1, RAG_TONE.infra, 288),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "A shared embedding space: a text question lands next to a screenshot",
  width: 880,
  height: 392,
  steps: [
    { title: "Training pairs each picture with its own caption" },
    { title: "Text chunks land by topic" },
    { title: "Pictures land beside the text about the same thing" },
    { title: `"${QUESTION}" lands next to the screenshot` },
  ],
  groups: [{ id: "g-train", title: "Training (CLIP-style)", tone: RAG_TONE.infra, x: 8, y: 24, w: 304, h: 344 }],
  shapes: [
    ...grid,
    ...scatter("sp", PLOT.x, PLOT.y, PLOT.w, PLOT.h, points, {
      dot: 14,
      ring: { around: "q", r: RING_R, step: 4 },
    }),
    // Cluster names.
    text("c-sign", 350, 52, "Sign-in and account", 2),
    text("c-ord", 700, 52, "Orders and delivery", 2),
    text("c-ret", 560, 344, "Returns and refunds", 2),
    // The relevant chunk's label, right of the ring.
    text("hit-label", Q.x + RING_R + 8, 155, "Lost phone: use a backup code", 2),
    // Images.
    ...image("i-shot", 496, 206, "Screenshot: sign-in screen", Q.x + RING_R + 8),
    ...image("i-parcel", 748, 136, "Parcel tracker"),
    ...image("i-label", 716, 322, "Returns label"),
    // The question, written under the ring.
    text("q-label", Q.x - 130, Q.y + RING_R + 8, `"${QUESTION}"`, 4, RAG_TONE.query, 260),
    // Legend.
    { id: "lg-dot", type: "circle", x: 356, y: 360, w: 12, tone: RAG_TONE.embedding, step: 2 },
    text("lg-dot-label", 366, 351, "text chunk", 2),
    { id: "lg-img", type: "cell", x: 450, y: 353, w: 14, h: 14, tone: RAG_TONE.embedding, fill: "pastel", step: 3 },
    text("lg-img-label", 468, 351, "image", 3),
  ],
};

export default spec;
