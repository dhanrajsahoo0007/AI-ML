import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { DATASETS, PROD_TONE } from "@/components/diagrams/presets/production";
import { ADJUDICATE, REFRESH, agreementPct } from "@/components/diagrams/presets/production-datasets";

// The life of a golden set, five stages (building-eval-datasets, "Keeping the set fresh" and the worked example):
//   1 sample: candidates from 30 days of logs, stratified by intent, personal data removed, plus the expert and
//     synthetic cases the coverage grid asks for, 200 in all
//   2 label: two annotators each write the reference answer and tick every rubric line: 200 × 2 = 400 labelled copies
//   3 adjudicate: they disagree on 22 of 200 (11 %); a lead settles each from the written policy.
//     Agreement (200 − 22) ÷ 200 = 89 %
//   4 version: freeze as golden-v1 with a content hash, the rubric version, an owner and a date
//   5 refresh: each month retire 12 cases the policy has changed and add 12 from new failures, giving golden-v2,
//     still 200. A dashed arrow returns to stage 1.
// Numbers are illustrative; presets/production-datasets.ts holds them.
//
// Grid (880 wide): stage boxes x 96, w 180, h 54, y 20 + 76 i; two lines of detail beside each at x 300.
// Colours (PROD_TONE): sample and refresh blue (data), label and adjudicate lime (checks), version violet (a store).

const BOX = { x: 96, w: 180, h: 54 } as const;
const rowY = (i: number) => 20 + i * 76;
const hug = (label: string) => Math.round(label.length * 7.2) + 8;

const stages = [
  {
    id: "sample",
    label: "1  Sample",
    sub: "choose the cases",
    tone: PROD_TONE.data,
    lines: [
      "Candidates from 30 days of logs, a set share per intent; personal data removed",
      `Add the expert and synthetic cases the grid asks for: ${DATASETS.goldenSet} in all.`,
    ],
  },
  {
    id: "label",
    label: "2  Label",
    sub: "two annotators",
    tone: PROD_TONE.check,
    lines: [
      "Each writes the reference answer and ticks every rubric line, working alone",
      `${DATASETS.goldenSet} cases × 2 annotators = ${DATASETS.goldenSet * 2} labelled copies.`,
    ],
  },
  {
    id: "adjudicate",
    label: "3  Adjudicate",
    sub: "settle disagreements",
    tone: PROD_TONE.check,
    lines: [
      `They disagree on ${ADJUDICATE.disagreements} of ${DATASETS.goldenSet} cases. A lead settles each from the written policy.`,
      `Agreement ${ADJUDICATE.agree} ÷ ${DATASETS.goldenSet} = ${agreementPct} %. A dispute that repeats becomes a new rubric rule.`,
    ],
  },
  {
    id: "version",
    label: "4  Version",
    sub: "freeze it",
    tone: PROD_TONE.store,
    lines: [
      "Freeze as golden-v1: 200 cases, a content hash, rubric version, owner, date",
      "A score only compares with scores from the same version.",
    ],
  },
  {
    id: "refresh",
    label: "5  Refresh",
    sub: "every month",
    tone: PROD_TONE.data,
    lines: [
      `Retire ${REFRESH.retired} cases the policy changed; add ${REFRESH.added} from new failures and thumbs-down`,
      `Result: golden-v2, still ${DATASETS.goldenSet}. Keep a small holdout the team never tunes on.`,
    ],
  },
];

const shapes: LayoutShape[] = [];
stages.forEach((s, i) => {
  const step = i + 1;
  shapes.push({
    id: s.id,
    type: "box",
    x: BOX.x,
    y: rowY(i),
    w: BOX.w,
    h: BOX.h,
    label: s.label,
    sub: s.sub,
    tone: s.tone,
    fill: "pastel",
    step,
  });
  s.lines.forEach((l, k) =>
    shapes.push({
      id: `${s.id}-l${k}`,
      type: "text",
      x: 300,
      y: rowY(i) + 5 + k * 24,
      w: hug(l),
      h: 20,
      label: l,
      tone: k === 0 ? PROD_TONE.infra : s.tone,
      step,
      quiet: true,
    })
  );
  if (i > 0) {
    shapes.push({
      id: `arrow-${i}`,
      type: "arrow",
      x: 0,
      y: 0,
      from: stages[i - 1].id,
      to: s.id,
      tone: PROD_TONE.infra,
      step,
    });
  }
});
shapes.push({
  id: "loop",
  type: "arrow",
  x: 0,
  y: 0,
  from: "refresh",
  to: "sample",
  via: [
    [48, rowY(4) + BOX.h / 2],
    [48, rowY(0) + BOX.h / 2],
  ],
  label: "monthly",
  dashed: true,
  tone: PROD_TONE.infra,
  step: 5,
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "The life of a golden set",
  width: 880,
  height: rowY(4) + BOX.h + 20,
  steps: [
    { title: "Sample: choose the cases" },
    { title: "Label: two annotators per case" },
    { title: "Adjudicate: settle the disagreements" },
    { title: "Version: freeze it" },
    { title: "Refresh: retire and add, then repeat" },
  ],
  shapes,
};

export default spec;
