import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { RAG_TONE, RESULTS } from "@/components/diagrams/presets/rag";

// In-batch contrastive loss as a score matrix (fine-tuning-embeddings-and-rerankers). A batch of three (question,
// passage) pairs; every question is scored against every passage in the batch. The diagonal holds each question's
// own passage (the positive); every other cell is a free negative. Step 3 adds one mined hard negative per question
// as extra columns, as MultipleNegativesRankingLoss does with (anchor, positive, negative) triplets.
//
// Scores are cosine similarities. Row 1 uses the running example: "Lost phone: use a backup code" 0.77 and "Change
// your password" 0.82 come from RESULTS; "Track a parcel" 0.30 and "Return an item" 0.25 match rag/contrastive-
// training. Every other score is illustrative.
//
// The loss for one row is InfoNCE: −ln( e^(s+/τ) / Σ e^(s/τ) ) over the row, with τ = 0.05 (scale 20, the
// sentence-transformers default for MultipleNegativesRankingLoss, and the same TAU as rag/contrastive-training).
// Working, row 1: in-batch only, logits 15.4, 6, 5 → loss = ln(1 + e^−9.4 + e^−10.4) ≈ 0.0001. With the hard
// negatives (logits 16.4, 5.6, 4.8 added) → ln(1 + 2.718 + …) = 1.31. Rows 2 and 3 go from 0.0003 and 0.0008 to
// 0.18 each. Batch mean: 0.0004 → 0.56. The figure computes these from the scores below.
//
// Layout: question headers x 20..180, positive columns from x 195 and hard-negative columns from x 500, 95 apart and
// 90 wide; rows 50 apart from y 112. Tones (three plus neutral): questions orange, passages blue, scores that matter
// lime (the positives on the diagonal, pastel, and the one hard negative that outscores its positive, highlighted);
// every other cell neutral. No red: a hard negative is training data, not a failure.

const TAU = 0.05;
const score = (title: string) => RESULTS.find((r) => r.title === title)!.score;

const QUESTIONS_IN_BATCH = ["reset password,\nlost phone", "where is my\nparcel?", "return a gift"];
const POSITIVES = ["Lost phone:\nbackup code", "Track a\nparcel", "Return an\nitem"];
const NEGATIVES = ["Change your\npassword", "Change\naddress", "Exchange\nan item"];

// SCORES[q] = [p1, p2, p3, n1, n2, n3]
const SCORES: number[][] = [
  [score("Lost phone: use a backup code"), 0.3, 0.25, score("Change your password"), 0.28, 0.24],
  [0.21, 0.74, 0.33, 0.18, 0.66, 0.29],
  [0.19, 0.35, 0.71, 0.17, 0.31, 0.63],
];

const rowLoss = (row: number[], i: number, cols: number) => {
  const e = row.slice(0, cols).map((s) => Math.exp(s / TAU));
  return -Math.log(e[i] / e.reduce((a, b) => a + b, 0));
};
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const LOSS_IN_BATCH = mean(SCORES.map((r, i) => rowLoss(r, i, 3)));
const LOSS_HARD = mean(SCORES.map((r, i) => rowLoss(r, i, 6)));
const ROW1_HARD = rowLoss(SCORES[0], 0, 6);

const COL_X = [195, 290, 385, 500, 595, 690];
const CW = 90;
const ROW_Y = (i: number) => 112 + i * 50;
const RH = 44;

const spec: LayoutSpec = {
  kind: "layout",
  title: "In-batch contrastive loss: every question against every passage, positives on the diagonal",
  width: 800,
  height: 320,
  steps: [
    { title: "A batch of three question and passage pairs" },
    { title: "Every other passage in the batch is a free negative" },
    { title: "Mined hard negatives add columns the model gets wrong" },
  ],
  groups: [
    { id: "g-pos", title: "Passages in the batch", tone: RAG_TONE.infra, x: 187, y: 26, w: 296, h: 248 },
    { id: "g-neg", title: "Mined hard negatives", tone: RAG_TONE.infra, x: 492, y: 26, w: 296, h: 248 },
  ],
  shapes: [
    ...POSITIVES.map((label, j): LayoutShape => ({
      id: `p${j}`,
      type: "box",
      x: COL_X[j],
      y: 56,
      w: CW,
      h: 44,
      label,
      tone: RAG_TONE.text,
      fill: "pastel",
    })),
    ...NEGATIVES.map((label, j): LayoutShape => ({
      id: `n${j}`,
      type: "box",
      x: COL_X[3 + j],
      y: 56,
      w: CW,
      h: 44,
      label,
      tone: RAG_TONE.text,
      step: 3,
    })),
    ...QUESTIONS_IN_BATCH.map((label, i): LayoutShape => ({
      id: `q${i}`,
      type: "box",
      x: 20,
      y: ROW_Y(i),
      w: 160,
      h: RH,
      label,
      tone: RAG_TONE.query,
      fill: "pastel",
    })),
    ...SCORES.flatMap((row, i) =>
      row.map((s, j): LayoutShape => {
        const diagonal = i === j;
        const hard = j >= 3;
        const nearMiss = hard && s > row[i];
        return {
          id: `c${i}${j}`,
          type: "cell",
          x: COL_X[j],
          y: ROW_Y(i),
          w: CW,
          h: RH,
          label: s.toFixed(2),
          tone: diagonal || nearMiss ? RAG_TONE.rank : RAG_TONE.infra,
          fill: diagonal ? "pastel" : "soft",
          highlight: nearMiss ? true : undefined,
          step: diagonal ? 1 : hard ? 3 : 2,
        };
      })
    ),
    {
      id: "loss-1",
      type: "text",
      x: 20,
      y: 286,
      w: 370,
      h: 20,
      label: `In-batch negatives only: loss ${LOSS_IN_BATCH.toFixed(4)}`,
      step: 2,
    },
    {
      id: "loss-2",
      type: "text",
      x: 400,
      y: 286,
      w: 370,
      h: 20,
      label: `With hard negatives: loss ${LOSS_HARD.toFixed(2)} (row 1: ${ROW1_HARD.toFixed(2)})`,
      step: 3,
    },
  ],
};

export default spec;
