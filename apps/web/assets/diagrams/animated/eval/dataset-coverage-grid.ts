import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { DATASETS, PROD_TONE } from "@/components/diagrams/presets/production";
import {
  GRID,
  INTENTS,
  LEVELS,
  THIN,
  colTotals,
  gridTotal,
  rowTotals,
  thinCell,
  thinStepPoints,
} from "@/components/diagrams/presets/production-datasets";

// The golden set as a grid: five intents (rows) by three difficulty levels (columns), counts from
// presets/production-datasets.ts. Three steps:
//   1 the counts, shaded by size (blue, stronger = more cases); the thinnest cell is red from the start
//   2 the totals: rows 46 + 40 + 36 + 44 + 34 = 200; columns 90 + 70 + 40 = 200
//   3 the thin cell: refunds and returns, hard, only 4 cases. One wrong answer moves that cell's pass rate by
//     1 ÷ 4 = 25 points, and refunds are where money leaves the shop (the red note says so).
// Counts are illustrative (chosen to teach); totals are checked in the preset.
//
// Grid (880 wide): row labels x 20, w 170; cells x 200 + 96 c, w 90, h 44, rows y 50 + 52 r; totals column x 488, w 80;
// totals row y 316; note panel x 600-870. Colours (PROD_TONE): counts blue, totals neutral, thin cell red.

const CELL = { x: 200, step: 96, w: 90, h: 44 } as const;
const rowY = (r: number) => 50 + r * 52;
const TOT_X = 488;
const TOT_Y = rowY(GRID.length) + 4;
const max = Math.max(...GRID.flat());

const hug = (label: string) => Math.round(Math.max(...label.split("\n").map((l) => l.length)) * 6.5) + 8;
const note = (id: string, y: number, label: string, step: number, tone?: LayoutShape["tone"]): LayoutShape => ({
  id,
  type: "text",
  x: 600,
  y,
  w: hug(label),
  h: 20 * label.split("\n").length,
  label,
  tone: tone ?? PROD_TONE.infra,
  step,
  quiet: true,
});

const shapes: LayoutShape[] = [];
LEVELS.forEach((lv, c) =>
  shapes.push({
    id: `head-${c}`,
    type: "text",
    x: CELL.x + c * CELL.step,
    y: 18,
    w: CELL.w,
    h: 24,
    label: lv,
    tone: PROD_TONE.infra,
    step: 1,
    quiet: true,
  })
);
INTENTS.forEach((name, r) => {
  shapes.push({
    id: `row-${r}`,
    type: "box",
    x: 20,
    y: rowY(r),
    w: 170,
    h: CELL.h,
    label: name,
    tone: PROD_TONE.infra,
    fill: "paper",
    step: 1,
    quiet: r > 0,
  });
  GRID[r].forEach((count, c) => {
    const thin = r === THIN.row && c === THIN.col;
    shapes.push({
      id: `cell-${r}-${c}`,
      type: "cell",
      x: CELL.x + c * CELL.step,
      y: rowY(r),
      w: CELL.w,
      h: CELL.h,
      label: `${count}`,
      tone: thin ? PROD_TONE.failure : PROD_TONE.data,
      ...(thin ? { fill: "pastel" as const } : { weight: 0.12 + (0.5 * count) / max }),
      step: 1,
      quiet: true,
    });
  });
});

// Totals (step 2).
rowTotals.forEach((t, r) =>
  shapes.push({
    id: `rt-${r}`,
    type: "cell",
    x: TOT_X,
    y: rowY(r),
    w: 80,
    h: CELL.h,
    label: `${t}`,
    tone: PROD_TONE.infra,
    fill: "soft",
    step: 2,
    quiet: r > 0,
  })
);
colTotals.forEach((t, c) =>
  shapes.push({
    id: `ct-${c}`,
    type: "cell",
    x: CELL.x + c * CELL.step,
    y: TOT_Y,
    w: CELL.w,
    h: CELL.h,
    label: `${t}`,
    tone: PROD_TONE.infra,
    fill: "soft",
    step: 2,
    quiet: true,
  })
);
shapes.push(
  {
    id: "total",
    type: "cell",
    x: TOT_X,
    y: TOT_Y,
    w: 80,
    h: CELL.h,
    label: `${gridTotal}`,
    tone: PROD_TONE.check,
    fill: "pastel",
    step: 2,
  },
  {
    id: "tot-label",
    type: "box",
    x: 20,
    y: TOT_Y,
    w: 170,
    h: CELL.h,
    label: "All intents",
    tone: PROD_TONE.infra,
    fill: "paper",
    step: 2,
    quiet: true,
  },
  note(
    "n1",
    56,
    `Rows: intent. Columns: difficulty.\nA cell counts tickets; darker blue\nis more, red is the thinnest cell.`,
    1
  ),
  note(
    "n2",
    150,
    `Rows add to ${rowTotals.join(" + ")}.\nColumns add to ${colTotals.join(" + ")}.\nBoth give ${gridTotal} = ${DATASETS.goldenSet}.`,
    2
  ),
  note(
    "n3",
    244,
    `Refunds, hard: ${thinCell} cases.\nOne wrong answer moves this\ncell by ${thinStepPoints} points.`,
    3,
    PROD_TONE.failure
  ),
  note("n4", 316, "Refunds are where money leaves\nthe shop. Add cases here first.", 3)
);

const spec: LayoutSpec = {
  kind: "layout",
  title: "The golden set as an intent by difficulty grid",
  width: 880,
  height: TOT_Y + CELL.h + 20,
  steps: [
    { title: "Count the tickets in each cell" },
    { title: "The totals add to 200" },
    { title: "Find the thin cell" },
  ],
  shapes,
};

export default spec;
