import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PROD_TONE, curve } from "@/components/diagrams/presets/production";
import {
  ALIAS,
  BAND_HALF,
  DROP_CASES,
  DROP_POINTS,
  MOVE_WEEK,
  PINNED,
} from "@/components/diagrams/presets/production-drift";
import { BAND } from "@/components/diagrams/presets/production-regress";

// A silent model update (drift-detection, Deep dive). Brightpost runs the 200-ticket golden set every week against two
// deployments of the same provider's model: one calls the ALIAS (a name the provider can repoint), one calls a PINNED
// version (a fixed snapshot). Pass counts per week are illustrative (presets/production-drift.ts).
// Steps: 1 weeks 1 to 6: both score about 180 of 200, inside the noise band · 2 in week 7 the provider repoints the
//   alias: it falls to about 168 while the pinned line stays at 180 · 3 the check: 180 − 168 = 12 cases = 6 points, past
//   the band of ±4.5 cases (±2.2 points, from the regression page), so the next weekly run catches it, and the pinned
//   version shows the old behaviour is still there to compare against.
// Plot: x weeks 1 to 12, y pass count 150 to 200; plot at (16, 6), 540 x 360; right panel x 580.
// Colours: both lines neutral until the move; the alias line red after the move (something breaks); no other tone.

const PLOT = { x: 16, y: 6, w: 540, h: 360 } as const;
const common = {
  width: PLOT.w,
  height: PLOT.h,
  xDomain: [1, 12] as [number, number],
  yDomain: [150, 200] as [number, number],
  xTicks: [1, 3, 5, 7, 9, 11],
  yTicks: [150, 160, 170, 180, 190, 200],
  formatX: (v: number) => `${v}`,
  formatY: (v: number) => `${v}`,
  xLabel: "week",
  yLabel: "golden-set passes out of 200 (illustrative)",
};
const pts = (a: readonly number[], from: number, to: number): [number, number][] =>
  a.slice(from - 1, to).map((v, i): [number, number] => [from + i, v]);
const onlyData = (s: LayoutShape[]) => s.filter((x) => /-(s|m)\d+(-label)?$/.test(x.id));

const shapes: LayoutShape[] = [
  ...curve("c1", PLOT.x, PLOT.y, {
    ...common,
    step: 1,
    series: [{ points: pts(PINNED, 1, 6), tone: PROD_TONE.infra }],
  }),
  ...onlyData(
    curve("c2", PLOT.x, PLOT.y, {
      ...common,
      step: 2,
      series: [
        { points: pts(PINNED, 6, 12), tone: PROD_TONE.infra, label: "pinned version" },
        { points: pts(ALIAS, 6, 12), tone: PROD_TONE.failure, label: "alias" },
      ],
      marks: [
        { x: MOVE_WEEK, y: ALIAS[MOVE_WEEK - 1], label: "alias moves", tone: PROD_TONE.failure, place: "below-left" },
      ],
    })
  ),
];
shapes.forEach((s) => {
  if (!/-s\d+$/.test(s.id) && !/-m\d+$/.test(s.id)) s.quiet = true;
});

const text = (
  id: string,
  y: number,
  h: number,
  label: string,
  step: number,
  tone: LayoutShape["tone"] = PROD_TONE.infra
): LayoutShape => ({
  id,
  type: "text",
  x: 580,
  y,
  w: 292,
  h,
  label,
  tone,
  step,
  quiet: true,
});
shapes.push(
  text(
    "p1",
    30,
    72,
    "Weeks 1 to 6: the alias and a pinned\nversion both score about 180 of 200.\nThe noise band is 175.5 to 184.5.",
    1
  ),
  text(
    "p2",
    140,
    72,
    `Week ${MOVE_WEEK}: the provider repoints the\nalias. It falls to about 168 and stays\nthere. The pinned line does not move.`,
    2,
    PROD_TONE.failure
  ),
  text(
    "p3",
    250,
    54,
    `180 − 168 = ${DROP_CASES} cases = ${DROP_POINTS.toFixed(0)} points. The band is\n±${BAND_HALF.toFixed(1)} cases (${BAND.low.toFixed(1)} to ${BAND.high.toFixed(1)}), so the\nweek-7 run is outside it.`,
    3
  ),
  text(
    "p4",
    322,
    54,
    "The alert fires at the first weekly\ncheck. A pinned version moves only\nafter your own evaluation.",
    3
  )
);

const spec: LayoutSpec = {
  kind: "layout",
  title: "A silent model update: an alias moves, a pinned version does not",
  width: 880,
  height: 410,
  steps: [
    { title: "Weeks 1 to 6: both deployments agree" },
    { title: "Week 7: the provider moves the alias" },
    { title: "The weekly golden-set run catches it" },
  ],
  shapes,
};

export default spec;
