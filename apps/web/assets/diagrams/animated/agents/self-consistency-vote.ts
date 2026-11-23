import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { AGENT_TONE, BRIGHTPOST } from "@/components/diagrams/presets/agents";

// Self-consistency (Wang et al. 2022, arXiv 2203.11171) on a small Brightpost sum (prompt-engineering-types,
// Technical mechanics). One question is sent five times at a non-zero temperature; each sample writes its own
// chain of thought and ends in a final answer; the answers are counted and the most common one wins.
//
// The question (numbers illustrative except the kettle, BRIGHTPOST.price): a customer paid for the £42 kettle and
// 3 mugs at £8; the kettle was refunded in full. What did they pay in the end? Working: 42 + 3 × 8 − 42 = 24.
// Paths 2, 3 and 5 reach £24 by different routes; path 1 forgets the refund (42 + 24 = 66); path 4 counts one mug
// (42 + 8 − 42 = 8). Vote: £24 × 3, £66 × 1, £8 × 1, so £24 wins with 3 of 5 = 60 % agreement. Path 1 is the wrong
// one on purpose: a single sample can be the bad one.
//
// Five steps: 1 the question · 2 five sampled reasoning paths · 3 each path's final answer · 4 the vote count ·
// 5 the majority answer and the agreement rate.
//
// Arrows are elbows along two spines (x 230 and x 700) so the fan-out and fan-in stay tidy.
//
// Layout: column headings at y 14. Question x 20 (w 190), centred on the rows. Paths x 250 (w 320), one row per
// path at y 50 | 110 | 170 | 230 | 290 (48 tall). Answers x 600 (w 80) on the same rows. Vote x 720 (w 140) at
// y 112; the majority answer under it at y 236.
//
// Colour (agents legend, four tones plus neutral): the question orange, reasoning paths and right answers green,
// wrong answers red (the two paths that broke), the vote lime; arrows and headings neutral. One accent: the answer.

const KETTLE = BRIGHTPOST.price; // £42
const MUG = 8; // £ each, illustrative
const MUGS = 3;
const RIGHT = KETTLE + MUGS * MUG - KETTLE; // 24

interface Path {
  reasoning: string;
  answer: number;
  /** Where the path went wrong, for the two wrong ones. */
  slip?: string;
}

const PATHS: readonly Path[] = [
  {
    reasoning: `${KETTLE} + ${MUGS} × ${MUG} = ${KETTLE + MUGS * MUG}`,
    answer: KETTLE + MUGS * MUG,
    slip: "forgets the refund",
  },
  { reasoning: `Mugs ${MUGS} × ${MUG} = ${MUGS * MUG}; the kettle nets to 0`, answer: RIGHT },
  {
    reasoning: `Paid ${KETTLE + MUGS * MUG}, got ${KETTLE} back: ${KETTLE + MUGS * MUG} − ${KETTLE} = ${RIGHT}`,
    answer: RIGHT,
  },
  {
    reasoning: `${KETTLE} + ${MUG} = ${KETTLE + MUG}; minus ${KETTLE} = ${MUG}`,
    answer: MUG,
    slip: "counts one mug, not three",
  },
  { reasoning: `Kept only the mugs: ${MUGS} × ${MUG} = ${RIGHT}`, answer: RIGHT },
];

// Tally, most votes first: [[24, 3], [66, 1], [8, 1]].
const tally = [...new Set(PATHS.map((p) => p.answer))]
  .map((a) => [a, PATHS.filter((p) => p.answer === a).length] as const)
  .sort((a, b) => b[1] - a[1]);
const [winner, votes] = tally[0];
const agreement = Math.round((votes / PATHS.length) * 100); // 60

const ROW_Y = [50, 110, 170, 230, 290] as const;
const H = 48;
const COL = {
  q: { x: 20, w: 190 },
  path: { x: 250, w: 320 },
  ans: { x: 600, w: 80 },
  vote: { x: 720, w: 140 },
} as const;

