import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import {
  PROD_TONE,
  confusionGrid,
  confusionGridSize,
  falsePositiveRate,
  n,
  precision,
  recall,
} from "@/components/diagrams/presets/production";
import { blk, note } from "@/components/diagrams/presets/production-safety";

// One classifier, two thresholds (content-moderation-red-teaming, Deep dive). ILLUSTRATIVE labelled set of 1,000
// messages, 100 truly harmful (the people's labels) and 900 fine. The classifier gives each message a score from 0 to 1;
// "block at 0.5" blocks every score of 0.5 or more. Rows are the truth, columns the classifier (production.ts convention).
//   Threshold 0.5: harmful 100 → 90 blocked, 10 let through; fine 900 → 72 blocked, 828 allowed.
//     precision = 90 ÷ (90 + 72) = 90 ÷ 162 = 0.56; recall = 90 ÷ 100 = 0.90; false-positive rate = 72 ÷ 900 = 0.08.
//   Threshold 0.8: harmful 100 → 70 blocked, 30 let through; fine 900 → 9 blocked, 891 allowed.
//     precision = 70 ÷ 79 = 0.89; recall = 70 ÷ 100 = 0.70; false-positive rate = 9 ÷ 900 = 0.01.
//   The move: 72 − 9 = 63 fewer fine messages blocked, 30 − 10 = 20 more harmful ones let through.
// Steps: 1 the grid at 0.5 · 2 the grid at 0.8 · 3 the trade. Metrics come from the exported helpers, not typed.
// Colours: grids lime (agreement) and soft red (errors); the trade box lime. Width 880.

const HARMFUL = 100;
const FINE = 900;
const AT_05 = [
  [90, HARMFUL - 90],
  [72, FINE - 72],
];
const AT_08 = [
  [70, HARMFUL - 70],
  [9, FINE - 9],
];

const opts = (title: string, counts: number[][], step: number) => ({
  title,
  rowLabels: ["Harmful", "Fine"],
  colLabels: ["Blocked", "Allowed"],
  rowTitle: "Truth ↓",
  colTitle: "Classifier",
  counts,
  cellW: 64,
  metrics: [
    { label: "Precision", value: precision(counts) },
    { label: "Recall", value: recall(counts) },
    { label: "False-positive rate", value: falsePositiveRate(counts) },
  ],
  highlight: [
    [0, 1],
    [1, 0],
  ] as [number, number][],
  step,
});

const o1 = opts("Block at score 0.5 or more", AT_05, 1);
const o2 = opts("Block at score 0.8 or more", AT_08, 2);
const size = confusionGridSize(o1);
const GAP = 30;

const fewerWrong = AT_05[1][0] - AT_08[1][0]; // 63
const moreMissed = AT_08[0][1] - AT_05[0][1]; // 20

const shapes: LayoutShape[] = [
  ...confusionGrid("a", 10, 10, o1),
  ...confusionGrid("b", 10 + size.width + GAP, 10, o2),
  note(
    "set",
    10,
    size.height + 30,
    `Illustrative test set: ${n(HARMFUL + FINE)} messages, ${HARMFUL} harmful and ${FINE} fine.`,
    1
  ),
  blk(
    "trade",
    10,
    size.height + 66,
    2 * size.width + GAP,
    62,
    `Raising the threshold: ${fewerWrong} fewer fine messages blocked, ${moreMissed} more harmful ones let through`,
    `Precision 0.56 → 0.89 and recall 0.90 → 0.70: the cost of each mistake picks the threshold`,
    PROD_TONE.check,
    3,
    true
  ),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "One classifier at two thresholds",
  width: 20 + 2 * size.width + GAP,
  height: size.height + 66 + 62 + 16,
  steps: [
    { title: "A low threshold: catches more, blocks more" },
    { title: "A high threshold: blocks less" },
    { title: "The trade" },
  ],
  shapes,
};

export default spec;
