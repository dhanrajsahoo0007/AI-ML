import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";

// Three ways to spend test-time compute on the same question, for "Architecture" on the Reasoning Models &
// Test-Time Compute page. One row per strategy, flowing left to right: question → work → answer.
//
// 1. One long chain of thought (sequential): the model writes a single long reasoning trace and can check itself.
//    The "Wait" that restarts the check mirrors the s1 paper's budget forcing (Muennighoff et al., 2025, arXiv
//    2501.19393, Figure 3), where appending "Wait" made the model re-check and fix its answer.
// 2. Self-consistency (Wang et al., 2022, arXiv 2203.11171): sample several reasoning paths at temperature > 0 and
//    return the most common final answer (majority vote; the paper used 40 paths at T = 0.7 for PaLM 540B).
// 3. Best-of-N with a process reward model (Lightman et al., 2023, arXiv 2305.20050, §2.6): the PRM scores every
//    step; a solution's score is "the probability that every step is correct", implemented "as the product of the
//    correctness probabilities for each step". The highest-scoring sample is returned.
//
// Toy question (ours): a notebook and a pen cost $1.20 together; the notebook costs $1.00 more than the pen. Pen = p,
// notebook = p + 1.00, so 2p + 1.00 = 1.20 and p = 0.10. The tempting slip is $0.20 (then the notebook would be
// $1.20 and the total $1.40). The 5 sampled answers and per-step scores are illustrative; the vote counts and the
// products below are computed:
//   sample 1  $0.20  0.95 × 0.30 × 0.80 = 0.228
//   sample 2  $0.10  0.95 × 0.90 × 0.92 = 0.787  ← highest, so the verifier returns $0.10
//   sample 3  $0.20  0.90 × 0.25 × 0.85 = 0.191
//   sample 4  $0.10  0.90 × 0.85 × 0.90 = 0.689
//   sample 5  $0.20  0.92 × 0.35 × 0.70 = 0.225
//   majority vote: $0.20 × 3, $0.10 × 2 → returns $0.20 (wrong: the popular slip wins the vote)
// Page colour key: question neutral, thinking tokens violet, correct samples blue, wrong samples red (failure),
// majority vote orange, verifier teal, final answers green (correct) or red (wrong).

const CORRECT = "$0.10";
const SAMPLES = [
  { answer: "$0.20", steps: [0.95, 0.3, 0.8] },
  { answer: "$0.10", steps: [0.95, 0.9, 0.92] },
  { answer: "$0.20", steps: [0.9, 0.25, 0.85] },
  { answer: "$0.10", steps: [0.9, 0.85, 0.9] },
  { answer: "$0.20", steps: [0.92, 0.35, 0.7] },
];
const SCORES = SAMPLES.map((s) => s.steps.reduce((a, b) => a * b, 1));

// Majority vote, computed.
const counts = new Map<string, number>();
for (const s of SAMPLES) counts.set(s.answer, (counts.get(s.answer) ?? 0) + 1);
const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
const VOTE_WINNER = ranked[0][0];

// Verifier pick, computed.
const BEST = SCORES.indexOf(Math.max(...SCORES));
const VERIFIER_WINNER = SAMPLES[BEST].answer;

const T = {
  question: "neutral",
  think: "violet",
  right: "blue",
  wrong: "red",
  vote: "orange",
  verifier: "teal",
  answer: "green",
} as const satisfies Record<string, LayoutTone>;

const text = (id: string, x: number, y: number, w: number, h: number, label: string, tone: LayoutTone = "neutral") =>
  ({ id, type: "text", x, y, w, h, label, tone }) as LayoutShape;
const box = (
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  tone: LayoutTone,
  sub?: string
): LayoutShape => ({ id, type: "box", x, y, w, h, label, sub, tone, fill: "pastel" });
// A free arrow between two points, so fan-in and fan-out lines meet the boxes' sides, not their corners.
const line = (id: string, x1: number, y1: number, x2: number, y2: number, label?: string): LayoutShape => ({
  id,
  type: "arrow",
  x: x1,
  y: y1,
  w: x2 - x1,
  h: y2 - y1,
  label,
});
const arrow = (from: string, to: string, label?: string): LayoutShape => ({
  id: `${from}>${to}`,
  type: "arrow",
  x: 0,
  y: 0,
  from,
  to,
  label,
});

// ── Geometry ────────────────────────────────────────────────────────────────────────────────────────────────
const GX = 16;
const GW = 848;
const Q_X = 40;
const Q_W = 110;
const Q_H = 44;
const S_X = 250;
const S_W = 200;
const S_H = 26;
const S_STEP = 36;
const ANS_X = 720;
const ANS_W = 124;

const A_Y = 72;
const A_H = 136;
const B_Y = 236;
const C_Y = 486;
const BC_H = 222;

const shapes: LayoutShape[] = [
  text(
    "question",
    16,
    10,
    848,
    40,
    "Toy question: “A notebook and a pen cost $1.20 together. The notebook costs $1.00 more than the pen.\nWhat does the pen cost?” Correct: $0.10. The tempting slip: $0.20."
  ),
];