const arrow = (id: string, from: string, to: string, step: number, via?: [number, number][]): LayoutShape => ({
  id,
  type: "arrow",
  x: 0,
  y: 0,
  from,
  to,
  via,
  step,
});

// Elbow connectors: the fan-out runs along a spine at x 230 from the question's middle (y 194), the fan-in along a
// spine at x 700 into the vote's middle (y 154), so every arrow meets its box square on.
const Q_MID = 194;
const VOTE_MID = 154;
const rowMid = (i: number) => ROW_Y[i] + H / 2;

const heading = (id: string, col: keyof typeof COL, label: string, step: number): LayoutShape => ({
  id,
  type: "text",
  x: COL[col].x,
  y: 14,
  w: COL[col].w,
  h: 20,
  label,
  tone: "neutral",
  step,
  quiet: true,
});

const rows: LayoutShape[] = PATHS.flatMap((p, i): LayoutShape[] => [
  {
    id: `path-${i}`,
    type: "box",
    x: COL.path.x,
    y: ROW_Y[i],
    w: COL.path.w,
    h: H,
    label: p.reasoning,
    sub: p.slip ? `Path ${i + 1}: ${p.slip}` : `Path ${i + 1}`,
    tone: AGENT_TONE.model,
    step: 2,
    quiet: i > 0 ? true : undefined,
  },
  arrow(`q-p${i}`, "question", `path-${i}`, 2, [
    [230, Q_MID],
    [230, rowMid(i)],
  ]),
  {
    id: `ans-${i}`,
    type: "cell",
    x: COL.ans.x,
    y: ROW_Y[i],
    w: COL.ans.w,
    h: H,
    label: `£${p.answer}`,
    tone: p.answer === RIGHT ? AGENT_TONE.model : AGENT_TONE.failure,
    step: 3,
    quiet: i > 0 ? true : undefined,
  },
  arrow(`p-a${i}`, `path-${i}`, `ans-${i}`, 3),
  arrow(`a-v${i}`, `ans-${i}`, "vote", 4, [
    [700, rowMid(i)],
    [700, VOTE_MID],
  ]),
]);

const spec: LayoutSpec = {
  kind: "layout",
  title: "Self-consistency: sample five reasoning paths, keep the most common answer",
  width: 880,
  height: 360,
  steps: [
    { title: "One question, with a single correct number" },
    { title: "Sample it five times: each run reasons its own way" },
    { title: "Each path ends in a final answer; two are wrong" },
    { title: "Count the final answers, not the reasoning" },
    { title: `The majority wins: £${winner}, ${votes} of ${PATHS.length} agree` },
  ],
  shapes: [
    heading("h-q", "q", "Question", 1),
    heading("h-path", "path", "Five sampled reasoning paths", 2),
    heading("h-ans", "ans", "Answer", 3),
    heading("h-vote", "vote", "Vote", 4),
    {
      id: "question",
      type: "box",
      x: COL.q.x,
      y: 139,
      w: COL.q.w,
      h: 110,
      label: `£${KETTLE} kettle + ${MUGS} mugs\nat £${MUG}. Kettle refunded.\nWhat was paid?`,
      sub: "sent 5 times, temp 0.7",
      tone: AGENT_TONE.task,
      fill: "pastel",
    },
    ...rows,
    {
      id: "vote",
      type: "box",
      x: COL.vote.x,
      y: 112,
      w: COL.vote.w,
      h: 84,
      label: tally.map(([a, n]) => `£${a}: ${n}`).join("\n"),
      sub: "majority vote",
      tone: AGENT_TONE.check,
      fill: "pastel",
      step: 4,
    },
    arrow("v-final", "vote", "final", 5),
    {
      id: "final",
      type: "box",
      x: COL.vote.x,
      y: 236,
      w: COL.vote.w,
      h: 60,
      label: `Answer: £${winner}`,
      sub: `${votes} of ${PATHS.length} agree (${agreement} %)`,
      tone: AGENT_TONE.model,
      fill: "pastel",
      highlight: true,
      step: 5,
    },
  ],
};

export default spec;
