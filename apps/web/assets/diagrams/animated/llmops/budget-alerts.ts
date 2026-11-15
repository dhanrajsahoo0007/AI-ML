import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PROD_TONE, meter, n } from "@/components/diagrams/presets/production";
import { BUDGET } from "@/components/diagrams/presets/production-observe";

// A monthly budget with alert thresholds (cost-tracking-attribution, Deep dive "Budgets and alerts"). Three steps, each
// adding a meter for the support key; budget 45,000 dollars, thresholds at 50 %, 80 % and 100 % (illustrative). A normal
// day costs 1,380 (200,000 × 0.0069); a loop bug adds 3,000 a day from day 21, so a day costs 4,380 (BUDGET in
// presets/production-observe.ts):
//   Day 10: 10 × 1,380 = 13,800 (31 %). Forecast for the month 30 × 1,380 = 41,400 (92 %).
//   Day 22: normal 22 × 1,380 = 30,360, loop 2 × 3,000 = 6,000; 36,360 (81 %): the 80 % line (36,000) was crossed this day,
//     with 8 days left. A run-rate forecast would have fired a day earlier: day 21 spend 27,600 + 4,380 = 31,980;
//     31,980 ÷ 21 × 30 = 45,686, over the 45,000.
//   Day 24: normal 24 × 1,380 = 33,120, loop 4 × 3,000 = 12,000; 45,120, 120 past the cap. A hard cap at the gateway
//     blocks the key at 45,000.
// Layout (880 x 350): meters 800 wide at x 40, at y 6, 118 and 230 (meterSize height 76); threshold lines at 50 % and
// 80 % with labels under the bar; a note line 84 px under each meter.
// Colours (PROD_TONE): normal spend green (the model), the loop's spend red (a runaway), the cap and the part past it red.
// Two tones plus neutral.

const X = 40;
const W = 800;
const BAR_Y = 24;
const BAR_H = 28;

const text = (id: string, x: number, y: number, w: number, label: string, step: number): LayoutShape => ({
  id,
  type: "text",
  x,
  y,
  w,
  h: 18,
  label,
  tone: PROD_TONE.infra,
  step,
});

const days = [
  {
    step: 1,
    day: 10,
    note: `On pace: the forecast for the month is 30 × $1,380 = $${n(BUDGET.forecast)}, 92 % of the budget.`,
  },
  {
    step: 2,
    day: 22,
    note: "The 80 % alert fires on day 22 with 8 days left. A run-rate forecast would have fired on day 21.",
  },
  { step: 3, day: 24, note: "Without a cap the day ends $120 past the budget. A hard cap blocks the key at $45,000." },
] as const;

const shapes: LayoutShape[] = [];
days.forEach((d, i) => {
  const y = 6 + i * 112;
  const normal = BUDGET.perDay * d.day;
  const loop = Math.max(0, d.day - 20) * BUDGET.leak;
  const used = BUDGET.spent(d.day);
  const segs =
    loop > 0
      ? [
          { value: normal, tone: PROD_TONE.model },
          { value: loop, tone: PROD_TONE.failure, label: `loop $${n(loop)}` },
        ]
      : [{ value: normal, tone: PROD_TONE.model }];
  // The scale ends at the limit for days 10 and 22; day 24 runs past it, so every row uses the same scale.
  const max = BUDGET.monthly * 1.02;
  shapes.push(
    ...meter(`m${d.step}`, X, y, {
      label: `Support key, month to date: day ${d.day}`,
      used,
      limit: BUDGET.monthly,
      unit: "dollars",
      width: W,
      max,
      limitLabel: "cap $45,000",
      segments: segs,
      step: d.step,
    })
  );
  BUDGET.thresholds.slice(0, 2).forEach((t) => {
    const x = Math.round(X + ((t * BUDGET.monthly) / max) * W);
    const label = `${t * 100} % · $${n(t * BUDGET.monthly)}`;
    shapes.push({
      id: `t${d.step}-${t * 100}`,
      type: "path",
      x: 0,
      y: 0,
      points: [
        [x, y + BAR_Y - 5],
        [x, y + BAR_Y + BAR_H + 5],
      ],
      dashed: true,
      tone: PROD_TONE.infra,
      step: d.step,
    });
    shapes.push(text(`t${d.step}-${t * 100}-label`, x - 50, y + BAR_Y + BAR_H + 6, 100, label, d.step));
  });
  shapes.push(text(`note-${d.step}`, X, y + 88, W, d.note, d.step));
});

// One labelled shape per step carries the "new" ring; the rest appear quietly.
const loud = new Set(["note-1", "note-2", "note-3"]);
const quietShapes = shapes.map((s) => (loud.has(s.id) ? s : { ...s, quiet: true }));

const spec: LayoutSpec = {
  kind: "layout",
  title: "A monthly budget with alerts at 50 %, 80 % and the cap: a loop bug crosses them in four days",
  width: 880,
  height: 346,
  steps: [{ title: "Day 10: on pace" }, { title: "Day 22: the 80 % alert fires" }, { title: "Day 24: the cap" }],
  shapes: quietShapes,
};

export default spec;
