import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { QUESTIONS, RAG_TONE } from "@/components/diagrams/presets/rag";

// Hallucination mitigation, "Detecting hallucinations without references": a sampling consistency check in the style
// of SelfCheckGPT (Manakul et al., 2023), on Brightpost's main question asked closed book (no chunks to check
// against). The main answer (temperature 0) is split into three claims; four more answers are sampled at temperature
// 1; each sample either supports a claim or does not; a claim's score is the share of samples that do not support it
// (the paper's prompt variant maps Yes / No to 0 / 1 and averages over samples; its experiments use 20 samples, four
// are drawn here so the grid stays readable).
//
// The support grid (illustrative): "Choose 'Forgot password'" 4 of 4 → score 0.00; "Enter a backup code" 3 of 4 →
// 0.25; "Call 020 7946 0321" 0 of 4 → 1.00, flagged (every sample invents a different number). The number is from
// Ofcom's drama range (020 7946 0000 to 0999), so it rings no real phone. Flag at score ≥ 0.5 (illustrative).
//
// Steps: 1 one answer, split into claims · 2 four more answers are sampled · 3 each sample supports a claim or not ·
// 4 score each claim; the claim the samples disagree on is flagged.
//
// Tones (four plus neutral): the question orange, the answer's claims and the "yes" cells green, the scores lime, the
// invented claim and its score red; "no" cells and headers neutral.
//
// Grid: question at x 20 (180 wide, centred on the middle claim, one arrow into a bracket over the claims); claims
// at x 250 (230 wide), rows at y 96 | 150 | 204 (44 tall, 10 apart); sample cells 56 wide from x 510, 8 apart; score
// cell at x 768 (72 wide).

const SAMPLES = 4;
const FLAG_AT = 0.5;

/** Each claim of the main answer and whether each of the four samples supports it. */
const CLAIMS: { text: string; support: boolean[] }[] = [
  { text: "Choose 'Forgot password'", support: [true, true, true, true] },
  { text: "Enter a backup code", support: [true, true, false, true] },
  { text: "Call 020 7946 0321", support: [false, false, false, false] },
];

const score = (s: boolean[]) => s.filter((v) => !v).length / s.length;

const ROW_Y = (i: number) => 96 + i * 54;
const ROW_H = 44;
const MID_Y = ROW_Y(1) + ROW_H / 2;
const CLAIM_X = 250;
const CLAIM_W = 230;
const CELL_X = (j: number) => 510 + j * 64;
const CELL_W = 56;
const SCORE_X = 768;
const SCORE_W = 72;

const claimShapes: LayoutShape[] = CLAIMS.flatMap((c, i): LayoutShape[] => {
  const s = score(c.support);
  const flagged = s >= FLAG_AT;
  return [
    {
      id: `claim-${i}`,
      type: "box",
      x: CLAIM_X,
      y: ROW_Y(i),
      w: CLAIM_W,
      h: ROW_H,
      label: c.text,
      tone: RAG_TONE.answer,
      fill: "pastel",
    },
    ...c.support.map((yes, j): LayoutShape => ({
      id: `cell-${i}-${j}`,
      type: "cell",
      x: CELL_X(j),
      y: ROW_Y(i),
      w: CELL_W,
      h: ROW_H,
      label: yes ? "yes" : "no",
      tone: yes ? RAG_TONE.answer : RAG_TONE.infra,
      fill: yes ? "soft" : "paper",
      step: 3,
    })),
    {
      id: `score-${i}`,
      type: "cell",
      x: SCORE_X,
      y: ROW_Y(i),
      w: SCORE_W,
      h: ROW_H,
      label: s.toFixed(2),
      tone: flagged ? RAG_TONE.failure : RAG_TONE.rank,
      fill: "pastel",
      step: 4,
    },
  ];
});

// The flagged claim is drawn green in step 1 (it reads as fine until the samples disagree); in step 4 a red dashed
// frame goes round it, next to its red score.
const c2 = { x: CLAIM_X - 5, y: ROW_Y(2) - 5, w: CLAIM_W + 10, h: ROW_H + 10 };

const spec: LayoutSpec = {
  kind: "layout",
  title: "A consistency check: claims the samples disagree on are likely invented",
  width: 860,
  height: 300,
  shapes: [
    {
      id: "question",
      type: "box",
      x: 20,
      y: MID_Y - 38,
      w: 180,
      h: 76,
      label: QUESTIONS.main.replace(" my password", "\nmy password").replace(" if I", "\nif I"),
      sub: "asked with no chunks",
      tone: RAG_TONE.query,
      fill: "pastel",
    },
    { id: "head-claims", type: "text", x: CLAIM_X, y: 64, w: CLAIM_W, h: 20, label: "Main answer, 3 claims" },
    ...claimShapes,
    {
      id: "flag-frame",
      type: "path",
      x: 0,
      y: 0,
      points: [
        [c2.x, c2.y],
        [c2.x + c2.w, c2.y],
        [c2.x + c2.w, c2.y + c2.h],
        [c2.x, c2.y + c2.h],
        [c2.x, c2.y],
      ],
      dashed: true,
      tone: RAG_TONE.failure,
      step: 4,
    },
    // One arrow from the question into a bracket that spans the three claims.
    {
      id: "q-arrow",
      type: "path",
      x: 0,
      y: 0,
      points: [
        [200, MID_Y],
        [234, MID_Y],
      ],
      head: true,
    },
    {
      id: "q-bracket",
      type: "path",
      x: 0,
      y: 0,
      points: [
        [244, ROW_Y(0)],
        [238, ROW_Y(0)],
        [238, ROW_Y(2) + ROW_H],
        [244, ROW_Y(2) + ROW_H],
      ],
    },
    {
      id: "head-samples",
      type: "text",
      x: CELL_X(0),
      y: 40,
      w: CELL_X(SAMPLES - 1) + CELL_W - CELL_X(0),
      h: 20,
      label: `${SAMPLES} more samples (temperature 1)`,
      step: 2,
    },
    ...Array.from({ length: SAMPLES }, (_, j): LayoutShape => ({
      id: `head-s${j + 1}`,
      type: "text",
      x: CELL_X(j),
      y: 64,
      w: CELL_W,
      h: 20,
      label: `S${j + 1}`,
      step: 2,
    })),
    {
      id: "head-score",
      type: "text",
      x: SCORE_X - 4,
      y: 64,
      w: SCORE_W + 8,
      h: 20,
      label: "Score",
      tone: RAG_TONE.rank,
      step: 4,
    },
    {
      id: "flag-note",
      type: "text",
      x: CLAIM_X - 10,
      y: 262,
      w: CLAIM_W + 20,
      h: 20,
      label: "Each sample made up a new number",
      tone: RAG_TONE.failure,
      step: 4,
    },
    {
      id: "rule",
      type: "text",
      x: CELL_X(0) - 10,
      y: 262,
      w: SCORE_X + SCORE_W - CELL_X(0) + 10,
      h: 20,
      label: `Score: share of samples that disagree; flag at ${FLAG_AT.toFixed(1)}+`,
      step: 4,
    },
  ],
  steps: [
    { title: "One answer, split into claims" },
    { title: `${SAMPLES} more answers are sampled` },
    { title: "Each sample supports a claim or not" },
    { title: "Score each claim; flag the one the samples disagree on" },
  ],
};

export default spec;
