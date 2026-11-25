import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { DATASETS, PROD_TONE, n } from "@/components/diagrams/presets/production";
import { CANDIDATES, pairwiseCalls, pointwiseCalls } from "@/components/diagrams/presets/production-judge";

// Pointwise against pairwise judging (llm-as-judge-evaluation, Deep dive). Step 1: two columns, what each asks the judge
// and what it is good and bad at. Step 2: the number of judge calls to compare k candidates on the 200 golden tickets.
//   Pointwise: 200 × k calls.
//   Pairwise, order swapped: k(k − 1) ÷ 2 pairs × 2 orders × 200 tickets = 200 × k(k − 1).
//   k = 2: 400 and 400 · k = 3: 600 and 1,200 · k = 5: 1,000 and 4,000 · k = 10: 2,000 and 18,000.
//
// Layout: two boxes (400 × 56) at y 16, x 20 and x 440, four text lines (12.5 px, 18 apart) under each; table at
// y 252: row labels x 20 (w 170), four cells (100 × 40) from x 200.
//
// Colour (production legend): both methods lime (a check); the pairwise cell for 5 candidates ringed (the one accent).

const COLS = [20, 440];
const W = 400;

const lines = (id: string, x: number, items: string[]): LayoutShape[] =>
  items.map((label, i) => ({
    id: `${id}-${i}`,
    type: "text",
    x,
    y: 86 + i * 24,
    w: W,
    h: 18,
    label,
    tone: PROD_TONE.infra,
    step: 1,
  }));

const TX = 200;
const CW = 100;
const TY = 252;
const cellsFor = (rowIdx: number, f: (k: number) => number, id: string): LayoutShape[] =>
  CANDIDATES.map((k, i) => ({
    id: `${id}-${i}`,
    type: "cell",
    x: TX + i * (CW + 6),
    y: TY + rowIdx * 48,
    w: CW,
    h: 40,
    label: n(f(k)),
    tone: PROD_TONE.check,
    fill: rowIdx === 0 ? "soft" : "pastel",
    highlight: rowIdx === 1 && k === 5 ? true : undefined,
    step: 2,
  }));

const label = (id: string, x: number, y: number, w: number, text: string, step: number): LayoutShape => ({
  id,
  type: "text",
  x,
  y,
  w,
  h: 18,
  label: text,
  tone: PROD_TONE.infra,
  step,
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "Pointwise and pairwise judging",
  width: 860,
  height: TY + 2 * 48 + 40,
  steps: [{ title: "What each asks the judge" }, { title: "What each costs as candidates grow" }],
  shapes: (
    [
      {
        id: "pw",
        type: "box",
        x: COLS[0],
        y: 16,
        w: W,
        h: 56,
        label: "Pointwise: grade one answer",
        sub: "rubric in, pass or fail out",
        tone: PROD_TONE.check,
        fill: "pastel",
        step: 1,
      },
      {
        id: "pa",
        type: "box",
        x: COLS[1],
        y: 16,
        w: W,
        h: 56,
        label: "Pairwise: pick the better of two",
        sub: "answers A and B in, winner or tie out",
        tone: PROD_TONE.check,
        fill: "pastel",
        step: 1,
      },
      ...lines("pwl", COLS[0], [
        "One call per answer.",
        "A fixed rubric, so the score means something.",
        "Works as a release gate with a threshold.",
        "Weak at telling two good answers apart.",
      ]),
      ...lines("pal", COLS[1], [
        "One call per pair, two with the order swapped.",
        "Relative, so it needs no absolute scale.",
        "Good for choosing between two prompts.",
        "Pairs grow with the square of the candidates.",
      ]),
      label(
        "th",
        20,
        TY - 46,
        800,
        `Judge calls to compare candidates on ${n(DATASETS.goldenSet)} tickets (pairs judged in both orders)`,
        2
      ),
      label("tr0", 20, TY + 11, 170, "Pointwise", 2),
      label("tr1", 20, TY + 59, 170, "Pairwise, swapped", 2),
      ...CANDIDATES.map((k, i) => label(`tk-${i}`, TX + i * (CW + 6), TY - 20, CW, `${k} candidates`, 2)),
      ...cellsFor(0, pointwiseCalls, "pt"),
      ...cellsFor(1, pairwiseCalls, "pr"),
    ] as LayoutShape[]
  ).map((sh): LayoutShape => (sh.type === "text" ? { ...sh, quiet: true } : sh)),
};

export default spec;