// ── Row 1: one long chain of thought ───────────────────────────────────────────────────────────────────────
const A_MID = A_Y + 26 + 36; // centre line of the row's content
shapes.push(
  box("a-q", Q_X, A_MID - Q_H / 2, Q_W, Q_H, "Question", T.question),
  box(
    "a-think",
    200,
    A_MID - 38,
    460,
    76,
    "Try pen = $0.20: notebook $1.20, total $1.40.\nWait, that is too much. Let pen = p: 2p + 1.00 = 1.20.\nSo p = 0.10. Check: 0.10 + 1.10 = 1.20.",
    T.think,
    "one long trace of thinking tokens"
  ),
  box("a-ans", ANS_X, A_MID - Q_H / 2, ANS_W, Q_H, `Answer: ${CORRECT}`, T.answer, "correct"),
  arrow("a-q", "a-think"),
  arrow("a-think", "a-ans"),
  text("a-cost", 200, A_MID + 44, 460, 20, "Cost: one sample, but a long one. Time to answer grows with its length.")
);

// ── Rows 2 and 3: five parallel samples ────────────────────────────────────────────────────────────────────
const sampleRows = (prefix: string, gy: number) => {
  const y0 = gy + 40;
  const mid = y0 + (4 * S_STEP + S_H) / 2;
  shapes.push(box(`${prefix}-q`, Q_X, mid - Q_H / 2, Q_W, Q_H, "Question", T.question));
  SAMPLES.forEach((s, i) => {
    const ok = s.answer === CORRECT;
    shapes.push(
      box(`${prefix}-s${i}`, S_X, y0 + i * S_STEP, S_W, S_H, `Sample ${i + 1} → ${s.answer}`, ok ? T.right : T.wrong),
      line(
        `${prefix}-q>s${i}`,
        Q_X + Q_W,
        mid + (i - 2) * 6,
        S_X,
        y0 + i * S_STEP + S_H / 2,
        i === 2 ? "T > 0" : undefined
      )
    );
  });
  return { y0, mid };
};

// Row 2: majority vote.
const b = sampleRows("b", B_Y);
const voteLabel = ["Majority vote", ...ranked.map(([a, n]) => `${a}: ${n} votes`)].join("\n");
shapes.push(box("b-vote", 530, b.mid - 34, 140, 68, voteLabel, T.vote));
SAMPLES.forEach((_, i) =>
  shapes.push(line(`b-s${i}>vote`, S_X + S_W, b.y0 + i * S_STEP + S_H / 2, 530, b.mid + (i - 2) * 12))
);
const voteOk = VOTE_WINNER === CORRECT;
shapes.push(
  box(
    "b-ans",
    ANS_X,
    b.mid - Q_H / 2,
    ANS_W,
    Q_H,
    `Answer: ${VOTE_WINNER}`,
    voteOk ? T.answer : T.wrong,
    voteOk ? "correct" : "wrong"
  ),
  arrow("b-vote", "b-ans"),
  text("b-cost", ANS_X - 20, b.mid + 30, ANS_W + 40, 36, "Cost: 5 full samples,\nrun in parallel")
);

// Row 3: verifier scores each sample.
const c = sampleRows("c", C_Y);
shapes.push(text("c-score-h", S_X + S_W - 20, c.y0 - 22, 120, 20, "step-score product", T.verifier));
SCORES.forEach((v, i) =>
  shapes.push({
    id: `c-score${i}`,
    type: "cell",
    x: S_X + S_W + 6,
    y: c.y0 + i * S_STEP,
    w: 44,
    h: S_H,
    tone: T.verifier,
    weight: Math.round(v * 100) / 100,
    label: v.toFixed(2),
  })
);
shapes.push(box("c-ver", 540, c.mid - 34, 140, 68, "Verifier (PRM)\nscores every step,\nkeeps the best", T.verifier));
SAMPLES.forEach((_, i) =>
  shapes.push(line(`c-score${i}>ver`, S_X + S_W + 50, c.y0 + i * S_STEP + S_H / 2, 540, c.mid + (i - 2) * 12))
);
const verOk = VERIFIER_WINNER === CORRECT;
const best = SAMPLES[BEST].steps.map((p) => p.toFixed(2)).join(" × ");
shapes.push(
  box(
    "c-ans",
    ANS_X,
    c.mid - Q_H / 2,
    ANS_W,
    Q_H,
    `Answer: ${VERIFIER_WINNER}`,
    verOk ? T.answer : T.wrong,
    verOk ? "correct" : "wrong"
  ),
  arrow("c-ver", "c-ans"),
  text(
    "c-best",
    540,
    c.mid + 40,
    160,
    36,
    `Best: sample ${BEST + 1}\n${best} = ${SCORES[BEST].toFixed(2)}`,
    T.verifier
  ),
  text("c-cost", ANS_X - 20, c.mid + 30, ANS_W + 40, 36, "Cost: 5 samples + a\nverifier pass on each")
);

const spec: LayoutSpec = {
  kind: "layout",
  title: "Three ways to spend test-time compute",
  width: 880,
  height: C_Y + BC_H + 14,
  groups: [
    { id: "row-a", title: "1 · One long chain of thought", tone: T.think, x: GX, y: A_Y, w: GW, h: A_H },
    {
      id: "row-b",
      title: "2 · N samples + majority vote (self-consistency)",
      tone: T.vote,
      x: GX,
      y: B_Y,
      w: GW,
      h: BC_H,
    },
    { id: "row-c", title: "3 · N samples + a verifier (best-of-N)", tone: T.verifier, x: GX, y: C_Y, w: GW, h: BC_H },
  ],
  shapes,
};

export default spec;
