import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { DATASETS, PROD_TONE } from "@/components/diagrams/presets/production";
import { gate } from "@/components/diagrams/presets/production";
import { leftNote } from "@/components/diagrams/presets/production-finetune";
import { CAND_A, CAND_B, OLD_FLOOR, OLD_SUITE, pc } from "@/components/diagrams/presets/production-retrain";

// The forgetting check (automated-retraining-finetuning, Deep dive): a retrained candidate must beat the floor on the new
// golden set AND still pass the frozen old suite. Static, two gates, ILLUSTRATIVE counts (presets/production-retrain.ts):
//   old suite = 120 cases from earlier incidents and capabilities; the champion passes 114 = 95 %; a candidate may fall at
//   most 2 points, so the floor is (0.95 − 0.02) × 120 = 111.6 → 112 passes.
//   A, new data only: golden 188 of 200 = 94 %; old suite 99 of 120 = 82.5 % (< 112) → block.
//   B, new data + 700 replayed tickets: golden 184 of 200 = 92 %; old suite 113 of 120 = 94.2 % (≥ 112) → promote.
// Layout (880 x 300): gate A at (20, 36), gate B at (20, 178); notes to the right of each gate at x 560.
// Colour: change neutral→ candidate A orange (new weights), B orange; passing checks lime, failing red; block red, promote green.

const goldenSub = (pass: number) => `${pass} of ${DATASETS.goldenSet} = ${pc(pass, DATASETS.goldenSet, 0)}`;
const oldSub = (pass: number) => `${pass} of ${OLD_SUITE.size} = ${pc(pass, OLD_SUITE.size)}, floor ${OLD_FLOOR}`;

const shapes: LayoutShape[] = [
  ...gate("a", 20, 36, {
    change: { label: "A: new data only", sub: "no replay", tone: PROD_TONE.traffic },
    checks: [
      { label: "New golden set", sub: goldenSub(CAND_A.golden), pass: true },
      { label: "Old suite", sub: oldSub(CAND_A.old), pass: CAND_A.old >= OLD_FLOOR },
    ],
    result: "block",
    resultSub: "forgot old cases",
  }),
  ...gate("b", 20, 178, {
    change: { label: "B: new + replay", sub: "700 old tickets", tone: PROD_TONE.traffic },
    checks: [
      { label: "New golden set", sub: goldenSub(CAND_B.golden), pass: true },
      { label: "Old suite", sub: oldSub(CAND_B.old), pass: CAND_B.old >= OLD_FLOOR },
    ],
    result: "promote",
    resultSub: "to the registry",
  }),
  leftNote(
    "na",
    640,
    62,
    `Looks better on new tickets,\nworse on old ones: ${CAND_A.old} is\nbelow the floor of ${OLD_FLOOR}`,
    { tone: PROD_TONE.failure }
  ),
  leftNote("nb", 640, 204, `Slightly lower on the golden\nset, but ${CAND_B.old} clears the\nfloor of ${OLD_FLOOR}`, {
    tone: PROD_TONE.check,
  }),
  leftNote(
    "rule",
    20,
    298,
    `old-suite floor: (${OLD_SUITE.championPass} ÷ ${OLD_SUITE.size} − 0.02) × ${OLD_SUITE.size} = 111.6, rounded up to ${OLD_FLOOR}   ·   all counts illustrative`
  ),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "The forgetting check: the old suite must still pass",
  width: 880,
  height: 325,
  shapes,
};

export default spec;
