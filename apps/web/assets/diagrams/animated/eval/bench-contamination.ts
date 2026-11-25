import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PROD_TONE } from "@/components/diagrams/presets/production";
import { LEAK, LEAK_CALC } from "@/components/diagrams/presets/production-eval";

// Test items that leaked into training data (offline-evaluation-benchmarks, Core concepts). ILLUSTRATIVE numbers; the
// method (an n-gram overlap check, clean against leaked subsets) is the one GPT-3's paper used (13-grams).
//   Step 1: a public test set of 40 items (blue grid, 8 × 5). Anyone can copy it to the web.
//   Step 2: an overlap check against a training corpus flags 11 items (red grid; the same 40 positions, the first 11 flagged).
//   Step 3: score the model on the whole set, the clean part and the leaked part:
//     all 40: (10 + 22) ÷ 40 = 80.0 %;  clean 29: 22 ÷ 29 = 75.9 %;  leaked 11: 10 ÷ 11 = 90.9 %;
//     leaked share 11 ÷ 40 = 27.5 %;  the headline is 4.1 points above the clean score.
//   Step 4: the fix: keep a private held-out split, score on the clean part and publish a canary string (lime).
// Grid: cells 22 px at pitch 26; first grid x 20, second x 300 (both y 56); score card x 590 (w 270); fix cards y 232.
// Colours: blue (the test set), red (leaked items, where something breaks), lime (checks and the private split), violet (the corpus).

const COLS = 8;
const cellsFor = (prefix: string, x0: number, step: number, leaked: boolean): LayoutShape[] =>
  Array.from({ length: LEAK.items }, (_, i): LayoutShape => ({
    id: `${prefix}-${i}`,
    type: "cell",
    x: x0 + (i % COLS) * 26,
    y: 56 + Math.floor(i / COLS) * 26,
    w: 22,
    h: 22,
    tone: leaked && i < LEAK.leaked ? PROD_TONE.failure : PROD_TONE.data,
    fill: leaked && i < LEAK.leaked ? "pastel" : "soft",
    step,
    quiet: true,
  }));

const pct = (v: number) => `${(v * 100).toFixed(1)} %`;
const shapes: LayoutShape[] = [
  {
    id: "h1",
    type: "text",
    x: 20,
    y: 24,
    w: 230,
    h: 20,
    label: `A public test set: ${LEAK.items} items`,
    tone: PROD_TONE.infra,
    quiet: true,
  },
  ...cellsFor("a", 20, 1, false),
  {
    id: "h2",
    type: "text",
    x: 300,
    y: 24,
    w: 250,
    h: 20,
    label: `${LEAK.leaked} found in the training corpus`,
    tone: PROD_TONE.failure,
    step: 2,
    quiet: true,
  },
  ...cellsFor("b", 300, 2, true),
  {
    id: "corpus",
    type: "box",
    x: 300,
    y: 196,
    w: 214,
    h: 30,
    label: "n-gram overlap check",
    tone: PROD_TONE.check,
    fill: "pastel",
    step: 2,
    quiet: true,
  },
  {
    id: "score-all",
    type: "box",
    x: 590,
    y: 52,
    w: 270,
    h: 44,
    label: `All ${LEAK.items} items: ${pct(LEAK_CALC.overall)}`,
    sub: "the headline number",
    tone: PROD_TONE.infra,
    fill: "pastel",
    step: 3,
    highlight: true,
  },
  {
    id: "score-clean",
    type: "box",
    x: 590,
    y: 104,
    w: 270,
    h: 44,
    label: `Clean ${LEAK_CALC.clean} items: ${pct(LEAK_CALC.cleanScore)}`,
    sub: "the score to trust",
    tone: PROD_TONE.data,
    fill: "pastel",
    step: 3,
  },
  {
    id: "score-leaked",
    type: "box",
    x: 590,
    y: 156,
    w: 270,
    h: 44,
    label: `Leaked ${LEAK.leaked} items: ${pct(LEAK_CALC.leakedScore)}`,
    sub: "the model may have seen these",
    tone: PROD_TONE.failure,
    fill: "pastel",
    step: 3,
  },
  {
    id: "gap",
    type: "text",
    x: 590,
    y: 208,
    w: 270,
    h: 20,
    label: `Headline is ${((LEAK_CALC.overall - LEAK_CALC.cleanScore) * 100).toFixed(1)} points above the clean score`,
    tone: PROD_TONE.failure,
    step: 3,
    quiet: true,
  },
  {
    id: "fix-private",
    type: "box",
    x: 20,
    y: 252,
    w: 260,
    h: 56,
    label: "Private held-out split",
    sub: "never published; scored by the owner",
    tone: PROD_TONE.check,
    fill: "pastel",
    step: 4,
  },
  {
    id: "fix-clean",
    type: "box",
    x: 310,
    y: 252,
    w: 260,
    h: 56,
    label: "Report the clean subset",
    sub: "drop or flag the leaked items",
    tone: PROD_TONE.check,
    fill: "pastel",
    step: 4,
  },
  {
    id: "fix-canary",
    type: "box",
    x: 600,
    y: 252,
    w: 260,
    h: 56,
    label: "Canary string in the data",
    sub: "lets crawlers skip it, and you test recall",
    tone: PROD_TONE.check,
    fill: "pastel",
    step: 4,
  },
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "Contamination: test items that leaked into training data inflate the score",
  width: 880,
  height: 330,
  steps: [
    { title: "A public test set" },
    { title: "Some items are found in the training data" },
    { title: "The headline score is inflated" },
    { title: "Keep a private split and report the clean part" },
  ],
  shapes,
};

export default spec;
