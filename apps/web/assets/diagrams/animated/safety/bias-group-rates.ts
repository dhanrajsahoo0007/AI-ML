import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import {
  PROD_TONE,
  confusionGrid,
  confusionGridSize,
  falsePositiveRate,
  precision,
  recall,
} from "@/components/diagrams/presets/production";
import { blk, note } from "@/components/diagrams/presets/production-safety";

// Error rates by group (bias-toxicity-detection, Deep dive). A toxicity classifier flags messages. ILLUSTRATIVE counts
// for two groups of 1,000 messages each, 100 truly toxic and 900 fine (the people's labels), group B written in a
// regional dialect. Rows are the truth, columns the classifier (production.ts convention); "Flagged" is the positive.
//   Group A: toxic 100 → 80 flagged, 20 passed; fine 900 → 36 flagged, 864 passed.
//     precision 80 ÷ 116 = 0.69; recall 80 ÷ 100 = 0.80; false-positive rate 36 ÷ 900 = 0.04.
//   Group B: toxic 100 → 82 flagged, 18 passed; fine 900 → 90 flagged, 810 passed.
//     precision 82 ÷ 172 = 0.48; recall 82 ÷ 100 = 0.82; false-positive rate 90 ÷ 900 = 0.10.
//   Gap in false-positive rate = 0.10 − 0.04 = 0.06; ratio 0.10 ÷ 0.04 = 2.5 times.
//   Recall is about the same (0.80 and 0.82): an overall "recall" number would show no problem.
// Steps: 1 group A · 2 group B · 3 the gap. Metrics come from the exported helpers. Width follows the two grids.
// Colours: grids lime (agreement) and soft red (errors; the fine messages wrongly flagged are ringed for comparison);
// the gap box red (PROD_TONE.failure), because a group wrongly flagged more often is a harm.

const A = [
  [80, 20],
  [36, 864],
];
const B = [
  [82, 18],
  [90, 810],
];

const opts = (title: string, counts: number[][], step: number) => ({
  title,
  rowLabels: ["Toxic", "Fine"],
  colLabels: ["Flagged", "Passed"],
  rowTitle: "Truth ↓",
  colTitle: "Classifier",
  counts,
  cellW: 64,
  metrics: [
    { label: "Precision", value: precision(counts) },
    { label: "Recall", value: recall(counts) },
    { label: "False-positive rate", value: falsePositiveRate(counts) },
  ],
  highlight: [[1, 0]] as [number, number][],
  step,
});

const oa = opts("Group A: standard English", A, 1);
const ob = opts("Group B: regional dialect", B, 2);
const size = confusionGridSize(oa);
const GAP = 30;
const fprA = falsePositiveRate(A); // 36 ÷ 900 = 0.04
const fprB = falsePositiveRate(B); // 90 ÷ 900 = 0.10
const gap = fprB - fprA; // 0.06
const ratio = fprB / fprA; // 2.5

const shapes: LayoutShape[] = [
  ...confusionGrid("a", 10, 10, oa),
  ...confusionGrid("b", 10 + size.width + GAP, 10, ob),
  note("set", 10, size.height + 30, "Illustrative: 1,000 messages per group, 100 toxic and 900 fine.", 1),
  blk(
    "gap",
    10,
    size.height + 66,
    2 * size.width + GAP,
    62,
    `False-positive gap = ${fprB.toFixed(2)} − ${fprA.toFixed(2)} = ${gap.toFixed(2)}: fine messages in group B are flagged ${ratio.toFixed(1)} times as often`,
    "Recall is 0.80 against 0.82, so an overall recall figure would hide it",
    PROD_TONE.failure,
    3,
    true
  ),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "The same classifier, two groups",
  width: 20 + 2 * size.width + GAP,
  height: size.height + 66 + 62 + 16,
  steps: [{ title: "Group A's counts" }, { title: "Group B's counts" }, { title: "The gap in false positives" }],
  shapes,
};

export default spec;
