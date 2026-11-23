import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { RAG_TONE, RESULTS, matrix } from "@/components/diagrams/presets/rag";

// Late interaction (ColBERT, Khattab and Zaharia 2020): the question and the chunk are encoded separately, but into
// one vector per token instead of one per text. The score is a sum of MaxSim: for each query token, the highest
// similarity with any chunk token, added up over the query tokens (equation 3 of the paper).
//
// The running example: six tokens of the main question against eight tokens of the chunk "Lost phone: use a backup
// code" ("If you lost your phone, sign in with a backup code, then reset your password"). Every similarity below is
// illustrative (cosine of normalised token vectors). ColBERT also pads the query with [mask] tokens to 32 and drops
// punctuation from documents; the figure leaves that out.
//
// Working: row maxima 0.35 + 0.92 + 0.95 + 0.30 + 0.90 + 0.94 = 4.36 (6 query tokens, so 0.73 per token on average).
// The single-vector cosine for the same chunk is 0.77 (RESULTS). The two are on different scales and are never
// compared with each other, only with other chunks' scores from the same model.
//
// Steps: 1 one vector per token on each side, every pair compared (the darkest cell in each row is its best match) ·
// 2 keep each query token's best match (MaxSim) · 3 add them up; beside it, the one-vector cosine for the same chunk.
// Tones (four plus neutral): query tokens orange, chunk tokens blue, token similarities pink, MaxSim and the score lime.

const Q_TOKENS = ["how", "reset", "password", "if", "lost", "phone"] as const;
const C_TOKENS = ["lost", "phone", "sign", "in", "backup", "code", "reset", "password"] as const;

/** Illustrative cosine of each query token (rows) with each chunk token (columns). */
const SIM: number[][] = [
  [0.2, 0.15, 0.3, 0.25, 0.18, 0.2, 0.35, 0.22],
  [0.25, 0.2, 0.4, 0.15, 0.3, 0.28, 0.92, 0.55],
  [0.18, 0.22, 0.45, 0.12, 0.35, 0.5, 0.52, 0.95],
  [0.3, 0.18, 0.2, 0.28, 0.15, 0.12, 0.22, 0.16],
  [0.9, 0.45, 0.15, 0.1, 0.3, 0.2, 0.25, 0.18],
  [0.42, 0.94, 0.25, 0.12, 0.28, 0.35, 0.2, 0.22],
];

const MAX = SIM.map((row) => Math.max(...row));
const ARGMAX = SIM.map((row, r) => row.indexOf(MAX[r]));
const TOTAL = MAX.reduce((a, b) => a + b, 0);
const CHUNK = "Lost phone: use a backup code";
const SINGLE = RESULTS.find((r) => r.title === CHUNK)!.score;

const M = { x: 130, y: 76, cell: 50 } as const;
const MAXCOL = { x: M.x + C_TOKENS.length * M.cell + 24, w: 76 } as const;

const text = (
  id: string,
  x: number,
  y: number,
  w: number,
  label: string,
  tone: LayoutShape["tone"],
  step?: number,
  h = 20
): LayoutShape => ({ id, type: "text", x, y, w, h, label, tone, step });

const rowY = (r: number) => M.y + r * M.cell;
const colX = (c: number) => M.x + c * M.cell;

// A bracket right of the MaxSim column gathers the six maxima into the sum (step 3).
const BRACKET_X = MAXCOL.x + MAXCOL.w + 12;
const MID_Y = Math.round((rowY(0) + rowY(Q_TOKENS.length)) / 2);
const bracket: LayoutShape = {
  id: "bracket",
  type: "path",
  x: 0,
  y: 0,
  points: [
    [BRACKET_X - 6, rowY(0) + 10],
    [BRACKET_X, rowY(0) + 10],
    [BRACKET_X, rowY(Q_TOKENS.length) - 10],
    [BRACKET_X - 6, rowY(Q_TOKENS.length) - 10],
  ],
  tone: RAG_TONE.rank,
  step: 3,
};

const SIDE = { x: 660, w: 190 } as const;

const spec: LayoutSpec = {
  kind: "layout",
  title: "Late interaction: one vector per token, best match per query token, summed",
  width: 860,
  height: 420,
  steps: [
    { title: "One vector per token on each side; compare every pair" },
    { title: "Keep each query token's best match (MaxSim)" },
    { title: "Add the best matches up: the chunk's score" },
  ],
  groups: [
    {
      id: "g-side",
      title: "Score for this chunk",
      tone: RAG_TONE.infra,
      x: SIDE.x - 10,
      y: 76,
      w: SIDE.w + 10,
      h: 300,
    },
  ],
  shapes: [
    text("chunk-title", M.x, 14, C_TOKENS.length * M.cell, `Chunk tokens: "${CHUNK}"`, RAG_TONE.text),
    text("q-title", 10, M.y + Q_TOKENS.length * M.cell + 10, 360, "Question tokens", RAG_TONE.query),
    ...matrix("sim", M.x, M.y, SIM, RAG_TONE.embedding, { cell: M.cell, showValues: true }),
    ...C_TOKENS.map((t, c) => text(`col-${c}`, colX(c) - 4, M.y - 26, M.cell + 8, t, RAG_TONE.text)),
    ...Q_TOKENS.map((t, r) => text(`row-${r}`, 20, rowY(r) + 15, 100, t, RAG_TONE.query)),
    text("max-title", MAXCOL.x - 6, M.y - 26, MAXCOL.w + 12, "MaxSim", RAG_TONE.rank, 2),
    ...MAX.map((v, r): LayoutShape => ({
      id: `max-${r}`,
      type: "cell",
      x: MAXCOL.x,
      y: rowY(r) + 5,
      w: MAXCOL.w,
      h: M.cell - 10,
      label: v.toFixed(2),
      tone: RAG_TONE.rank,
      step: 2,
    })),
    {
      id: "sum",
      type: "box",
      x: SIDE.x + 10,
      y: MID_Y - 29,
      w: SIDE.w - 30,
      h: 58,
      label: `Σ MaxSim = ${TOTAL.toFixed(2)}`,
      sub: `${Q_TOKENS.length} query tokens`,
      tone: RAG_TONE.rank,
      fill: "pastel",
      highlight: true,
      step: 3,
    },
    bracket,
    { id: "a-sum", type: "arrow", x: BRACKET_X, y: MID_Y, w: SIDE.x + 10 - BRACKET_X, h: 0, step: 3 },
    {
      id: "single",
      type: "box",
      x: SIDE.x + 10,
      y: MID_Y + 60,
      w: SIDE.w - 30,
      h: 58,
      label: `one-vector cosine ${SINGLE.toFixed(2)}`,
      sub: "bi-encoder: other scale",
      tone: RAG_TONE.infra,
      fill: "soft",
      step: 3,
    },
  ],
};

export default spec;
