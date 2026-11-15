import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { RAG_TONE } from "@/components/diagrams/presets/rag";

// The similarity threshold of a semantic cache (semantic-caching). Nine pairs of support questions, each a new
// question and the cached question nearest to it, plotted by how similar their embeddings are. Top group: pairs that
// mean the same thing, where serving the cached answer is right. Bottom group: pairs that look alike but need a
// different answer, where a hit is wrong. "Change my password" against the cached "reset my password" is the near
// miss: RESULTS in presets/rag.ts already ranks "Change your password" first for the main question.
//
// All similarities are illustrative (no source; the page labels them). THRESHOLD and STRICT are the two settings
// compared; THRESHOLD = 0.92 and the 0.97 / 0.94 pairs match semcache-request-path.
// Working: at 0.92 the same-answer pairs at 0.97, 0.96 and 0.95 hit (3 of 5) and the different-answer pair at 0.94
// hits too (1 false hit of 4). At 0.96 only 0.97 and 0.96 hit (2 of 5) and no different-answer pair does (0 of 4).
// The two groups overlap between 0.87 and 0.94, so no single threshold separates them.
//
// Layout: pair boxes left (x 20..350), the similarity as text beside them (x 354..394), then a similarity axis from
// 0.85 at x 410 to 1.00 at x 830 (28 units per 0.01), with a dashed guide from the axis start to each dot.
// Rows 30 apart. The threshold lines are dashed and lime (scores); the tallies sit under the axis.
// Tones (four): same-answer pairs orange (rewrites of a question), different-answer pairs neutral, the false hit red
// (highlighted), thresholds lime.

const THRESHOLD = 0.92;
const STRICT = 0.96;

const SAME = [
  { pair: "how do I reset my password · how can I reset it", sim: 0.97 },
  { pair: "cancel my order · how do I cancel an order", sim: 0.96 },
  { pair: "I forgot my password · reset my password", sim: 0.95 },
  { pair: "phone was stolen · lost my phone, can't sign in", sim: 0.91 },
  { pair: "where is my parcel · track my order", sim: 0.88 },
];
const DIFF = [
  { pair: "change my password · reset my password", sim: 0.94, falseHit: true },
  { pair: "cancel my order · cancel my subscription", sim: 0.9 },
  { pair: "refund to my card · refund as store credit", sim: 0.89 },
  { pair: "update my phone number · update my email", sim: 0.87 },
];

const AX = { lo: 0.85, hi: 1.0, x0: 410, x1: 830 } as const;
const simX = (s: number) => Math.round(AX.x0 + ((s - AX.lo) / (AX.hi - AX.lo)) * (AX.x1 - AX.x0));
const ROW = { same: 84, diff: 274, gap: 30 } as const;
const AXIS_Y = 404;

const text = (id: string, x: number, y: number, w: number, label: string, tone?: LayoutTone, step?: number) =>
  ({ id, type: "text", x, y, w, h: 20, label, tone, step }) as LayoutShape;

const rowShapes = (
  id: string,
  y: number,
  r: { pair: string; sim: number; falseHit?: boolean },
  tone: LayoutTone
): LayoutShape[] => {
  const cx = simX(r.sim);
  return [
    { id: `${id}-pair`, type: "box", x: 20, y: y - 12, w: 330, h: 24, label: r.pair, tone: RAG_TONE.infra },
    text(`${id}-sim`, 354, y - 10, 40, r.sim.toFixed(2), r.falseHit ? RAG_TONE.failure : undefined),
    {
      id: `${id}-guide`,
      type: "path",
      x: 0,
      y: 0,
      points: [
        [AX.x0, y],
        [cx - 8, y],
      ],
      dashed: true,
    },
    {
      id: `${id}-dot`,
      type: "circle",
      x: cx,
      y,
      w: 14,
      tone: r.falseHit ? RAG_TONE.failure : tone,
      fill: "pastel",
      highlight: r.falseHit ? true : undefined,
    },
  ];
};

const threshold = (id: string, s: number, step: number): LayoutShape[] => [
  {
    id: `${id}-line`,
    type: "path",
    x: 0,
    y: 0,
    points: [
      [simX(s), 46],
      [simX(s), AXIS_Y],
    ],
    dashed: true,
    tone: RAG_TONE.rank,
    step,
  },
  text(`${id}-label`, simX(s) - 20, 26, 40, s.toFixed(2), RAG_TONE.rank, step),
];

const TICKS = [0.85, 0.9, 0.95, 1.0];

const spec: LayoutSpec = {
  kind: "layout",
  title: "Similarity of question pairs that should and should not share an answer, against a threshold",
  width: 860,
  height: 480,
  steps: [
    { title: "Pairs that share an answer and pairs that only look alike" },
    { title: `A threshold of ${THRESHOLD}: three hits and one false hit` },
    { title: `A stricter ${STRICT}: no false hit, but fewer hits` },
  ],
  groups: [
    { id: "g-same", title: "Same answer: a hit is right", tone: RAG_TONE.infra, x: 10, y: 52, w: 840, h: 168 },
    { id: "g-diff", title: "Different answer: a hit is wrong", tone: RAG_TONE.infra, x: 10, y: 242, w: 840, h: 138 },
  ],
  shapes: [
    text("h-pair", 20, 6, 220, "New question · nearest cached one"),
    text("h-sim", AX.x0, 6, 250, "Similarity (illustrative)"),
    ...SAME.flatMap((r, i) => rowShapes(`s${i}`, ROW.same + i * ROW.gap, r, RAG_TONE.query)),
    ...DIFF.flatMap((r, i) => rowShapes(`d${i}`, ROW.diff + i * ROW.gap, r, RAG_TONE.infra)),
    {
      id: "axis",
      type: "path",
      x: 0,
      y: 0,
      points: [
        [AX.x0, AXIS_Y],
        [AX.x1, AXIS_Y],
      ],
    },
    ...TICKS.flatMap((t): LayoutShape[] => [
      {
        id: `tick-${t}`,
        type: "path",
        x: 0,
        y: 0,
        points: [
          [simX(t), AXIS_Y],
          [simX(t), AXIS_Y + 6],
        ],
      },
      text(`tick-${t}-label`, simX(t) - 20, AXIS_Y + 8, 40, t.toFixed(2)),
    ]),
    ...threshold("t1", THRESHOLD, 2),
    text("tally-1", 20, 446, 400, `At ${THRESHOLD}: 3 of 5 hits, 1 false hit of 4`, RAG_TONE.failure, 2),
    ...threshold("t2", STRICT, 3),
    text("tally-2", 440, 446, 400, `At ${STRICT}: 2 of 5 hits, 0 false hits`, undefined, 3),
  ],
};

export default spec;
